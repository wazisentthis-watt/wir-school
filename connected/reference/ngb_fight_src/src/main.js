// NeonGlazed BrawlScape — The Glazed Ring. Game shell.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import data from './data/anims.json';
import { ClipLib } from './anim.js';
import { ROSTER } from './rig.js';
import { Fighter } from './fighter.js';
import { Arena, RING } from './arena.js';
import { FX } from './fx.js';
import { AIController, STYLES } from './ai.js';
import { PMKBody } from './pmkbody.js';
import { SweetScience, ERAS } from './sweetscience.js';
import { GUARDS, GUARD_ORDER, ROSTER_GUARD, activeGuard } from './guards.js';
import { SIGNATURES, sigBlocked } from './signature.js';
import { Corner } from './corner.js';
import * as BAL from './balance.js';
import { STRIKES, KEY_TO_STRIKE, sweepGlove, distPointSegment, pickStrike } from './combat.js';
import { RECIPES, RECIPE_ORDER, REACTIONS } from './gloves.js';
import { Pads, padFight, MenuNav, BTN } from './input.js';
import { analogFrame, newPadState } from './analog.js';
import { Referee } from './referee.js';
import { FORMS } from './fighter.js';
import { TRAITS, LEVELS, LOG_TYPES, loadProfile, saveProfile, level, nextAt, perks, awardFight, awardLog, ATTRS, attrsOf, awardAttrs } from './progress.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const UP = new THREE.Vector3(0, 1, 0);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

const CONDS = {
  normal: { name: 'PREHEATED SKILLET', heat: 0.42, moisture: 0.15, adhesion: 0.08, desc: 'Stable ring, moderate heat, predictable traction.' },
  steam:  { name: 'STEAM BATH', heat: 0.55, moisture: 0.85, adhesion: 0.10, desc: 'Turnbuckle vents roar. Chambers rehydrate; vision gets cloudy.' },
  glaze:  { name: 'GLAZE FLOOD', heat: 0.48, moisture: 0.30, adhesion: 0.72, desc: 'Amber caramel floods the canvas. Footwork sticks; power punches can slip.' },
  scorch: { name: 'SCORCH', heat: 0.94, moisture: 0.05, adhesion: 0.12, desc: 'Burner coils wake under the canvas. Stand on the heat and your gloves boil.' },
};

