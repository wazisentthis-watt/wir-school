// Deterministic procedural animation layer for SLOTTA's temporary jointed model.
// The same action names are later translated to skeletal glTF clips by slotta_rig_adapter.js.
// Visual design is PROPOSAL/HOLD; never apply movement forces to the player here.
const saturate=v=>Math.max(0,Math.min(1,Number(v)||0));
const bump=p=>Math.sin(saturate(p)*Math.PI);
export function applySlottaPose(rig,snapshot={},loadout=null){
 if(!rig)return;
 const state=snapshot.state||'idle',p=saturate(snapshot.progress),b=bump(p),t=rig.clock||0;
 const [left,right]=rig.arms,legs=rig.legs;
 rig.body.rotation.x=0;rig.body.rotation.y=0;rig.head.rotation.x=0;rig.head.rotation.z=0;
 left.rotation.z=right.rotation.z=left.rotation.y=right.rotation.y=0;
 rig.pack.rotation.x=rig.pack.rotation.y=0;
 const ports=rig.pack.userData.active||[],stored=rig.pack.userData.stored||[];
 for(let i=0;i<ports.length;i++){
  const port=ports[i];
  // Clone one material per active port, so lighting only the selected port is possible.
  if(!port.userData.isolatedMaterial){port.material=port.material.clone();port.userData.isolatedMaterial=true;}
  const selected=(rig.selectedSlot??0)===i,active=state==='select'||state==='swap'||state==='slitherCast'||state==='ninjaSummon'||state==='phantomDash'||state==='legacyCast';
  port.material.emissiveIntensity=selected&&active?1.25+.55*Math.sin(t*22):.24+.09*Math.sin(t*3+i);
  port.scale.y=1+(selected&&active?b*.24:0);
  port.position.z=-.37-(selected&&(state==='select'||state==='swap')?b*.16:0);
 }
 for(let i=0;i<stored.length;i++){
  const port=stored[i];
  if(!port.userData.isolatedMaterial){port.material=port.material.clone();port.userData.isolatedMaterial=true;}
  port.material.emissiveIntensity=state==='swap' ? .35+b*.5 : .12;
  port.position.z=-.374-(state==='swap'&&i===(rig.selectedStorageSlot??0)?b*.19:0);
 }
 switch(state){
  case 'intro':rig.body.rotation.y=b*.32;right.rotation.x=-b*.9;left.rotation.x=-b*.2;rig.head.rotation.y=b*.4;break;
  case 'select':right.rotation.x=-b*.92;right.rotation.z=-b*.38;rig.pack.rotation.y=b*.13;break;
  case 'swap':right.rotation.x=-b*1.2;left.rotation.x=-b*.45;rig.pack.rotation.x=b*.22;break;
  case 'slitherCast':right.rotation.x=-.2-b*1.45;right.rotation.z=-b*.38;left.rotation.x=-b*.6;rig.body.rotation.y=b*.23;break;
  case 'ninjaSummon':right.rotation.x=-b*.95;left.rotation.x=-b*.95;right.rotation.z=b*.42;left.rotation.z=-b*.42;break;
  case 'phantomDash':rig.body.rotation.x=.52*b;right.rotation.x=-.7*b;left.rotation.x=1.0*b;legs[0].rotation.x+=.65*b;legs[1].rotation.x-=.65*b;break;
  case 'legacyCast':right.rotation.x=-1.1*b;left.rotation.x=-.45*b;break;
  case 'hitLight':
   // A fast shoulder recoil and foot plant; does not displace the combat collider.
   rig.body.rotation.x=-.31*b;
   rig.body.rotation.z=.21*b;
   rig.head.rotation.x=.24*b;rig.head.rotation.z=.16*b;
   left.rotation.x+=.46*b;right.rotation.x-=.27*b;
   legs[0].rotation.x-=.18*b;
   rig.pack.rotation.x=.13*b;
   break;
  case 'hitHeavy':
   // Three-hit combo escalates to a stagger without overwriting the boss world position.
   rig.body.rotation.x=-.68*b;rig.body.rotation.z=-.43*b;
   rig.head.rotation.x=.29*b;rig.head.rotation.z=-.12*b;
   left.rotation.x+=.59*b;right.rotation.x+=.72*b;
   left.rotation.z=-.25*b;right.rotation.z=.22*b;
   legs[0].rotation.x+=.37*b;legs[1].rotation.x-=.39*b;
   rig.pack.rotation.x=-.20*b;rig.pack.rotation.y=.16*b;
   break;
  case 'galliumHeld':rig.body.rotation.x=-.12;left.rotation.z=-.7;right.rotation.z=.7;break;
  case 'knockdown':rig.body.rotation.z=p*1.12;rig.body.rotation.x=p*.45;break;
  case 'getUp':rig.body.rotation.z=(1-p)*.72;rig.body.rotation.x=(1-p)*.4;break;
  case 'taunt':rig.head.rotation.y=Math.sin(p*Math.PI*2)*.48;right.rotation.x=-.48*b;break;
  case 'victory':rig.body.rotation.x=-.12;left.rotation.z=.7;right.rotation.z=-.7;break;
  case 'strafe':rig.body.rotation.z=Math.sin(t*4)*.12;break;
  default:break;
 }
}
export function slottaPoseName(snapshot){return typeof snapshot==='string'?snapshot:(snapshot?.state||'idle');}
