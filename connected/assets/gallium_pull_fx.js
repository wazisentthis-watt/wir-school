// ============================================================================
// GALAXY GALLIUM PULL — liquid streams from metal into Metal (PROPOSAL / HOLD)
// Replaces the lavender matter-flecks. Each active draw source (car, lamp, rail,
// coping, puddle, scrap) gets a liquid tube that peels off its surface and runs
// into Metal's chest, thick at the source and thinning as it reaches him, with
// a pulse flowing toward him and beads of liquid riding the line.
// Visual only: the rules (rates, reserves, caps) stay in metal_draw_core.mjs.
import {galliumLiquidMat,GU} from './gallium_limb.js';

const MAX_STREAMS = 6;   // strongest sources drawn at once
const SEG = 14, RAD = 8; // tube resolution
const BEADS = 3;         // beads per stream

export function makePullStreams(scene, THREEref) {
  const T = THREEref;
  const mat = galliumLiquidMat({ transmission: 0, opacity: .96, emissive: 0x6a3cff, emissiveIntensity: .35 });
  const beadMat = galliumLiquidMat({ transmission: 0, opacity: .98, emissive: 0x9b6bff, emissiveIntensity: .5 });
  const beadGeo = new T.SphereGeometry(.07, 10, 8);
  const blobGeo = new T.SphereGeometry(1, 14, 10);
  const pool = [];
  for (let i = 0; i < MAX_STREAMS; i++) {
    const mesh = new T.Mesh(new T.BufferGeometry(), mat);
    mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
    const beads = [];
    for (let b = 0; b < BEADS; b++) { const m = new T.Mesh(beadGeo, beadMat); m.visible = false; scene.add(m); beads.push(m); }
    const blob = new T.Mesh(blobGeo, mat); blob.visible = false; scene.add(blob);
    pool.push({ mesh, beads, blob });
  }
  const tmpA = new T.Vector3(), tmpB = new T.Vector3(), side = new T.Vector3(), up = new T.Vector3(), dir = new T.Vector3();

  // curve sampler: source -> chest, with a sagging wobble that settles toward Metal
  function pointAt(S, E, u, time, k) {
    const p = new T.Vector3().lerpVectors(S, E, u);
    const env = Math.sin(Math.PI * u);
    // gentle, smooth sag and a slow sway; no fast zigzag
    p.y += -.22 * env;
    p.x += Math.sin(u * 3.1 + time * 2.3 + k) * .07 * env;
    p.z += Math.cos(u * 2.7 + time * 1.9 + k * 1.3) * .07 * env;
    return p;
  }

  function buildTube(mesh, S, E, time, k, amount) {
    const pos = [], idx = [];
    dir.subVectors(E, S); const L = dir.length() || 1e-3; dir.normalize();
    side.crossVectors(dir, new T.Vector3(0, 1, 0)); if (side.lengthSq() < .01) side.set(1, 0, 0); side.normalize();
    up.crossVectors(side, dir).normalize();
    const base = .16 + Math.min(.16, amount * 2); // a visible rope, fatter when it draws more
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const c = pointAt(S, E, u, time, k);
      const pulse = Math.exp(-((u - ((time * 1.4 + k * .17) % 1)) ** 2) * 120); // bulge flowing toward Metal
      const r = T.MathUtils.lerp(base, .04, Math.pow(u, .8)) * (1 + .3 * pulse + .03 * Math.sin(u * 14 - time * 6 + k));
      for (let j = 0; j <= RAD; j++) {
        const th = j / RAD * Math.PI * 2;
        const rr = r * (1 + .06 * Math.sin(th * 3 + u * 9 - time * 6));
        const x = c.x + (side.x * Math.cos(th) + up.x * Math.sin(th)) * rr;
        const y = c.y + (side.y * Math.cos(th) + up.y * Math.sin(th)) * rr;
        const z = c.z + (side.z * Math.cos(th) + up.z * Math.sin(th)) * rr;
        pos.push(x, y, z);
      }
    }
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * (RAD + 1) + j, b = a + RAD + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = mesh.geometry;
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    mesh.visible = true;
  }

  return {
    // streams: [{src:{x,y,z}, amount}] from metal_draw_core stepDraw; me: Metal's chest point
    update(streams, me, time, dt, bounds) {
      GU.value = time;
      const list = streams.slice().sort((a, b) => b.amount - a.amount).slice(0, MAX_STREAMS);
      for (let i = 0; i < MAX_STREAMS; i++) {
        const s = pool[i];
        if (i >= list.length) { s.mesh.visible = false; s.blob.visible = false; s.beads.forEach(b => b.visible = false); continue; }
        const st = list[i];
        const S = tmpA.set(st.src.x, st.src.y, st.src.z);
        const E = tmpB.set(me.x, me.y, me.z);
        buildTube(s.mesh, S, E, time, i, st.amount || 0);
        const pulse = 1 + .18 * Math.sin(time * 13 + i);
        s.blob.position.copy(S);
        s.blob.scale.setScalar((.18 + Math.min(.2, (st.amount || 0) * 2)) * pulse);
        s.blob.visible = true;
        for (let b = 0; b < BEADS; b++) {
          const u = (time * .9 + i * .21 + b / BEADS) % 1;
          const p = pointAt(S, E, u, time, i);
          s.beads[b].position.copy(p);
          s.beads[b].scale.setScalar(.7 + .3 * Math.sin(time * 20 + b));
          s.beads[b].visible = true;
        }
      }
    },
    visibleCount() { return pool.filter(s => s.mesh.visible).length; },
    clear() { pool.forEach(s => { s.mesh.visible = false; s.blob.visible = false; s.beads.forEach(b => b.visible = false); }); },
  };
}
