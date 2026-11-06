// METAL POWER COMBOS — PROPOSAL / PUBLISH HOLD
// Powers chain into each other. Feed every power/strike event in; get back a combo id when a chain completes.
// No button sequences to memorize on screen: the chains follow what the powers physically do.

export const COMBOS = [
  { id: 'galliumFist', name: 'Gallium Fist', seq: ['strike', 'strike', 'globThrow'], win: 0.9, pts: 300,
    what: 'Two hits then throw the glob: it hardens around your fist and lands +60 %' },
  { id: 'magnetStorm', name: 'Magnet Storm', seq: ['drawLong', 'pulse'], win: 1.2, pts: 400,
    what: 'Draw metal for a second, then pulse: double radius, pulls fighters in, then throws them out' },
  { id: 'shatter', name: 'Shatter', seq: ['globThrow', 'blast'], win: 0.9, pts: 350,
    what: 'Blast your own glob in flight: it bursts into crystal shards (4 m)' },
  { id: 'meteor', name: 'Meteor', seq: ['airborne', 'globThrow'], win: 1.5, pts: 380,
    what: 'Throw a glob from the air: it drives down and cracks the ground' },
  { id: 'railRifle', name: 'Rail Rifle', seq: ['grind', 'globThrow'], win: 1.2, pts: 420,
    what: 'Throw while grinding: rail speed is added and the glob pierces' },
  { id: 'styleCannon', name: 'Style Cannon', seq: ['trick', 'globThrow'], win: 1.0, pts: 250,
    what: 'Land a flip trick, then throw: the glob carries your landing speed' },
  { id: 'swingBreaker', name: 'Swing Breaker', seq: ['swingRelease', 'strike'], win: 1.0, pts: 320,
    what: 'Let go of a swing and strike before you land: heavy down-hit' },
];

export function createCombos() { return { log: [], fired: [], chain: 0, chainT: 0, score: 0 }; }

// event: { type, t } — returns the combo that completed (or null)
export function feed(C, type, t) {
  C.log.push({ type, t });
  while (C.log.length > 12) C.log.shift();
  for (const c of COMBOS) {
    const n = c.seq.length; if (C.log.length < n) continue;
    const tail = C.log.slice(-n);
    if (tail.every((e, i) => e.type === c.seq[i]) && tail[n - 1].t - tail[0].t <= c.win) {
      C.log.length = 0;
      C.chain = t - C.chainT < 3 ? C.chain + 1 : 1; C.chainT = t;
      const mult = 1 + 0.25 * (C.chain - 1);
      C.score += Math.round(c.pts * mult); C.fired.push({ id: c.id, t, mult });
      return { ...c, mult, chain: C.chain };
    }
  }
  return null;
}
