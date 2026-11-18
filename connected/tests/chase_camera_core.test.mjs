import test from 'node:test';
import assert from 'node:assert/strict';
import { angDiff, yawOf, sideYaw, framingNeed, cameraDistance, CAM } from '../assets/chase_camera_core.mjs';

test('angDiff wraps the short way round', () => {
  assert.ok(Math.abs(angDiff(0.1, 2 * Math.PI - 0.1) - (-0.2)) < 1e-9);
  assert.ok(Math.abs(angDiff(0, Math.PI / 2) - Math.PI / 2) < 1e-9);
});

test('side choice picks the candidate nearest the current yaw (no 180 flips)', () => {
  const a = sideYaw(-0.3, 1, 0);
  assert.ok(Math.abs(a - 0.42) < 1e-6, 'nearest side is the +offset side');
  const b = sideYaw(Math.PI - 0.3, 1, 0);
  assert.ok(Math.abs(b - (Math.PI - 0.42)) < 1e-6, 'stays on its own side instead of flipping');
  assert.ok(Math.abs(angDiff(Math.PI - 0.3, b)) < Math.PI / 2);
});

test('framing guard is zero when both fighters are centred in front', () => {
  const yaw = 0; // looking down +z
  const need = framingNeed({ x: 0, z: 0 }, yaw, [{ x: 0, z: 6 }, { x: 0.5, z: 8 }]);
  assert.ok(need <= 0, `expected no pull back, got ${need}`);
});

test('framing guard pulls back when a fighter drifts toward the edge', () => {
  const need = framingNeed({ x: 0, z: 0 }, 0, [{ x: 9, z: 4 }]);
  assert.ok(need > 0, 'a fighter far to the side should trigger a pull back');
});

test('framing guard pulls back when a fighter is behind the camera', () => {
  const need = framingNeed({ x: 0, z: 0 }, 0, [{ x: 0, z: -3 }]);
  assert.ok(need > 0);
});

test('camera distance grows with separation, stays in its band, and tightens on punch', () => {
  const near = cameraDistance({ separation: 0 });
  const far = cameraDistance({ separation: 40 });
  assert.equal(near, CAM.minDist);
  assert.equal(far, CAM.maxDist);
  const mid = cameraDistance({ separation: 3 });
  assert.ok(mid > CAM.minDist && mid < CAM.maxDist);
  assert.ok(cameraDistance({ separation: 3, punch: 1 }) < mid);
});

test('yawOf matches the forward convention (sin yaw, cos yaw)', () => {
  assert.ok(Math.abs(yawOf(0, 1)) < 1e-9);
  assert.ok(Math.abs(yawOf(1, 0) - Math.PI / 2) < 1e-9);
});
