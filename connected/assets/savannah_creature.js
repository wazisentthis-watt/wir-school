// ============================================================================
// SAVANNAH PREDATOR — a rigged wild cat that wanders the field (PROPOSAL / HOLD)
// Uses the creature's own clips: Idle, Walk. It stays near its home point, pauses,
// and turns to face where it is going. It does not attack: fights are a later step.
export function makeWildCat(gltf, THREEref, home, { radius = 11, speed = 1.5, scale = 1 } = {}) {
  const T = THREEref;
  const o = gltf.scene;
  o.scale.setScalar(scale);
  o.traverse(m => { if (m.isMesh) m.castShadow = true; });
  o.position.copy(home);
  const mixer = new T.AnimationMixer(o);
  const acts = {};
  for (const clip of gltf.animations || []) acts[clip.name] = mixer.clipAction(clip);
  let current = null;
  const play = (name) => {
    const next = acts[name] || null;
    if (!next || next === current) return;
    if (current) current.fadeOut(.25);
    next.reset().fadeIn(.25).play();
    current = next;
  };
  const state = { mode: 'idle', wait: 1 + Math.random() * 2, target: home.clone() };
  const pickTarget = () => {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
    state.target.set(home.x + Math.cos(a) * r, home.y, home.z + Math.sin(a) * r);
  };
  play('Idle');
  return {
    o,
    update(dt) {
      mixer.update(dt);
      if (state.mode === 'idle') {
        play('Idle');
        state.wait -= dt;
        if (state.wait <= 0) { pickTarget(); state.mode = 'walk'; }
        return;
      }
      const to = state.target.clone().sub(o.position); to.y = 0;
      const dist = to.length();
      if (dist < .3) { state.mode = 'idle'; state.wait = 2 + Math.random() * 3; return; }
      to.normalize();
      o.position.addScaledVector(to, Math.min(speed * dt, dist));
      o.rotation.y = Math.atan2(to.x, to.z);
      play('Walk');
    },
  };
}
