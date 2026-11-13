// Chase camera rules for a two-fighter fight. Pure functions, no DOM or three.js.
// Clean-room: written for WIR Connected from the behaviour, not copied from any other build.

export const CAM = {
  sideOffsetRad: 0.42,   // how far the camera swings behind the fight axis
  minDist: 6.5,
  maxDist: 22,
  baseDist: 5.2,
  sepScale: 0.72,        // extra distance per metre of separation
  pullBackCap: 8,        // most the framing guard can add
  edgeLatMax: 0.6,       // lateral/depth ratio that counts as drifting off screen
  edgeLatScale: 0.55,
};

export function angDiff(a, b) {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// Yaw of the camera's forward vector on the ground plane. Forward is (sin yaw, cos yaw).
export function yawOf(fx, fz) {
  return Math.atan2(fx, fz);
}

// Pick the camera side across the fight axis that needs the least turn from the current yaw.
// (ux, uz) is the unit vector from fighter A to fighter B on the ground plane.
export function sideYaw(currentYaw, ux, uz, offset = CAM.sideOffsetRad) {
  const left = { x: -uz, z: ux };  // perpendicular to the fight axis
  const cands = [1, -1].map((s) => {
    const fx = s * left.x * Math.cos(offset) + ux * Math.sin(offset);
    const fz = s * left.z * Math.cos(offset) + uz * Math.sin(offset);
    return yawOf(fx, fz);
  });
  return Math.abs(angDiff(currentYaw, cands[0])) <= Math.abs(angDiff(currentYaw, cands[1]))
    ? cands[0]
    : cands[1];
}

// How far the camera must pull back so no target drifts toward the screen edge.
// cam = {x, z}; targets = [{x, z}]; yaw = current camera yaw.
export function framingNeed(cam, yaw, targets, cfg = CAM) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let need = 0;
  for (const t of targets) {
    const rx = t.x - cam.x, rz = t.z - cam.z;
    const depth = rx * fx + rz * fz;             // distance in front of the camera
    const lat = Math.abs(rx * fz - rz * fx);     // distance off the centre line
    if (depth < 1.5 || lat / Math.max(depth, 0.1) > cfg.edgeLatMax) {
      need = Math.max(need, lat / cfg.edgeLatScale - depth);
    }
  }
  return need;
}

// Camera distance from the fight. punch in [0,1] tightens the frame briefly after a big hit.
export function cameraDistance({ separation, pullBack = 0, punch = 0 }, cfg = CAM) {
  const raw = cfg.baseDist + separation * cfg.sepScale + Math.min(pullBack, cfg.pullBackCap);
  const clamped = Math.min(cfg.maxDist, Math.max(cfg.minDist, raw));
  return clamped * (1 - punch * 0.35);
}

export function lerp(a, b, k) { return a + (b - a) * k; }
export function clamp01(x) { return Math.max(0, Math.min(1, x)); }
