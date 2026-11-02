// Read-only GLTF diagnostics. Does not alter the live character or animations.
export function inspectRig(gltf) {
  const bones=[],meshes=[],skins=[],clips=[];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{
    if(o.isBone)bones.push({name:o.name,parent:o.parent?.name||null});
    if(o.isMesh){
      meshes.push({name:o.name,vertices:o.geometry?.attributes?.position?.count||0,skinned:!!o.isSkinnedMesh});
      if(o.isSkinnedMesh)skins.push({mesh:o.name,bones:o.skeleton?.bones?.map(b=>b.name)||[],influences:o.geometry?.attributes?.skinIndex?.itemSize||0});
    }
  });
  for(const clip of gltf.animations||[])clips.push({name:clip.name,duration:clip.duration,tracks:clip.tracks.length});
  const names=new Set(bones.map(b=>b.name.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const roles={hips:['hips','pelvis'],spine:['spine','spine1','chest'],head:['head'],leftFoot:['leftfoot','footl','deffootl'],rightFoot:['rightfoot','footr','deffootr'],leftHand:['lefthand','handl','defhandl'],rightHand:['righthand','handr','defhandr']};
  const mapped=Object.fromEntries(Object.entries(roles).map(([role,aliases])=>[role,aliases.some(n=>names.has(n))]));
  return {bones,meshes,skins,clips,mapped,hasSkinnedMesh:skins.length>0,animated:clips.length>0};
}
export function compareRigs(driver,visual){
  const d=inspectRig(driver),v=inspectRig(visual);
  const shared=d.bones.map(b=>b.name).filter(n=>v.bones.some(x=>x.name===n));
  return {driver:{bones:d.bones.length,clips:d.clips.length,skinned:d.hasSkinnedMesh},visual:{bones:v.bones.length,clips:v.clips.length,skinned:v.hasSkinnedMesh},sharedBones:shared,missingRoles:Object.keys(v.mapped).filter(k=>!v.mapped[k]),recommendation:!v.hasSkinnedMesh?'RIG_AND_WEIGHT_FIRST':shared.length>=12?'TEST_DIRECT_BONE_TRANSFER':'BUILD_RETARGET_MAP'};
}
