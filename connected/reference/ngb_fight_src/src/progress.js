// The Fourth Ingredient — what Savannah becomes through experience (fights + real-world training log).
export const TRAITS = {
  reflex:  { name: 'Crema Reflex',   color: '#e8c39e', perk: 'Counter damage +3% per level', lore: 'Years of counterpunching sharpen his sensory read — the crema settles faster.', from: 'counters, parries, slipped punches, shadowboxing' },
  rebound: { name: 'Noodle Rebound', color: '#ff2f86', perk: 'Punch stamina cost −3% per level', lore: 'Pressure work compresses the noodle fibre so it springs back cheaper.', from: 'landed punches, body work, heavy bag, roadwork' },
  core:    { name: 'Caramel Core',   color: '#d2691e', perk: 'Damage taken −2% per level', lore: 'Absorbing heat without breaking sets the caramel harder.', from: 'blocked punches, rounds survived, push-ups' },
  craft:   { name: 'Glaze Craft',    color: '#ffb347', perk: 'Glove prep quality +3% per level', lore: 'Kitchen hours. The chamber chemistry becomes instinct.', from: 'recipes cooked, culinary reactions' },
  footing: { name: 'Skillet Footing', color: '#00e5ff', perk: 'Footwork speed +2% per level', lore: 'Distance control burned into the legs.', from: 'opponent misses, footwork drills, squats' },
};
export const LEVELS = [0, 50, 130, 260, 450, 700];
export const LOG_TYPES = {
  shadow:   { label: 'Shadowboxing', unit: 'min', step: 5, xp: { reflex: 2, rebound: 0.5 } },
  footwork: { label: 'Footwork drills', unit: 'min', step: 5, xp: { footing: 2.2 } },
  bag:      { label: 'Heavy bag', unit: 'rounds', step: 1, xp: { rebound: 8, reflex: 2 } },
  roadwork: { label: 'Roadwork', unit: 'km', step: 1, xp: { rebound: 7, footing: 2 } },
  pushups:  { label: 'Push-ups', unit: 'reps', step: 10, xp: { core: 0.5 } },
  squats:   { label: 'Squats', unit: 'reps', step: 10, xp: { footing: 0.4, core: 0.15 } },
};
const KEY = 'ngb_fourth';
export function loadProfile() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.xp) return v; } catch (e) {} return { xp: { reflex: 0, rebound: 0, core: 0, craft: 0, footing: 0 }, log: [], fights: 0 }; }
export function saveProfile(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
export function level(xp) { let l = 0; for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i; return l; }
export function nextAt(xp) { const l = level(xp); return l >= LEVELS.length - 1 ? null : LEVELS[l + 1]; }
export function perks(p) {
  const L = k => level(p.xp[k] || 0);
  return { counter: 1 + 0.03 * L('reflex'), stamCost: 1 - 0.03 * L('rebound'), taken: 1 - 0.02 * L('core'), prep: 0.03 * L('craft'), move: 1 + 0.02 * L('footing') };
}
function add(p, gains, k, v) { if (v > 0) { p.xp[k] = (p.xp[k] || 0) + v; gains[k] = (gains[k] || 0) + v; } }
export function awardFight(p, me, opp, rounds, won) {
  const g = {}; const s = me.stats, o = opp.stats;
  add(p, g, 'reflex', s.counters * 6 + (s.parries || 0) * 8 + (s.slips || 0) * 3);
  add(p, g, 'rebound', s.landed * 1 + s.bodyLanded * 1.5);
  add(p, g, 'core', o.blocked * 1.5 + rounds * 10);
  add(p, g, 'craft', s.recipes * 5 + s.reactions * 12);
  add(p, g, 'footing', o.missed * 1.5);
  if (won) for (const k of Object.keys(TRAITS)) add(p, g, k, 4);
  p.fights = (p.fights || 0) + 1; return g;
}
export function awardLog(p, type, amount) {
  const t = LOG_TYPES[type]; const g = {};
  for (const [k, r] of Object.entries(t.xp)) add(p, g, k, Math.round(r * amount));
  p.log.unshift({ d: new Date().toISOString().slice(0, 10), type, amount }); p.log = p.log.slice(0, 40); return g;
}

// Boxer attributes: ratings 50-99 that grow with what you actually do in fights and in Training Camp.
export const ATTRS = {
  power:   { name: 'Power',     color: '#ff2f86', how: 'land heavy punches clean', does: 'heavy-punch damage' },
  balance: { name: 'Balance',   color: '#ffb000', how: 'throw heavies without falling off-balance', does: 'heavy wind-up speed, less over-commit, less knockback' },
  agility: { name: 'Agility',   color: '#00e5ff', how: 'make them miss with slips, ducks, pulls and rolls', does: 'slip speed and depth, roll speed, step speed' },
  hands:   { name: 'Hand Speed', color: '#8dff9a', how: 'land punches in combinations', does: 'punch speed' },
  chin:    { name: 'Chin',      color: '#d6b8ff', how: 'take shots and stay standing', does: 'less daze per head shot' },
  engine:  { name: 'Engine',    color: '#58c8ff', how: 'finish rounds and keep working', does: 'stamina recovery' },
};
export function rating(xp) { return Math.round(50 + 49 * (1 - Math.exp(-(xp || 0) / 500))); }
export function attrsOf(p) { const o = {}; for (const k in ATTRS) o[k] = rating((p.ax || {})[k]); return o; }
export function awardAttrs(p, ax) { p.ax = p.ax || {}; const before = attrsOf(p); for (const k in ax) p.ax[k] = (p.ax[k] || 0) + ax[k]; return { before, after: attrsOf(p) }; }
