// Parse FBX files with three's FBXLoader in node and report skeleton + clip info
import fs from 'fs';
import path from 'path';
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {}, getContext: () => null, addEventListener(){} }), createElement: () => ({ style: {}, getContext: () => null, addEventListener(){} }) };
globalThis.Image = class {};
const THREE = await import('three');
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');

export async function load(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new FBXLoader();
  const origWarn = console.warn; console.warn = () => {};
  try { return loader.parse(ab, ''); } finally { console.warn = origWarn; }
}
export { THREE };

if (process.argv[1].endsWith('inspect.mjs')) {
  for (const f of process.argv.slice(2)) {
    try {
      const obj = await load(f);
      let bones = 0, meshes = 0, hips = null;
      obj.traverse(o => { if (o.isBone) { bones++; if (/Hips$/.test(o.name)) hips = o; } if (o.isMesh || o.isSkinnedMesh) meshes++; });
      const c = obj.animations[0];
      console.log(path.basename(f), '| bones', bones, '| meshes', meshes, '| clips', obj.animations.length,
        c ? `| ${c.name} ${c.duration.toFixed(2)}s tracks ${c.tracks.length}` : '', '| hips', hips && hips.name, hips && hips.position.toArray().map(v=>v.toFixed(1)).join(','), '| scale', obj.scale.x);
    } catch (e) { console.log(path.basename(f), 'ERR', e.message); }
  }
}
