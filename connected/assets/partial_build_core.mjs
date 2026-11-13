// WIR REFRAMER COMMAND: partial-build enemies (#35). PROPOSAL / PUBLISH HOLD.
// A ReFramer keeps only the parts physically attached when its build is interrupted.
// Loose parts drop into the world and stay recoverable. Pure state, no THREE.
export const KIT = Object.freeze({ wheels: 4, chassis: 1, engine: 1, arms: 8 });
export const STAGE_ORDER = Object.freeze(['drop', 'read', 'anchor', 'release', 'reframe', 'chase']);

// Which moves a build can make, from its real parts. Each move needs its parts.
export const MOVES = Object.freeze([
  { id: 'drive',   needs: { wheels: 2, chassis: 1 } },
  { id: 'ram',     needs: { chassis: 1, arms: 2 } },
  { id: 'grab',    needs: { arms: 2 } },
  { id: 'slam',    needs: { chassis: 1, engine: 1, arms: 4 } },
  { id: 'retreat', needs: { wheels: 2, chassis: 1 } },
]);

// parts: { wheels, chassis, engine, arms } counts (0..KIT max each).
export function movesFor(parts) {
  const have = clampParts(parts);
  return MOVES.filter(m => Object.entries(m.needs).every(([k, n]) => have[k] >= n)).map(m => m.id);
}

export function clampParts(p = {}) {
  const out = {};
  for (const k of Object.keys(KIT)) out[k] = Math.max(0, Math.min(KIT[k], Math.floor(p[k] ?? 0)));
  return out;
}

// Which parts are attached at the moment a build is interrupted, given the stage it reached.
// Parts for later stages are not yet attached and fall loose. A reframe after release keeps what
// was already bolted on.
export function interrupt(fullParts, stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0) return { ok: false, reason: 'unknown-stage' };
  const full = clampParts(fullParts);
  // Stage at which each part is physically attached (earlier = attached sooner).
  const attachAt = { chassis: 'anchor', wheels: 'release', engine: 'reframe', arms: 'anchor' };
  const attached = {}, loose = {};
  for (const k of Object.keys(KIT)) {
    const need = STAGE_ORDER.indexOf(attachAt[k]);
    const have = idx >= need ? full[k] : 0;
    attached[k] = have;
    loose[k] = full[k] - have;
  }
  return { ok: true, stage, attached, loose, moves: movesFor(attached) };
}

export function totalParts(p) {
  return Object.values(clampParts(p)).reduce((s, n) => s + n, 0);
}
