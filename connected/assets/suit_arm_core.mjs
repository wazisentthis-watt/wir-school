// WIR REFRAMER COMMAND: General suit arm contacts. PROPOSAL / PUBLISH HOLD.
// Pure math, no THREE. Eight arms, each with a fixed shoulder on the suit body.
// State machine: STOWED -> SEEK_TARGET -> EXTEND -> CONTACT -> LOAD -> ACTION -> RELEASE -> RECOVER -> STOWED.
// Rules: reach is limited; a brace needs >= 2 valid contacts; a lift needs support capacity >= load;
// losing contact drops the load; heat and servo damage limit use; no teleporting arms.
export const SUIT = Object.freeze({
  ARMS: 8, REACH: 1.6, EXTEND_SPEED: 3.0, CONTACT_EPS: 0.08, RECOVER_TIME: 0.6,
  ARM_CAPACITY_KG: 40, BRACE_MIN_CONTACTS: 2, BRACED_SPEED_MUL: 0.5,
  HEAT_PER_ACTION: 0.25, HEAT_MAX: 1, HEAT_COOL: 0.2,
  DAMAGE_PER_REACH_LOSS: 0.5, // servo hp 0..1 scales reach down to 50% at 0
});
const SHOULDER = i => {
  // Eight shoulders in a ring around the suit body (metres, body-local, y up = 0).
  const a = (i / SUIT.ARMS) * Math.PI * 2;
  return { x: Math.cos(a) * 0.6, y: 1.2, z: Math.sin(a) * 0.6 };
};
const VALID_SURFACES = new Set(['concrete', 'metal', 'glass', 'brick']);
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const finite3 = p => p && [p.x, p.y, p.z].every(Number.isFinite);

export function createSuit() {
  const arms = Array.from({ length: SUIT.ARMS }, (_, i) => ({
    id: i, shoulder: SHOULDER(i), state: 'STOWED', tip: null, target: null, contact: null,
    load: 0, servo: 1, timer: 0,
  }));
  return { arms, heat: 0, locked: false, log: [] };
}

export function reachOf(arm) {
  return SUIT.REACH * (1 - (1 - arm.servo) * SUIT.DAMAGE_PER_REACH_LOSS);
}

// target: { p:{x,y,z}, surface, normal }. Fails cleanly with a reason; never moves an arm instantly.
export function seek(S, i, target) {
  const arm = S.arms[i];
  if (!arm) return { ok: false, reason: 'no-arm' };
  if (arm.state === 'DISABLED') return { ok: false, reason: 'arm-disabled' };
  if (S.locked) return { ok: false, reason: 'heat-lockout' };
  if (arm.state !== 'STOWED') return { ok: false, reason: 'arm-busy', state: arm.state };
  if (!target || !finite3(target.p)) return { ok: false, reason: 'no-target' };
  if (dist3(arm.shoulder, target.p) > reachOf(arm)) return { ok: false, reason: 'out-of-reach' };
  arm.target = { p: { ...target.p }, surface: target.surface || null, normal: target.normal || null };
  arm.state = 'EXTEND'; arm.tip = { ...arm.shoulder };
  return { ok: true, arm: i };
}

