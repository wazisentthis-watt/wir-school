// Metal vs ReFramer fight tempo: rewards for reading the machine, not just hitting it.
// Pure rules, no DOM or three.js. PROPOSAL / PUBLISH HOLD.
// Reads the events that reframer_hunt_core already emits, so it can be wired without changing the hunt.

export const TEMPO = Object.freeze({
  RIPOSTE_T: 1.2,        // window after a dodged tether to land a counter
  RIPOSTE_MUL: 1.5,      // damage multiplier on that counter
  BURST_T: 0.8,          // speed burst after breaking free of a tether
  BURST_SPEED: 1.25,
  CHAIN_WINDOW: 1.0,     // seconds between hits that keep a combo alive
  CHAIN_STEP: 0.05,      // extra damage per hit in a chain
  CHAIN_CAP: 0.4,        // most a chain can add
});

export function createTempo() {
  return { riposte: 0, burst: 0, chain: 0, chainT: 0, counters: 0, breakFrees: 0 };
}

// Feed the hunt's events in. Dodging a tether opens a counter window; breaking free grants a burst.
export function onHuntEvents(T, events = []) {
  const out = [];
  for (const e of events) {
    if (!e || !e.type) continue;
    if (e.type === 'tether-dodged') {
      T.riposte = TEMPO.RIPOSTE_T;
      out.push({ type: 'riposte-open' });
    } else if (e.type === 'tether-escaped') {
      T.burst = TEMPO.BURST_T;
      T.breakFrees++;
      out.push({ type: 'break-free' });
    } else if (e.type === 'tether-caught') {
      T.chain = 0; T.chainT = 0; // being grabbed breaks the combo
    }
  }
  return out;
}

export function tickTempo(T, dt) {
  const t = Number.isFinite(dt) && dt > 0 ? Math.min(0.1, dt) : 0;
  T.riposte = Math.max(0, T.riposte - t);
  T.burst = Math.max(0, T.burst - t);
  T.chainT = Math.max(0, T.chainT - t);
  if (T.chainT === 0) T.chain = 0;
  return T;
}

// Damage multiplier for a hit landed now. Consumes the riposte, extends the chain.
export function registerHit(T) {
  let mul = 1;
  const parts = [];
  if (T.riposte > 0) {
    mul *= TEMPO.RIPOSTE_MUL;
    parts.push('riposte');
    T.riposte = 0;
    T.counters++;
  }
  if (T.chainT > 0) T.chain++;
  else T.chain = 1;
  T.chainT = TEMPO.CHAIN_WINDOW;
  const chainBonus = Math.min(TEMPO.CHAIN_CAP, (T.chain - 1) * TEMPO.CHAIN_STEP);
  if (chainBonus > 0) { mul *= 1 + chainBonus; parts.push('chain'); }
  return { mul, chain: T.chain, parts };
}

// Speed factor for Metal's movement right now (burst after a break-free).
export function moveSpeedMul(T) {
  return T.burst > 0 ? TEMPO.BURST_SPEED : 1;
}
