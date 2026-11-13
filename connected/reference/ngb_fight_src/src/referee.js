// The third man in the ring: keeps position off the fighters' line, walks to the downed fighter and counts.
import * as THREE from 'three';
import { buildSkeleton, createFighterMesh, REF_SPEC } from './rig.js';
import { solveTwoBone } from './anim.js';
import { RING } from './arena.js';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Referee {
  constructor(game) {
    this.game = game; this.lib = game.lib;
    this.skel = buildSkeleton(game.data, 1.0);
    this.mesh = createFighterMesh(this.skel, REF_SPEC);
    this.root = this.skel.root; this.root.add(this.mesh.group);
    this.pos = new THREE.Vector3(1.6, 0, 0); this.yaw = -Math.PI / 2; this.t = Math.random() * 4; this.pose = this.lib.newPose(); this.vel = new THREE.Vector3();
  }
  reset() { this.pos.set(1.7, 0, 0); this.vel.set(0, 0, 0); this.snap = true; }
  update(dt) {
    const g = this.game, [A, B] = g.f; if (!A) return;
    const c = g.count;
    let target, look;
    if (c && g.phase === 'down') { // stand over the downed fighter, between him and the other man
      const f = c.f, o = g.opponentOf(f); const away = o.pos.clone().sub(f.pos).setY(0); if (away.lengthSq() < 1e-4) away.set(0, 0, 1); away.normalize();
      target = f.pos.clone().addScaledVector(away, 0.95); look = f.pos;
    } else if (g.phase === 'end' && g.result && g.result.winner) {
      const w = g.result.winner; target = w.pos.clone().add(new THREE.Vector3(0.55, 0, 0.2)); look = w.pos;
    } else {
      const mid = A.pos.clone().lerp(B.pos, 0.5); const line = B.pos.clone().sub(A.pos).setY(0); if (line.lengthSq() < 1e-4) line.set(0, 0, 1); line.normalize();
      const perp = new THREE.Vector3(-line.z, 0, line.x); const cam = g.camPos ? g.camPos.clone().sub(mid).setY(0) : this.pos.clone().sub(mid).negate(); if (perp.dot(cam) > 0) perp.negate(); // far side from the camera
      target = mid.clone().addScaledVector(perp, 1.6); look = mid;
      // if pinned against the ropes, swap sides
      const lim = RING - 0.35; if (Math.abs(target.x) > lim || Math.abs(target.z) > lim) { target = mid.clone().addScaledVector(perp, 1.1).addScaledVector(line, 0.6); }
    }
    const lim = RING - 0.35; target.x = clamp(target.x, -lim, lim); target.z = clamp(target.z, -lim, lim);
    if (this.snap) { this.pos.copy(target); this.snap = false; }
    { // never walk through the fighters: if the target is across their line, go around the end of it
      const mid = A.pos.clone().lerp(B.pos, 0.5); const line = B.pos.clone().sub(A.pos).setY(0).normalize(); const perp = new THREE.Vector3(-line.z, 0, line.x);
      const a = perp.dot(this.pos.clone().sub(mid)), b = perp.dot(target.clone().sub(mid));
      if (a * b < 0 && Math.abs(a) > 0.25 && !(c && g.phase === 'down')) { const endSide = Math.sign(line.dot(this.pos.clone().sub(mid))) || 1; target = mid.clone().addScaledVector(line, endSide * 1.75).addScaledVector(perp, Math.sign(a) * 0.3); target.x = clamp(target.x, -lim, lim); target.z = clamp(target.z, -lim, lim); }
    }
    // keep clear of fighters
    for (const f of g.f) { const d = this.pos.clone().sub(f.pos).setY(0); const l = d.length(); if (l < 0.75 && l > 1e-3 && f.state !== 'down') this.pos.addScaledVector(d.normalize(), (0.75 - l) * 0.5); }
    const to = target.clone().sub(this.pos).setY(0); const dist = to.length();
    const want = dist > 0.08 ? to.normalize().multiplyScalar(Math.min(2.0, dist * 2.2)) : new THREE.Vector3();
    this.vel.lerp(want, 1 - Math.exp(-6 * dt)); this.pos.addScaledVector(this.vel, dt);
    const lp = look.clone().sub(this.pos); const wy = Math.atan2(lp.x, lp.z); let dy = wy - this.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; this.yaw += dy * (1 - Math.exp(-5 * dt));
    // relaxed standing take, walking bob when moving
    const spd = this.vel.length(); this.t += dt * (0.5 + spd * 0.8);
    this.lib.sample('celebrate', 0.4 + (this.t % 2.6) * 0.3, this.pose, 0);
    this.lib.apply(this.pose, this.skel, 1);
    this.root.position.copy(this.pos); this.root.position.y += Math.abs(Math.sin(this.t * 7)) * Math.min(0.03, spd * 0.02);
    this.root.rotation.set(0, this.yaw, 0); this.root.updateMatrixWorld(true);
    const Bn = this.skel.bones; const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    // count gesture: right arm chops down once per count
    if (c && g.phase === 'down' && c.t > 0 && !(c.f.downInfo && c.f.downInfo.rising)) {
      Bn.Spine1.rotateX(0.25); Bn.Spine1.updateMatrixWorld(true);
      const ph = c.t % 1; const k = ph < 0.25 ? 1 - ph / 0.25 : (ph - 0.25) / 0.75; // fast down, slow back up
      const sh = Bn.RightArm.getWorldPosition(new THREE.Vector3());
      const tgt = sh.clone().addScaledVector(fwd, 0.42).addScaledVector(right, -0.12).add(new THREE.Vector3(0, -0.35 + 0.6 * k, 0));
      solveTwoBone(Bn.RightArm, Bn.RightForeArm, Bn.RightHand, tgt, sh.clone().addScaledVector(right, -0.4).add(new THREE.Vector3(0, -0.3, 0)), 1);
    } else if (g.phase === 'intro' || (g.phase === 'fight' && g.phaseT < 0.6)) { // "Box!" — both arms sweep between the fighters
      for (const [s, sx] of [['Left', 1], ['Right', -1]]) { const sh = Bn[s + 'Arm'].getWorldPosition(new THREE.Vector3()); const tgt = sh.clone().addScaledVector(fwd, 0.5).addScaledVector(right, 0.15 * sx).add(new THREE.Vector3(0, -0.1, 0)); solveTwoBone(Bn[s + 'Arm'], Bn[s + 'ForeArm'], Bn[s + 'Hand'], tgt, sh.clone().addScaledVector(right, 0.5 * sx).add(new THREE.Vector3(0, -0.4, 0)), 0.9); }
    } else if (g.phase === 'end' && g.result && g.result.winner) { // raise the winner's hand
      const sh = Bn.LeftArm.getWorldPosition(new THREE.Vector3()); solveTwoBone(Bn.LeftArm, Bn.LeftForeArm, Bn.LeftHand, sh.clone().add(new THREE.Vector3(0, 0.55, 0)).addScaledVector(right, 0.15), sh.clone().addScaledVector(right, 0.5), 1);
    }
  }
}