class Game {
  constructor() {
    this.data = data; this.lib = new ClipLib(data);
    this.quality = isTouch || /Mobi|Android/i.test(navigator.userAgent) ? { shadows: true, shadowSize: 1024, crowd: 260, particles: 500, bloom: false, pr: Math.min(1.5, devicePixelRatio) } : { shadows: true, shadowSize: 2048, crowd: 420, particles: 900, bloom: true, pr: Math.min(2, devicePixelRatio) };
    if (new URLSearchParams(location.search).has('lowfx')) Object.assign(this.quality, { bloom: false, shadows: false, crowd: 120, pr: 1 });
    this.time = 0; this.dt = 0; this.timeScale = 1; this.slow = 0; this.frozen = false; this.mode = 'menu';
    this.settings = Object.assign({ p0: 'savannah', p1: 'graham', diff: 'normal', rounds: 3, roundLen: 90, mode: 'quick', rules: 'sanctioned', weightClass: 'middle', padScheme: 'analog', stance: 'orthodox', era: 'modern' }, store.get('ngb_settings', {}));
    this.pads = new Pads(); this.nav = new MenuNav(this); this.profile = loadProfile(); this.rollState = {}; this.padActive = false; this.aps = {}; this.analogDriven = new Set();
    this.setupRender(); this.arena = new Arena(this.scene, this.quality); this.fx = new FX(this.scene, this.camera, this.quality);
    this.marks = store.get('ngb_ring_memory', []);
    this.keys = {}; this.camMode = 0; this.hudOn = true; this.hudMode = store.get('ngb_hud', 'min'); this.f = []; this.ctrl = [];
    this.loadout = store.get('ngb_loadout4', [['glaze', 'kernel', 'trail', 'caramel'], ['steam', 'burner', 'syrup', 'pressure']]); this.prep = [0.75, 0.75];
    this.bindInput(); this.buildMenu(); this.buildTouch(); this.applyHudMode();
    addEventListener('gamepadconnected', e => { const n = (e.gamepad && e.gamepad.id || 'Controller').replace(/\(.*?\)/g, '').trim(); this.toast(`CONTROLLER CONNECTED · ${n.slice(0, 40)}`); this.setPadMode(true); if (this.mode === 'menu') this.buildMenu(); });
    addEventListener('gamepaddisconnected', () => { this.toast('CONTROLLER DISCONNECTED'); });
    addEventListener('pointerdown', e => { if (e.pointerType === 'touch') this.setPadMode(false); }, true);
    this.camPos = new THREE.Vector3(0, 3, 6); this.camLook = new THREE.Vector3(0, 1.2, 0);
    this.showcase();
    this.last = performance.now(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  setupRender() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.quality.bloom, powerPreference: 'high-performance', preserveDrawingBuffer: /shot/.test(location.search) });
    r.setPixelRatio(this.quality.pr); r.setSize(innerWidth, innerHeight); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95; r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = this.quality.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
    $('stage').appendChild(r.domElement);
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r); this.scene.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture; this.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 120);
    if (this.quality.bloom) {
      this.composer = new EffectComposer(r); this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.45, 0.88); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    }
    addEventListener('resize', () => { r.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); if (this.composer) this.composer.setSize(innerWidth, innerHeight); });
  }

  // ---------------- match setup ----------------
  clearFighters() { for (const f of this.f) this.scene.remove(f.root); this.f = []; this.ctrl = []; }
  setupMatch(mode) {
    this.clearFighters(); this.mode = mode; const S = this.settings;
    const aId = mode === 'watch' || mode === 'versus' ? S.p0 : 'savannah', bId = mode === 'training' || mode === 'forge' ? 'graham' : S.p1;
    const A = new Fighter(this, ROSTER[aId], { x: 0, z: -0.75, yaw: 0, side: 0, id: 'A', loadout: this.loadout, prep: this.prep });
    const Bspec = ROSTER[bId] === ROSTER[aId] ? Object.assign({}, ROSTER[bId], { gloveL: 0x00e5ff, gloveR: 0x00e5ff, shorts: 0xff2f86, id: bId, name: ROSTER[bId].name + ' (MIRROR)' }) : ROSTER[bId];
    const B = new Fighter(this, Bspec, { x: 0, z: 0.75, yaw: Math.PI, side: 1, id: 'B', scale: bId === 'pop' ? 0.97 : bId === 'skillet' ? 1.03 : 1, loadout: aiLoadout(bId) });
    this.f = [A, B]; for (const f of this.f) this.scene.add(f.root);
    for (const f of this.f) if (f.spec.weightshift) { f.baseForm = S.rules === 'sanctioned' ? ({ light: -1, middle: 0, heavy: 1 })[S.weightClass] : 0; f.form = f.formK = f.baseForm; }
    if (mode !== 'watch') { A.stance = A.baseStance = S.stance || 'orthodox'; }
    if (this.corner) { this.corner.prevCounts = null; if (this.corner.active) this.corner.close('reset'); }
    A.guardStyle = mode === 'watch' ? ROSTER_GUARD[aId] || 'high' : S.guardStyle || 'high'; B.guardStyle = mode === 'versus' ? 'high' : ROSTER_GUARD[bId] || 'high';
    for (const f of this.f) f.attr = Object.assign({ power: 70, balance: 70, agility: 70, hands: 70, chin: 70, engine: 70 }, f.spec.attrs || {});
    if (aId === 'savannah' && mode !== 'watch') { A.attr = attrsOf(this.profile); A.trackXP = true; A.perks = perks(this.profile); A.gloves.forEach(g => g.prep = Math.min(1, g.prep + A.perks.prep)); }
    if (!this.ref) { this.ref = new Referee(this); } this.ref.reset(); if (!this.ref.root.parent) this.scene.add(this.ref.root); this.ref.root.visible = mode !== 'forge' && mode !== 'training';
    this.ctrl = [mode === 'watch' ? new AIController(this, A, ROSTER[aId].style, S.diff) : null,
      mode === 'forge' || mode === 'versus' ? null : new AIController(this, B, mode === 'training' ? 'dummy' : ROSTER[bId].style, S.diff)];
    this.round = 1; this.roundT = S.roundLen; this.scores = [[], []]; this.phase = 'intro'; this.phaseT = 0; this.count = null; this.result = null; this.frozen = true;
    this.bs = { res: 0, state: 'normal', t: 0, counts: { steam: 0, glaze: 0, scorch: 0 }, zones: [], spills: [], ventT: 0 };
    this.feedClear(); this.camMode = mode === 'watch' || mode === 'versus' ? 1 : 0;
    this.player = mode === 'watch' ? null : A; this.player2 = mode === 'versus' ? B : null; this.fightLogged = false; this.attrsLogged = false;
    $('hud').classList.remove('hidden'); ['btnPause', 'btnCam', 'btnHud', 'btnBody'].forEach(b => $(b).classList.remove('hidden'));
    $('touch').classList.toggle('hidden', !(isTouch && this.player)); document.body.classList.toggle('touchmode', !!(isTouch && this.player)); this.setPadMode(this.padActive);
    $('forgeUI').classList.toggle('hidden', mode !== 'forge'); $('chain').classList.toggle('hidden', mode !== 'forge');
    $('scape').classList.toggle('hidden', mode === 'forge'); $('gloves').classList.toggle('hidden', mode === 'forge');
    this.buildHUD();
    this.fx.audio.init();
    if (mode === 'forge') { this.phase = 'forge'; this.frozen = false; this.buildForge(); this.roundT = Infinity; B.pos.set(0, 0, 0.9); }
    else if (mode === 'training') { this.phase = 'fight'; this.frozen = false; this.roundT = Infinity; this.training = this.syncNext ? [] : this.pmk && this.pmk.state === 'live' ? bodySteps(this.pmk.tracker.feet.seen > 0.5) : this.settings.padScheme !== 'classic' && this.padActive ? analogSteps() : trainingSteps(); this.trainIdx = 0; if (this.syncNext) { this.syncNext = false; $('hint').classList.add('hidden'); this.announce('BODY SYNC', 'THE GAME LEARNS YOUR HANDS', 1.6); this.pmk.sync.begin(); } else { this.showHint(); this.announce('TRAINING CAMP', 'SPAR WITH GRAHAM — FOLLOW THE CUES'); } }
    else { this.announce(`${A.spec.short} vs ${B.spec.short}`, mode === 'watch' ? 'WATCH MODE — PRESS H TO HIDE THE HUD' : mode === 'versus' ? (this.pads.state.length ? 'LOCAL VERSUS' : 'P2: CONNECT A CONTROLLER') : (S.rules === 'exhibition' ? 'NGB EXHIBITION — WEIGHTSHIFT LIVE' : 'THE GLAZED RING')); }
    this.paused = false;
  }

  opponentOf(f) { return f === this.f[0] ? this.f[1] : this.f[0]; }
  ctrlOf(f) { return this.ctrl[this.f.indexOf(f)]; }
  inFightPhase() { return this.phase === 'fight' || this.phase === 'forge'; }
  // where a stick-thrown punch is going, in the thrower's own body frame (depth/height judged for you, line and timing are yours)
  analogAim(f, s, stick) {
    const o = this.opponentOf(f), d = s.def; const tgt = d.target === 'head' ? o.vol.head.a.clone() : o.vol.abdo.b.clone().lerp(o.vol.abdo.a, 0.45).add(f.dirWorld(new THREE.Vector3(s.sx > 0 ? 0.09 : -0.03, 0, 0)));
    if (d.path === 'upper' && d.target === 'head') tgt.y -= 0.07;
    const L = f.toLocal(tgt); const inFront = L.z > 0.3 && Math.abs(Math.atan2(L.x, L.z)) < 0.9;
    const aim = inFront ? L : new THREE.Vector3(0, d.target === 'head' ? f.vol.head.a.y - 0.02 : 1.05 * f.scale, 0.95);
    if (d.path === 'straight' || d.path === 'over') aim.x += -stick[0] * 0.14;
    return aim;
  }
  foulCheck(f, kind) {
    f.fouls = (f.fouls || 0) + 1; const immediate = kind === 'break';
    if (immediate || f.fouls % 4 === 0) {
      f.warnings = (f.warnings || 0) + 1;
      if (f.warnings >= 3) { f.warnings = 0; f.roundDeduct = (f.roundDeduct || 0) + 1; f.stats.deductions = (f.stats.deductions || 0) + 1; this.announce('ONE POINT!', `${f.spec.short} — ${kind === 'break' ? 'hitting on the break' : 'holding and hitting'}`, 1.6); }
      else this.announce(kind === 'break' ? 'ON THE BREAK!' : 'WATCH THE HOLDING!', `referee warning · ${f.spec.short}`, 1.1);
      f.stats.warnings = (f.stats.warnings || 0) + 1; this.fx.audio.tone(520, 0.12, 0.2, 'square'); this.fx.audio.tone(520, 0.12, 0.2, 'square', 0.16);
    }
  }
  isHuman(f) { return !!f && (f === this.player || f === this.player2); }
  setPadMode(on) { this.padActive = on; document.body.classList.toggle('padmode', on); document.body.classList.toggle('touchmode', !!(isTouch && this.player && this.f.length && !on)); }
  toast(t) { this.hitInfo(t, '#00e5ff', true); }
  // which pads drive which fighter
  padOwners(states) { const own = {}; if (!this.f.length) return own; if (this.mode === 'versus') { if (states.length >= 2) { own[states[0].index] = this.f[0]; own[states[1].index] = this.f[1]; } else if (states.length === 1) own[states[0].index] = this.f[1]; } else if (this.player) for (const st of states) own[st.index] = this.player; return own; }
  rumble(f, strong, weak, ms) { if (!this.isHuman(f)) return; const own = this.padOwners(this.pads.state); for (const k in own) if (own[k] === f) this.pads.rumble(+k, strong, weak, ms); }

  // ---------------- physics/environment hooks used by fighters ----------------
  strikeTarget(att, s) {
    const o = this.opponentOf(att); let p;
    if (s.def.target === 'head') { p = o.vol.head.a.clone(); if (s.def.path === 'upper') p.y -= 0.07; }
    else { p = o.vol.abdo.b.clone().lerp(o.vol.abdo.a, 0.45).add(att.dirWorld(new THREE.Vector3((s.sx > 0 ? 0.1 : -0.03), 0, 0))); }
    s.bias = new THREE.Vector3();
    if (att.aimBias) { s.bias.copy(att.aimBias); att.aimBias = null; }
    const c = this.ctrlOf(att); if (c) { const err = (1 - c.d.skill) * 0.09 + (att.obscured > 0 ? 0.08 : 0); s.bias.add(new THREE.Vector3((Math.random() - .5) * err, (Math.random() - .5) * err, 0)); }
    else if (att.obscured > 0) s.bias.add(new THREE.Vector3((Math.random() - .5) * 0.08, (Math.random() - .5) * 0.08, 0));
    return p.add(s.bias);
  }
  liveTarget(att, s) { const o = this.opponentOf(att); let p; if (s.def.target === 'head') { p = o.vol.head.a.clone(); if (s.def.path === 'upper') p.y -= 0.07; } else p = o.vol.abdo.b.clone().lerp(o.vol.abdo.a, 0.45).add(att.dirWorld(new THREE.Vector3((s.sx > 0 ? 0.1 : -0.03), 0, 0))); return p.add(s.bias || new THREE.Vector3()); }
  inZone(f) { for (const z of this.bs.zones) if (z.k > 0.3 && z.owner !== f && Math.hypot(f.pos.x - z.x, f.pos.z - z.z) < z.r * 0.85) return z; return null; }
  inSpill(f) { for (const s of this.bs.spills) if (Math.hypot(f.pos.x - s.x, f.pos.z - s.z) < s.r * 0.9) return s; return null; }
  gloveEnv(f) { const c = this.cond(); const z = this.inZone(f); return { ringHeat: c.heat * 80, zoneHeat: z ? (f.spec.id === 'skillet' ? 6 : 13) : 0, moistureMul: 1 + c.moisture * 2.5 }; }
  traction(f) { const c = this.cond(); let t = 1 - c.adhesion * 0.3; if (this.inSpill(f)) t *= f.spec.id === 'pop' ? 0.75 : 0.55; return t; }
  speedMul(f) { return this.inZone(f) && f.spec.id === 'skillet' ? 1.06 : 1; }
  powerMul(f) { let m = 1; if (this.inZone(f)) m *= f.spec.id === 'skillet' ? 1.22 : 1.04; if (this.bs.state === 'scorch') m *= 1.05; return m; }
  cond() { const st = CONDS[this.bs ? this.bs.state : 'normal']; return st; }

  // ---------------- events ----------------
  onEvent(f, type, d) {
    const who = f.spec.short; const isP = f === this.player;
    switch (type) {
      case 'throw': if (this.mode === 'training') this.trainCheck('strike', d.name); break;
      case 'miss': { this.fx.audio.punch(0, 'whiff'); const o = this.opponentOf(f); if (o && (Math.abs(o.weaveX) > 0.4 || o.roll || o.duckK > 0.4 || o.pullK > 0.4)) { o.focus = Math.min(100, o.focus + 5); o.stats.slips = (o.stats.slips || 0) + 1; o.xp('agility', 4); this.marker(o.vol.head.a, 'slip', 1); if (activeGuard(o) === 'peek') { o.counterWindow = Math.max(o.counterWindow || 0, 0.7); if (o === this.player) this.hitInfo('PEEK-A-BOO SLIP — COUNTER', '#00e5ff'); } } break; }
      case 'overextend': if (isP || this.mode === 'watch') this.feed(`${who} over-committed — off balance`, 'bad'); break;
      case 'gassed': if (isP) this.hitInfo('GASSED — let your stamina come back', '#58c8ff'); break;
      case 'roll': if (this.mode === 'training') this.trainCheck('roll', d); break;
      case 'recipeSel': if (isP) this.hitInfo(`${d.side === 'L' ? 'LEFT' : 'RIGHT'} GLOVE → ${d.recipe.name}`, d.recipe.color); break;
      case 'gloveSel': if (isP) this.hitInfo(`CONFIGURING ${d.side === 'L' ? 'LEFT' : 'RIGHT'} GLOVE`, '#ffb000'); break;
      case 'cookStart': this.fx.audio.sizzle(); break;
      case 'recipeOk': { const r = d.r; this.feed(`${who}: ${r.name} ${r.mode === 'prime' ? 'primed in the ' + (d.g.side === 'L' ? 'left' : 'right') + ' glove' : 'released'}`, 'cook'); this.addRes(6); if (r.id === 'steam') { this.bs.counts.steam += 2; this.fx.audio.hiss(1.2); } if (r.id === 'glaze' || r.id === 'caramel') this.bs.counts.glaze += 1; if (this.mode === 'training') this.trainCheck('recipe', r.id); this.fx.audio.ding(780); break; }
      case 'recipeFail': this.feed(`${who}: ${d.r.name} failed — ${d.why}`, 'bad'); this.fx.audio.noise(0.3, 400, 120, 1, 0.3); if (d.why.startsWith('scorched')) this.bs.counts.scorch += 2; break;
      case 'backfire': f.stamina -= 15; f.stagger = 0.4; f.gloves[d.hi].pressure = 0; f.gloves[d.hi].stability = Math.max(0, f.gloves[d.hi].stability - 20); this.fx.steamBurst(f.gloveNow[d.hi], 1); this.feed(`${who}: PRESSURE BACKFIRE — chamber vented in their own face`, 'bad'); this.fx.audio.hiss(0.6); break;
      case 'read': this.feed(d.text, 'read'); break;
      case 'weightshift': { const nm = d < 0 ? 'LIGHT' : d > 0 ? 'DENSE' : 'MIDDLE'; this.announce('WEIGHTSHIFT', `${who} → ${nm} FORM`, 1.2); this.feed(`${who} reshapes the recipe: ${nm.toLowerCase()} form`, 'cook'); this.fx.steamBurst(f.vol.chest.a, 0.8); this.fx.audio.tone(d < 0 ? 520 : 140, 0.35, 0.3, 'triangle', 0, d < 0 ? 900 : 80); this.addRes(5); if (this.mode === 'training') this.trainCheck('shift'); break; }
      case 'shiftCost': if (this.isHuman(f)) this.hitInfo('WEIGHTSHIFT needs 30 focus + 12 stamina', '#b98cff'); break;
      case 'shiftDenied': if (this.isHuman(f)) this.hitInfo(f.spec.weightshift ? 'WEIGHTSHIFT is exhibition-only (set RULES → EXHIBITION)' : `${who} has no Weightshift`, '#b98cff'); break;
      case 'pivot': { const r = d || {}; this.fx.audio.noise(0.08, r.clean ? 2600 : 1400, 900, 1, 0.12); if (this.mode === 'training' && r.ok) this.trainCheck('pivot');
        if (f === this.player && r.q != null) this.hitInfo(r.clean ? 'CLEAN PIVOT' : r.ok ? 'SLOPPY PIVOT' + (r.why[0] ? ' — ' + r.why[0] : '') : 'TANGLED UP' + (r.why[0] ? ' — ' + r.why[0] : ''), r.clean ? '#00e5ff' : r.ok ? '#ffb000' : '#ff2f86'); break; }
      case 'stumble': { this.fx.audio.noise(0.2, 500, 200, 1, 0.22); const r = d || {}; if (f === this.player) this.hitInfo('STUMBLE — ' + r.why, '#ff2f86'); else this.hitInfo(f.spec.short + ' STUMBLES — ' + r.why, '#8dff9a'); break; }
      case 'switchStart': { this.fx.audio.noise(0.1, 900, 400, 1, 0.12); break; }
      case 'switchDone': { const r = d || {}; if (f === this.player) this.hitInfo(r.clean ? 'CLEAN SWITCH' : r.ok ? 'SLOPPY SWITCH' + (r.why[0] ? ' — ' + r.why[0] : '') : 'TANGLED THE SWITCH', r.clean ? '#00e5ff' : r.ok ? '#ffb000' : '#ff2f86'); break; }
      case 'switchStance': { if (this.mode === 'training') this.trainCheck('switch'); this.fx.audio.noise(0.15, 800, 300, 1, 0.2); break; }
      case 'trapSprung': if (this.player) this.hitInfo('TRAP! They read your weave', '#ffb000'); break;
    }
  }
  addRes(n) { if (!this.bs || this.mode === 'forge') return; if (this.bs.state === 'normal') this.bs.res = Math.min(100, this.bs.res + n); }
  checkReactions(f, g, id) {
    const other = f.gloves[g.side === 'L' ? 1 : 0]; const active = new Set();
    if (other.primed) active.add(other.primed); for (const k in other.buffs) active.add(k); if (this.bs.state === 'scorch' || g.heat > 82) active.add('scorch');
    for (const r of REACTIONS) {
      if ((r.a === id && active.has(r.b)) || (r.b === id && active.has(r.a))) {
        f.stats.reactions++; this.addRes(12); this.announce(r.name.toUpperCase(), r.desc, 1.6); this.feed(`${f.spec.short}: REACTION — ${r.name}`, 'cook');
        if (r.name === 'Pressure Cooker') { f.gloves.forEach(gl => gl.pressure = Math.min(100, gl.pressure + 40)); }
        f.reaction = { name: r.name, t: 6 }; return;
      }
    }
  }

  // ---------------- combat resolution ----------------
  resolve(att) {
    const s = att.strike; if (!s || s.contact) return; const d = s.def; const def = this.opponentOf(att);
    if (def.state === 'down' || def.state === 'ko') return;
    if (s.body) { if (!s.live) return; } // camera strike: live only while your real hand drives outward
    else if (s.t < d.windup + (d.impact - d.windup) * 0.3 || s.t > d.impact + 0.09) return;
    const p0 = att.glovePrev[s.hi], p1 = att.gloveNow[s.hi];
    const hit = sweepGlove(p0, p1, 0.085, def.volList); if (!hit) return;
    const speed = s.body ? Math.max(s.camSpeed || 0, Math.min(4, p0.distanceTo(p1) / Math.max(1e-4, this.dt))) : p0.distanceTo(p1) / Math.max(1e-4, this.dt);
    if (s.analog && s.hold && s.t >= d.impact - 1e-3 && speed < 1.4) return; // a held-out glove is not a punch
    s.contact = hit; s.contactPos = att.gloveNow[s.hi].clone().lerp(p0, 1 - hit.u); s.t = Math.max(s.t, d.impact);
    const dir = p1.clone().sub(p0); dir.y *= 0.4; dir.normalize();
    const g = att.gloves[s.hi]; const primed = g.primed; if (primed) g.primed = null;
    let kind, part = hit.vol.part; const counter = def.strike && def.strike.t < def.strike.def.impact + 0.04 && !hit.vol.block;
    const exposed = def.strike && def.strike.analog && def.strike.hold && def.strike.t >= def.strike.def.impact - 1e-3;
    const bonusCounter = def.offBalance > 0 || att.counterWindow > 0 || exposed;
    const held = def.guardHigh > 0.45 || def.guardLow > 0.45 || (def.handGuardAmt && def.handGuardAmt[part.endsWith('L') ? 0 : 1] > 0.45) || def.gloves[part.endsWith('L') ? 0 : 1].buffs.roux;
    if (s.dirty || (att.clinch && !hit.vol.block)) {} 
    if (this.time - (this.lastBreakT || -9) < 0.7 && !hit.vol.block) this.foulCheck(att, 'break');
    if (hit.vol.block && !held) { // loose (resting) guard: partial block — some force gets through
      const region0 = d.target === 'head' ? 'head' : 'body';
      let dmg = d.power * clamp(speed / 8, 0.45, 1.15) * s.powerMul * 0.75;
      def.takeHit({ dmg, part: region0, dir, kind: 'glance', strike: s, attacker: att }); sigBlocked(this, att, def);
      const hi2 = part.endsWith('L') ? 0 : 1; def.armKick[hi2].kick(def.toLocal(def.pos.clone().add(dir)).multiplyScalar(dmg * 0.12));
      att.stats.landed++; att.stats.partial = (att.stats.partial || 0) + 1; att.stats.byStrike[s.name].l++; const real = dmg * 0.45; att.stats.dmgDealt += real; att.roundStats.landed += 0.5; att.roundStats.dmg += real;
      if (primed === 'glaze') this.applyGlaze(att, def); if (primed === 'caramel') { g.caramelSet = 3; this.fx.caramelSplash(hit.point); }
      this.fx.impact(hit.point, dir, 'block', def.spec, dmg); this.fx.audio.punch(dmg * 0.6, 'glance'); this.marker(hit.point, 'partial', dmg / 6);
      if (att === this.player) this.hitInfo('PARTIAL BLOCK', '#a99cc0');
      this.addRes(1.5); if (this.mode === 'forge') this.forgeHit = { kind: 'partial block', speed, part: region0, dmg: real };
      this.checkKnockdown(def, region0, real, s); return;
    }
    if (hit.vol.block) {
      kind = 'block'; const parry = this.time - def.guardPressedAt < 0.2 && def.guardHeld;
      const roux = def.gloves[part.endsWith('L') ? 0 : 1].buffs.roux;
      let dmg = d.power * clamp(speed / 8, 0.45, 1.15) * s.powerMul; if (att.reaction && att.reaction.name === 'Flash Sear' && primed === 'pressure') dmg *= 1.5;
      def.takeHit({ dmg, part, dir, kind, chip: roux ? 0 : dmg * (def.guardHeld ? 0.06 : 0.14), strike: s }); sigBlocked(this, att, def);
      att.armKick[s.hi].kick(att.toLocal(att.pos.clone().sub(dir)).multiplyScalar(dmg * 0.09));
      att.stats.blocked++; def.gloves[part.endsWith('L') ? 0 : 1].pressure = Math.min(100, def.gloves[part.endsWith('L') ? 0 : 1].pressure + 3);
      this.fx.impact(hit.point, dir, 'block', def.spec, dmg); this.fx.audio.punch(dmg, 'block'); this.marker(hit.point, parry ? 'parry' : 'block', dmg / 6);
      def.focus = Math.min(100, def.focus + 2); this.rumble(def, 0.15, 0.35, 70); this.rumble(att, 0.1, 0.25, 50);
      if (parry) { def.stats.parries = (def.stats.parries || 0) + 1; def.focus = Math.min(100, def.focus + 10); att.offBalance = 0.42; def.counterWindow = 0.7; this.hitInfo(def === this.player ? 'PARRY! Counter now' : 'PARRIED', '#00e5ff'); this.addRes(4); }
      if (roux && def.reaction && def.reaction.name === 'Caramel Roux Wall') { att.coatT = 4; this.feed(`${att.spec.short}'s glove came away coated in caramel roux`, 'cook'); }
      if (primed === 'glaze' || (att.reaction && att.reaction.name === 'Mocha Lacquer' && primed)) this.applyGlaze(att, def);
      if (primed === 'caramel') { g.caramelSet = 3; this.fx.caramelSplash(hit.point); }
      this.addRes(1); if (this.mode === 'training' && def === this.player) this.trainCheck('block');
      return;
    }
    const region = part === 'head' ? 'head' : 'body';
    if (d.target === 'body' && region === 'head') part = 'head';
    const center = hit.vol.b ? closestOnSeg(hit.point, hit.vol.a, hit.vol.b) : hit.vol.a; const align = dir.dot(center.clone().sub(hit.point).normalize());
    kind = speed > 2.4 && (align > 0.25 || hit.pen > 0.06) ? 'clean' : 'glance';
    let chain = 1;
    if (s.analog) { // ground → hips → trunk → glove: how much body was behind it
      const tw = Math.sign(d.twist || 1); const hr = clamp(att.hipYawRate * tw / 7, 0, 1); const planted = att.footSys ? att.footSys.every(x => !x.step) : true;
      const fwdV = clamp(att.vel.dot(dir.clone().setY(0).normalize()), 0, 1); const rear = att.stance === 'southpaw' ? 0 : 1; const wide = clamp(-(att.footOffset ? att.footOffset[rear] : 0) / 0.2, 0, 1);
      chain = 0.74 + 0.26 * hr + (planted ? 0.1 : -0.06) + fwdV * 0.1 + wide * 0.05 - Math.abs(att.weaveX) * 0.07 - (att.offBalance > 0 ? 0.15 : 0); s.chain = chain;
    }
    let dmg = chain * d.power * clamp(speed / 8, 0.5, 1.15) * s.powerMul * (counter ? 1.35 : 1) * (bonusCounter ? 1.25 : 1) * (def.daze > 60 ? 1.15 : 1);
    dmg = this.ss.modifyHit(att, def, { dmg, part: region, kind, strike: s }); // sweet science: rolling, pull-counters, closing speed, blind side, broken hands, era
    if (att.reaction && att.reaction.name === 'Brittle Caramel' && primed === 'caramel') { dmg *= 1.6; this.fx.caramelSplash(hit.point); this.feed('Caramel fractured — brittle impact!', 'cook'); }
    if (primed === 'pressure' && s.reachBonus > 0) { this.feed(`${att.spec.short}: NOODLE SNAP connects`, 'cook'); this.fx.audio.tone(140, 0.2, 0.4, 'sawtooth', 0, 60); }
    if (att.perks && (counter || bonusCounter)) dmg *= att.perks.counter;
    def.takeHit({ dmg, part: region, dir, kind, strike: s, counter: counter || bonusCounter, attacker: att });
    att.focus = Math.min(100, att.focus + (kind === 'clean' ? 4 : 1.5) + (counter || bonusCounter ? 5 : 0)); const rk = Math.min(1, dmg / 8); this.rumble(def, 0.5 + rk * 0.5, 0.4 + rk * 0.4, 120 + rk * 120); this.rumble(att, 0.15, 0.3, 60);
    att.stats.landed++; att.stats.byStrike[s.name].l++; if (kind === 'clean') att.stats.clean++; if (counter || bonusCounter) att.stats.counters++; att.stats[region === 'head' ? 'headLanded' : 'bodyLanded']++;
    const real = dmg * (kind === 'glance' ? 0.45 : 1); att.stats.dmgDealt += real; att.roundStats.landed++; att.roundStats.dmg += real;
    this.ss.afterHit(att, def, { kind, strike: s }, region, real); // cuts, swelling, liver, plexus, hands, doctor
    g.pressure = Math.min(100, g.pressure + 6);
    if (primed === 'glaze') this.applyGlaze(att, def);
    if (primed === 'caramel') { g.caramelSet = 3; if (region === 'body') this.spawnSpill(def.pos.x, def.pos.z, 0.55); this.fx.caramelSplash(hit.point); this.bs.counts.glaze += 2; }
    this.fx.impact(hit.point, dir, counter || bonusCounter ? 'counter' : kind, def.spec, real); this.fx.audio.punch(real, counter || bonusCounter ? 'counter' : kind);
    this.marker(hit.point, s.heavy && kind === 'clean' ? 'heavy' : counter || bonusCounter ? 'counter' : kind === 'glance' ? 'glance' : region === 'body' ? 'body' : 'clean', real / 5);
    if (kind === 'clean') { att.xp('power', s.heavy ? 5 : 0.5); if (this.time - (att.lastLandT || -9) < 0.75) att.xp('hands', 2); att.lastLandT = this.time; }
    if (primed === 'kernel') { const cannon = att.reaction && att.reaction.name === 'Popcorn Cannon'; def.vel.addScaledVector(dir.clone().setY(0).normalize(), cannon ? 3.4 : 1.8); def.stunT += 0.7; this.fx.popBurst && this.fx.popBurst(hit.point); this.fx.audio.tone(900, 0.08, 0.3, 'square'); }
    this.addRes(kind === 'clean' ? (counter ? 9 : 4) : 1.5); this.arena.hype = Math.min(1, this.arena.hype + real * 0.03);
    if (counter || bonusCounter) { if (real > 10) this.slowmo(0.35, 0.35); } else if (s.heavy && kind === 'clean' && real > 8) this.slowmo(0.18, 0.4);
    if (this.mode === 'training' && att === this.player) this.trainCheck('land', { name: s.name, kind, speed });
    if (this.mode === 'forge') this.forgeHit = { kind, speed, part: region, dmg: real, chain: s.chain };
    this.checkKnockdown(def, region, real, s);
  }
  applyGlaze(att, def) { const ss = att.reaction && att.reaction.name === 'Steam-Set Glaze' ? 2 : 1; def.coatT = 5 * ss; this.feed(`${def.spec.short}'s guard is glazed — hands sticky for ${5 * ss}s`, 'cook'); this.bs.counts.glaze += 2; this.fx.caramelSplash(def.gloveNow[0]); }
  spawnSpill(x, z, r) { const lim = RING - 0.3; this.bs.spills.push({ x: clamp(x, -lim, lim), z: clamp(z, -lim, lim), r, seed: Math.random() * 10, life: 26 }); if (this.bs.spills.length > 10) this.bs.spills.shift(); }
  checkKnockdown(def, region, dmg, s, force) {
    if (this.mode === 'forge' || this.mode === 'training' || def.state !== 'idle' && def.state !== 'strike') return;
    let kd = force || null; // force: a delayed liver shot folds you to a knee whatever the numbers say
    const headKD = () => { const fwdMo = def.vel.dot(def.forward); const lunging = this.time - (def.lastStrikeT || -9) < 0.45; return (fwdMo > 0.2 || lunging || (s.def.path === 'hook' && Math.random() < 0.35)) ? 'forward' : 'fall'; };
    if (def.health <= 0) kd = region === 'body' ? 'kneel' : headKD();
    else if (region === 'head' && def.daze >= 100 && (def.health < 65 || dmg > 7)) kd = headKD();
    else if (region === 'body' && def.stamina < 6 && def.bodyDmg > 45 && dmg > 7) kd = 'kneel';
    if (!kd) return;
    def.health = Math.max(0, def.health); def.knockDown(kd); def.daze = 45;
    const att = this.opponentOf(def); att.roundStats.kd++;
    this.slowmo(0.9, 0.25); this.fx.audio.thud(); this.fx.audio.crowdSwell(1); this.arena.hype = 1;
    this.announce(kd === 'kneel' ? 'DOWN!' : kd === 'forward' ? 'FACE-FIRST!' : 'KNOCKDOWN!', kd === 'kneel' ? 'body-shot collapse' : kd === 'forward' ? 'caught coming in · ' + s.def.label.toUpperCase() : s.def.label.toUpperCase()); this.rumble(def, 1, 1, 450); this.rumble(att, 0.4, 0.6, 200);
    this.count = { f: def, t: -1.2, n: 0, rise: 0, mash: 0, decided: false };
    if (def.roundKD >= 3) { this.count.tko = true; }
    const c = this.ctrlOf(def);
    if (!this.isHuman(def)) { const p = clamp(0.62 + def.health / 120 - (def.knockdowns - 1) * 0.24 + (kd === 'kneel' ? 0.1 : 0) - (this.settings.diff === 'easy' && c ? 0.15 : 0), 0.04, 0.95); this.count.aiRise = Math.random() < p && !this.count.tko ? 3 + Math.floor(Math.random() * 5) : 99; }
    if (def.health <= 0 && def.knockdowns >= 3) this.count.aiRise = 99;
    this.phase = 'down'; this.frozen = false;
  }

  // ---------------- main update ----------------
  update(dt) {
    this.dt = dt; this.time += dt;
    const [A, B] = this.f; if (!A) return;
    // controllers
    if (this.phase === 'fight' || this.phase === 'forge') {
      this.humanInput(dt);
      if (this.pmk.active || (this.player && this.player.camBody)) this.pmk.apply(dt);
      this.ctrl.forEach((c, i) => { if (c) c.update(dt); });
    } else { for (const f of this.f) { if (f.state !== 'down') { f.intent.move.set(0, 0); f.intent.weave = 0; f.setGuard(null); } } }
    if (this.phase === 'down') this.neutralCorner(dt);
    if (this.phase === 'intro' || this.phase === 'break' || this.phase === 'end') this.frozen = true; else this.frozen = false;
    if (this.phase === 'fight') this.updateClinch(dt); else if (this.f.some(f => f.clinch)) this.breakClinch(false);
    for (const f of this.f) f.update(dt);
    for (const f of this.f) f.postUpdate(dt);
    if (this.ref && this.ref.root.visible) this.ref.update(dt);
    // separation & ropes
    const d = new THREE.Vector3().subVectors(B.pos, A.pos); d.y = 0; const dist = d.length(); const minD = 0.6;
    if (dist < minD && A.state !== 'down' && B.state !== 'down' && !A.clinch) { d.normalize(); const push = (minD - dist) / 2; A.pos.addScaledVector(d, -push); B.pos.addScaledVector(d, push); }
    for (const f of this.f) { const lim = RING - 0.32; for (const k of ['x', 'z']) if (Math.abs(f.pos[k]) > lim) { f.pos[k] = Math.sign(f.pos[k]) * lim; f.vel[k] *= -0.3; } }
    if (this.phase === 'fight' || this.phase === 'forge') { this.resolve(A); this.resolve(B); }
    this.updateScape(dt); this.ss.update(dt);
    this.updateRules(dt);
    // glove fx
    for (const f of this.f) this.gloveFX(f, dt);
    this.fx.update(dt);
  }
  gloveFX(f, dt) {
    for (let hi = 0; hi < 2; hi++) {
      const g = f.gloves[hi]; const m = f.mesh.mats[hi === 0 ? 'gloveL' : 'gloveR']; const base = new THREE.Color(f.spec[hi === 0 ? 'gloveL' : 'gloveR']);
      const hot = clamp((g.heat - 55) / 45, 0, 1);
      const em = g.primed ? new THREE.Color(RECIPES[g.primed].color) : base.clone().lerp(new THREE.Color(0xff3a10), hot);
      m.emissive.copy(em); m.emissiveIntensity = 0.06 + hot * 0.5 + (g.primed ? 0.45 + 0.35 * Math.sin(this.time * 10) : 0) + g.flash;
      m.color.copy(base).lerp(new THREE.Color(0xd2691e), f.coatT > 0 ? 0.7 : 0).lerp(new THREE.Color(0x8a4a1a), g.caramelSet > 0 ? 0.35 : 0);
      if (g.cooking || g.primed) { if (Math.random() < dt * 30) this.fx.bubbles(f.gloveNow[hi], g.primed ? RECIPES[g.primed].color : 0xffffff); }
      if (g.moisture > 60 && g.heat > 60 && Math.random() < dt * 4) this.fx.puff(f.gloveNow[hi], new THREE.Vector3(0, 0.4, 0), 0xffffff, 0.08, 0.8, { a: 0.25 });
      if (f.strike && f.strike.heavy && f.strike.hi === hi && f.strike.t < f.strike.def.impact) { m.emissive.setHex(0xff3a10); m.emissiveIntensity = 0.6 + 0.8 * Math.min(1, f.strike.t / f.strike.def.windup); }
      if (f.strike && f.strike.hi === hi && f.strike.t > f.strike.def.windup && f.strike.t < f.strike.def.impact + 0.05) this.fx.trail(hi, f, f.glovePrev[hi], f.gloveNow[hi], g.primed ? RECIPES[g.primed].color : (hi === 0 ? f.spec.gloveL : f.spec.gloveR));
    }
    if (f.spec.id === 'skillet' && Math.random() < dt * (this.inZone(f) ? 14 : 2)) this.fx.ember(f.vol.chest.a.clone().add(new THREE.Vector3((Math.random() - .5) * .3, (Math.random() - .3) * .5, (Math.random() - .5) * .3)));
    const sk = f.mesh.mats.skin; if (!f.spec.skinKind || f.spec.skinKind !== 'iron') { sk.emissive.setHex(0xff2050); sk.emissiveIntensity = f.flashT > 0 ? f.flashT * 1.8 : 0; }
    const acc = f.mesh.mats.accent; acc.emissiveIntensity = 0.9 + Math.max(f.gloves[0].heat, f.gloves[1].heat) / 100;
    if (f.spec.skinKind === 'iron') f.mesh.mats.skin.emissiveIntensity = 0.45 + (this.inZone(f) ? 0.8 : 0) + 0.15 * Math.sin(this.time * 3);
  }
  // ---------------- clinch ----------------
  updateClinch(dt) {
    const [A, B] = this.f;
    for (const f of this.f) {
      const o = this.opponentOf(f);
      if (f.intent.clinch && !(f.clinchCD > 0) && !f.clinch && !o.clinch && f.canAct && !f.strike && f.state === 'idle' && (o.state === 'idle' || o.state === 'strike') && f.pos.distanceTo(o.pos) < 0.98 && f.stamina > 4) {
        f.clinch = { other: o, role: 'holder', t: 0 }; o.clinch = { other: f, role: 'held', t: 0 }; o.strike = null; o.state = 'idle'; o.queued = null; o.escape = 0; f.stamina -= 3;
        this.fx.audio.noise(0.25, 500, 200, 0.8, 0.25); this.rumble(f, 0.3, 0.5, 120); this.rumble(o, 0.3, 0.5, 120); this.stats_clinch = (this.stats_clinch || 0) + 1; f.stats.clinches = (f.stats.clinches || 0) + 1;
        if (this.mode === 'training') this.trainCheck('clinch');
      }
    }
    const H = this.f.find(f => f.clinch && f.clinch.role === 'holder'); if (!H) return;
    const O = H.clinch.other; H.clinch.t += dt; O.clinch.t += dt;
    // held fighter fights out by pulling away (left stick back)
    const back = Math.max(0, -O.intent.move.y) + Math.abs(O.intent.move.x) * 0.4; O.escape += dt * back * (0.6 + O.stamina / 120);
    if (!H.intent.clinch && H.clinch.t > 0.25 || H.clinch.t > 3.2 || O.escape > 0.55 || H.state !== 'idle' || O.state === 'down') { this.breakClinch(H.clinch.t > 3.2); return; }
    const mid = H.pos.clone().lerp(O.pos, 0.5); const dir = O.pos.clone().sub(H.pos).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
    const k = 1 - Math.exp(-8 * dt); H.pos.lerp(mid.clone().addScaledVector(dir, -0.27), k); O.pos.lerp(mid.clone().addScaledVector(dir, 0.27), k); H.vel.set(0, 0, 0); O.vel.set(0, 0, 0);
  }
  breakClinch(byRef) {
    const H = this.f.find(f => f.clinch && f.clinch.role === 'holder'); for (const f of this.f) { f.clinch = null; f.clinchCD = 1.4; } if (!H) return;
    const [A, B] = this.f; const d = B.pos.clone().sub(A.pos).setY(0).normalize(); A.vel.addScaledVector(d, -1.3); B.vel.addScaledVector(d, 1.3);
    if (byRef) { this.lastBreakT = this.time; this.announce('BREAK!', '', 0.8); this.fx.audio.tone(520, 0.15, 0.2, 'square'); }
  }
  addBurner(x, z, owner) {
    const lim = 2.2; this.bs.zones.push({ x: clamp(x, -lim, lim), z: clamp(z, -lim, lim), r: 0.75, k: 0, vx: 0, vz: 0, life: 6, owner });
    this.fx.audio.thud(); this.addRes(6); this.bs.counts.scorch += 2;
    if (owner.reaction && owner.reaction.name === 'Scorched Sugar') this.spawnSpill(x, z, 0.55);
  }
  onFootstep(f, p, spd) { if (spd > 0.6 && Math.random() < 0.5) this.fx.puff(p.clone().setY(0.03), new THREE.Vector3((Math.random() - .5) * .3, 0.2, (Math.random() - .5) * .3), 0xcfd8e0, 0.06, 0.45, { a: 0.18, grow: 1.4 }); if (this.inSpill(f) && Math.random() < 0.6) this.fx.caramelSplash(p.clone().setY(0.05)); }
  // screen-space hit markers (no words)
  marker(pos, kind, k = 1) {
    if (!this.f.length) return; const v = pos.clone().project(this.camera); if (v.z > 1) return;
    const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight; const el = document.createElement('div'); el.className = 'mk ' + kind;
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--s', (0.65 + Math.min(1.4, k) * 0.55).toFixed(2));
    el.innerHTML = MARKER_SVG[kind] || MARKER_SVG.clean; $('markers').appendChild(el); setTimeout(() => el.remove(), 650);
    while ($('markers').children.length > 14) $('markers').firstChild.remove();
  }
  neutralCorner(dt) {
    const c = this.count; if (!c) return; const up = this.opponentOf(c.f);
    const corner = new THREE.Vector3(-Math.sign(c.f.pos.x || 1) * (RING - 0.6), 0, -Math.sign(c.f.pos.z || 1) * (RING - 0.6));
    const to = up.toLocal(corner); const l = Math.hypot(to.x, to.z);
    up.intent.move.set(l > 0.3 ? clamp(to.x / l, -1, 1) * 0.7 : 0, l > 0.3 ? clamp(to.z / l, -1, 1) * 0.7 : 0); up.intent.weave = 0; up.setGuard(null);
  }
  updateRules(dt) {
    this.phaseT += dt;
    const [A, B] = this.f;
    if (this.phase === 'intro' && this.phaseT > 2.6) { this.phase = 'fight'; this.phaseT = 0; this.fx.audio.bell(1); this.announce(`ROUND ${this.round}`, 'BOX!', 1.2); }
    if (this.phase === 'fight' && this.mode !== 'training' && this.mode !== 'forge') {
      this.roundT -= dt;
      if (this.roundT <= 0) this.endRound();
    }
    if (this.phase === 'down') this.updateCount(dt);
    if (this.phase === 'break' && this.phaseT > 5.5 && !this.ss.cornerOpen) { this.round++; this.roundT = this.settings.roundLen; this.phase = 'intro'; this.phaseT = 1.2; for (const f of this.f) f.roundKD = 0; }
    if (this.mode === 'training' && this.f[1].health < 40) { this.f[1].health = 100; this.f[1].daze = 0; }
    if (this.mode === 'training' || this.mode === 'forge') { A.health = Math.max(A.health, 60); }
  }
  updateCount(dt) {
    const c = this.count; c.t += dt; const f = c.f;
    const n = Math.max(0, Math.floor(c.t));
    if (n !== c.n && n >= 1) { c.n = n; this.fx.audio.tone(320, 0.12, 0.25, 'square'); }
    if (c.t > 1.6 && f.downInfo && f.downInfo.kind === 'fall' && !c.lay) { c.lay = true; }
    const isPlayer = this.isHuman(f);
    if (isPlayer) { c.mash = Math.max(0, c.mash - dt * 0.35 * (1 + f.knockdowns * 0.3)); }
    const rising = f.downInfo && f.downInfo.rising;
    if (!rising && !c.tko) {
      const canRiseHuman = isPlayer && c.mash >= 1 && n >= 2 && f.health > -20;
      const canRiseAI = !isPlayer && n >= c.aiRise;
      if (canRiseHuman || canRiseAI) {
        f.health = Math.max(f.health, 22 - f.knockdowns * 4); f.daze = 35; f.stamina = Math.max(f.stamina, 45);
        f.rise(() => { this.phase = 'fight'; this.count = null; this.announce('BOX!', `${f.spec.short} beat the count`, 1.0); this.fx.audio.bell(1); });
      }
    }
    if (!rising && (n >= 10 || (c.tko && n >= 3))) { this.finish(this.opponentOf(f), c.tko ? 'TKO' : 'KO'); }
    $('count').classList.toggle('hidden', this.phase !== 'down' || n < 1 || rising);
    $('count').innerHTML = `${Math.min(n, 10)}<small>${isPlayer ? (this.padActive ? 'MASH X · Y · A · B TO RISE' : 'TAP ANY PUNCH KEY TO RISE') : 'REFEREE COUNT'}</small>${isPlayer ? `<div id="riseMeter"><i style="width:${Math.min(100, c.mash * 100)}%"></i></div>` : ''}`;
  }
  endRound() {
    const [A, B] = this.f; this.fx.audio.bell(2);
    // 10-point must
    const sa = A.roundStats.dmg + A.roundStats.landed * 0.3, sb = B.roundStats.dmg + B.roundStats.landed * 0.3;
    let ra = 10, rb = 10; if (sa > sb * 1.05) rb = 9; else if (sb > sa * 1.05) ra = 9; ra -= B.roundStats.kd; rb -= A.roundStats.kd; ra -= A.roundDeduct || 0; rb -= B.roundDeduct || 0; A.roundDeduct = 0; B.roundDeduct = 0; this.scores[0].push(ra); this.scores[1].push(rb);
    for (const f of this.f) { f.roundStats = { landed: 0, dmg: 0, kd: 0 }; f.xp('engine', 8 + f.stats.thrown * 0.05); }
    if (this.round >= this.settings.rounds) { const ta = this.scores[0].reduce((a, b) => a + b, 0), tb = this.scores[1].reduce((a, b) => a + b, 0); this.finish(ta > tb ? A : tb > ta ? B : null, 'DECISION', `${ta}–${tb}`); return; }
    this.ss.roundEnded(this.round, [this.scores[0].reduce((a, b) => a + b, 0), this.scores[1].reduce((a, b) => a + b, 0)]);
    this.phase = 'break'; this.phaseT = 0; this.announce(`END OF ROUND ${this.round}`, `Judges: ${ra}–${rb} · corners work the gloves`, 3);
    for (const f of this.f) { f.health = Math.min(100, f.health + 10); f.stamina = 100; f.daze = 0; f.bodyDmg *= 0.75; f.gloves.forEach(g => { g.heat = 40; g.moisture = Math.max(g.moisture, 50); g.stability = Math.max(g.stability, 70); }); f.pos.set(0, 0, f === A ? -0.9 : 0.9); f.vel.set(0, 0, 0); f.strike = null; f.state = 'idle'; f.coatT = 0; }
  }
  finish(winner, how, extra = '') {
    if (this.phase === 'end') return; this.phase = 'end'; this.phaseT = 0; this.result = { winner, how, extra };
    this.fx.audio.bell(3); this.fx.audio.crowdSwell(1);
    if (winner) { winner.winning = true; winner.strike = null; winner.setGuard(null); winner.playAction('celebrate', { w: 0.7, fadeIn: 0.6, hold: true, start: 0.2 }); }
    const loser = winner ? this.opponentOf(winner) : null;
    this.announce(winner ? `${winner.spec.short.toUpperCase()} WINS` : 'DRAW', `${how}${extra ? ' · ' + extra : ''}`, 4);
    if (this.bs.state === 'scorch' || this.bs.counts.scorch > 3) { this.marks.push({ x: (Math.random() - .5) * 4, z: (Math.random() - .5) * 4, r: 0.25 + Math.random() * 0.3 }); }
    if (loser && loser.downInfo) this.marks.push({ x: loser.pos.x, z: loser.pos.z, r: 0.2 });
    this.marks = this.marks.slice(-12); store.set('ngb_ring_memory', this.marks);
    setTimeout(() => this.showReport(), 4200);
  }

  // ---------------- BrawlScape ----------------
  updateScape(dt) {
    const bs = this.bs; if (!bs) return; const ar = this.arena;
    if (this.phase === 'fight') {
      if (bs.state === 'normal' && bs.res >= 100) {
        const c = bs.counts; let st = 'scorch'; const avgHeat = this.f.reduce((a, f) => a + f.gloves[0].heat + f.gloves[1].heat, 0) / 4;
        if (c.steam > c.glaze && c.steam > c.scorch + (avgHeat > 60 ? 3 : 0)) st = 'steam'; else if (c.glaze > c.scorch + (avgHeat > 60 ? 3 : 0)) st = 'glaze'; else st = 'scorch';
        if (this.f.some(f => f.spec.id === 'skillet') && Math.random() < 0.35) st = 'scorch';
        bs.state = st; bs.t = 0; bs.dur = 24; this.announce('BRAWLSCAPE AWAKENED', CONDS[st].name + ' — ' + CONDS[st].desc, 2.6); this.fx.audio.thud(); this.arena.hype = 1;
        if (st === 'scorch') { bs.zones = [0, 1, 2].map(i => ({ x: (Math.random() - .5) * 3.6, z: (Math.random() - .5) * 3.6, r: 0.8 + Math.random() * 0.35, k: 0, vx: (Math.random() - .5) * 0.3, vz: (Math.random() - .5) * 0.3 })); this.bs.counts.scorch++; }
        if (st === 'glaze') { for (let i = 0; i < 3; i++) this.spawnSpill((Math.random() - .5) * 4.2, (Math.random() - .5) * 4.2, 0.45 + Math.random() * 0.35); }
        this.feed(`BrawlScape: ${CONDS[st].name}`, 'read');
      }
      if (bs.state !== 'normal') {
        bs.t += dt; bs.res = Math.max(0, 100 * (1 - bs.t / bs.dur));
        if (bs.state === 'steam') { bs.ventT -= dt; if (bs.ventT <= 0) { bs.ventT = 0.12; for (const v of ar.vents) if (Math.random() < 0.6) this.fx.vent(v); } }
        if (bs.state === 'glaze' && Math.random() < dt * 0.25) this.spawnSpill((Math.random() - .5) * 4.2, (Math.random() - .5) * 4.2, 0.4 + Math.random() * 0.3);
        if (bs.t >= bs.dur) { bs.state = 'normal'; bs.res = 0; bs.counts = { steam: 0, glaze: 0, scorch: 0 }; this.feed('BrawlScape settles back to a preheated skillet', 'read'); }
      }
    }
    for (const z of bs.zones) { if (z.life != null) z.life -= dt; const want = bs.state === 'scorch' || (z.life != null && z.life > 0) ? 1 : 0; z.k += (want - z.k) * Math.min(1, dt * 0.8); z.x = clamp(z.x + z.vx * dt, -2, 2); z.z = clamp(z.z + z.vz * dt, -2, 2); if (Math.abs(z.x) >= 2) z.vx *= -1; if (Math.abs(z.z) >= 2) z.vz *= -1; }
    bs.zones = bs.zones.filter(z => z.k > 0.01 || bs.state === 'scorch' || (z.life != null && z.life > 0)); if (bs.zones.length > 4) bs.zones.shift();
    for (const s of bs.spills) s.life -= dt; bs.spills = bs.spills.filter(s => s.life > 0); for (const s of bs.spills) if (s.life < 3) s.r *= (1 - dt * 0.6);
    // fighters on heat zones
    if (this.phase === 'fight') for (const f of this.f) { const z = this.inZone(f); if (z && f.spec.id !== 'skillet') { f.stamina -= dt * 1.4; } if (z && Math.random() < dt * 3) this.fx.ember(f.pos.clone().add(new THREE.Vector3((Math.random() - .5) * .4, 0.05, (Math.random() - .5) * .4))); }
    const st = bs.state; const k = st === 'normal' ? 0 : Math.min(1, bs.t / 1.5) * Math.min(1, (bs.dur - bs.t) / 2);
    ar.update(dt, { glaze: st === 'glaze' ? k : 0, steam: st === 'steam' ? k : 0, scorch: st === 'scorch' ? k * 0.8 : 0, trail: 0.25 + bs.res / 100 * 0.6 + (st !== 'normal' ? 0.5 : 0), zones: bs.zones, spills: bs.spills, marks: this.marks, hype: this.arena.hype * 0.98 });
    this.arena.hype *= Math.exp(-dt * 0.15);
  }

  // ---------------- input ----------------
  bindInput() {
    const codeKey = e => { const c = e.code; if (/^Numpad\d$/.test(c)) return c.slice(6); if (/^Digit\d$/.test(c)) return c.slice(5); if (c === 'NumpadDecimal' || c === 'Period') return '.'; if (c === 'NumpadAdd' || c === 'Equal') return '+'; if (c === 'NumpadSubtract' || c === 'Minus') return '-'; if (c.startsWith('Key')) return c.slice(3).toLowerCase(); if (c.startsWith('Arrow')) return c.slice(5).toLowerCase(); return e.key.toLowerCase(); };
    addEventListener('keydown', e => {
      const k = codeKey(e); if (e.repeat) return; this.fx.audio.init(); this.setPadMode(false);
      if (k === 'escape' || k === 'p') { if (this.f.length && this.mode !== 'menu') this.togglePause(); else this.nav.back(); return; }
      if (k === 'h') { this.toggleHUD(); return; }
      if (k === 'c') { this.cycleCam(); return; }
      if (k === 'm') { this.fx.audio.on = !this.fx.audio.on; return; }
      if (k === ' ' && this.prepActive) { this.prepLock(); e.preventDefault(); return; }
      if (k === ' ') { this.keys[' '] = true; e.preventDefault(); return; }
      if (!this.inFight() && ['up', 'down', 'left', 'right'].includes(k)) { this.nav.move(k); e.preventDefault(); return; }
      if (!this.inFight() && k === 'enter' && this.nav.el) { this.nav.activate(); e.preventDefault(); return; }
      this.press(k, e.shiftKey); if (/^[0-9.qweasdzx+-]$/.test(k)) e.preventDefault();
    });
    addEventListener('keyup', e => { const k = codeKey(e); this.release(k); });
    addEventListener('blur', () => { this.keys = {}; });
    this.ss = new SweetScience(this); this.corner = new Corner(this); this.pmk = new PMKBody(this); this.pmk.bindUI(); this.menuPmk = () => { if (this.mode === 'menu' && !$('menu').classList.contains('hidden')) this.buildMenu(); }; $('btnBody').onclick = () => this.pmk.showPanel(true);
    $('btnPause').onclick = () => this.togglePause(); $('btnCam').onclick = () => this.cycleCam(); $('btnHud').onclick = () => this.toggleHUD();
  }
  inFight() { return this.f.length > 0 && !this.paused && $('report').classList.contains('hidden'); }
  cycleCam() { this.camMode = (this.camMode + 1) % 3; this.toast(['FIGHT CAM', 'BROADCAST CAM', 'HIGH CAM'][this.camMode]); }
  // keyboard → P1 actions (the keypad layout from the design doc)
  press(k, shift) {
    this.keys[k] = true; const P = this.player; if (!P || this.paused) return;
    const map = { z: 'rollL', x: 'rollR', '.': 'cook', '+': 'wsDown', '-': 'wsUp' };
    let a = KEY_TO_STRIKE[k] ? 'p:' + (this.keys[' '] && (k === '7' || k === '9') ? (k === '7' ? 'overL' : 'overR') : KEY_TO_STRIKE[k]) + (this.keys[' '] ? '!' : '') : map[k];
    if (k === '0') a = shift ? 'gloveSwap' : 'recipeNext';
    if (k === 'v') a = 'guardCycle';
    if (k === 'b') a = 'switch';
    if (a) this.act(P, a);
    if ((k === '8' || k === '2') && this.mode === 'training') this.trainCheck('guard', k);
    if ((k === 'q' || k === 'e') && this.mode === 'training') this.trainCheck('weave', k);
  }
  release(k) { this.keys[k] = false; }
  // one action vocabulary shared by keyboard, touch and controllers
  act(f, a) {
    if (!f || this.paused) return;
    if (a === 'pause') { this.togglePause(); return; } if (a === 'cam') { this.cycleCam(); return; } if (a === 'hud') { this.toggleHUD(); return; }
    if (this.phase === 'down' && this.count && this.count.f === f && a.startsWith('p:')) { this.count.mash += 0.075; return; }
    if (this.phase !== 'fight' && this.phase !== 'forge') return;
    if (a.startsWith('p:')) { const heavy = a.endsWith('!'); const nm = a.slice(2).replace('!', ''); f.requestStrike(nm, heavy); if (this.mode === 'training' && heavy) this.trainCheck('heavy', nm); return; }
    switch (a) {
      case 'rollL': if (f.startRoll(1) && this.mode === 'training') this.trainCheck('roll'); break;
      case 'rollR': if (f.startRoll(-1) && this.mode === 'training') this.trainCheck('roll'); break;
      case 'cook': f.activateRecipe(); break;
      case 'cookL': case 'cookR': { const i = a === 'cookL' ? 0 : 1; f.cfgGlove = i; f.activateRecipe(i); break; }
      case 'cycleL': case 'cycleR': { const i = a === 'cycleL' ? 0 : 1; const g = f.gloves[i]; f.cfgGlove = i; if (!g.cooking) { g.cycle(); this.onEvent(f, 'recipeSel', g); } break; }
      case 'recipeNext': f.cycleRecipe(); break;
      case 'recipePrev': { const g = f.gloves[f.cfgGlove]; if (!g.cooking) { g.sel = (g.sel + g.loadout.length - 1) % g.loadout.length; this.onEvent(f, 'recipeSel', g); } break; }
      case 'gloveSwap': f.switchGlove(); break;
      case 'glove0': case 'glove1': { const i = +a.slice(-1); if (f.cfgGlove !== i) { f.cfgGlove = i; this.onEvent(f, 'gloveSel', f.gloves[i]); } break; }
      case 'wsUp': f.weightShift(-1); break; case 'wsDown': f.weightShift(1); break;
      case 'wsCycle': f.weightShift(f.form >= 1 ? -2 : 1); break;
      case 'switch': f.switchStance(); break;
      case 'guardCycle': { f.guardStyle = GUARD_ORDER[(GUARD_ORDER.indexOf(f.guardStyle || 'high') + 1) % GUARD_ORDER.length]; const G = GUARDS[f.guardStyle]; if (f === this.player) { this.settings.guardStyle = f.guardStyle; this.saveSettings(); this.toast(G.name + (G.who ? ' · ' + G.who : '')); } if (this.mode === 'training') this.trainCheck('guardStyle', f.guardStyle); break; }
    }
  }
  // continuous intents: keyboard (P1) + every controller assigned to the fighter
  humanInput(dt) {
    const K = this.keys; const own = this.padOwners(this.pads.state);
    for (const f of [this.player, this.player2]) {
      if (!f) continue;
      let lat = 0, fwd = 0, weave = 0, guard = null, duck = 0, pull = 0, clinch = false;
      if (this.analogDriven.has(f)) { if (f === this.player) { const kf = (K.w ? 1 : 0) - (K.s ? 1 : 0), kl = (K.a ? 1 : 0) - (K.d ? 1 : 0); if (kf || kl) f.intent.move.set(kl, kf); } f.setGuard(null); if (this.mode === 'training') { if (f.intent.handGuard && (f.intent.handGuard[0] || f.intent.handGuard[1])) this.trainCheck('guard', '8'); if (Math.abs(f.intent.weave) > 0.5) this.trainCheck('weave'); if (f.pivot) this.trainCheck('pivot'); } continue; }
      if (f === this.player) {
        fwd = (K.w ? 1 : 0) - (K.s ? 1 : 0); lat = (K.a ? 1 : 0) - (K.d ? 1 : 0); weave = (K.q ? 1 : 0) - (K.e ? 1 : 0); guard = K['8'] ? 'high' : K['2'] ? 'low' : null; duck = K.f ? 1 : 0; pull = K.r ? 1 : 0; clinch = !!K.g;
      }
      for (const st of this.pads.state) {
        if (own[st.index] !== f) continue; const r = st._fight; if (!r) continue;
        lat += r.move[0]; fwd += r.move[1]; if (Math.abs(r.weave) > Math.abs(weave)) weave = r.weave; guard = guard || r.guard; duck = Math.max(duck, r.duck); pull = Math.max(pull, r.pull); clinch = clinch || r.clinch;
        if (this.mode === 'training') { if (r.guard) this.trainCheck('guard', r.guard === 'high' ? '8' : '2'); if (Math.abs(r.weave) > 0.5) this.trainCheck('weave'); }
      }
      f.intent.move.set(clamp(lat, -1, 1), clamp(fwd, -1, 1)); f.intent.weave = clamp(weave, -1, 1); f.setGuard(guard); f.intent.duck = duck; f.intent.pull = pull; f.intent.clinch = clinch;
      if (this.mode === 'training') { if (duck > 0.6) this.trainCheck('duck'); if (clinch) this.trainCheck('clinchTry'); }
    }
  }
  pollPads() {
    const states = this.pads.poll(performance.now()); this.analogDriven.clear();
    if (!states.length) return;
    let any = false;
    const own = this.padOwners(states);
    for (const st of states) {
      if (st.down.size || st.stickEdge) any = true;
      const menuOpen = !this.inFight() || (this.ss && this.ss.cornerOpen);
      if (menuOpen) { // controller-driven menus
        const dirs = { [BTN.UP]: 'up', [BTN.DOWN]: 'down', [BTN.LEFT]: 'left', [BTN.RIGHT]: 'right' };
        for (const b of st.down) { if (dirs[b]) this.nav.move(dirs[b]); }
        if (st.stickEdge) this.nav.move(st.stickEdge);
        if (st.down.has(BTN.A)) { this.fx.audio.init(); this.nav.activate(); }
        if (st.down.has(BTN.B)) this.nav.back();
        if (st.down.has(BTN.MENU)) { if (this.paused) this.togglePause(); else if (this.mode === 'menu' && $('menu').classList.contains('hidden') === false) this.start(); }
        st._fight = null; continue;
      }
      const f0 = own[st.index];
      if (f0 && this.settings.padScheme !== 'classic') {
        const ps = this.aps[st.index] || (this.aps[st.index] = newPadState()); f0.analogRest = true; this.analogDriven.add(f0); st._fight = null;
        for (const a of analogFrame(this, f0, st, ps, performance.now() / 1000, this.dt || 1 / 60)) { if (a === 'pause') this.togglePause(); else this.act(f0, a); }
        continue;
      }
      const f = own[st.index]; this.rollState[st.index] = this.rollState[st.index] || {};
      const r = padFight(st, this.rollState[st.index], performance.now() / 1000); st._fight = r;
      if (f) for (const o of r.actions) { if (o.a === 'pause') this.togglePause(); else if (o.a === 'strike') { const nm = pickStrike(o.combo, o.body, o.heavy); if (nm) this.act(f, 'p:' + nm + (o.heavy ? '!' : '')); } else this.act(f, o.a); }
      else if (st.down.has(BTN.MENU)) this.togglePause();
    }
    if (any) { if (!this.padActive) this.setPadMode(true); this.fx.audio.init(); }
  }
  buildTouch() {
    if (!isTouch) return;
    const L = [['q', 'WEAVE', 'L'], ['w', 'ADV', '▲'], ['e', 'WEAVE', 'R'], ['a', 'CIRCLE', '◀'], ['s', 'BACK', '▼'], ['d', 'CIRCLE', '▶'], ['z', 'ROLL', 'L'], ['WS', 'WEIGHT', '⇅'], ['x', 'ROLL', 'R']];
    const R = [['7', 'JAB', 'L'], ['8', 'HIGH', 'GUARD'], ['9', 'JAB', 'R'], ['4', 'HOOK', 'L'], ['5', 'UPPER', 'CUT'], ['6', 'HOOK', 'R'], ['1', 'BODY', 'L'], ['2', 'LOW', 'GUARD'], ['3', 'BODY', 'R'], [' ', 'HEAVY', 'HOLD'], ['g', 'CLINCH', 'HOLD'], ['.', 'COOK', '•'], ['0', 'POWER', '↻'], ['S0', 'GLOVE', '⇄'], ['f', 'DUCK', '▼']];
    const mk = (host, arr) => { for (const [k, a, b] of arr) { const el = document.createElement('div'); el.className = 'tk' + (/[13-79]/.test(k) ? ' atk' : /[28qezx]/.test(k) ? ' def' : ''); if (!k) { el.style.visibility = 'hidden'; host.appendChild(el); continue; } el.innerHTML = `<b>${b}</b>${a}`;
      const down = ev => { ev.preventDefault(); el.classList.add('dn'); this.fx.audio.init(); if (k === 'S0') this.press('0', true); else if (k === 'WS') { if (this.player) this.act(this.player, 'wsCycle'); } else this.press(k, false); };
      const up = ev => { ev.preventDefault(); el.classList.remove('dn'); this.release(k === 'S0' ? '0' : k); };
      el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up); host.appendChild(el); } };
    mk($('tLeft'), L); mk($('tRight'), R);
  }

  // ---------------- camera ----------------
  updateCamera(dt) {
    const cam = this.camera; const [A, B] = this.f; let pos, look, fov = 48;
    const portrait = innerWidth < innerHeight;
    if (!A) { // menu showcase orbit
      const t = this.time * 0.12; pos = new THREE.Vector3(Math.sin(t) * 5.2, 2.0, Math.cos(t) * 5.2); look = new THREE.Vector3(0, 1.1, 0); fov = portrait ? 62 : 42;
    } else {
      const mid = A.pos.clone().lerp(B.pos, 0.5); const sep = A.pos.distanceTo(B.pos);
      const P = this.player || A; const O = this.opponentOf(P);
      const fwd = O.pos.clone().sub(P.pos); fwd.y = 0; fwd.normalize(); const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      if (this.phase === 'down' && this.count) { const f = this.count.f; const t = this.time * 0.25; pos = f.pos.clone().add(new THREE.Vector3(Math.sin(t) * 3, 1.3, Math.cos(t) * 3)); look = f.vol.chest.a.clone(); fov = 45; }
      else if (this.phase === 'end') { const w = this.result && this.result.winner || A; const t = this.time * 0.2; pos = w.pos.clone().add(new THREE.Vector3(Math.sin(t) * 3.4, 2.0, Math.cos(t) * 3.4)); look = w.vol.chest.a.clone().add(new THREE.Vector3(0, 0.15, 0)); fov = portrait ? 66 : 46; }
      else if (this.mode === 'forge') { const t = this.forgeOrbit ?? 0.9; pos = A.pos.clone().add(new THREE.Vector3(Math.sin(t) * 3.3, 1.55, Math.cos(t) * 3.3)); look = A.pos.clone().add(new THREE.Vector3(0, 1.25, 0.3)); fov = portrait ? 60 : 42; }
      else if (this.camMode === 0) { pos = P.pos.clone().addScaledVector(fwd, -(2.2 + sep * 0.35)).addScaledVector(right, -1.0).add(new THREE.Vector3(0, 2.0, 0)); look = mid.clone().addScaledVector(fwd, 0.3).add(new THREE.Vector3(0, 1.22, 0)); fov = portrait ? 70 : 50; if (portrait) { pos.addScaledVector(fwd, -0.6).addScaledVector(right, -0.55); pos.y += 0.75; look.y -= 0.15; } }
      else if (this.camMode === 1) { pos = mid.clone().addScaledVector(right, -(3.9 + sep * 0.6)).add(new THREE.Vector3(0, 1.75, 0)); look = mid.clone().add(new THREE.Vector3(0, 1.15, 0)); fov = portrait ? 70 : 44; }
      else { pos = mid.clone().add(new THREE.Vector3(3.4, 4.6, 3.4)); look = mid.clone().add(new THREE.Vector3(0, 0.9, 0)); fov = portrait ? 66 : 46; }
      if (this.phase !== 'end' && !(this.phase === 'down')) { const lim = 2.55; pos.x = clamp(pos.x, -lim, lim); pos.z = clamp(pos.z, -lim, lim); }
    }
    let k = 1 - Math.exp(-dt * 5);
    if (this.corner && this.corner.active && this.player) { const c = this.corner.camPose(); pos = c.pos; look = c.look; fov = c.fov; k = 1 - Math.exp(-dt * 14); }
    this.camPos.lerp(pos, k); this.camLook.lerp(look, k);
    cam.position.copy(this.camPos); const sh = this.fx.shake * 0.06; if (sh > 0) cam.position.add(new THREE.Vector3((Math.random() - .5) * sh, (Math.random() - .5) * sh, (Math.random() - .5) * sh));
    cam.lookAt(this.camLook);
    const hz = this.hazeK || 0; if (hz > 0.01) { cam.rotateZ(Math.sin(this.time * 1.6) * 0.07 * hz); fov += Math.sin(this.time * 2.3) * 3 * hz; }
    if (Math.abs(cam.fov - fov) > 0.1) { cam.fov += (fov - cam.fov) * k; cam.updateProjectionMatrix(); }
  }
  slowmo(dur, scale) { this.slow = dur; this.slowScale = scale; }

  // ---------------- loop ----------------
  loop(now) {
    requestAnimationFrame(this.loop);
    let real = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.pollPads();
    if (this.paused) { this.render(); return; }
    let ts = this.timeScale; if (this.slow > 0) { this.slow -= real; ts *= this.slowScale; }
    const dt = real * ts;
    if (this.f.length) { const sub = dt > 0.025 ? 2 : 1; for (let i = 0; i < sub; i++) this.update(dt / sub); } else { this.time += dt; this.showcaseUpdate(dt); this.fx.update(dt); }
    { const hs = [this.player, this.player2].filter(Boolean).map(f => f.state === 'down' ? 0.6 : f.stunK || 0); const want = hs.length && this.f.length ? Math.max(...hs) : 0; this.hazeK = (this.hazeK || 0) + (want - (this.hazeK || 0)) * Math.min(1, real * 4);
      const hk = this.hazeK; $('haze').style.opacity = hk.toFixed(3); this.renderer.domElement.style.filter = hk > 0.02 ? `blur(${(hk * 2.4).toFixed(2)}px) saturate(${(1 + hk * 0.6).toFixed(2)}) hue-rotate(${(Math.sin(this.time * 1.3) * 18 * hk).toFixed(1)}deg)` : ''; }
    this.updateCamera(real);
    if (this.corner && this.corner.active) this.corner.tick(real);
    if (this.f.length) this.updateHUD();
    if (this.mode === 'forge') this.forgeUpdate(real);
    this.render();
  }
  render() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }

  // ---------------- menu showcase ----------------
  showcase() {
    this.show = []; const ids = ['savannah', 'graham', 'pop', 'skillet'];
    ids.forEach((id, i) => { const f = new Fighter(this, ROSTER[id], { x: 0, z: 0 }); const a = i / 4 * Math.PI * 2 + 0.4; f.pos.set(Math.sin(a) * 1.25, 0, Math.cos(a) * 1.25); f.yaw = a + Math.PI; f.root.position.copy(f.pos); this.scene.add(f.root); this.show.push(f); f._clip = ['shadow', 'bag', 'pivot', 'fightIdle2'][i]; f._t = Math.random() * 5; });
  }
  showcaseUpdate(dt) {
    if (!this.show) return;
    for (const f of this.show) { f._t += dt; this.lib.sample(f._clip, f._t, f.pose, 0); this.lib.apply(f.pose, f.skel, f.scale); f.root.position.copy(f.pos); f.root.rotation.set(0, f.yaw, 0); f.root.updateMatrixWorld(true); }
    this.arena.update(dt, { glaze: 0, steam: 0, scorch: 0, trail: 0.5, zones: [], spills: [], marks: this.marks, hype: 0.3 });
  }
  hideShowcase() { if (this.show) { for (const f of this.show) this.scene.remove(f.root); this.show = null; } }

  // ---------------- HUD ----------------
  buildHUD() {
    const [A, B] = this.f;
    for (const [i, f] of [[0, A], [1, B]]) { const el = $('p' + i); el.querySelector('.nm').textContent = f.spec.name; el.querySelector('.rc').textContent = f.spec.title; el.querySelector('.form').classList.toggle('hidden', !f.spec.weightshift); }
    const panel = (pi) => [0, 1].map(i => `<div class="glove" id="gl${pi}_${i}"><h4><span>${pi ? 'P2 ' : ''}${i ? 'RIGHT' : 'LEFT'} GLOVE</span><span id="glq${pi}_${i}"></span></h4><div class="rec" id="glr${pi}_${i}"></div><div class="res"><span>Heat</span><div class="bar heat"><i id="glh${pi}_${i}"></i></div><span>Moisture</span><div class="bar moist"><i id="glm${pi}_${i}"></i></div><span>Pressure</span><div class="bar pres"><i id="glp${pi}_${i}"></i></div><span>Stability</span><div class="bar stab"><i id="gls${pi}_${i}"></i></div></div><div class="stt" id="glt${pi}_${i}"></div></div>`).join('');
    const compact = (pi) => [0, 1].map(i => `<div class="gw" id="gw${pi}_${i}"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" class="trk"/><circle cx="24" cy="24" r="20" class="hb" id="gwh${pi}_${i}" pathLength="100"/><circle cx="24" cy="24" r="15" class="trk2"/><circle cx="24" cy="24" r="15" class="sb" id="gws${pi}_${i}" pathLength="100"/><circle cx="24" cy="24" r="10" class="core" id="gwc${pi}_${i}"/></svg><span id="gwn${pi}_${i}"></span><em>${i ? '▶' : '◀'}</em></div>`).join('');
    const mini = this.hudMode !== 'full';
    $('gloves').innerHTML = this.player ? (mini ? compact(0) : panel(0)) : ''; $('gloves2').innerHTML = this.player2 ? (mini ? compact(1) : panel(1)) : ''; $('gloves2').classList.toggle('hidden', !this.player2);
    document.body.classList.toggle('versus', !!this.player2);
  }
  updateHUD() {
    const [A, B] = this.f; const set = (el, v) => { el.style.transform = `scaleX(${clamp(v, 0, 1)})`; };
    [A, B].forEach((f, i) => { const el = $('p' + i); set(el.querySelector('.hp i'), f.health / 100); set(el.querySelector('.hp b'), f.health / 100); set(el.querySelector('.st i'), f.stamina / 100); set(el.querySelector('.dz i'), f.daze / 100); set(el.querySelector('.fo i'), (f.focus || 0) / 100);
      { const bm = el.querySelector('.balm'); const b = f.bal; if (bm && b) { const fr = i === 1 ? 1 - b.front : b.front; bm.querySelector('b').style.left = (clamp(b.front, 0, 1) * 100).toFixed(1) + '%'; bm.classList.toggle('warn', b.margin < 0.035 || b.narrow); bm.classList.toggle('bad', b.margin < 0 || b.crossed || b.stumbleT > 0 || !!f.switching); bm.querySelector('.stl').textContent = f.switching ? 'SWITCH' : f.stance === 'southpaw' ? 'SOUTH' : 'ORTH'; } }
      if (f.spec.weightshift) { const fe = el.querySelector('.form'); const nm = f.fm.name; fe.textContent = `${nm} FORM${f.canShift ? ' · SHIFT READY' : ''}`; fe.classList.toggle('ready', f.canShift && f.focus >= 30 && f.stamina >= 12); } });
    const t = Math.max(0, this.roundT); $('clock').textContent = isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '∞';
    $('roundLbl').textContent = this.mode === 'training' ? 'TRAINING' : this.mode === 'forge' ? 'ANIMATION FORGE' : `ROUND ${this.round}/${this.settings.rounds}`;
    [this.player, this.player2].forEach((P, pi) => { if (!P) return; for (let i = 0; i < 2; i++) {
      const g = P.gloves[i], id = `${pi}_${i}`;
      if ($('gw' + id)) { $('gwh' + id).style.strokeDasharray = `${g.heat} 100`; $('gws' + id).style.strokeDasharray = `${g.stability} 100`; const r = g.recipe; const c = $('gwc' + id); c.style.fill = g.primed ? RECIPES[g.primed].color : r.color; c.style.opacity = g.primed ? 1 : g.cooking ? 0.9 : 0.55; $('gw' + id).classList.toggle('primed', !!g.primed); $('gw' + id).classList.toggle('cooking', !!g.cooking); $('gwn' + id).textContent = (g.primed ? RECIPES[g.primed] : r).short; const bad = r.heat && (g.heat < r.heat[0] || g.heat > r.heat[1]) || (r.needMoist && g.moisture < r.needMoist); $('gw' + id).classList.toggle('bad', !!bad && !g.primed); continue; }
      if (!$('glh' + id)) continue; set($('glh' + id), g.heat / 100); set($('glm' + id), g.moisture / 100); set($('glp' + id), g.pressure / 100); set($('gls' + id), g.stability / 100);
      const r = g.recipe; $('glr' + id).innerHTML = `<span style="color:${r.color}">●</span> ${r.name}`; $('glq' + id).textContent = `prep ${Math.round(g.prep * 100)}%`;
      $('glt' + id).textContent = g.cooking ? 'COOKING…' : g.primed ? `${RECIPES[g.primed].short} PRIMED — land it` : Object.keys(g.buffs).length ? Object.keys(g.buffs).map(k => RECIPES[k] ? RECIPES[k].short : k).join(' · ') + ' active' : g.caramelSet > 0 ? `caramel-set ×${g.caramelSet}` : (r.heat && (g.heat < r.heat[0] ? 'needs more heat' : g.heat > r.heat[1] ? 'too hot — will scorch' : 'ready')) || 'ready';
      $('gl' + id).classList.toggle('cfg', P.cfgGlove === i);
    } });
    const c = this.cond(); const bs = this.bs;
    $('condName').textContent = c.name; $('resBar').style.transform = `scaleX(${bs.res / 100})`;
    const hz = this.player && this.inZone(this.player) ? 0.2 : 0;
    $('cHeat').textContent = `Heat ${Math.round((c.heat + hz) * 100)}%`; $('cMoist').textContent = `Moisture ${Math.round(c.moisture * 100)}%`; $('cAdh').textContent = `Adhesion ${Math.round(c.adhesion * 100)}%`;
  }
  autoFocus(scrId) { if (!this.padActive) return; setTimeout(() => { const scr = $(scrId); if (!scr || scr.classList.contains('hidden')) return; const T = this.nav.targets(scr); const pick = scr.querySelector('.go') || T[0]; if (pick) this.nav.set(pick); }, 0); }
  feed(text, cls = '') { const el = document.createElement('div'); el.className = cls; el.textContent = text; const fd = $('feed'); fd.prepend(el); while (fd.children.length > 5) fd.lastChild.remove(); setTimeout(() => el.remove(), 9000); }
  feedClear() { $('feed').innerHTML = ''; }
  announce(big, small = '', dur = 2) { const a = $('announce'); a.innerHTML = `${big}${small ? `<small>${small}</small>` : ''}`; a.style.opacity = 1; clearTimeout(this._annT); this._annT = setTimeout(() => a.style.opacity = 0, dur * 1000); }
  hitInfo(text, color, force) { if (this.hudMode !== 'full' && !force && this.f.length && this.inFight()) return; const h = $('hitInfo'); h.textContent = text; h.style.color = color; h.style.opacity = 1; clearTimeout(this._hiT); this._hiT = setTimeout(() => h.style.opacity = 0, 700); }
  toggleHUD() { this.hudMode = this.hudMode === 'min' ? 'full' : this.hudMode === 'full' ? 'off' : 'min'; store.set('ngb_hud', this.hudMode); this.applyHudMode(); if (this.f.length) this.buildHUD(); this.toast(this.hudMode === 'min' ? 'HUD: MINIMAL' : this.hudMode === 'full' ? 'HUD: FULL' : 'HUD: OFF'); }
  applyHudMode() { document.body.classList.toggle('hudmin', this.hudMode === 'min'); document.body.classList.toggle('hudoff', this.hudMode === 'off'); }

  // ---------------- screens ----------------
  buildMenu() {
    const S = this.settings; const m = $('menu');
    const fcard = (id, sel) => { const r = ROSTER[id]; return `<div class="card ${sel === id ? 'on' : ''}" data-f="${id}"><b>${r.name}</b><div class="swatch"><i style="background:#${r.skin.toString(16).padStart(6, '0')}"></i><i style="background:#${r.skin2.toString(16).padStart(6, '0')}"></i><i style="background:#${r.gloveL.toString(16).padStart(6, '0')}"></i><i style="background:#${r.shorts.toString(16).padStart(6, '0')}"></i></div><span>${r.title}</span><span style="margin-top:5px;color:#d8cde8">${r.blurb}</span></div>`; };
    const modes = [['quick', 'QUICK BRAWL', 'You are Savannah. Pick an opponent, a difficulty and go.'], ['watch', 'WATCH MODE', 'Two AIs fight. Hide the HUD (H) and read the fight from body movement.'], ['versus', 'LOCAL VERSUS', 'Two players, one ring. P1 on keyboard or controller, P2 on a second controller.'], ['training', 'TRAINING CAMP', 'Guided sparring: footwork, head movement, body work, glove cooking, Weightshift.'], ['sync', '📷 BODY SYNC', 'The game learns YOUR punches, guard, slips and both stances — 3 reps each, with coaching. Do this first with the camera.'], ['kitchen', 'LIVING COOKBOOK', 'Build each glove\'s loadout and prep it in the kitchen before you fight.'], ['forge', 'ANIMATION FORGE', 'Every mocap take and strike in slow motion, with the kinetic chain plotted.'], ['log', 'FOURTH INGREDIENT', 'Savannah\'s growth from fights + your real training log (shadowboxing, roadwork, push-ups…).']];
    m.innerHTML = `<div class="wrap">
      <div class="sub">WIR PRESENTS</div><div class="logo">NEONGLAZED<br>BRAWLSCAPE</div><div class="tag">THE GLAZED RING · WHERE FOOD BITES BACK</div>
      <h2>MODE</h2><div class="grid modes">${modes.map(([id, t, d]) => `<div class="card ${S.mode === id ? 'on' : ''}" data-m="${id}"><b>${t}</b><span>${d}</span></div>`).join('')}</div>
      <div id="pickA" class="${S.mode === 'watch' || S.mode === 'versus' ? '' : 'hidden'}"><h2>${S.mode === 'versus' ? 'PLAYER 1' : 'CORNER A'}</h2><div class="grid fighters" id="fa">${Object.keys(ROSTER).map(id => fcard(id, S.p0)).join('')}</div></div>
      <h2 id="oppH">OPPONENT</h2><div class="grid fighters" id="fb">${Object.keys(ROSTER).map(id => fcard(id, S.p1)).join('')}</div>
      <h2>RULES</h2><div class="row" id="diff">${['easy', 'normal', 'hard'].map(d => `<button class="pill ${S.diff === d ? 'on' : ''}" data-d="${d}">${d.toUpperCase()}</button>`).join('')}<span style="width:14px"></span>${[1, 3, 5].map(r => `<button class="pill ${S.rounds === r ? 'on' : ''}" data-r="${r}">${r} ROUND${r > 1 ? 'S' : ''}</button>`).join('')}<span style="width:14px"></span>${[60, 90, 180].map(r => `<button class="pill ${S.roundLen === r ? 'on' : ''}" data-l="${r}">${r}s</button>`).join('')}</div>
      <div class="row" style="margin-top:10px">${[['sanctioned', 'SANCTIONED'], ['exhibition', 'NGB EXHIBITION']].map(([k, l]) => `<button class="pill ${S.rules === k ? 'on' : ''}" data-rules="${k}">${l}</button>`).join('')}<span style="width:14px"></span>${S.rules === 'sanctioned' ? [['light', 'LIGHT'], ['middle', 'MIDDLE'], ['heavy', 'HEAVY']].map(([k, l]) => `<button class="pill ${S.weightClass === k ? 'on' : ''}" data-wc="${k}">${l}</button>`).join('') : ''}</div>
      <div class="row" style="margin-top:8px">${[['analog', 'CONTROLLER: ANALOG BOXING'], ['classic', 'CONTROLLER: CLASSIC BUTTONS']].map(([k, l]) => `<button class="pill ${S.padScheme === k ? 'on' : ''}" data-scheme="${k}">${l}</button>`).join('')}<span style="width:14px"></span>${[['orthodox', 'ORTHODOX'], ['southpaw', 'SOUTHPAW']].map(([k, l]) => `<button class="pill ${S.stance === k ? 'on' : ''}" data-stance="${k}">${l}</button>`).join('')}<span style="width:14px"></span><button class="pill" id="menuGuard">GUARD: ${(GUARDS[S.guardStyle] || GUARDS.high).name}</button><span style="width:14px"></span><button class="pill" id="menuEra">RULES: ${(ERAS[S.era] || ERAS.modern).label}</button><span style="width:14px"></span><button class="pill ${this.pmk && this.pmk.active ? 'on' : ''}" id="menuBody">📷 BODY CONTROL${this.pmk && this.pmk.active ? ': ON' : ''}</button></div>
      <p class="note" style="margin:6px 0 0">${S.rules === 'sanctioned' ? 'Sanctioned: Savannah weighs in at one division and fights the whole bout in that form.' : 'Exhibition: Savannah can Weightshift mid-fight (30 focus + 12 stamina). Light = speed and footwork, Dense = leverage and a compact shell.'}</p>
      <div class="row"><button class="go" id="go">ENTER THE RING</button><button class="go alt" id="ctrlBtn">CONTROLS</button></div>
      <div id="ctrls" class="hidden">${controlsHTML()}</div>
      <p class="note" style="margin-top:14px">${this.padStatus()}</p>
      <p class="note" style="margin-top:8px">Prototype v3.1 · Balance Engine + The Corner + Direct Footwork + Guard Styles + Signature Moves + Body Sync + Sweet Science + Body Control + Analog Boxing · skeletal 3D: your 13 FBX takes + Combat pack retargeted onto one rig; every punch is an IK path through the animated skeleton, and collisions are swept from the real glove bones. Ring memory: ${this.marks.length} scorch mark${this.marks.length === 1 ? '' : 's'} from past fights.</p>
    </div>`;
    m.querySelectorAll('[data-m]').forEach(el => el.onclick = () => { if (el.dataset.m === 'kitchen') { S.mode = 'kitchen'; this.openKitchen(); return; } if (el.dataset.m === 'log') { this.openLog(); return; } if (el.dataset.m === 'sync') { this.startSync(); return; } S.mode = el.dataset.m; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('[data-scheme]').forEach(el => el.onclick = () => { S.padScheme = el.dataset.scheme; this.saveSettings(); this.buildMenu(); });
    if ($('menuBody')) $('menuBody').onclick = () => this.pmk.showPanel(true);
    if ($('menuGuard')) $('menuGuard').onclick = () => { S.guardStyle = GUARD_ORDER[(GUARD_ORDER.indexOf(S.guardStyle || 'high') + 1) % GUARD_ORDER.length]; this.saveSettings(); this.buildMenu(); };
    if ($('menuEra')) $('menuEra').onclick = () => { const k = Object.keys(ERAS); S.era = k[(k.indexOf(S.era || 'modern') + 1) % k.length]; this.saveSettings(); this.buildMenu(); };
    m.querySelectorAll('[data-stance]').forEach(el => el.onclick = () => { S.stance = el.dataset.stance; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('[data-rules]').forEach(el => el.onclick = () => { S.rules = el.dataset.rules; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('[data-wc]').forEach(el => el.onclick = () => { S.weightClass = el.dataset.wc; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('#fb [data-f]').forEach(el => el.onclick = () => { S.p1 = el.dataset.f; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('#fa [data-f]').forEach(el => el.onclick = () => { S.p0 = el.dataset.f; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('[data-d]').forEach(el => el.onclick = () => { S.diff = el.dataset.d; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('[data-r]').forEach(el => el.onclick = () => { S.rounds = +el.dataset.r; this.saveSettings(); this.buildMenu(); });
    m.querySelectorAll('[data-l]').forEach(el => el.onclick = () => { S.roundLen = +el.dataset.l; this.saveSettings(); this.buildMenu(); });
    if (S.mode === 'watch') $('oppH').textContent = 'CORNER B'; if (S.mode === 'versus') $('oppH').textContent = 'PLAYER 2'; if (S.mode === 'training' || S.mode === 'forge') { $('oppH').classList.add('hidden'); $('fb').classList.add('hidden'); }
    if (S.mode !== 'watch' && S.mode !== 'versus') S.p0 = S.mode === 'quick' ? 'savannah' : S.p0;
    $('go').onclick = () => this.start(); $('ctrlBtn').onclick = () => $('ctrls').classList.toggle('hidden');
    if (this.padActive && !this.nav.restore(m)) this.autoFocus('menu');
  }
  padStatus() {
    if (this.pads.blocked) return 'This viewer is blocking controllers. Open the downloaded NGB HTML file in Safari or Chrome and your Nimbus will work there.';
    const st = this.pads.raw(); if (!st.length) return 'Controller: none detected yet. Pair your SteelSeries Nimbus over Bluetooth, then press any button.';
    return '' + st.map((g, i) => `P${i + 1 > 2 ? i + 1 : (this.settings.mode === 'versus' && st.length === 1 ? 2 : i + 1)}: ${(g.id || 'Controller').replace(/\(.*?\)/g, '').trim().slice(0, 36)}`).join(' · ') + ' — D-pad/stick to move, A select, B back, Menu to start.';
  }
  saveSettings() { store.set('ngb_settings', this.settings); }
  start() {
    const S = this.settings; if (S.mode === 'quick' || S.mode === 'training' || S.mode === 'forge') S.p0 = 'savannah'; if (S.mode === 'kitchen' || S.mode === 'log') S.mode = 'quick';
    this.hideShowcase(); $('menu').classList.add('hidden'); $('report').classList.add('hidden'); $('kitchen').classList.add('hidden');
    this.setupMatch(S.mode === 'kitchen' ? 'quick' : S.mode);
  }
  togglePause() {
    if (this.phase === 'end') return; this.paused = !this.paused; const p = $('pause'); p.classList.toggle('hidden', !this.paused);
    if (this.paused) { p.innerHTML = `<div class="wrap"><div class="logo" style="font-size:40px">PAUSED</div><div class="row"><button class="go" id="resume">RESUME</button><button class="go alt" id="quit">QUIT TO MENU</button><button class="go alt" id="snd">${this.fx.audio.on ? 'MUTE' : 'UNMUTE'}</button><button class="go alt" id="pHud">HUD: ${this.hudMode.toUpperCase()}</button><button class="go alt" id="pCam">CAMERA</button><button class="go alt" id="pBody">BODY CONTROL${this.pmk.active ? ' ●' : ''}</button></div>${controlsHTML()}</div>`; $('resume').onclick = () => this.togglePause(); $('quit').onclick = () => this.toMenu(); $('pHud').onclick = () => { this.toggleHUD(); $('pHud').textContent = 'HUD: ' + this.hudMode.toUpperCase(); }; $('pCam').onclick = () => this.cycleCam(); $('pBody').onclick = () => this.pmk.showPanel(true); this.autoFocus('pause'); $('snd').onclick = () => { this.fx.audio.on = !this.fx.audio.on; this.togglePause(); this.togglePause(); }; }
  }
  toMenu() { if (this.pmk && this.pmk.sync && this.pmk.sync.active) this.pmk.sync.exit(false); if (this.mode === 'training' && this.player && this.player.attrXP && !this.attrsLogged) { awardAttrs(this.profile, this.player.attrXP); saveProfile(this.profile); this.attrsLogged = true; }
    this.paused = false; ['pause', 'report', 'kitchen', 'log'].forEach(s => $(s).classList.add('hidden')); $('menu').classList.remove('hidden'); this.clearFighters(); this.mode = 'menu'; this.timeScale = 1; $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('forgeUI').classList.add('hidden'); $('chain').classList.add('hidden'); $('hint').classList.add('hidden'); $('count').classList.add('hidden'); ['btnPause', 'btnCam', 'btnHud', 'btnBody'].forEach(b => $(b).classList.add('hidden')); this.bs = null; this.showcase(); this.buildMenu(); }
  showReport() {
    const [A, B] = this.f; const r = this.result; const c = this.ctrl[1];
    const row = (lbl, a, b) => `<tr><td>${lbl}</td><td>${a}</td><td>${b}</td></tr>`;
    const pct = (s) => s.thrown ? Math.round(s.landed / s.thrown * 100) + '%' : '—';
    const reads = c ? c.habitReads().map(x => `<li>${x.text}</li>`).join('') : '';
    let fourth = '';
    if (A.spec.id === 'savannah' && (this.mode === 'quick' || this.mode === 'versus')) {
      if (!this.fightLogged) { const before = {}; for (const k in TRAITS) before[k] = level(this.profile.xp[k] || 0); this.lastGains = awardFight(this.profile, A, B, this.scores[0].length + (r.how === 'DECISION' ? 0 : 1), r.winner === A); this.lastBefore = before; saveProfile(this.profile); this.fightLogged = true; }
      if (!this.attrsLogged) { this.attrDelta = awardAttrs(this.profile, A.attrXP || {}); saveProfile(this.profile); this.attrsLogged = true; }
      fourth = attrHTML(this.attrDelta, A.attrXP) + `<h2>FOURTH INGREDIENT — WHAT THIS FIGHT WROTE INTO HIS ANATOMY</h2><div class="grid kit">${Object.entries(TRAITS).map(([k, t]) => { const xp = this.profile.xp[k] || 0, l = level(xp), g = Math.round(this.lastGains[k] || 0), up = l > this.lastBefore[k]; return `<div class="chip ${up ? 'on' : ''}"><b style="color:${t.color}">${t.name} · LV ${l}${up ? ' ▲' : ''}</b><span>+${g} xp · ${Math.round(xp)}${nextAt(xp) ? ' / ' + nextAt(xp) : ' (max)'}</span><span>${t.perk}</span></div>`; }).join('')}</div>`;
    }
    const per = Object.keys(STRIKES).map(k => { const a = A.stats.byStrike[k], b = B.stats.byStrike[k]; if (!a && !b) return ''; return row(STRIKES[k].label, a ? `${a.l}/${a.t}` : '—', b ? `${b.l}/${b.t}` : '—'); }).join('');
    $('report').innerHTML = `<div class="wrap"><div class="sub">FIGHT REVIEW</div><div class="logo" style="font-size:clamp(28px,5vw,48px)">${r.winner ? r.winner.spec.name + ' WINS' : 'DRAW'}</div><div class="tag">${r.how}${r.extra ? ' · ' + r.extra : ''}${this.scores[0].length ? ' · cards: ' + this.scores[0].join('/') + ' – ' + this.scores[1].join('/') : ''}</div>
      <h2>EXCHANGES</h2><table class="rep"><tr><th></th><th>${A.spec.short}</th><th>${B.spec.short}</th></tr>
      ${row('Punches landed / thrown', `${A.stats.landed}/${A.stats.thrown} (${pct(A.stats)})`, `${B.stats.landed}/${B.stats.thrown} (${pct(B.stats)})`)}
      ${row('Clean shots', A.stats.clean, B.stats.clean)}${row('Head / body landed', `${A.stats.headLanded} / ${A.stats.bodyLanded}`, `${B.stats.headLanded} / ${B.stats.bodyLanded}`)}
      ${row('Counters', A.stats.counters, B.stats.counters)}${row('Blocked by opponent', A.stats.blocked, B.stats.blocked)}${row('Missed', A.stats.missed, B.stats.missed)}
      ${row('Knockdowns suffered', A.knockdowns, B.knockdowns)}${row('Recipes cooked / failed', `${A.stats.recipes} / ${A.stats.recipeFails}`, `${B.stats.recipes} / ${B.stats.recipeFails}`)}${row('Culinary reactions', A.stats.reactions, B.stats.reactions)}${row('Ref warnings / points deducted', `${A.stats.warnings || 0} / ${A.stats.deductions || 0}`, `${B.stats.warnings || 0} / ${B.stats.deductions || 0}`)}${(() => { const t = f => f.tr || { swell: [0, 0], cut: [0, 0], hand: [0, 0] }; const m = f => `${Math.round(Math.max(...t(f).swell))}% / ${Math.round(Math.max(...t(f).cut))}% / ${Math.round(100 - Math.max(...t(f).hand))}%`; return row('Swelling / cuts / hand health', m(A), m(B)); })()}
      ${per}</table>
      ${fourth}
      ${reads ? `<h2>WHAT ${B.spec.short.toUpperCase()} LEARNED ABOUT YOU</h2><ul class="note" style="font-size:13.5px">${reads}</ul>` : ''}
      <div class="row"><button class="go" id="again">REMATCH</button><button class="go alt" id="menuB">MENU</button></div></div>`;
    $('report').classList.remove('hidden'); this.autoFocus('report'); $('again').onclick = () => { $('report').classList.add('hidden'); this.setupMatch(this.mode); }; $('menuB').onclick = () => this.toMenu();
  }

  // ---------------- Fourth Ingredient + real-world training log ----------------
  openLog() {
    $('menu').classList.add('hidden'); const L = $('log'); L.classList.remove('hidden'); this.logSel = this.logSel || { type: 'shadow', amount: 15 };
    const draw = (gains) => {
      const p = this.profile, sel = this.logSel, T = LOG_TYPES[sel.type];
      L.innerHTML = `<div class="wrap"><div class="sub">SAVANNAH PRESSURE · ${p.fights || 0} FIGHTS LOGGED</div><div class="logo" style="font-size:clamp(26px,5vw,46px)">THE FOURTH INGREDIENT</div>
      <p class="note">His Three Meals set the recipe. The Fourth Ingredient records what he becomes. Every trait levels from what you actually do — in the ring and in your own training. Perks apply to Savannah in Quick Brawl and Versus.</p>
      <div class="grid kit">${Object.entries(TRAITS).map(([k, t]) => { const xp = p.xp[k] || 0, l = level(xp), nx = nextAt(xp), lo = LEVELS[l]; const pct = nx ? (xp - lo) / (nx - lo) * 100 : 100; return `<div class="chip ${gains && gains[k] ? 'on' : ''}"><b style="color:${t.color}">${t.name} · LV ${l}</b><div class="bar" style="height:6px"><i style="background:${t.color};transform:scaleX(${pct / 100})"></i></div><span>${Math.round(xp)} xp${nx ? ' / ' + nx : ' · max'}${gains && gains[k] ? ` · +${gains[k]}` : ''}</span><span>${t.perk}</span><span style="color:#d8cde8">${t.lore}</span><span>Grows from: ${t.from}</span></div>`; }).join('')}</div>
      ${attrHTML({ before: attrsOf(p), after: attrsOf(p) })}
      <h2>LOG REAL TRAINING</h2><p class="note">Honor system, nothing is recorded but what you enter here, and it stays in this browser. No video uploads needed.</p>
      <div class="row">${Object.entries(LOG_TYPES).map(([k, t]) => `<button class="pill ${sel.type === k ? 'on' : ''}" data-lt="${k}">${t.label}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="pill" data-nav="minus" id="lgMinus">−</button><div style="font-family:var(--disp);font-size:26px;min-width:150px;text-align:center">${sel.amount} <span style="font-size:13px;color:var(--dim)">${T.unit}</span></div><button class="pill" data-nav="plus" id="lgPlus">+</button><button class="go" id="lgAdd" style="margin:0 0 0 10px;padding:10px 18px;font-size:14px">LOG IT</button></div>
      ${p.log.length ? `<h2>RECENT</h2><table class="rep">${p.log.slice(0, 8).map(e => `<tr><td>${e.d}</td><td>${LOG_TYPES[e.type] ? LOG_TYPES[e.type].label : e.type}</td><td>${e.amount} ${LOG_TYPES[e.type] ? LOG_TYPES[e.type].unit : ''}</td></tr>`).join('')}</table>` : ''}
      <div class="row"><button class="go alt" id="logBack">BACK</button></div></div>`;
      L.querySelectorAll('[data-lt]').forEach(el => el.onclick = () => { sel.type = el.dataset.lt; sel.amount = LOG_TYPES[sel.type].step * (sel.type === 'shadow' || sel.type === 'footwork' ? 3 : sel.type === 'pushups' || sel.type === 'squats' ? 3 : 3); draw(); });
      $('lgMinus').onclick = () => { sel.amount = Math.max(T.step, sel.amount - T.step); draw(); }; $('lgPlus').onclick = () => { sel.amount = Math.min(T.step * 40, sel.amount + T.step); draw(); };
      $('lgAdd').onclick = () => { const g = awardLog(this.profile, sel.type, sel.amount); saveProfile(this.profile); this.fx.audio.init(); this.fx.audio.ding(880); draw(g); };
      $('logBack').onclick = () => { L.classList.add('hidden'); $('menu').classList.remove('hidden'); this.buildMenu(); };
      if (this.padActive && !this.nav.restore(L)) this.autoFocus('log');
    };
    draw();
  }

  // ---------------- kitchen (Living Cookbook) ----------------
  openKitchen() {
    $('menu').classList.add('hidden'); const k = $('kitchen'); k.classList.remove('hidden');
    const draw = () => {
      k.innerHTML = `<div class="wrap"><div class="sub">LIVING COOKBOOK</div><div class="logo" style="font-size:clamp(26px,5vw,46px)">THE GLOVE KITCHEN</div>
      <p class="note">Each Glazed Glove is its own chamber. Pick up to four powers per glove. On the controller: D-pad ◀ / ▶ cooks the left / right glove, ▲ / ▼ cycles each glove's power. Keyboard: <b>0</b> cycle, <b>Shift+0</b> swap glove, <b>.</b> cook. Then prep each chamber: stop the needle in the golden band — prep quality sets how reliable and strong the recipes are.</p>
      ${[0, 1].map(i => `<h2>${i ? 'RIGHT' : 'LEFT'} GLOVE — ${this.loadout[i].length}/4</h2><div class="grid kit">${RECIPE_ORDER.map(id => { const r = RECIPES[id]; return `<div class="chip ${this.loadout[i].includes(id) ? 'on' : ''}" data-g="${i}" data-r="${id}"><b style="color:${r.color}">${r.name}</b><span>${r.desc}</span></div>`; }).join('')}</div>
        <div class="row" style="margin-top:10px"><div style="flex:1;min-width:220px"><div class="prep" id="prep${i}"><div class="zone" style="left:42%;width:16%"></div><div class="needle" style="left:0"></div></div></div><button class="pill" data-prep="${i}">PREP (${Math.round(this.prep[i] * 100)}%)</button></div>`).join('')}
      <h2>CHEMISTRY NOTES</h2><div class="grid kit">${RECIPE_ORDER.map(id => `<div class="chip"><b style="color:${RECIPES[id].color}">${RECIPES[id].name}</b><span>${RECIPES[id].science}</span></div>`).join('')}</div>
      <h2>CULINARY REACTIONS</h2><div class="grid kit">${REACTIONS.map(r => `<div class="chip"><b>${r.name}</b><span>${RECIPES[r.a] ? RECIPES[r.a].short : r.a.toUpperCase()} + ${RECIPES[r.b] ? RECIPES[r.b].short : r.b.toUpperCase()} — ${r.desc}</span></div>`).join('')}</div>
      <div class="row"><button class="go" id="kGo">TO THE RING</button><button class="go alt" id="kBack">BACK</button></div></div>`;
      k.querySelectorAll('[data-r]').forEach(el => el.onclick = () => { const i = +el.dataset.g, id = el.dataset.r; const L = this.loadout[i]; if (L.includes(id)) { if (L.length > 1) L.splice(L.indexOf(id), 1); } else { if (L.length >= 4) L.shift(); L.push(id); } store.set('ngb_loadout4', this.loadout); draw(); });
      k.querySelectorAll('[data-prep]').forEach(el => el.onclick = () => { if (this.prepActive) this.prepLock(); else this.prepStart(+el.dataset.prep, el); });
      if (this.padActive && !this.nav.restore(k)) this.autoFocus('kitchen');
      $('kGo').onclick = () => { this.settings.mode = 'quick'; this.prepActive = null; this.start(); }; $('kBack').onclick = () => { this.prepActive = null; k.classList.add('hidden'); this.settings.mode = 'quick'; $('menu').classList.remove('hidden'); this.buildMenu(); };
    };
    this.kitchenDraw = draw; draw();
  }
  prepStart(i, btn) { this.prepActive = { i, t: 0, btn }; btn.textContent = 'STOP! (tap / space)'; const tick = () => { if (!this.prepActive) return; const p = this.prepActive; p.t += 0.016 * (1.2 + i * 0.25); const x = (Math.sin(p.t * 2.6) * 0.5 + 0.5) * 100; p.x = x; const n = document.querySelector(`#prep${i} .needle`); if (n) n.style.left = x + '%'; requestAnimationFrame(tick); }; tick(); }
  prepLock() { const p = this.prepActive; if (!p) return; this.prepActive = null; const off = Math.abs(p.x - 50); this.prep[p.i] = clamp(1 - Math.max(0, off - 8) / 55, 0.45, 1); this.fx.audio.init(); this.fx.audio.ding(500 + this.prep[p.i] * 400); this.kitchenDraw(); }

  // ---------------- training ----------------
  showHint() { const s = this.training[this.trainIdx]; const h = $('hint'); if (!s) { h.innerHTML = '✔ Camp complete — free sparring. Esc for menu.'; setTimeout(() => h.classList.add('hidden'), 4000); return; } h.classList.remove('hidden'); h.innerHTML = `<b style="color:var(--gold)">${this.trainIdx + 1}/${this.training.length}</b> · ${s.text}`; }
  startSync() { this.settings.mode = 'training'; this.saveSettings(); this.syncNext = true; this.start(); }
  startBodyCamp() { if (this.mode !== 'training') return; this.training = bodySteps(this.pmk.tracker.feet.seen > 0.5); this.trainIdx = 0; this.showHint(); this.announce('BODY CAMP', 'YOUR BODY IS THE CONTROLLER', 1.6); }
  trainCheck(type, d) { const s = this.training && this.training[this.trainIdx]; if (!s) return; if (s.check(type, d)) { this.trainIdx++; this.fx.audio.ding(880); this.hitInfo('✔ ' + (s.ok || 'NICE'), '#8dff9a'); this.showHint(); } }

  // ---------------- forge ----------------
  buildForge() {
    const ui = $('forgeUI'); const clips = Object.entries(this.lib.clips);
    ui.innerHTML = `<h3>ANIMATION FORGE</h3><div class="note">Speed</div><div class="two">${[0.1, 0.25, 0.5, 1].map(s => `<button data-sp="${s}" class="${s === 0.25 ? 'on' : ''}">${s}×</button>`).join('')}</div>
      <h3>STRIKE LAB (keys work too)</h3><div class="two">${Object.entries(STRIKES).map(([k, s]) => `<button data-st="${k}">${s.key} · ${s.label}</button>`).join('')}</div>
      <div class="two"><button data-act="weave">Q/E weave</button><button data-act="roll">Z roll</button><button data-act="guard">8 guard</button><button data-act="cook">. cook</button></div>
      <div id="forgeHit" class="note" style="margin:6px 0;min-height:30px"></div>
      <h3>MOCAP TAKES</h3>${clips.map(([k, c]) => `<button data-clip="${k}">${c.label} <span style="color:var(--dim)">· ${c.duration.toFixed(1)}s</span></button>`).join('')}
      <div class="note" style="margin-top:8px">Drag on the stage to orbit. Takes are retargeted from your FBX files onto one skeleton; strikes are IK paths layered on top.</div>`;
    this.timeScale = 0.25;
    ui.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { this.timeScale = +b.dataset.sp; ui.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', x === b)); });
    ui.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const st = STRIKES[b.dataset.st]; this.player.requestStrike(b.dataset.st.startsWith('upper') ? 'upper' : b.dataset.st); });
    ui.querySelectorAll('[data-clip]').forEach(b => b.onclick = () => { const A = this.player; const c = this.lib.clips[b.dataset.clip]; A.playAction(b.dataset.clip, { w: 1, fadeIn: 0.15, fadeOut: 0.3, rm: /ko|getUp/.test(b.dataset.clip) ? 1 : 0, hold: false }); A.hipsBias.set(0, 0); ui.querySelectorAll('[data-clip]').forEach(x => x.classList.toggle('on', x === b)); });
    ui.querySelector('[data-act="weave"]').onclick = () => { this.keys.q = true; setTimeout(() => this.keys.q = false, 700); };
    ui.querySelector('[data-act="roll"]').onclick = () => this.player.startRoll(1);
    ui.querySelector('[data-act="guard"]').onclick = () => { this.keys['8'] = true; setTimeout(() => this.keys['8'] = false, 1200); };
    ui.querySelector('[data-act="cook"]').onclick = () => this.player.activateRecipe();
    this.chainHist = []; this.forgeOrbit = 0.9;
    const cv = this.renderer.domElement; let drag = null;
    cv.onpointerdown = e => { if (this.mode === 'forge') drag = e.clientX; }; addEventListener('pointerup', () => drag = null);
    cv.onpointermove = e => { if (drag != null && this.mode === 'forge') { this.forgeOrbit += (e.clientX - drag) * 0.01; drag = e.clientX; } };
    this.ctrl[1] = null; const B = this.f[1]; B.setGuard('high');
  }
  forgeUpdate(real) {
    const A = this.player; const B = this.f[1]; B.setGuard('high'); B.pos.set(0, 0, A.pos.z + 1.0); B.intent.move.set(0, 0);
    // kinetic chain sample
    const hipsQ = A.B.Hips.getWorldQuaternion(new THREE.Quaternion()), chestQ = A.B.Spine2.getWorldQuaternion(new THREE.Quaternion());
    const yawOf = q => { const v = new THREE.Vector3(0, 0, 1).applyQuaternion(q); return Math.atan2(v.x, v.z); };
    const hs = A.strike ? A.strike.hi : 1; const sh = A.B[hs === 0 ? 'LeftArm' : 'RightArm'].getWorldPosition(new THREE.Vector3());
    const prev = this._chainPrev; const dt = Math.max(1e-4, this.dt);
    if (prev) { const dy = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) / dt; };
      this.chainHist.push([dy(yawOf(hipsQ), prev.h) / 12, dy(yawOf(chestQ), prev.c) / 12, sh.distanceTo(prev.s) / dt / 3, A.gloveNow[hs].distanceTo(A.glovePrev[hs]) / dt / 8]); if (this.chainHist.length > 160) this.chainHist.shift(); }
    this._chainPrev = { h: yawOf(hipsQ), c: yawOf(chestQ), s: sh };
    const cv = $('chainCv'), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); const cols = ['#8dff9a', '#58c8ff', '#ffb000', '#ff2f86'];
    for (let k = 0; k < 4; k++) { g.strokeStyle = cols[k]; g.lineWidth = 3; g.beginPath(); this.chainHist.forEach((v, i) => { const x = i / 160 * cv.width, y = cv.height - 8 - clamp(v[k], 0, 1.1) * (cv.height - 16); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    if (this.forgeHit) { const h = this.forgeHit; $('forgeHit').innerHTML = `Last contact: <b>${h.kind.toUpperCase()}</b> to the ${h.part} · glove speed <b>${h.speed.toFixed(1)} m/s</b> · ${h.dmg.toFixed(1)} dmg`; this.forgeHit = null; }
  }
}

const star = (n, r1, r2) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; d += (i ? 'L' : 'M') + (50 + Math.cos(a) * r).toFixed(1) + ' ' + (50 + Math.sin(a) * r).toFixed(1); } return d + 'Z'; };
const MARKER_SVG = {
  clean: `<svg viewBox="0 0 100 100"><path d="${star(8, 46, 16)}" fill="#ff2f86"/><path d="${star(8, 30, 10)}" fill="#fff"/></svg>`,
  heavy: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#ffb000" stroke-width="6"/><path d="${star(10, 48, 14)}" fill="#ff3a10"/><path d="${star(10, 30, 9)}" fill="#fff6d0"/></svg>`,
  counter: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#ffb000" stroke-width="5"/><circle cx="50" cy="50" r="32" fill="none" stroke="#ffe066" stroke-width="4"/><path d="${star(6, 26, 8)}" fill="#fff"/></svg>`,
  body: `<svg viewBox="0 0 100 100"><path d="M10 40 L50 60 L90 40" fill="none" stroke="#00e5ff" stroke-width="9" stroke-linecap="round"/><path d="M20 62 L50 78 L80 62" fill="none" stroke="#7cf7ff" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="40" r="9" fill="#fff"/></svg>`,
  glance: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="#d8cde8" stroke-width="4" stroke-dasharray="8 7"/></svg>`,
  block: `<svg viewBox="0 0 100 100"><path d="M18 30 Q50 6 82 30" fill="none" stroke="#bfe8ff" stroke-width="8" stroke-linecap="round"/><path d="M28 46 Q50 30 72 46" fill="none" stroke="#bfe8ff" stroke-width="5" stroke-linecap="round" opacity=".7"/></svg>`,
  partial: `<svg viewBox="0 0 100 100"><path d="M18 34 Q50 10 82 34" fill="none" stroke="#bfe8ff" stroke-width="7" stroke-linecap="round"/><path d="${star(6, 26, 10)}" fill="#ff8ab8" transform="translate(0 14)"/></svg>`,
  parry: `<svg viewBox="0 0 100 100"><path d="M14 50 L50 14 L86 50 L50 86 Z" fill="none" stroke="#00e5ff" stroke-width="7"/><path d="M34 50 L50 34 L66 50 L50 66 Z" fill="#00e5ff"/></svg>`,
  slip: `<svg viewBox="0 0 100 100"><path d="M20 70 Q50 10 80 70" fill="none" stroke="#8dff9a" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 12"/></svg>`,
};
function attrHTML(delta, xp = {}) {
  if (!delta) return '';
  return `<h2>BOXER ATTRIBUTES — EARNED BY DOING</h2><div class="grid kit">${Object.entries(ATTRS).map(([k, a]) => { const b = delta.before[k], n = delta.after[k]; return `<div class="chip ${n > b ? 'on' : ''}"><b style="color:${a.color}">${a.name} · ${n}${n > b ? ` ▲${n - b}` : ''}</b><div class="bar" style="height:6px"><i style="background:${a.color};transform:scaleX(${(n - 50) / 49})"></i></div><span>Improves: ${a.does}</span><span>Train it: ${a.how}${xp[k] ? ` · +${Math.round(xp[k])} xp` : ''}</span></div>`; }).join('')}</div>`;
}
function closestOnSeg(p, a, b) { const ab = b.clone().sub(a); const t = clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1); return a.clone().addScaledVector(ab, t); }
function aiLoadout(id) { return { savannah: [['glaze', 'caramel', 'pressure'], ['steam', 'crema', 'roux']], graham: [['roux', 'glaze'], ['roux', 'crema']], pop: [['caramel', 'glaze'], ['crema', 'steam']], skillet: [['caramel', 'pressure'], ['steam', 'pressure']] }[id]; }
function controlsHTML() {
  const L = [['Q', 'Weave L'], ['W', 'Advance'], ['E', 'Weave R'], ['A', 'Circle L'], ['S', 'Retreat'], ['D', 'Circle R'], ['Z', 'Roll L'], ['', ''], ['X', 'Roll R']];
  const R = [['7', 'Left jab'], ['8', 'High guard'], ['9', 'Right jab'], ['4', 'Left hook'], ['5', 'Uppercut'], ['6', 'Right hook'], ['1', 'Left body'], ['2', 'Low guard'], ['3', 'Right body']];
  const pad = a => `<div class="kpad">${a.map(([k, l]) => `<div style="${k ? '' : 'visibility:hidden'}"><b>${k}</b>${l}</div>`).join('')}</div>`;
  const padRows = [['Left stick', 'Footwork — your feet really step: lead foot first going in, rear foot first going out'], ['Right stick ← →', 'Weave / slip (analog: push further, slip deeper)'], ['Right stick ↓ / ↑', 'Duck under / pull back away'], ['Right stick fast flick ↙ ↘', 'Roll left / right under hooks'], ['X · Y', 'Left jab · right straight'], ['A · B', 'Left hook · right hook'], ['X+A · Y+B together', 'Left uppercut · right uppercut'], ['Hold L1 + punch', 'HEAVY version — X/Y become overhands (over-the-top swings). Big damage, big wind-up; miss and you lose your balance'], ['Hold L2 + punch', 'Every punch goes to the body (jabs, straights, hooks, uppercuts)'], ['Hold R1 (up close)', 'Clinch — wrap him up to clear your head and get your wind back; ref breaks it after ~3s. If you are the one held, push the left stick back to fight out'], ['R2 hold', 'High guard (L2+R2 low guard). Tap right before impact to parry'], ['D-pad ◀ / ▶', 'Cook the LEFT / RIGHT glove\'s power'], ['D-pad ▲ / ▼', 'Cycle the LEFT / RIGHT glove\'s power'], ['L2 + D-pad ▲ ▼', 'Weightshift lighter / denser (exhibition)'], ['Menu', 'Pause (camera + HUD options inside)'], ['Nimbus+ extras', 'L3 Weightshift · R3 SWITCH STANCE (stick fwd = step through, back = drop step) · Options camera']];
  const anRows = [['Left stick', 'Step around the ring — feet really step'], ['Right stick (no bumper)', 'Body: slip ← →, duck ↓, pull ↑, fast flick ↙ ↘ = roll. Works with guards up'], ['Hold L1 / R1 + right stick', 'Throw with the LEFT / RIGHT hand. ↑ straight · ← → hook · ↓ (hold a beat) body shot · dip ↓ then rip ↑ uppercut · ↖/↗ up-and-across overhand. Hold the stick out = arm stays out (and you are open). Let go of the stick = hand comes home'], ['Tap, then press-and-hold L1 / R1', 'POWER punch on that hand. Back-to-back power shots before your base resets come out weak and can stumble you'], ['L2 / R2', 'Raise LEFT / RIGHT guard. Stick ↓ drags the guard down to the body, ← → angles it; ← → still slips'], ['A · B', 'Slide rear foot back (wider base, more power) · slide right foot forward'], ['A + B together', 'Switch stance (orthodox ⇄ southpaw)'], ['X · Y', 'Pivot clockwise off the LEFT foot · counter-clockwise off the RIGHT foot'], ['L1 + R1 up close', 'Clinch. Keep either one held to keep holding. Release one: that hand is free to dirty-box with the stick, its trigger guards'], ['Clinch rules', 'Too much holding-and-hitting = referee warnings, then a point. Hitting right after BREAK! is a warning'], ['D-pad', '◀ ▶ cook left / right glove · ▲ ▼ cycle each glove'], ['Menu', 'Pause (switch Analog / Classic layout from the main menu)']];
  const bodyRows = [['BODY SYNC (do this first)', 'Menu → 📷 BODY SYNC, or BODY panel → BODY SYNC. The fighter shows each move, you throw it 3× each side (jab, cross, hooks, uppercuts, body shots), then face guard, body guard, slips, duck, lean back, and both stances. The game builds your own punch templates, trigger speed, guard positions and stance — and coaches you on speed, reach and getting the hand back.'], ['Guard: face vs body', 'Each hand separately: glove at your face = high guard ■, elbow down over the ribs = body guard ▼ (shown on the BODY chip as L■ R▼).'], ['Stance', 'Read from your feet vs your chest every moment no punch is out — switch your lead foot and the fighter switches orthodox ⇄ southpaw.'], ['Gloves by your face', 'Guard — your real hand position blocks (fence with it)'], ['Throw a punch', 'Jab · cross · hooks · uppercuts · overhands · body shots — read from how your fist travels. Stop short = feint (nothing thrown)'], ['Leave it out there', 'Arm stays extended — and you are open to the counter'], ['Turn hips + shoulders into it', 'Power. Snapping your hips is what the kinetic chain scores'], ['Lean · bend knees · lean back', 'Slip · duck · pull. Drop and move under = roll'], ['Both hands reach out slowly, close in', 'Clinch. Pull one hand back to free it for dirty boxing (the ref is watching)'], ['Step side / toward / away from camera', 'Footwork when no controller is connected (controller left stick otherwise)'], ['Both gloves high over your head 1 s', 'Pause']];
  const ssRows = [['Cuts & swelling', 'Clean head shots swell the side they land on; hard ones can open a cut. Blood runs into that eye and closes your screen on that side — shots from the blind side land harder'], ['Liver shot', 'Lead-hand hook to the body: a beat later the legs can go'], ['Solar plexus', 'Straight to the body knocks the wind out — stamina capped for a few seconds'], ['Roll with it', 'Moving your head the way a hook is travelling takes the sting out (−40%)'], ['Pull counter', 'Lean back, then fire the straight as he falls short (+30%)'], ['Walking onto it', 'Stepping into a punch makes it land harder'], ['Hands', 'Overhands to the skull and body shots into an elbow can hurt your hand — a hurt hand hits softer'], ['Mouthpiece', 'Uppercuts can knock it out; an open jaw takes more'], ['The corner', 'Between rounds you get 60 s on the stool: Enswell, adrenaline, Vaseline, ice, breathing, mouthpiece — or throw in the towel'], ['Doctor', 'A bad enough cut brings the doctor — and can stop the fight'], ['Rules', 'Menu → RULES: Modern 10 oz · 1920s 5 oz horsehair · Bare knuckle (harder hits, more cuts, more broken hands)']];
  const gRows = GUARD_ORDER.map(k => [GUARDS[k].name + (GUARDS[k].who ? ' · ' + GUARDS[k].who : ''), GUARDS[k].desc]).concat([['How to pick one', 'Camera: just put your hands in that shell — the game reads it (Body Sync learns yours). Controller: hold both triggers and click L3. Keyboard: V, then hold 8. Menu: GUARD pill = your default. Every opponent has a shell of their own, and reads yours.']]);
  const bRows = [['Balance meter', 'Under your bars: the dot is where your weight is (REAR ↔ LEAD). Green = solid base, amber = narrow or near the edge, red = off balance / one foot / mid-switch.'], ['Pivots are a skill', 'Turn on a LOADED foot: weight on the lead foot (after a jab/cross) makes a lead-foot pivot clean. Weight back, mid power-punch on the wrong foot, moving the other way, tired legs or hurt = sloppy or you trip. Clean pivots take a real angle and he loses you for a beat. Your Balance + Agility decide how consistent you are — and grow with clean reps.'], ['Switch-step', 'R3 / B (camera: switch your feet). Stick forward = step through (moves you in), back = drop step (moves you out), neutral = shuffle. For a moment the feet pass: one foot in the air. Get hit then and it lands harder and moves you.'], ['Stumbles', 'Momentum you didn’t choose (a missed power shot, a shot that moves you, a bad pivot) carries your weight past your feet. If no foot can step in time you stumble — open to counters, can’t punch. Feet crossed = no base at all.'], ['Turning', 'Small turns are your upper body. Big turns need the FEET — so when he pivots clean you are off-line for a beat (and so is he when you do).']];
  const cRows = [['10 seconds', 'Between rounds you get 10 seconds on the stool — a close-up of your fighter. Do as much as you can, right.'], ['Vaseline', 'Drag your finger around the jar (it grooves the jelly and loads your finger), then smear his brows and cheekbones exactly where you want it. Coverage = cuts and glancing shots next round. Grease in his EYE blurs it.'], ['Water · Spit', 'Drag the bottle to his mouth and hold (a sip, not a flood). Hold the bucket under his mouth and he spits — water first, then spit, rinses the mouthpiece.'], ['Enswell', 'Drag the cold iron and rub it on a swollen eye.'], ['TALK', 'Hold the mic and tell him what you saw. Name what HE kept landing + what to do + believe in him = up to +3 on attributes and a read on that punch (it lands softer next round). Insults cost focus. No mic? Type it, or tap a line (worth a bit less).'], ['Controller', 'QUICK GREASE · SIP · SPIT · the lines · STAND UP are all on the D-pad / A.']];
  return `<h2>FOOTWORK & BALANCE</h2><table class="rep ctl">${bRows.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table>
  <h2>THE CORNER</h2><table class="rep ctl">${cRows.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table>
  <h2>SIGNATURE MOVES (earned by doing them)</h2><table class="rep ctl">${SIGNATURES.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table>
  <h2>GUARD STYLES</h2><table class="rep ctl">${gRows.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table>
  <h2>SWEET SCIENCE</h2><table class="rep ctl">${ssRows.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table>
  <h2>BODY CONTROL — PHATOM PMK (CAMERA)</h2><table class="rep ctl">${bodyRows.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table><p class="note">Turn it on from the menu (📷 BODY CONTROL) or pause → BODY CONTROL. Needs an https:// link in Safari/Chrome. A connected controller keeps feet, cooking and pause; any arm the camera loses goes back to the controller until it is seen again.</p>
  <h2>CONTROLLER — ANALOG BOXING (DEFAULT)</h2><table class="rep ctl">${anRows.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table>
  <h2>CONTROLLER — CLASSIC BUTTONS</h2><table class="rep ctl">${padRows.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:left">${v}</td></tr>`).join('')}</table><p class="note">Menus: D-pad or left stick to move, A select, B back, Menu to start. Knocked down: mash X · Y · A · B to beat the count. Rumble works where the browser supports it (Chrome); Safari ignores it.</p>
  <h2>CONTROLS</h2><div class="keys"><div><div class="note" style="margin-bottom:6px">LEFT HAND — BODY</div>${pad(L)}</div><div><div class="note" style="margin-bottom:6px">RIGHT HAND — KEYPAD STRIKES (number row works too)</div>${pad(R)}</div></div>
  <p class="note"><b>0</b> next power · <b>.</b> cook · <b>Shift+0</b> switch glove · hold <b>Space</b> = heavy (Space+7/9 = overhands) · hold <b>G</b> clinch · <b>V</b> next guard style · <b>B</b> switch stance (with W = step through, S = drop step) · hold <b>F</b> duck / <b>R</b> pull · <b>−</b>/<b>+</b> Weightshift · hold <b>8</b>/<b>2</b> to guard (tap just before impact to <b>parry</b>) · <b>C</b> camera · <b>H</b> hide HUD · <b>M</b> mute · <b>Esc</b> pause. Throw during the back half of a punch to chain combos. When you're down, hammer the punch keys to beat the count.</p>`;
}
function bodySteps(feet) {
  const b = (...ts) => (t, d) => t === 'body' && ts.includes(d);
  const S = [
    { text: 'Gloves up by your face — that is your guard (it blocks for real)', check: t => t === 'guard' },
    { text: 'Jab: snap your lead hand straight out and back', check: b('straight'), ok: 'SNAP' },
    { text: 'Throw a hook — elbow up, swing the fist across', check: b('hook') },
    { text: 'Uppercut — dip the fist low, drive it up', check: b('upper', 'bodyUp') },
    { text: 'Go to the body — punch low, at belly height', check: b('bodyStraight', 'bodyHook', 'bodyUp') },
    { text: 'Overhand — loop the rear hand up and over', check: b('over') },
    { text: 'Feint: start a punch and stop it short (nothing is thrown)', check: t => t === 'feint', ok: 'SOLD IT' },
    { text: 'Throw one and LEAVE it out there — feel how open you are', check: t => t === 'bodyHold', ok: 'NOW BRING IT HOME' },
    { text: 'Slip: lean your head off the centre line', check: t => t === 'weave' },
    { text: 'Duck: bend your knees under the punch', check: t => t === 'duck' },
    { text: 'Lean back away from a shot', check: t => t === 'pull' },
    { text: 'Show a shell: Peek-a-Boo (gloves tight on the cheeks), Philly (lead arm down across the belly), Long Guard (lead arm out, slowly) or Cross-Arm', check: t => t === 'guardStyle', ok: 'OLD SCHOOL' },
    { text: 'Power: turn your hips and shoulders through a full-speed punch', check: t => t === 'bodyPower', ok: 'KINETIC CHAIN' },
    { text: 'Clinch: step in, reach both hands out slowly and close together', check: t => t === 'clinch' },
    { text: 'In the clinch: pull ONE hand back — it is free for dirty boxing', check: t => t === 'oneHand', ok: 'LISTEN TO THE REF' },
  ];
  if (feet) S.push(
    { text: 'Feet: lengthen your stance (rear foot back) or bring your right foot up', check: t => t === 'scoot' },
    { text: 'Pivot: turn on your planted front foot', check: t => t === 'pivot' },
    { text: 'Switch stance: swap which foot is in front', check: t => t === 'switch' });
  return S;
}
function analogSteps() {
  return [
    { text: 'Hold R1 and flick the right stick ↑ — right straight', check: (t, d) => t === 'analog' && d === 'straight' },
    { text: 'Hold L1 or R1 and flick ← or → — hook', check: (t, d) => t === 'analog' && d === 'hook' },
    { text: 'Hold a bumper, dip the stick ↓ then rip it ↑ — uppercut', check: (t, d) => t === 'analog' && (d === 'upper' || d === 'bodyUp') },
    { text: 'Hold a bumper and push ↓ — body shot', check: (t, d) => t === 'analog' && (d === 'bodyHook' || d === 'bodyStraight') },
    { text: 'Hold R1, flick up-and-across (↖) — overhand', check: (t, d) => t === 'analog' && d === 'over' },
    { text: 'Power: tap R1, then press-and-hold it and flick', check: t => t === 'analogPower' },
    { text: 'Raise a guard — L2 (left hand) or R2 (right hand)', check: t => t === 'guard' },
    { text: 'Both triggers + click L3 — change your guard style (Peek-a-Boo · Philly Shell · Long · Cross-Arm)', check: t => t === 'guardStyle', ok: 'OLD SCHOOL' },
    { text: 'No bumper: slip with the right stick', check: t => t === 'weave' },
    { text: 'Pivot — hold X (off the left foot) or Y (off the right foot)', check: t => t === 'pivot' },
    { text: 'Switch stance — click R3 (stick forward = step through, back = drop step) or A+B', check: t => t === 'switch' },
    { text: 'Close in and hold L1 + R1 together — clinch', check: t => t === 'clinch' },
    { text: 'Cook a power — D-pad ◀ or ▶', check: t => t === 'recipe' },
  ];
}
function trainingSteps() {
  return [
    { text: 'Step in and throw a LEFT JAB — pad X · key 7. Watch your feet step', check: (t, d) => t === 'strike' && d === 'jabL' },
    { text: 'Right straight — Y · 9', check: (t, d) => t === 'strike' && d === 'crossR' },
    { text: 'Uppercut — press X+A (or Y+B) together · 5', check: (t, d) => t === 'strike' && d.startsWith('upper') },
    { text: 'Over-the-top swing — HOLD L1 + Y · Space+9', check: (t, d) => t === 'heavy' && (d === 'overR' || d === 'overL') },
    { text: 'Go to the body — HOLD L2 + any punch · 1/3', check: (t, d) => t === 'land' && STRIKES[d.name] && STRIKES[d.name].target === 'body', ok: 'BODY' },
    { text: 'Slip — right stick ← → · Q/E', check: t => t === 'weave' },
    { text: 'Duck — right stick ↓ · F', check: t => t === 'duck' },
    { text: 'Roll — FLICK the right stick ↙ or ↘ · Z/X', check: t => t === 'roll' },
    { text: 'High guard — hold R2 · 8', check: (t, d) => t === 'guard' && d === '8' },
    { text: 'Change your guard style — V (Peek-a-Boo · Philly Shell · Long · Cross-Arm)', check: t => t === 'guardStyle', ok: 'OLD SCHOOL' },
    { text: 'Get close and CLINCH — hold R1 · G', check: t => t === 'clinch' },
    { text: 'Cook a power — D-pad ◀ or ▶ · . (watch the heat ring)', check: t => t === 'recipe' },
    { text: 'Block one of Graham\'s punches', check: t => t === 'block', ok: 'BLOCKED' },
  ];
}

window.__bal = BAL; // test/debug hook
window.addEventListener('DOMContentLoaded', () => { window.__game = new Game(); window.__ready = true; });
if (document.readyState !== 'loading') { window.__game = new Game(); window.__ready = true; }
