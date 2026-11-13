import { load, THREE } from './inspect.mjs';
for (const f of process.argv.slice(2)) {
  const o = await load(f); o.updateMatrixWorld(true);
  const p = n => { let b; o.traverse(x=>{ if(x.isBone && x.name.replace(/^mixamorig:?/,'')===n && !b) b=x; }); if(!b) return 'NA'; const v=new THREE.Vector3(); b.getWorldPosition(v); return v.toArray().map(a=>a.toFixed(1)).join(','); };
  console.log(f.split('/').pop(), ['Hips','Head','LeftHand','RightHand','LeftFoot','RightFoot','LeftArm'].map(n=>n+'['+p(n)+']').join(' '));
}
