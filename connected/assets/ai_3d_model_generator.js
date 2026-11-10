// WIR ORIGINAL parametric Three.js rig generator. No copied or extracted BrawlScape code.
// PROPOSAL / PUBLISH HOLD. Geometric model synthesis only, no LLM/API/network calls.
import * as THREE from 'three';
import {METAL_SPEC,normalizeAISpec,clamp,smoothstep,createSeededRNG,validateCharacterTopology} from './ai_3d_model_spec.mjs';
export {METAL_SPEC,normalizeAISpec,clamp,smoothstep,createSeededRNG,validateCharacterTopology};
export const singleWeight = key => ({[key]:1});
export const blendWeights=(a,b,t)=>{const o={};for(const [k,v] of Object.entries(a))o[k]=(o[k]||0)+v*(1-t);for(const [k,v] of Object.entries(b))o[k]=(o[k]||0)+v*t;return o;};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const smoothMix=(a,b,t)=>a+(b-a)*smoothstep(t);

export function buildSkeleton(spec=METAL_SPEC){
 const normalized=normalizeAISpec(spec),s=normalized.scale,p=normalized.proportions;
 // All coordinates are in meters. Skeleton world rest coordinates also define geometry lofts.
 const shoulder=.205*p.shoulder,armReach=p.arm,foreReach=p.forearm;
 const position={
  Hips:V(0,.96,0),Spine:V(0,1.08,0),Spine1:V(0,1.23,0),Spine2:V(0,1.40,0),
  Neck:V(0,1.54,0),Head:V(0,1.635,0),
  LeftShoulder:V(-shoulder,1.44,0),LeftArm:V(-shoulder-.12,1.40,0),LeftForeArm:V(-shoulder-.33*armReach,1.15,0),LeftHand:V(-shoulder-.41*foreReach,.94,.008),
  RightShoulder:V(shoulder,1.44,0),RightArm:V(shoulder+.12,1.40,0),RightForeArm:V(shoulder+.33*armReach,1.15,0),RightHand:V(shoulder+.41*foreReach,.94,.008),
  LeftUpLeg:V(-.13,.87,0),LeftLeg:V(-.13,.49,0),LeftFoot:V(-.13,.13,.03),LeftToeBase:V(-.13,.08,.14),LeftToe_End:V(-.13,.08,.23),
  RightUpLeg:V(.13,.87,0),RightLeg:V(.13,.49,0),RightFoot:V(.13,.13,.03),RightToeBase:V(.13,.08,.14),RightToe_End:V(.13,.08,.23)
 };
 // 24 bones, not 22: two five-bone leg chains plus two four-bone arms, six in the spine/head.
 const hierarchy={Hips:null,Spine:'Hips',Spine1:'Spine',Spine2:'Spine1',Neck:'Spine2',Head:'Neck',
  LeftShoulder:'Spine2',LeftArm:'LeftShoulder',LeftForeArm:'LeftArm',LeftHand:'LeftForeArm',
  RightShoulder:'Spine2',RightArm:'RightShoulder',RightForeArm:'RightArm',RightHand:'RightForeArm',
  LeftUpLeg:'Hips',LeftLeg:'LeftUpLeg',LeftFoot:'LeftLeg',LeftToeBase:'LeftFoot',LeftToe_End:'LeftToeBase',
  RightUpLeg:'Hips',RightLeg:'RightUpLeg',RightFoot:'RightLeg',RightToeBase:'RightFoot',RightToe_End:'RightToeBase'};
 const root=new THREE.Group();root.name='WIR_Character_Root';
 const bones=[],lookup={},index={};
 for(const [name,parent] of Object.entries(hierarchy)){
  const b=new THREE.Bone();b.name=name;
  b.position.copy(position[name]).sub(parent?position[parent]:V(0,0,0)).multiplyScalar(s);
  (parent?lookup[parent]:root).add(b);index[name]=bones.length;bones.push(b);lookup[name]=b;
 }
 root.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(bones);
 const rest=Object.fromEntries(Object.entries(position).map(([k,pos])=>[k,pos.clone().multiplyScalar(s)]));
 return {root,bones,lookup,index,skeleton,rest,scale:s,spec:normalized};
}

