// Particles, glove trails, impact flashes and synthesized audio.
import * as THREE from 'three';

function softSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}

export class FX {
  constructor(scene, camera, quality) {
    this.scene = scene; this.camera = camera; this.N = quality.particles; this.parts = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.N * 3); this.col = new Float32Array(this.N * 4); this.size = new Float32Array(this.N);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 4)); g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const tex = softSprite();
    this.matAdd = this.makeMat(tex, THREE.AdditiveBlending); this.matNorm = this.makeMat(tex, THREE.NormalBlending);
    this.points = new THREE.Points(g, this.matAdd); this.points.frustumCulled = false; this.points.renderOrder = 5; scene.add(this.points);
    // second system for opaque-ish smoke/steam
    const g2 = new THREE.BufferGeometry(); this.N2 = Math.floor(this.N * 0.6);
    this.pos2 = new Float32Array(this.N2 * 3); this.col2 = new Float32Array(this.N2 * 4); this.size2 = new Float32Array(this.N2);
    g2.setAttribute('position', new THREE.BufferAttribute(this.pos2, 3)); g2.setAttribute('color', new THREE.BufferAttribute(this.col2, 4)); g2.setAttribute('size', new THREE.BufferAttribute(this.size2, 1));
    this.points2 = new THREE.Points(g2, this.matNorm); this.points2.frustumCulled = false; this.points2.renderOrder = 4; scene.add(this.points2);
    this.smoke = [];
    this.trails = []; this.shake = 0; this.flash = null;
    this.audio = new Audio();
  }
  makeMat(tex, blending) {
    return new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending,
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize = size*scale/ -mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC; void main(){ vec4 t=texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a*t.a); if(gl_FragColor.a<0.01) discard; }` });
  }
  spawn(p, v, color, size, life, opts = {}) { if (this.parts.length >= this.N) this.parts.shift(); this.parts.push({ p: p.clone(), v: v.clone(), c: new THREE.Color(color), s: size, life, t: 0, g: opts.g ?? -6, drag: opts.drag ?? 1.5, grow: opts.grow ?? 0, a: opts.a ?? 1, floor: opts.floor ?? true }); }
  puff(p, v, color, size, life, opts = {}) { if (this.smoke.length >= this.N2) this.smoke.shift(); this.smoke.push({ p: p.clone(), v: v.clone(), c: new THREE.Color(color), s: size, life, t: 0, g: opts.g ?? 0.3, drag: opts.drag ?? 1.2, grow: opts.grow ?? 1.2, a: opts.a ?? 0.35 }); }
  impact(p, dir, kind, fighterSpec, strength) {
    const n = Math.round(10 + strength * 2.2);
    const pal = { savannah: [0x3a1d10, 0xd9a35c, 0xffb000], graham: [0xc58a4a, 0xffd9a0, 0x8a5a2a], pop: [0xfff4d0, 0xffe066, 0xffffff], skillet: [0xff5a10, 0xffb000, 0xff2a00] }[fighterSpec.id] || [0xffffff, 0xffaa00, 0xff2f86];
    if (kind === 'block') {
      for (let i = 0; i < 8; i++) this.spawn(p, new THREE.Vector3((Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3), 0xaee8ff, 0.05, 0.25, { g: -2 });
      this.ring(p, 0x9fe6ff, 0.25);
      return;
    }
    for (let i = 0; i < n; i++) {
      const v = dir.clone().multiplyScalar(1.5 + Math.random() * 3.5).add(new THREE.Vector3((Math.random() - .5) * 3, Math.random() * 2.5, (Math.random() - .5) * 3));
      this.spawn(p, v, pal[i % 3], 0.03 + Math.random() * 0.05 * (fighterSpec.id === 'pop' ? 2 : 1), 0.5 + Math.random() * 0.5, { g: fighterSpec.id === 'skillet' ? 1 : -7 });
    }
    this.spawn(p, new THREE.Vector3(), 0xffffff, 0.35 + strength * 0.02, 0.09, { g: 0 });
    this.ring(p, kind === 'counter' ? 0xffb000 : 0xff2f86, 0.3 + strength * 0.02);
    this.shake = Math.min(1, this.shake + strength * 0.035);
  }
  ring(p, color, size) { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; this.spawn(p, new THREE.Vector3(Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0).applyQuaternion(this.camera.quaternion), color, 0.04, 0.18, { g: 0, drag: 6 }); } }
  steamBurst(p, k = 1) { for (let i = 0; i < 26 * k; i++) this.puff(p.clone().add(new THREE.Vector3((Math.random() - .5) * .1, 0, (Math.random() - .5) * .1)), new THREE.Vector3((Math.random() - .5) * 1.6, 0.6 + Math.random() * 1.3, (Math.random() - .5) * 1.6), 0xe8f6ff, 0.22 + Math.random() * 0.2, 1.2 + Math.random() * 1.0, { a: 0.4, grow: 1.6 }); }
  vent(p) { for (let i = 0; i < 3; i++) this.puff(p, new THREE.Vector3((Math.random() - .5) * .5, 1.0 + Math.random(), (Math.random() - .5) * .5).add(p.clone().setY(0).multiplyScalar(-0.15)), 0xdff2ff, 0.18, 1.6, { a: 0.28, grow: 1.4 }); }
  bubbles(p, color) { this.spawn(p.clone().add(new THREE.Vector3((Math.random() - .5) * .1, (Math.random() - .5) * .08, (Math.random() - .5) * .1)), new THREE.Vector3(0, 0.5 + Math.random() * 0.5, 0), color, 0.025 + Math.random() * 0.02, 0.4, { g: 0.5, drag: 2 }); }
  ember(p) { this.spawn(p, new THREE.Vector3((Math.random() - .5) * .4, 0.8 + Math.random(), (Math.random() - .5) * .4), Math.random() > .5 ? 0xff5a10 : 0xffb000, 0.03, 1.2, { g: 0.4, drag: 0.8 }); }
  caramelSplash(p) { for (let i = 0; i < 18; i++) this.spawn(p, new THREE.Vector3((Math.random() - .5) * 2.5, Math.random() * 2, (Math.random() - .5) * 2.5), 0xd2691e, 0.05, 0.7, { g: -8 }); }
  dashTrail(fi) { const p = fi.pos.clone().setY(0.05); for (let i = 0; i < 26; i++) this.spawn(p.clone().add(new THREE.Vector3((Math.random() - .5) * .3, Math.random() * 1.2, (Math.random() - .5) * .3)), fi.vel.clone().multiplyScalar(-0.3).add(new THREE.Vector3(0, 0.2, 0)), i % 2 ? 0xffe066 : 0xff2f86, 0.05, 0.5, { g: 0, drag: 3 }); this.audio.noise(0.25, 2000, 6000, 0.7, 0.15, 'bandpass'); }
  syrupStrand(a, b) { for (let i = 0; i <= 20; i++) { const p = a.clone().lerp(b, i / 20); p.y -= Math.sin(Math.PI * i / 20) * 0.12; this.spawn(p, new THREE.Vector3(0, -0.2, 0), 0xc46a1a, 0.06, 0.6, { g: -1, drag: 4 }); } this.audio.noise(0.3, 300, 900, 1.2, 0.2); }
  popBurst(p) { for (let i = 0; i < 22; i++) this.spawn(p, new THREE.Vector3((Math.random() - .5) * 5, Math.random() * 4, (Math.random() - .5) * 5), i % 3 ? 0xfff4d0 : 0xffe066, 0.07 + Math.random() * 0.05, 0.8, { g: -9 }); this.ring(p, 0xfff4d0, 0.5); this.shake = Math.min(1, this.shake + 0.4); }
  trail(hi, f, p0, p1, color) {
    const key = f.id + hi; let tr = this.trails.find(t => t.key === key);
    if (!tr) { const g = new THREE.BufferGeometry(); const n = 14; g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3)); const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.frustumCulled = false; this.scene.add(m); tr = { key, m, pts: [], n }; this.trails.push(tr); }
    tr.m.material.color.set(color); tr.pts.unshift(p1.clone()); if (tr.pts.length > tr.n) tr.pts.pop(); tr.life = 0.12;
  }
  update(dt) {
    const parts = this.parts;
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; if (q.t >= q.life) { parts.splice(i, 1); continue; } q.v.y += q.g * dt; q.v.multiplyScalar(Math.exp(-q.drag * dt)); q.p.addScaledVector(q.v, dt); if (q.floor && q.p.y < 0.01) { q.p.y = 0.01; q.v.y *= -0.25; q.v.x *= 0.6; q.v.z *= 0.6; } }
    for (let i = 0; i < this.N; i++) { const q = parts[i]; if (q) { this.pos.set([q.p.x, q.p.y, q.p.z], i * 3); const f = 1 - q.t / q.life; this.col.set([q.c.r, q.c.g, q.c.b, q.a * f], i * 4); this.size[i] = q.s * (1 + q.grow * q.t); } else { this.size[i] = 0; this.col[i * 4 + 3] = 0; } }
    const g = this.points.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
    const sm = this.smoke;
    for (let i = sm.length - 1; i >= 0; i--) { const q = sm[i]; q.t += dt; if (q.t >= q.life) { sm.splice(i, 1); continue; } q.v.y += q.g * dt; q.v.multiplyScalar(Math.exp(-q.drag * dt)); q.p.addScaledVector(q.v, dt); }
    for (let i = 0; i < this.N2; i++) { const q = sm[i]; if (q) { this.pos2.set([q.p.x, q.p.y, q.p.z], i * 3); const u = q.t / q.life; const f = Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - u); this.col2.set([q.c.r, q.c.g, q.c.b, q.a * f], i * 4); this.size2[i] = q.s * (1 + q.grow * q.t); } else { this.size2[i] = 0; this.col2[i * 4 + 3] = 0; } }
    const g2 = this.points2.geometry; g2.attributes.position.needsUpdate = g2.attributes.color.needsUpdate = g2.attributes.size.needsUpdate = true;
    // trails: ribbon facing camera
    for (const tr of this.trails) {
      tr.life -= dt; if (tr.life <= 0 && tr.pts.length) tr.pts.pop();
      const pa = tr.m.geometry.attributes.position; const n = tr.n;
      for (let i = 0; i < n; i++) { const p = tr.pts[Math.min(i, tr.pts.length - 1)]; if (!p) { pa.setXYZ(i * 2, 0, -10, 0); pa.setXYZ(i * 2 + 1, 0, -10, 0); continue; }
        const w = 0.07 * (1 - i / n); const up = new THREE.Vector3(0, 1, 0); pa.setXYZ(i * 2, p.x, p.y + w, p.z); pa.setXYZ(i * 2 + 1, p.x, p.y - w, p.z); }
      pa.needsUpdate = true; tr.m.visible = tr.pts.length > 1;
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
  }
}

// ---------- WebAudio synth ----------
export class Audio {
  constructor() { this.ctx = null; this.on = true; }
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination); this.noiseBuf = this.makeNoise(); this.startCrowd(); } catch (e) { this.ctx = null; } }
  makeNoise() { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  noise(dur, f0, f1, q, gain, type = 'bandpass', when = 0) {
    if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime + when; const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  tone(freq, dur, gain, type = 'sine', when = 0, f1) { if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime + when; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05); }
  punch(strength, kind) {
    if (kind === 'block') { this.noise(0.08, 1800, 600, 1.2, 0.35); this.tone(180, 0.06, 0.2, 'triangle'); return; }
    if (kind === 'whiff') { this.noise(0.14, 900, 2400, 0.8, 0.08); return; }
    const k = Math.min(1, strength / 15); this.noise(0.12 + k * 0.1, 900, 120, 0.9, 0.5 + k * 0.4); this.tone(95 + k * 30, 0.16 + k * 0.1, 0.5 + k * 0.4, 'sine', 0, 45);
    if (kind === 'counter' || k > 0.8) this.crowdSwell(0.6 + k * 0.4);
  }
  bell(n = 1) { for (let i = 0; i < n; i++) { [1, 2.76, 5.4].forEach((m, j) => this.tone(880 * m, 1.6, 0.18 / (j + 1), 'sine', i * 0.38)); } }
  hiss(dur = 1) { this.noise(dur, 6000, 3000, 0.4, 0.18, 'highpass'); }
  sizzle() { this.noise(0.4, 4000, 7000, 0.6, 0.08, 'highpass'); }
  ding(f = 660) { this.tone(f, 0.25, 0.15, 'triangle'); this.tone(f * 1.5, 0.3, 0.08, 'sine', 0.05); }
  thud() { this.tone(70, 0.5, 0.7, 'sine', 0, 35); this.noise(0.4, 300, 60, 0.7, 0.5); }
  startCrowd() { const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6; this.crowdGain = c.createGain(); this.crowdGain.gain.value = 0.05; s.connect(f); f.connect(this.crowdGain); this.crowdGain.connect(this.master); s.start(); }
  crowdSwell(k) { if (!this.ctx) return; const g = this.crowdGain.gain, t = this.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.05 + 0.2 * k, t + 0.15); g.linearRampToValueAtTime(0.05, t + 1.8); }
}
