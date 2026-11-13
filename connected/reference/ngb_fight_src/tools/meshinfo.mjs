import { load } from './inspect.mjs';
for (const f of process.argv.slice(2)) {
  const o = await load(f);
  o.traverse(m => { if (m.isMesh) { const g=m.geometry; console.log(f.split('/').pop(), m.name, m.type, 'verts', g.attributes.position.count, 'idx', g.index? g.index.count:0, 'groups', g.groups.length, 'mat', [].concat(m.material).map(x=>x.name+':'+x.color?.getHexString()).join(' '), 'attrs', Object.keys(g.attributes).join(',')); if (m.isSkinnedMesh) console.log('  skeleton bones', m.skeleton.bones.length); g.computeBoundingBox(); console.log('  bbox', g.boundingBox.min.toArray().map(v=>v.toFixed(1)), g.boundingBox.max.toArray().map(v=>v.toFixed(1)));} });
  const names=[]; o.traverse(b=>{ if(b.isBone) names.push(b.name)}); console.log(names.join(' '));
  const c=o.animations[0]; console.log(c.tracks.slice(0,8).map(t=>t.name+':'+t.times.length).join(' | '));
}