export class SkinnedMeshBuilder {
 constructor(index){this.index=index;this.p=[];this.uv=[];this.ind=[];this.si=[];this.sw=[];this.seams=[];}
 v(pos,u=0,v=0,weightsMap={Hips:1}){
  const pairs=Object.entries(weightsMap).filter(([name,w])=>Object.hasOwn(this.index,name)&&Number.isFinite(w)&&w>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
  if(!pairs.length)throw new Error('Vertex without valid bone influence');
  const total=pairs.reduce((t,x)=>t+x[1],0);
  this.p.push(pos.x,pos.y,pos.z);this.uv.push(u,v);
  for(let k=0;k<4;k++){this.si.push(k<pairs.length?this.index[pairs[k][0]]:0);this.sw.push(k<pairs.length?pairs[k][1]/total:0);}
  return this.p.length/3-1;
 }
 loft(rings,{capStart=false,capEnd=false,flip=false}={}){
  if(rings.length<2)throw new Error('Need at least two loft rings');
  const sides=rings[0].pts.length-1,base=this.p.length/3;
  if(sides<3||rings.some(r=>r.pts.length!==sides+1))throw new Error('Every ring must contain identical closed seam points');
  for(let i=0;i<rings.length;i++){
   const ring=rings[i];for(let j=0;j<=sides;j++){
    const w=typeof ring.w==='function'?ring.w(j/sides):ring.w;
    this.v(ring.pts[j],j/sides,ring.v??i/(rings.length-1),w);
   }this.seams.push([base+i*(sides+1),base+i*(sides+1)+sides]);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
   const a=base+i*(sides+1)+j,b=a+1,c=a+(sides+1),d=c+1;
   if(flip)this.ind.push(a,b,c,b,d,c);else this.ind.push(a,c,b,b,c,d);
  }
  if(capStart||capEnd){
   for(const [ringIndex,doCap,sign] of [[0,capStart,-1],[rings.length-1,capEnd,1]]){
    if(!doCap)continue;const r=rings[ringIndex];const center=r.pts.slice(0,-1).reduce((a,v)=>a.add(v),V(0,0,0)).divideScalar(sides);
    const w=typeof r.w==='function'?r.w(.5):r.w,centerIndex=this.v(center,.5,.5,w),first=base+ringIndex*(sides+1);
    for(let j=0;j<sides;j++){
     if(sign*(flip?-1:1)>0)this.ind.push(centerIndex,first+j,first+j+1);
     else this.ind.push(centerIndex,first+j+1,first+j);
    }
   }
  }
 }
 toBufferGeometry(){
  validateCharacterTopology(this.sw,this.si,Object.keys(this.index).length);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(this.si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(this.sw,4));g.setIndex(this.ind);g.computeVertexNormals();
  // Seam welding. UV duplication remains, lighting normals average at each longitudinal seam.
  const n=g.getAttribute('normal');for(const [a,b] of this.seams){const x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),l=Math.hypot(x,y,z)||1;n.setXYZ(a,x/l,y/l,z/l);n.setXYZ(b,x/l,y/l,z/l);}
  n.needsUpdate=true;g.computeBoundingSphere();return g;
 }
}