// Advance arms by dt. Returns events. Contact is only made on a valid surface.
export function step(S, dt, world = {}) {
  const ev = [];
  S.heat = Math.max(0, S.heat - SUIT.HEAT_COOL * dt);
  if (S.locked && S.heat <= 0.2) S.locked = false;
  for (const arm of S.arms) {
    if (arm.state === 'EXTEND') {
      const d = dist3(arm.tip, arm.target.p);
      const move = SUIT.EXTEND_SPEED * dt;
      if (d <= SUIT.CONTACT_EPS || d <= move) {
        arm.tip = { ...arm.target.p };
        if (VALID_SURFACES.has(arm.target.surface)) {
          arm.state = 'CONTACT'; arm.contact = { surface: arm.target.surface, normal: arm.target.normal };
          ev.push({ type: 'contact', arm: arm.id, surface: arm.target.surface });
        } else {
          arm.state = 'RECOVER'; arm.timer = 0; ev.push({ type: 'bad-surface', arm: arm.id, surface: arm.target.surface });
        }
      } else {
        const k = move / d;
        arm.tip = { x: arm.tip.x + (arm.target.p.x - arm.tip.x) * k, y: arm.tip.y + (arm.target.p.y - arm.tip.y) * k, z: arm.tip.z + (arm.target.p.z - arm.tip.z) * k };
      }
    } else if (arm.state === 'CONTACT' || arm.state === 'LOAD') {
      // Contact lost if the anchor moved beyond reach (counterplay: cut or pull the anchor).
      const anchor = world.anchors?.[arm.id];
      if (anchor && (!finite3(anchor) || dist3(arm.shoulder, anchor) > reachOf(arm) + SUIT.CONTACT_EPS)) {
        ev.push(...drop(S, arm.id, 'contact-lost'));
      } else if (anchor) { arm.tip = { ...anchor }; }
    } else if (arm.state === 'RELEASE') {
      arm.state = 'RECOVER'; arm.timer = 0;
    } else if (arm.state === 'RECOVER') {
      arm.timer += dt;
      if (arm.timer >= SUIT.RECOVER_TIME) { arm.state = 'STOWED'; arm.tip = null; arm.target = null; arm.contact = null; ev.push({ type: 'stowed', arm: arm.id }); }
    }
  }
  return ev;
}

function drop(S, i, reason) {
  const arm = S.arms[i];
  const had = arm.load;
  arm.load = 0; arm.contact = null; arm.state = 'RELEASE';
  return [{ type: 'released', arm: i, reason, freedKg: had }];
}

export function contacts(S) {
  return S.arms.filter(a => a.state === 'CONTACT' || a.state === 'LOAD');
}

export function isBraced(S) {
  return contacts(S).length >= SUIT.BRACE_MIN_CONTACTS;
}

export function speedMul(S) {
  return isBraced(S) ? SUIT.BRACED_SPEED_MUL : 1;
}

// Carry a load (kg) across contacted arms. Load is shared evenly; each arm carries at most its capacity.
export function lift(S, massKg) {
  if (!Number.isFinite(massKg) || massKg <= 0) return { ok: false, reason: 'bad-mass' };
  if (S.locked) return { ok: false, reason: 'heat-lockout' };
  const supports = contacts(S).filter(a => a.servo > 0);
  if (supports.length < SUIT.BRACE_MIN_CONTACTS) return { ok: false, reason: 'needs-two-contacts' };
  const capacity = supports.reduce((s, a) => s + SUIT.ARM_CAPACITY_KG * a.servo, 0);
  if (massKg > capacity) return { ok: false, reason: 'over-capacity', capacity };
  const share = massKg / supports.length;
  for (const a of supports) { a.load = share; a.state = 'LOAD'; }
  addHeat(S, SUIT.HEAT_PER_ACTION);
  return { ok: true, perArm: share, arms: supports.map(a => a.id) };
}

export function release(S, i = null) {
  const idx = i === null ? S.arms.filter(a => a.state === 'LOAD' || a.state === 'CONTACT').map(a => a.id) : [i];
  const ev = [];
  for (const id of idx) {
    const arm = S.arms[id];
    if (arm.state === 'LOAD' || arm.state === 'CONTACT') ev.push(...drop(S, id, 'released'));
  }
  return ev;
}

// Servo damage: hp 0..1 scales reach. At 0 the arm is disabled and its contact drops.
export function hitArm(S, i, amount) {
  const arm = S.arms[i];
  if (!arm || !Number.isFinite(amount) || amount <= 0) return [];
  arm.servo = Math.max(0, arm.servo - amount);
  const ev = [{ type: 'servo', arm: i, servo: arm.servo }];
  if (arm.servo <= 0) {
    ev.push(...drop(S, i, 'disabled'));
    arm.state = 'DISABLED';
    ev.push({ type: 'disabled', arm: i });
  }
  return ev;
}

function addHeat(S, amt) {
  S.heat = Math.min(SUIT.HEAT_MAX, S.heat + amt);
  if (S.heat >= SUIT.HEAT_MAX) S.locked = true;
}
