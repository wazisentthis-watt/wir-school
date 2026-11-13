// Glazed Gloves — each glove is a tiny kitchen with its own chemistry.
export const RECIPES = {
  glaze:    { id: 'glaze',    name: 'Peanut-Lime Glaze', short: 'GLAZE',   color: '#ffb347', mode: 'prime', cook: 0.45, heat: [22, 78], moisture: 10, desc: 'Adhesive coat. Next contact sticks to their gloves: guard recovery and hand speed drop for 5s.', science: 'Peanut proteins + lime acid tighten into a tacky emulsion. Too hot and the sugars scorch; too cold and it never sets.' },
  steam:    { id: 'steam',    name: 'Steam Burst',       short: 'STEAM',   color: '#bfe8ff', mode: 'instant', cook: 0.0, needMoist: 25, desc: 'Vent a cloud from the chamber. Obscures your next movement — their read and aim degrade for 2.5s.', science: 'Water flashes to vapour ~1700× its volume. Costs moisture, raises chamber heat, shakes stability.' },
  caramel:  { id: 'caramel',  name: 'Amber Caramel',     short: 'CARAMEL', color: '#d2691e', mode: 'prime', cook: 0.7, heat: [45, 92], moisture: 5, desc: 'Next landed punch sets caramel: body shots spill it under their feet (traction loss), the glove hardens (+power for 3 punches).', science: 'Sucrose caramelises only once it is hot enough — under-heated sugar stays syrup and slides off.' },
  pressure: { id: 'pressure', name: 'Noodle Snap',       short: 'SNAP',    color: '#ff2f86', mode: 'prime', cook: 0.35, needPressure: 40, desc: 'Cocoa-ramen elasticity. Next punch stretches the forearm for extra reach and +45% force. Unstable chambers backfire.', science: 'Pressure stored in elastic noodle fibre releases as rebound. Vent it safely or it vents itself.' },
  crema:    { id: 'crema',    name: 'Espresso Crema',    short: 'CREMA',   color: '#e8c39e', mode: 'instant', cook: 0.0, needMoist: 10, desc: 'Soul-meal focus shot: hand speed and read sharpen for 4s.', science: 'Pressurised extraction pulls oils into a stable crema foam — the patient, analytical edge.' },
  roux:     { id: 'roux',     name: 'Roux Shield',       short: 'ROUX',    color: '#c8a26a', mode: 'instant', cook: 0.0, heat: [30, 100], needMoist: 15, desc: 'Thickened protective layer on this glove: blocks on this side absorb almost everything for 4s.', science: 'Flour + fat cooked, then hydrated: starch granules swell into a thick protective gel.' },
  trail:    { id: 'trail',    name: 'NeonGlaze Dash',    short: 'DASH',    color: '#ffe066', mode: 'instant', cook: 0.0, needMoist: 8, desc: 'Ride the NeonGlaze trail: an explosive glide wherever you are stepping (sideways if standing). Leaves a glowing streak.', science: 'Sugar glass on a hot surface goes frictionless for a heartbeat — the trail runs on that.' },
  burner:   { id: 'burner',   name: 'Burner Wake',       short: 'BURN',    color: '#ff4a10', mode: 'instant', cook: 0.0, heat: [50, 100], desc: 'Stomp the canvas: a burner coil wakes under your opponent for 6s and boils their gloves.', science: 'Dumps your chamber heat into the NeonGlaze Trails beneath the ring.' },
  kernel:   { id: 'kernel',   name: 'Kernel Pop',        short: 'POP',     color: '#fff4d0', mode: 'prime', cook: 0.4, heat: [35, 90], moisture: 8, desc: 'Next landed punch pops: blast knockback and a short stun.', science: 'Water trapped in the kernel flashes to steam at ~180°C and the hull bursts.' },
  syrup:    { id: 'syrup',    name: 'Maple Snare',       short: 'SNARE',   color: '#c46a1a', mode: 'instant', cook: 0.0, needMoist: 15, desc: 'Fling a syrup strand: in range it yanks them half a step in and glues their feet for 2.5s.', science: 'Reduced sap: long sugar chains, high viscosity, very stretchy when warm.' },
};
export const RECIPE_ORDER = ['glaze', 'steam', 'caramel', 'pressure', 'crema', 'roux', 'trail', 'burner', 'kernel', 'syrup'];

export const REACTIONS = [
  { a: 'glaze', b: 'steam', name: 'Steam-Set Glaze', desc: 'Steam sets the adhesive: coating lasts twice as long.' },
  { a: 'caramel', b: 'scorch', name: 'Brittle Caramel', desc: 'Caramel past hard-crack: next hit +60% and shatters.' },
  { a: 'steam', b: 'pressure', name: 'Pressure Cooker', desc: 'Steam feeds the chamber: +40 pressure instantly.' },
  { a: 'crema', b: 'glaze', name: 'Mocha Lacquer', desc: 'Fast hands carrying adhesive: glaze applies on any contact.' },
  { a: 'roux', b: 'caramel', name: 'Caramel Roux Wall', desc: 'Punches into your guard come away coated.' },
  { a: 'pressure', b: 'scorch', name: 'Flash Sear', desc: 'Superheated snap: burns through the guard (+chip damage).' },
  { a: 'trail', b: 'steam', name: 'Steam Comet', desc: 'Dash through your own steam: they lose sight of you.' },
  { a: 'burner', b: 'caramel', name: 'Scorched Sugar', desc: 'The coil caramelises the canvas: a spill lands with the burner.' },
  { a: 'kernel', b: 'pressure', name: 'Popcorn Cannon', desc: 'Pressurised pop: double knockback.' },
];

export class GloveState {
  constructor(side, loadout, prep = 0.8) {
    this.side = side; this.loadout = loadout.slice(); this.sel = 0; this.prep = prep;
    this.heat = 34; this.moisture = 55; this.pressure = 10; this.stability = 85;
    this.cooking = null; this.primed = null; this.buffs = {}; this.coat = 0; this.caramelSet = 0; this.lastUse = -99; this.flash = 0;
  }
  get recipe() { return RECIPES[this.loadout[this.sel]]; }
  cycle() { this.sel = (this.sel + 1) % this.loadout.length; }
  update(dt, env) {
    // env: {ringHeat, zoneHeat, moistureMul, fighter}
    const ambient = env.ringHeat;
    this.heat += ((ambient - this.heat) * 0.08 + env.zoneHeat) * dt;
    this.heat = Math.max(0, Math.min(100, this.heat));
    this.moisture += (2.2 * env.moistureMul - Math.max(0, this.heat - 70) * 0.08) * dt;
    this.moisture = Math.max(0, Math.min(100, this.moisture));
    this.pressure = Math.max(0, this.pressure - 0.8 * dt);
    const target = 100 - Math.max(0, this.heat - 65) * 1.6 - (this.pressure > 85 ? 15 : 0);
    this.stability += (target - this.stability) * 0.25 * dt;
    this.stability = Math.max(0, Math.min(100, this.stability));
    for (const k in this.buffs) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) delete this.buffs[k]; }
    this.flash = Math.max(0, this.flash - dt);
    if (this.cooking) { this.cooking.t += dt; }
  }
}
