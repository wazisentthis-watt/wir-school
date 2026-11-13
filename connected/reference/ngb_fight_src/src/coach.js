// Corner talk: what you SAY to your fighter between rounds, scored like a real trainer would be judged —
// is it about what actually happened this round, is it a concrete instruction, is it motivating (and not tearing him down).
// Pure function, no DOM: analyzeTalk(text, report) → { buffs:[{attr,n,why}], read, focus, stamina, reply, score, heard }

const FAM = { // punch families and the words people use for them
  jab: /\b(jab|jabs|jabbing|lead hand|left hand|the left|his left|stiff jab)\b/,
  cross: /\b(cross|right hand|straight right|the right|his right|one[- ]two|1[- ]2|straight)\b/,
  hook: /\b(hook|hooks|hooking|left hook|right hook)\b/,
  upper: /\b(uppercut|uppercuts|upper cut|upper|under ?cut)\b/,
  body: /\b(body|bodies|ribs|liver|stomach|belly|gut|downstairs|chest|midsection)\b/,
  over: /\b(overhand|over hand|looping|wild)\b/,
};
const DEF = /\b(slip|slipping|roll|rolling|duck|ducking|weave|bob|head movement|move your head|moving your head|block|parry|catch|catching|tight|hands up|keep your hands|guard|elbows|chin down|tuck|cover|shell|lean back|pull back|get out of the way|off the center|off the line)\b/;
const OFF = /\b(throw|throwing|punch|punching|hit|hitting|work|working|go to|attack|double|triple|combination|combo|combos|counter|countering|fire|let it go|let your hands go|pressure|press|dig|land|lands|sit down on|commit|faster|snap)\b/;
const FEET = /\b(feet|footwork|move|moving|circle|circling|pivot|angle|angles|step|stepping|bounce|legs|lateral|side to side|cut off|ring|corner|ropes|in and out|distance|range)\b/;
const MOTIV = /\b(you got this|you've got this|let'?s go|come on|believe|champ|champion|you'?re the best|strong|stronger|you can|keep it up|keep going|proud|you'?re winning|winning|he'?s tired|he'?s hurt|he'?s breaking|he is tired|he is hurt|he is breaking|he'?s slowing|dig deep|heart|breathe|relax|calm|focus|confident|beast|king|warrior|this is your|your round|take it|one more|almost there|i believe|love you|stay on him|you'?re sharper|you look good|looking good|great round|good round)\b/g;
const NEG = /\b(trash|suck|sucks|stupid|lazy|garbage|weak|quit|loser|terrible|idiot|pathetic|embarrassing|worthless|shut up|dumb|soft)\b/g;
const HIS = /\b(he|he'?s|his|him|they|their|them|opponent|that dude|this dude|this guy|that guy)\b/;
const LEFTRIGHT = /\b(left|right)\b/;

// report: { theyLanded: {jab,cross,hook,upper,body,over}, youLanded: {...}, youBodyDmg, swell:[L,R], youThrown, theirName }
export function analyzeTalk(raw, report = {}) {
  const t = ' ' + String(raw || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  const words = t.trim() ? t.trim().split(' ').length : 0;
  const out = { buffs: [], read: null, focus: 0, stamina: 0, reply: '', score: 0, heard: raw || '' };
  if (words < 2) { out.reply = '…'; return out; }
  const theirs = report.theyLanded || {}, mine = report.youLanded || {};
  const top = Object.entries(theirs).sort((a, b) => b[1] - a[1])[0]; const topFam = top && top[1] >= 2 ? top[0] : null;
  // split into clauses so "his jab … slip left" and "your hook" are judged separately
  const clauses = t.split(/\b(?:and|but|then|also|so|because|cause|plus)\b|[.!?,;]/).map(c => ' ' + c.trim() + ' ').filter(c => c.trim().length > 2);
  const add = (attr, n, why) => { const b = out.buffs.find(x => x.attr === attr); if (b) { if (n > b.n) { b.n = n; b.why = why; } } else out.buffs.push({ attr, n, why }); };
  let defenseFam = null, specific = 0;
  for (let ci = 0; ci < clauses.length; ci++) {
    const c = clauses[ci], prev = clauses[ci - 1] || '', fam = Object.keys(FAM).find(k => FAM[k].test(c)) || null;
    const aboutHim = HIS.test(c) || (fam && HIS.test(prev)); const def = DEF.test(c); const off = OFF.test(c); const cDir = c.replace(/\b(left|right) (hand|hook|uppercut|upper|jab|cross|straight|eye|side of)\b/g, ' '); const dir = LEFTRIGHT.test(cDir);
    // defense against what HE is doing
    const prevFam = Object.keys(FAM).find(k => FAM[k].test(prev)) || null;
    if (def && (aboutHim || fam || prevFam || defenseFam)) {
      const f = fam || prevFam || defenseFam; const real = f && f === topFam;
      add('agility', real ? 3 : f ? 2 : 1, f ? `${real ? 'he kept landing that ' : 'defend the '}${f === 'body' ? 'body shot' : f}${dir ? ', move ' + (cDir.match(LEFTRIGHT) || [])[0] : ''}` : 'head movement');
      if (f) { defenseFam = defenseFam || f; specific += real ? 2 : 1; } if (dir) specific++;
      if (/\b(hands up|guard|chin|tight|elbows|tuck|cover|shell)\b/.test(c)) add('chin', 2, 'hands up, chin down');
      continue;
    }
    if (/\b(hands up|keep your hands up|guard up|chin down|elbows in|tuck your chin|stay tight)\b/.test(c)) { add('chin', 2, 'hands up, chin down'); specific++; continue; }
    // what YOU should throw
    if (fam && (off || !aboutHim)) {
      const landed = (mine[fam] || 0) >= 2; const n = landed ? 3 : 2;
      if (fam === 'jab' || /\b(double|triple|faster|snap|combination|combo)\b/.test(c)) add('hands', n, `${fam === 'jab' ? 'the jab' : 'your hands'}${landed ? ' is working' : ''}`);
      else add('power', n, `${fam === 'body' ? 'go to the body' : fam === 'cross' ? 'the right hand' : 'the ' + fam}${landed ? ' is landing' : ''}`);
      specific += landed ? 2 : 1; continue;
    }
    if (FEET.test(c)) { add('balance', /\b(pivot|angle|circle|cut off|step)\b/.test(c) ? 3 : 2, /\b(pivot|angle)\b/.test(c) ? 'take the angle' : 'use your feet'); specific++; continue; }
    if (/\b(breathe|relax|calm|recover|rest)\b/.test(c)) add('engine', 2, 'breathe, relax');
  }
  // motivation & tone
  const mot = (t.match(MOTIV) || []).length, neg = (t.match(NEG) || []).length;
  if (neg) { out.focus -= 12 * neg; out.buffs = out.buffs.map(b => ({ ...b, n: Math.max(1, b.n - 1) })); }
  if (mot && !neg) { out.focus += Math.min(30, 12 + 8 * mot); out.stamina += Math.min(15, 5 + 4 * mot); if (mot >= 2) add('chin', 2, 'heart'); }
  // a corner that's both specific AND believes in him is worth more
  if (specific >= 2 && mot && !neg) out.buffs.forEach(b => { b.n = Math.min(3, b.n + (b.n < 3 && specific >= 3 ? 1 : 0)); });
  out.buffs = out.buffs.sort((a, b) => b.n - a.n).slice(0, 3);
  if (defenseFam) out.read = defenseFam; // next round he reads that punch better
  out.score = Math.min(100, specific * 18 + mot * 10 + out.buffs.reduce((a, b) => a + b.n * 6, 0) - neg * 25);
  const lead = out.buffs[0];
  out.reply = neg && !out.buffs.length ? "…alright, coach." : !out.buffs.length && mot ? "Let's go! I got you." : !out.buffs.length ? 'Say what you saw, coach!' :
    lead.why === 'heart' ? "Let's go! I got you." : defenseFam ? `Got it — I'm watching that ${defenseFam === 'body' ? 'body shot' : defenseFam}.` : lead.attr === 'power' || lead.attr === 'hands' ? `Yeah — ${lead.why}.` : lead.attr === 'balance' ? 'Feet moving. I got it.' : 'Hands up. I hear you.';
  return out;
}

// quick lines for controller players (no mic): built from the round, worth a little less than your own words
export function suggestions(report = {}) {
  const theirs = report.theyLanded || {}; const top = Object.entries(theirs).sort((a, b) => b[1] - a[1])[0]; const mine = report.youLanded || {};
  const best = Object.entries(mine).sort((a, b) => b[1] - a[1])[0];
  const s = [];
  if (top && top[1] >= 1) s.push(`He keeps landing that ${top[0] === 'body' ? 'body shot' : top[0]} — slip it and roll under, hands up.`);
  if (best && best[1] >= 1) s.push(`Your ${best[0] === 'body' ? 'body work' : best[0]} is landing — keep throwing it, let's go!`);
  s.push('Use your feet — pivot and take the angle. You got this, champ!');
  return s.slice(0, 3);
}