export function sweepTube(builder,start,end,radius,weights,{segs=8,rad=9,capStart=true,capEnd=true}={}){
 const from=start.clone(),to=end.clone(),tangent=to.clone().sub(from).normalize();
 if(tangent.lengthSq()<1e-9)return;
 const up=Math.abs(tangent.y)>.93?V(1,0,0):V(0,1,0);
 const u=V(0,0,0).crossVectors(up,tangent).normalize(),v=V(0,0,0).crossVectors(tangent,u).normalize();const rings=[];
 for(let i=0;i<=segs;i++){const t=i/segs,ctr=from.clone().lerp(to,t);const rr=typeof radius==='function'?radius(t):radius;
  const ru=Array.isArray(rr)?rr[0]:rr,rv=Array.isArray(rr)?rr[1]:rr;
  const pts=Array.from({length:rad+1},(_,j)=>{const theta=j/rad*Math.PI*2;return ctr.clone().addScaledVector(u,ru*Math.cos(theta)).addScaledVector(v,rv*Math.sin(theta));});
  rings.push({pts,w:typeof weights==='function'?weights(t):weights,v:t});
 }builder.loft(rings,{capStart,capEnd});
}
export function sculptEllipsoid(builder,center,rx,ry,rz,weights,{lat=10,lon=16}={}){
 const rings=[];
 for(let i=0;i<=lat;i++){const phi=-Math.PI/2+i/lat*Math.PI,r=Math.max(.00001,Math.cos(phi));
  const pts=Array.from({length:lon+1},(_,j)=>{const th=j/lon*Math.PI*2;return V(center.x+rx*r*Math.cos(th),center.y+ry*Math.sin(phi),center.z+rz*r*Math.sin(th));});
  rings.push({pts,w:weights,v:i/lat});
 }builder.loft(rings,{capStart:true,capEnd:true});
}
export function sweepHingedLimb(builder,start,hinge,end,radA,radB,wA,wB,{segs=14,rad=12}={}){
 const rings=[];
 for(let i=0;i<=segs;i++){
  const t=i/segs,first=t<=.5,local=first?t*2:(t-.5)*2;
  const a=first?start:hinge,b=first?hinge:end;
  const center=a.clone().lerp(b,local),tangent=b.clone().sub(a).normalize();const helper=Math.abs(tangent.y)>.95?V(1,0,0):V(0,1,0);
  const normal=V(0,0,0).crossVectors(helper,tangent).normalize(),binormal=V(0,0,0).crossVectors(tangent,normal).normalize();
  const pts=[];for(let j=0;j<=rad;j++){const th=j/rad*Math.PI*2;const r=(first?radA:radB)(local,th);
   pts.push(center.clone().addScaledVector(normal,r*Math.cos(th)).addScaledVector(binormal,r*Math.sin(th));}
  const w=blendWeights(wA,wB,smoothstep((t-.43)/.14));rings.push({pts,w,v:t});
 }builder.loft(rings,{capStart:true,capEnd:true});
}

function layersFor(skel,spec,bulk=1){
 const {rest,index}=skel,p=spec.proportions,scale=skel.scale,mat={};
 for(const key of ['skin','armor','accent','eyes','hair'])mat[key]=new SkinnedMeshBuilder(index);
 const r=v=>v*scale,spine=[['Hips',.93],['Spine',1.08],['Spine1',1.23],['Spine2',1.41],['Neck',1.55]];
 const spineWeight=y=>{if(y<=spine[0][1])return singleWeight('Hips');if(y>=spine.at(-1)[1])return singleWeight('Neck');
  for(let i=0;i<spine.length-1;i++)if(y<=spine[i+1][1])return blendWeights(singleWeight(spine[i][0]),singleWeight(spine[i+1][0]),smoothstep((y-spine[i][1])/(spine[i+1][1]-spine[i][1])));
  return singleWeight('Spine1');};
 const torso=[];
 const slice=[[.90,.14,.098],[.97,.165,.117],[1.04,.145,.105],[1.12,.134,.10],[1.22,.168,.115],[1.32,.183,.125],[1.41,.195,.125],[1.47,.157,.1],[1.53,.068,.062]];
 for(const [i,[y,x,z]] of slice.entries()){
  const rx=x*(y>1.15?p.chest:y<1.1?p.waist:1)*bulk,rz=z*(y>1.15?p.chest:p.waist)*bulk;
  const exp=2/p.torsoSquareness,pts=[];
  for(let j=0;j<=24;j++){const th=j/24*Math.PI*2,c=Math.cos(th),sn=Math.sin(th);
   const a=Math.sign(c)*Math.pow(Math.abs(c),exp)*rx,b=Math.sign(sn)*Math.pow(Math.abs(sn),exp)*rz;
   const pec=y>1.20&&y<1.46&&sn>0?.017*Math.sin(Math.PI*(y-1.2)/.26)*sn*sn*Math.sqrt(Math.abs(Math.cos(2*th))):0;
   pts.push(V(r(a),r(y),r(b+pec)));}
  torso.push({pts,v:i/(slice.length-1),w:spineWeight(y)});
 }mat[spec.features.sealedSuit?'armor':'skin'].loft(torso,{capStart:true,capEnd:true});
 const head=rest.Head.clone().add(V(0,r(.13*p.head),r(.014))),facial=spec.features.sealedSuit?'armor':'skin';
 sculptEllipsoid(mat[facial],head,r(.10*p.head),r(.125*p.head),r(.109*p.head),singleWeight('Head'),{lat:13,lon:20});
 // Narrow angular sensory apertures, never a conventional exposed pair of eyes in METAL state.
 for(const sign of [-1,1]){
  const eye=head.clone().add(V(r(sign*.043*p.head),r(.018),r(.103*p.head)));
  sculptEllipsoid(mat.eyes,eye,r(.029*p.head),r(.007),r(.004),singleWeight('Head'),{lat:5,lon:9});
 }
 // Coiled Afro masses and cheek/chin braid-beard attach to the same Head bone, not a separate helmet.
 if(spec.features.headGear==='afro-crown'||spec.features.headGear==='coils'){
  const N=spec.features.headGear==='afro-crown'?11:15;
  for(let i=0;i<N;i++){
   const a=i/N*Math.PI*2,dis=r(.068*p.head),base=head.clone().add(V(dis*Math.cos(a),r(.094*p.head),dis*Math.sin(a)));
   const top=base.clone().add(V(r(.022*Math.cos(a+.5)),r(.06+.018*(i%3)),r(.015*Math.sin(a+.5))));
   sweepTube(mat.hair,base,top,t=>r((.025+.013*Math.sin(Math.PI*t))*(1-t*.25)),singleWeight('Head'),{segs:6,rad:7});
  }
  if(spec.features.sealedSuit)for(const [x,y,z] of [[-.068,-.064,.067],[-.047,-.091,.09],[-.024,-.116,.10],[.01,-.121,.1],[.04,-.099,.09],[.066,-.072,.067]]){
   const base=head.clone().add(V(r(x*p.head),r(y*p.head),r(z*p.head)));
   sweepTube(mat.hair,base,base.clone().add(V(0,r(-.048),r(.008))),t=>r(.015*(1-.15*t)),singleWeight('Head'),{segs:4,rad:7});
  }
 }
 if(spec.features.headGear==='visor'){
  const visor=head.clone().add(V(0,r(.016),r(.112*p.head)));
  sculptEllipsoid(mat.accent,visor,r(.093),r(.022),r(.012),singleWeight('Head'),{lat:5,lon:13});
 }
 for(const side of ['Left','Right']){
  const sign=side==='Left'?-1:1,upper=rest[side+'Arm'],hinge=rest[side+'ForeArm'],hand=rest[side+'Hand'];
  const upperR=t=>r((.052+.008*Math.sin(Math.PI*t))*p.arm*bulk),lowerR=t=>r((.044-.012*t+.008*Math.sin(Math.PI*t))*p.forearm*bulk);
  sweepHingedLimb(mat[spec.features.sealedSuit?'armor':'skin'],upper,hinge,hand,upperR,lowerR,singleWeight(side+'Arm'),singleWeight(side+'ForeArm'));
  if(spec.features.shoulderPads){const pad=upper.clone().add(V(r(.008*sign),r(.005),0));sculptEllipsoid(mat.armor,pad,r(.071*p.shoulder*bulk),r(.067*p.shoulder*bulk),r(.074*p.shoulder*bulk),blendWeights(singleWeight(side+'Shoulder'),singleWeight(side+'Arm'),.65),{lat:9,lon:14});}
  sculptEllipsoid(mat[spec.features.handType==='bare'&&!spec.features.sealedSuit?'skin':'armor'],hand.clone().add(V(r(sign*.015),r(-.014),0)),r(.043*bulk),r(.052),r(.034*bulk),singleWeight(side+'Hand'),{lat:8,lon:12});
  const thigh=rest[side+'UpLeg'],knee=rest[side+'Leg'],foot=rest[side+'Foot'];
  sweepHingedLimb(mat[spec.features.sealedSuit?'armor':'skin'],thigh,knee,foot,
   t=>r((.088-.025*t+.011*Math.sin(Math.PI*t))*p.leg*bulk),t=>r((.055-.013*t+.009*Math.sin(Math.PI*t))*p.leg*bulk),singleWeight(side+'UpLeg'),singleWeight(side+'Leg'));
  // Both pants cover footwear/prosthetic boundaries in the armor baseline.
  const toes=rest[side+'Toe_End'];sweepTube(mat.armor,foot,toes,t=>[r((.055-.01*t)*bulk),r(.051-.012*t)],singleWeight(side+'Foot'),{segs:6,rad:12});
 }
 // One straight emblem seam on upper torso remains part of material, not floating prose.
 if(spec.features.sealedSuit){const a=rest.Spine1.clone().add(V(0,r(.07),r(.14))),b=rest.Spine2.clone().add(V(0,r(.00),r(.13)));
  sweepTube(mat.accent,a,b,t=>r(.006*(1-.3*t)),t=>blendWeights(singleWeight('Spine1'),singleWeight('Spine2'),t),{segs:6,rad:7});}
 return mat;
}
function materials(spec){const c=spec.palette;return {
  skin:new THREE.MeshStandardMaterial({color:c.skin,roughness:.73,metalness:.02}),
  armor:new THREE.MeshStandardMaterial({color:c.armor,roughness:.36,metalness:.73,flatShading:false}),
  accent:new THREE.MeshStandardMaterial({color:c.accent,emissive:c.glow,emissiveIntensity:.8,roughness:.32,metalness:.55}),
  eyes:new THREE.MeshBasicMaterial({color:c.eyes}),
  hair:new THREE.MeshStandardMaterial({color:c.hair,roughness:.65,metalness:spec.features.sealedSuit?.49:.02})
 };}

export function generateCharacterFromAISpec(input=METAL_SPEC,{morphs=true}={}){
 const spec=normalizeAISpec(input),rig=buildSkeleton(spec),base=layersFor(rig,spec),mats=materials(spec),meshes={};
 let light,heavy;
 if(morphs){light=layersFor(rig,spec,.81);heavy=layersFor(rig,spec,1.22);}
 const baseKeys=Object.keys(base);
 for(const key of baseKeys){if(!base[key].p.length)continue;const g=base[key].toBufferGeometry();
  if(morphs){
   if(light[key].p.length!==base[key].p.length||heavy[key].p.length!==base[key].p.length)throw new Error('Morph target topology drift: '+key);
   g.morphTargetsRelative=false;g.morphAttributes.position=[new THREE.Float32BufferAttribute(light[key].p,3),new THREE.Float32BufferAttribute(heavy[key].p,3)];
  }
  const mesh=new THREE.SkinnedMesh(g,mats[key]);mesh.name='WIR_'+key;mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
  rig.root.add(mesh);rig.root.updateMatrixWorld(true);mesh.bind(rig.skeleton);meshes[key]=mesh;
 }
 rig.root.userData={wir:true,name:spec.name,prototype:true,hold:true,rigged:true,characterSpec:spec};
 let disposed=false;
 const api={group:rig.root,root:rig.root,skeleton:rig.skeleton,bones:rig.lookup,meshes,spec,
  setBulk(value){const t=clamp(Number(value)||0,-1,1);for(const mesh of Object.values(meshes)){
   if(mesh.morphTargetInfluences?.length>=2){mesh.morphTargetInfluences[0]=t<0?-t:0;mesh.morphTargetInfluences[1]=t>0?t:0;}}
   return t;},
  setPose(name,amount=1){const a=clamp(Number(amount)||0,0,1);
   for(const bone of rig.bones)bone.rotation.set(0,0,0);
   if(name==='guard'){rig.lookup.LeftArm.rotation.z=-.35*a;rig.lookup.RightArm.rotation.z=.35*a;rig.lookup.LeftForeArm.rotation.z=.6*a;rig.lookup.RightForeArm.rotation.z=-.6*a;}
   if(name==='anticipation'){rig.lookup.Spine.rotation.x=.17*a;rig.lookup.LeftArm.rotation.x=-.3*a;rig.lookup.RightArm.rotation.x=.26*a;rig.lookup.LeftLeg.rotation.x=-.12*a;}
   if(name==='stride'){rig.lookup.LeftUpLeg.rotation.x=.38*a;rig.lookup.RightUpLeg.rotation.x=-.35*a;rig.lookup.LeftArm.rotation.x=-.25*a;rig.lookup.RightArm.rotation.x=.18*a;}
   rig.root.updateMatrixWorld(true);},
  stats(){return {bones:rig.bones.length,meshes:Object.keys(meshes).length,vertices:Object.values(meshes).reduce((a,m)=>a+m.geometry.attributes.position.count,0),triangles:Object.values(meshes).reduce((a,m)=>a+m.geometry.index.count/3,0),morphTargets:morphs?2:0};},
  dispose(){if(disposed)return;disposed=true;for(const m of Object.values(meshes)){m.geometry.dispose();m.material.dispose();}rig.root.parent?.remove(rig.root);}
 };
 return api;
}
export function createMetalPrototype(options={}){const base=normalizeAISpec(METAL_SPEC);return generateCharacterFromAISpec({...base,...options,features:{...base.features,...options.features},proportions:{...base.proportions,...options.proportions},palette:{...base.palette,...options.palette}});}
