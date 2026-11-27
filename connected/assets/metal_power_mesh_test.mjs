// ORIGINAL-WIR / PROPOSAL / PUBLISH HOLD. Visuals only: no damage, resource or movement writes.
export const POWER_IDS=['gallium','armor','weight','crown','diamond','swing','electron','roar','sword'];
const names={gallium:'Gallium manipulation',armor:'Galaxy Gallium',weight:'Extreme weight',crown:'Crown pressure',diamond:'Diamond creation',swing:'Gallium swing',electron:'Electron charging',roar:'Lion roar',sword:'Galaxy sword'};
const alias={
 Hand_R:['Hand_R','RightHand','hand_r','HandR','Hand.R','mixamorigRightHand'],
 Head:['Head','head','mixamorigHead'],
 Chest:['Chest','Spine2','Spine1','UpperChest','chest','spine_03','mixamorigSpine2'],
 Hips:['Hips','hips','pelvis','mixamorigHips'],
 UpperArm_L:['UpperArm_L','LeftUpperArm','upperarm_l','LeftArm','mixamorigLeftArm','UpperArm.L'],
 UpperArm_R:['UpperArm_R','RightUpperArm','upperarm_r','RightArm','mixamorigRightArm','UpperArm.R'],
 Forearm_L:['Forearm_L','LeftLowerArm','lowerarm_l','LeftForeArm','mixamorigLeftForeArm','Forearm.L'],
 Forearm_R:['Forearm_R','RightLowerArm','lowerarm_r','RightForeArm','mixamorigRightForeArm','Forearm.R'],
 Shin_L:['Shin_L','LeftLowerLeg','calf_l','LeftLeg','mixamorigLeftLeg','Shin.L'],
 Shin_R:['Shin_R','RightLowerLeg','calf_r','RightLeg','mixamorigRightLeg','Shin.R']
};
const norm=s=>String(s||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
export function resolvePowerBone(model,name){
 const options=alias[name]||[name];
 for(const n of options){const o=model?.getObjectByName(n);if(o?.isBone)return o;}
 let found=null;model?.traverse(o=>{if(!found&&o.isBone&&options.some(n=>norm(n)===norm(o.name)))found=o;});return found;
}
export function choosePowerVisuals(state,preview=null){
 if(preview)return POWER_IDS.includes(preview)?[preview]:[];
 return POWER_IDS.filter(id=>({sword:state.sword,armor:state.armor,electron:state.charge,swing:state.swing,gallium:state.grip})[id]);
}
export function validatePowerAsset(gltf){
 const defs=gltf?.parser?.json?.extras?.WIR_power_manifest;
 if(!defs||Object.keys(defs).length!==9||!POWER_IDS.every(id=>Array.isArray(defs[id])&&defs[id].length>0))throw Error('Not the WIR power attachment GLB');
 const seen=new Set();
 for(const id of POWER_IDS)for(const part of defs[id]){
  if(typeof part.node!=='string'||!part.node.startsWith('WIR_POWER_'+id+'_')||seen.has(part.node)||!gltf.scene.getObjectByName(part.node)||!(part.bone==='Root'||alias[part.bone])||![[part.position,3],[part.scale,3],[part.rotation,4]].every(([v,n])=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite))||part.scale.some(x=>x<=0||x>5))throw Error('Invalid power attachment: '+part.node);
  seen.add(part.node);
 }
 if(seen.size!==27)throw Error('Expected 27 attachments');
 return defs;
}
export function mountConnectedPowerVisuals({THREE,loader,scene,getPlayer,getState}){
 let source=null,defs=null,model=null,entries=[],preview=null,loadToken=0,dead=false,hiddenSword=null,lastMissing=[],report='';
 const root=document.createElement('div');root.className='wir-keep';root.id='wirPowerMeshTest';root.style.cssText='position:fixed;left:12px;top:calc(75px + env(safe-area-inset-top,0px));max-width:min(320px,88vw);z-index:90;color:#f6efff;font:12px system-ui;pointer-events:auto';
 const top=document.createElement('button');top.textContent='3D POWER ASSETS · TEST';top.type='button';
 const panel=document.createElement('div');panel.hidden=true;panel.style.cssText='background:#161326f5;border:1px solid #8270b8;border-radius:12px;padding:10px;max-height:65vh;overflow:auto';
 const note=document.createElement('p');note.textContent='PROPOSAL / PUBLISH HOLD. Choose Metal_Power_Visuals.glb. Live mode follows authorized gameplay; preview only displays meshes.';
 const input=document.createElement('input');input.type='file';input.accept='.glb';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='No asset loaded. Original game visuals remain.';
 const buttons=document.createElement('div');buttons.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:5px';
 const controls=[];
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='background:#30274c;color:white;border:1px solid #8874c2;border-radius:8px;padding:8px;min-height:38px';b.onclick=fn;return b;}
 const live=button('FOLLOW GAME',()=>{preview=null;});const clear=button('UNLOAD ASSETS',()=>{loadToken++;detach();release(source);source=null;defs=null;preview=null;report='No asset loaded.';input.value='';status.textContent=report;});
 for(const id of POWER_IDS){const b=button(names[id],()=>{preview=id;});controls.push(b);buttons.append(b);}
 panel.append(note,input,live,clear,buttons,status);root.append(top,panel);document.body.append(root);top.onclick=()=>{panel.hidden=!panel.hidden;};
 for(const e of ['keydown','keyup','pointerdown','pointerup','touchstart','touchend','click'])root.addEventListener(e,ev=>ev.stopPropagation());
 const wscale=new THREE.Vector3(),p0=new THREE.Vector3(),q0=new THREE.Quaternion(),unitY=new THREE.Vector3(0,1,0),identity=new THREE.Quaternion();
 function restoreSword(){if(hiddenSword){hiddenSword.object.visible=hiddenSword.was;hiddenSword=null;}}
 function release(g){if(!g)return;const ge=new Set(),ma=new Set(),tx=new Set();g.scene.traverse(o=>{if(o.geometry)ge.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)ma.add(m);});for(const m of ma)for(const t of Object.values(m))if(t?.isTexture)tx.add(t);for(const x of [...ge,...ma,...tx])x.dispose?.();}
 function detach(){restoreSword();for(const e of entries)e.object.removeFromParent();entries=[];model=null;lastMissing=[];}
 function attach(P){
  detach();model=P.model;P.o.updateMatrixWorld(true);
  for(const id of POWER_IDS)for(const part of defs[id]){
   const bone=part.bone==='Root'?null:resolvePowerBone(model,part.bone);
   if(!bone&&part.bone!=='Root'){lastMissing.push(part.bone);continue;}
   const object=source.scene.getObjectByName(part.node).clone(true);
   const world=part.bone==='Root'||part.node.endsWith('swing_hook');
   const parent=world?scene:bone;parent.add(object);
   object.visible=false;object.scale.set(1,1,1);entries.push({id,part,bone,object,world});
  }
 }
 input.onchange=async()=>{
  const f=input.files?.[0];if(!f)return;
  if(f.size>5*1024*1024){status.textContent='Choose the compact power-only GLB (under 5 MB), not the full character.';return;}
  const token=++loadToken;status.textContent='Reading local GLB…';const url=URL.createObjectURL(f);let g=null;
  try{g=await loader.loadAsync(url);const d=validatePowerAsset(g);if(dead||token!==loadToken){release(g);return;}
   detach();release(source);source=g;defs=d;preview=null;report='Loaded '+f.name;status.textContent=report;
  }catch(e){release(g);if(token===loadToken)status.textContent='Load failed: '+String(e.message||e)+'; previous visuals retained.';}finally{URL.revokeObjectURL(url);}
 };
 function tick(t){
  if(dead||!source)return;const P=getPlayer();if(!P?.model||!P?.o)return;
  if(model!==P.model)attach(P);
  const S=getState(),active=new Set(choosePowerVisuals(S,preview));P.o.updateMatrixWorld(true);
  let customSword=false;
  for(const e of entries){const {id,part,object,bone,world}=e;const liveMode=preview===null;const anchor=S.swingAnchor;
   const hideTether=liveMode&&(part.node.endsWith('swing_tether')||part.node.endsWith('gallium_tendril'));
   object.visible=active.has(id)&&!hideTether&&!(liveMode&&part.node.endsWith('swing_hook')&&!anchor);
   if(!object.visible)continue;
   object.scale.set(...part.scale);object.quaternion.set(...part.rotation);
   if(world){
    if(part.node.endsWith('swing_hook')&&liveMode&&anchor){object.position.copy(anchor);bone.getWorldPosition(p0);p0.sub(anchor);if(p0.lengthSq()>1e-6)object.quaternion.setFromUnitVectors(unitY,p0.normalize());}
    else if(part.node.endsWith('swing_hook')){bone.getWorldPosition(p0);bone.getWorldQuaternion(q0);object.position.set(...part.position).applyQuaternion(q0).add(p0);object.quaternion.premultiply(q0);}
    else{object.position.copy(P.o.position);object.position.y=Number.isFinite(S.floor)?S.floor:P.o.position.y;object.position.add(new THREE.Vector3(...part.position));}
   }else{
    bone.getWorldScale(wscale);const div=[Math.max(.0001,Math.abs(wscale.x)),Math.max(.0001,Math.abs(wscale.y)),Math.max(.0001,Math.abs(wscale.z))];
    object.position.set(...part.position);if(id==='sword'&&liveMode){object.position.set(0,0,0);object.quaternion.copy(identity);}
    const m=part.node.match(/_orb_(\d+)$/);if(m){const a=t*1.7+Number(m[1])*Math.PI/3;object.position.set(.78*Math.cos(a),.30+.15*Math.sin(a*2),.78*Math.sin(a));}
    if(part.node.endsWith('_field'))object.rotateY(t*.8);
    object.position.set(object.position.x/div[0],object.position.y/div[1],object.position.z/div[2]);object.scale.set(part.scale[0]/div[0],part.scale[1]/div[1],part.scale[2]/div[2]);
   }
   if(id==='sword')customSword=true;
  }
  // Original sword is only masked when our mesh is attached and authorized. Never touch its resource state.
  if(hiddenSword&&hiddenSword.object!==S.oldSword)restoreSword();
  if(customSword&&S.oldSword&&S.sword){if(!hiddenSword)hiddenSword={object:S.oldSword,was:S.oldSword.visible};S.oldSword.visible=false;}
  else if(hiddenSword){hiddenSword.object.visible=!!S.sword;hiddenSword=null;}
  const text=report+' · '+(preview?'VISUAL PREVIEW: '+names[preview]:'FOLLOW GAME: '+([...active].join(', ')||'idle'))+' · '+entries.length+'/27 attached'+(lastMissing.length?' · Missing bones: '+[...new Set(lastMissing)].join(', '):'');
  if(status.textContent!==text)status.textContent=text;
 }
 function snapshot(){return {loaded:!!source,preview,attached:entries.length,missing:[...new Set(lastMissing)],mode:preview?'visual-preview':'follow-game'};}
 return {tick,snapshot,destroy(){dead=true;loadToken++;detach();release(source);root.remove();}};
}
