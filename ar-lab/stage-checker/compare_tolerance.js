'use strict';
// Scores the same SIMULATED clips under fixed (+-150 ms, default) and relative (opt-in) tolerance. PROPOSAL.
const { scoreMove } = require('./stage_checker'), G = require('./synth_poses');
const clips = { clean: G.clean(), slowClean: G.slowClean(), hipsLate: G.hipsLate(), slowHipsLate: G.hipsLate({ tempo: 2.5 }), fastClean: G.clean({ tempo: 0.6 }), reversed: G.reversed(), armsOnlyFlail: G.armsOnlyFlail(), jump: G.jumpFrames(), overTurn: G.overTurn(), fullSpin: G.fullSpin() };
console.log('clip'.padEnd(14), 'fixed score/order', ' relative score/order');
for (const [n, f] of Object.entries(clips)) { const a = scoreMove(f), b = scoreMove(f, { cfg: { tolMode: 'relative' } });
  console.log(n.padEnd(14), String(a.score).padEnd(8), String(a.parts && a.parts.order).padEnd(8), String(b.score).padEnd(8), String(b.parts && b.parts.order)); }
