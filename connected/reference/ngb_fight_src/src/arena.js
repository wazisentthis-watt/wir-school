// The Glazed Ring — arena, lighting, crowd and the living BrawlScape floor.
import * as THREE from 'three';

export const RING = 2.75; // half-size of the fighting area (inside ropes)

function canvasTexture(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export class Arena {
  constructor(scene, quality) {
    this.scene = scene; this.q = quality; this.t = 0;
    this.cond = { heat: 0.42, moisture: 0.15, adhesion: 0.08 };
    this.zones = []; this.spills = []; this.marks = []; this.vents = [];
    this.build();
  }
  build() {
    const S = this.scene;
    S.fog = new THREE.FogExp2(0x07060c, 0.035);
    S.background = new THREE.Color(0x07060c);
    // lights
    S.add(new THREE.HemisphereLight(0x8090ff, 0x201008, 0.35));
    const key = new THREE.SpotLight(0xfff1dd, 70, 30, 0.62, 0.55, 1.6); key.position.set(0.4, 9, 0.6); key.target.position.set(0, 0, 0);
    key.castShadow = this.q.shadows; key.shadow.mapSize.set(this.q.shadowSize, this.q.shadowSize); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.near = 4; key.shadow.camera.far = 14;
    S.add(key, key.target); this.key = key;
    const rimA = new THREE.SpotLight(0xff2f86, 26, 25, 0.5, 0.7, 1.4); rimA.position.set(-6, 5.5, -5); S.add(rimA, rimA.target);
    const rimB = new THREE.SpotLight(0x00e5ff, 26, 25, 0.5, 0.7, 1.4); rimB.position.set(6, 5.5, 5); S.add(rimB, rimB.target);
    const fillC = new THREE.SpotLight(0xffb000, 14, 25, 0.6, 0.8, 1.4); fillC.position.set(5, 4, -6); S.add(fillC, fillC.target);
    this.heatLight = new THREE.PointLight(0xff5a10, 0, 7, 1.6); this.heatLight.position.set(0, 0.5, 0); S.add(this.heatLight);

    // arena floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0b0a10, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.05; floor.receiveShadow = true; S.add(floor);
    // platform & apron
    const plat = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.0, 7.2), new THREE.MeshStandardMaterial({ color: 0x14121c, roughness: 0.7 }));
    plat.position.y = -0.52; plat.receiveShadow = true; S.add(plat);
    const skirt = canvasTexture(1024, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1a0010'); gr.addColorStop(.5, '#2a0030'); gr.addColorStop(1, '#001a22'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.font = '900 64px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff2f86'; g.shadowBlur = 18; g.fillStyle = '#ffe9f4'; g.fillText('NEONGLAZED  BRAWLSCAPE', w / 2, h / 2 + 4); });
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.9), new THREE.MeshStandardMaterial({ map: skirt, emissive: 0xffffff, emissiveMap: skirt, emissiveIntensity: 0.3, roughness: 0.6 })); const a = i * Math.PI / 2; m.position.set(Math.sin(a) * 3.61, -0.52, Math.cos(a) * 3.61); m.rotation.y = a; S.add(m); }
    // canvas mat
    const mat = canvasTexture(1024, 1024, (g, w, h) => {
      g.fillStyle = '#16323a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
      // centre donut logo
      g.save(); g.translate(w / 2, h / 2);
      g.lineWidth = 46; g.strokeStyle = 'rgba(255,170,0,.30)'; g.beginPath(); g.arc(0, 0, 150, 0, 7); g.stroke();
      g.lineWidth = 20; g.strokeStyle = 'rgba(255,47,134,.35)'; g.beginPath(); g.arc(0, 0, 150, 0.3, 2.6); g.stroke();
      g.font = '900 64px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,240,220,.22)'; g.fillText('NGB', 0, 0);
      g.font = '700 26px Arial, sans-serif'; g.fillText('THE GLAZED RING', 0, 230); g.fillText('WHERE FOOD BITES BACK', 0, -230);
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    });
    const canvasMat = new THREE.MeshStandardMaterial({ map: mat, roughness: 0.82, metalness: 0.0 });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 6.6), canvasMat); ring.rotation.x = -Math.PI / 2; ring.receiveShadow = true; S.add(ring);
    this.canvasMat = canvasMat;

    // BrawlScape overlay shader
    this.uni = { uTime: { value: 0 }, uHeat: { value: 0.42 }, uGlaze: { value: 0 }, uSteam: { value: 0 }, uScorch: { value: 0 }, uTrail: { value: 0.35 },
      uZones: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uSpills: { value: Array.from({ length: 10 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uMarks: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, 0, 0)) } };
    const ov = new THREE.ShaderMaterial({ uniforms: this.uni, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        varying vec2 vP; uniform float uTime,uHeat,uGlaze,uSteam,uScorch,uTrail; uniform vec4 uZones[4]; uniform vec4 uSpills[10]; uniform vec4 uMarks[12];
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec3 col = vec3(0.); float a = 0.;
          // NeonGlaze trails: organic veins
          vec2 p = vP*0.9; float n = noise(p*1.3 + vec2(uTime*0.05,0.));
          float v1 = abs(sin(p.x*2.1 + sin(p.y*1.7 + n*3.)*1.4)); float v2 = abs(sin(p.y*2.3 + sin(p.x*1.3 - n*2.)*1.2));
          float vein = smoothstep(0.06,0.0,v1)*0.8 + smoothstep(0.05,0.0,v2)*0.6;
          float pulse = 0.55+0.45*sin(uTime*2.2 - length(vP)*2.5);
          vec3 vcol = mix(vec3(1.,.67,0.), vec3(1.,.18,.52), 0.5+0.5*sin(length(vP)*1.7 - uTime*.6));
          col += vcol*vein*pulse*uTrail*1.6; a += vein*pulse*uTrail*0.9;
          // heat zones / burner coils
          for(int i=0;i<4;i++){ vec4 z=uZones[i]; if(z.w<=0.001) continue; float d=length(vP-z.xy); float m=smoothstep(z.z,z.z*0.15,d);
            float coil = smoothstep(0.08,0.0,abs(fract(d*3.2 - uTime*0.4)-0.5)-0.38);
            vec3 hc = mix(vec3(1.,.25,0.), vec3(1.,.75,.2), coil);
            col += hc*m*z.w*(0.55+0.6*coil); a += m*z.w*0.75; }
          // scorch tint
          float sc = uScorch*(0.4+0.6*noise(vP*2.+uTime*.2)); col += vec3(1.,.3,.05)*sc*0.35; a += sc*0.25;
          // glaze sheen
          float gl = uGlaze*(0.5+0.5*noise(vP*1.5)); col += vec3(1.,.62,.2)*gl*0.25; a += gl*0.22;
          // steam condensation
          col += vec3(.6,.85,1.)*uSteam*0.12*noise(vP*3.+uTime); a += uSteam*0.08;
          // caramel spills (amber gloss)
          for(int i=0;i<10;i++){ vec4 s=uSpills[i]; if(s.z<=0.001) continue; vec2 q=vP-s.xy; float ang=atan(q.y,q.x); float rr=s.z*(1.+0.18*sin(ang*5.+s.w)+0.1*sin(ang*3.-s.w*2.));
            float m=smoothstep(rr,rr*0.85,length(q)); float hl=pow(max(0.,1.-length(q-vec2(rr*.25,-rr*.3))/(rr*.5)),3.);
            col = mix(col, vec3(.62,.30,.04)+hl*vec3(1.,.8,.4), m*0.92); a = max(a, m*0.9); }
          // ring memory: scorch marks from past fights
          for(int i=0;i<12;i++){ vec4 mk=uMarks[i]; if(mk.z<=0.001) continue; float d=length(vP-mk.xy); float m=smoothstep(mk.z,0.,d)*(0.6+0.4*noise(vP*6.)); col = mix(col, vec3(0.05,0.03,0.02), m*0.8); a=max(a,m*0.7); }
          gl_FragColor = vec4(col, clamp(a,0.,1.));
        }` });
    const ovm = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), ov); ovm.rotation.x = -Math.PI / 2; ovm.position.y = 0.004; ovm.renderOrder = 1; S.add(ovm);

    // posts, pads, ropes
    const postMat = new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 });
    const corners = [[1, 1, 0xff2f86], [-1, 1, 0xffffff], [-1, -1, 0x00e5ff], [1, -1, 0xffffff]];
    const C = 2.95;
    for (const [sx, sz, c] of corners) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.75, 12), postMat); post.position.set(sx * C, 0.85 - 0.05, sz * C); post.castShadow = true; S.add(post);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.25, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.12, roughness: 0.4 })); pad.position.set(sx * (C - 0.04), 0.95, sz * (C - 0.04)); S.add(pad);
      this.vents.push(new THREE.Vector3(sx * (C - 0.12), 1.62, sz * (C - 0.12)));
    }
    const ropeCols = [0xff2f86, 0xffffff, 0x00e5ff, 0xffb000];
    [0.42, 0.78, 1.14, 1.5].forEach((y, i) => {
      const pts = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([x, z]) => new THREE.Vector3(x * C, y, z * C));
      for (let k = 0; k < 4; k++) {
        const a = pts[k], b = pts[(k + 1) % 4]; const mid = a.clone().lerp(b, 0.5); mid.y -= 0.03;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.022, 8, false), new THREE.MeshStandardMaterial({ color: ropeCols[i], emissive: ropeCols[i], emissiveIntensity: 0.35, roughness: 0.3 }));
        S.add(rope);
      }
    });
    // truss lights above
    const truss = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.06, 6, 64), new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.9, roughness: 0.3 })); truss.rotation.x = Math.PI / 2; truss.position.y = 7.4; S.add(truss);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xb8ad9c });
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 12), lampMat); l.position.set(Math.cos(a) * 4.6, 7.25, Math.sin(a) * 4.6); S.add(l); }
    // jumbotron
    const jt = canvasTexture(1024, 256, (g, w, h) => { g.fillStyle = '#05040a'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff2f86'); gr.addColorStop(.5, '#ffb000'); gr.addColorStop(1, '#00e5ff'); g.fillStyle = gr; g.font = '900 92px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THE GLAZED RING', w / 2, h / 2 - 20); g.font = '700 34px Arial'; g.fillStyle = '#fff'; g.fillText('WIR PRESENTS · NEONGLAZED BRAWLSCAPE', w / 2, h / 2 + 62); });
    const jMat = new THREE.MeshBasicMaterial({ map: jt });
    const jb = new THREE.Group(); for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), jMat); const a = i * Math.PI / 2; m.position.set(Math.sin(a) * 1.3, 0, Math.cos(a) * 1.3); m.rotation.y = a; jb.add(m); }
    jb.position.y = 8.6; S.add(jb); this.jumbo = jb;
    // crowd
    this.buildCrowd();
    this.overlay = ovm;
  }
  buildCrowd() {
    const body = new THREE.CapsuleGeometry(0.22, 0.5, 3, 8); body.translate(0, 0.5, 0);
    const head = new THREE.SphereGeometry(0.15, 8, 6); head.translate(0, 1.08, 0);
    const merged = mergeGeoms([body, head]);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, envMapIntensity: 0.1 });
    const N = this.q.crowd; const im = new THREE.InstancedMesh(merged, mat, N); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const pal = [0x2a2440, 0x3a2030, 0x1e3038, 0x4a3a2a, 0x302838, 0x5a2a40, 0x203a48, 0x60482a];
    this.crowd = []; const col = new THREE.Color(); const m4 = new THREE.Matrix4();
    let k = 0;
    for (let tier = 0; tier < 6 && k < N; tier++) {
      const R = 5.2 + tier * 1.05; const y = -1.05 + tier * 0.45; const n = Math.floor(2 * Math.PI * R / 0.62);
      for (let i = 0; i < n && k < N; i++) {
        const a = i / n * Math.PI * 2 + tier * 0.17; const rr = R + (Math.random() - 0.5) * 0.2;
        this.crowd.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, y, a, ph: Math.random() * 6, s: 0.9 + Math.random() * 0.25 });
        col.setHex(pal[(Math.random() * pal.length) | 0]).multiplyScalar(0.18 + Math.random() * 0.22); im.setColorAt(k, col);
        k++;
      }
    }
    im.count = k; this.crowdMesh = im; this.scene.add(im); this.hype = 0.2;
    // phone-light sparkles
    const pg = new THREE.BufferGeometry(); const pp = []; for (let i = 0; i < 160; i++) { const c = this.crowd[(Math.random() * this.crowd.length) | 0]; pp.push(c.x, c.y + 1.4, c.z); }
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    this.sparkles = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xfff0d0, size: 0.06, transparent: true, opacity: 0.0 })); this.scene.add(this.sparkles);
  }
  setCondition(name, k) { this.condName = name; this.condK = k; }
  update(dt, st) {
    this.t += dt; const u = this.uni; u.uTime.value = this.t;
    // st: {glaze, steam, scorch, trail, zones, spills, marks, heat}
    u.uGlaze.value += (st.glaze - u.uGlaze.value) * Math.min(1, dt * 2); u.uSteam.value += (st.steam - u.uSteam.value) * Math.min(1, dt * 2); u.uScorch.value += (st.scorch - u.uScorch.value) * Math.min(1, dt * 2); u.uTrail.value += (st.trail - u.uTrail.value) * Math.min(1, dt * 2);
    for (let i = 0; i < 4; i++) { const z = st.zones[i]; if (z) u.uZones.value[i].set(z.x, z.z, z.r, z.k); else u.uZones.value[i].w = 0; }
    for (let i = 0; i < 10; i++) { const s = st.spills[i]; if (s) u.uSpills.value[i].set(s.x, s.z, s.r, s.seed); else u.uSpills.value[i].z = 0; }
    for (let i = 0; i < 12; i++) { const m = st.marks[i]; if (m) u.uMarks.value[i].set(m.x, m.z, m.r, 0); else u.uMarks.value[i].z = 0; }
    this.heatLight.intensity = (u.uScorch.value * 12 + st.zones.reduce((a, z) => a + (z ? z.k : 0), 0) * 3);
    // crowd
    this.hype += ((st.hype || 0.2) - this.hype) * Math.min(1, dt * 1.5);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const amp = 0.03 + this.hype * 0.22, sp = 3 + this.hype * 6;
    for (let i = 0; i < this.crowd.length; i++) { const c = this.crowd[i]; const b = Math.max(0, Math.sin(this.t * sp + c.ph)) * amp; p.set(c.x, c.y + b, c.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -c.a - Math.PI / 2); sc.setScalar(c.s); m4.compose(p, q, sc); this.crowdMesh.setMatrixAt(i, m4); }
    this.crowdMesh.instanceMatrix.needsUpdate = true;
    this.sparkles.material.opacity = 0.25 + this.hype * 0.6 * (0.6 + 0.4 * Math.sin(this.t * 13));
    this.jumbo.rotation.y += dt * 0.08;
  }
}

function mergeGeoms(geos) {
  let pos = [], nor = [], idx = [], off = 0;
  for (const g of geos) { const gi = g.index ? g : g; const p = g.attributes.position.array, n = g.attributes.normal.array; pos.push(...p); nor.push(...n); const ix = g.index ? g.index.array : [...Array(p.length / 3).keys()]; for (const i of ix) idx.push(i + off); off += p.length / 3; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx); return out;
}
