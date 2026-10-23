/* Atoms mode: Bohr atoms, ionic/covalent bonding (octet/duet), VSEPR ball-and-stick, balanced reactions, mini challenges.
   Uses the shared gesture pipeline (pinch / open / fist) and the fx.js engine. Educational only. */
import * as THREE from 'three';
import {FX,L,rnd,waterSpawn,lightAt} from './fx.js';
const $=id=>document.getElementById(id);
const SUP={'+':'⁺','-':'⁻',0:'⁰',1:'¹',2:'²',3:'³'}; const SUB=n=>String(n).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d]);
const chg=c=>c===0?'':(Math.abs(c)>1?SUP[Math.abs(c)]:'')+(c>0?'⁺':'⁻');

/* ---------- element data (accurate for the shown elements) ----------
 shells = electron shell occupancy; val = valence e-; group; kind: m=metal(ion +q), n=nonmetal, g=noble.
 cov = usual covalent bonds; ion = typical ion charge; col = CPK-ish colour; r = drawn radius (px) */
export const EL={
 H:{Z:1,name:'Hydrogen',shells:[1],val:1,group:1,kind:'n',cov:1,ion:-1,col:0xffffff,r:9},
 He:{Z:2,name:'Helium',shells:[2],val:2,group:18,kind:'g',col:0xd9ffff,r:10},
 Li:{Z:3,name:'Lithium',shells:[2,1],val:1,group:1,kind:'m',ion:1,col:0xcc80ff,r:17},
 Be:{Z:4,name:'Beryllium',shells:[2,2],val:2,group:2,kind:'m',ion:2,col:0xc2ff00,r:15},
 B:{Z:5,name:'Boron',shells:[2,3],val:3,group:13,kind:'n',cov:3,col:0xffb5b5,r:14},
 C:{Z:6,name:'Carbon',shells:[2,4],val:4,group:14,kind:'n',cov:4,col:0x505050,r:14},
 N:{Z:7,name:'Nitrogen',shells:[2,5],val:5,group:15,kind:'n',cov:3,ion:-3,col:0x3050f8,r:13},
 O:{Z:8,name:'Oxygen',shells:[2,6],val:6,group:16,kind:'n',cov:2,ion:-2,col:0xff0d0d,r:13},
 F:{Z:9,name:'Fluorine',shells:[2,7],val:7,group:17,kind:'n',cov:1,ion:-1,col:0x90e050,r:12},
 Ne:{Z:10,name:'Neon',shells:[2,8],val:8,group:18,kind:'g',col:0xb3e3f5,r:12},
 Na:{Z:11,name:'Sodium',shells:[2,8,1],val:1,group:1,kind:'m',ion:1,col:0xab5cf2,r:19},
 Mg:{Z:12,name:'Magnesium',shells:[2,8,2],val:2,group:2,kind:'m',ion:2,col:0x8aff00,r:17},
 Al:{Z:13,name:'Aluminium',shells:[2,8,3],val:3,group:13,kind:'m',ion:3,col:0xbfa6a6,r:16},
 Si:{Z:14,name:'Silicon',shells:[2,8,4],val:4,group:14,kind:'n',cov:4,col:0xf0c8a0,r:16},
 P:{Z:15,name:'Phosphorus',shells:[2,8,5],val:5,group:15,kind:'n',cov:3,ion:-3,col:0xff8000,r:15},
 S:{Z:16,name:'Sulfur',shells:[2,8,6],val:6,group:16,kind:'n',cov:2,ion:-2,col:0xffff30,r:15},
 Cl:{Z:17,name:'Chlorine',shells:[2,8,7],val:7,group:17,kind:'n',cov:1,ion:-1,col:0x1ff01f,r:15},
 Ar:{Z:18,name:'Argon',shells:[2,8,8],val:8,group:18,kind:'g',col:0x80d1e3,r:14},
 K:{Z:19,name:'Potassium',shells:[2,8,8,1],val:1,group:1,kind:'m',ion:1,col:0x8f40d4,r:21},
 Ca:{Z:20,name:'Calcium',shells:[2,8,8,2],val:2,group:2,kind:'m',ion:2,col:0x3dff00,r:19},
 Fe:{Z:26,name:'Iron',shells:[2,8,14,2],val:2,group:8,kind:'m',ion:3,col:0xe06633,r:17,tm:'4s² electrons; forms Fe²⁺ or Fe³⁺ (Fe³⁺ used here)'},
 Cu:{Z:29,name:'Copper',shells:[2,8,18,1],val:1,group:11,kind:'m',ion:2,col:0xc88033,r:17,tm:'4s¹ (plus 3d); forms Cu⁺ or Cu²⁺ (Cu²⁺ used here)'},
 Zn:{Z:30,name:'Zinc',shells:[2,8,18,2],val:2,group:12,kind:'m',ion:2,col:0x7d80b0,r:17},
 Br:{Z:35,name:'Bromine',shells:[2,8,18,7],val:7,group:17,kind:'n',cov:1,ion:-1,col:0xa62929,r:16},
 I:{Z:53,name:'Iodine',shells:[2,8,18,18,7],val:7,group:17,kind:'n',cov:1,ion:-1,col:0x940094,r:17},
};
const PALETTE=['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Fe','Cu','Zn','Br','I'];
function tendency(e){ const d=EL[e];
  if(d.kind==='g') return `full outer shell (${d.val}) → doesn't bond`;
  if(d.kind==='m') return `tends to lose ${d.ion} e⁻ → ${e}${chg(d.ion)}`;
  if(e==='H') return 'shares 1 e⁻ (duet), or gains 1 with metals → H⁻';
  if(d.ion) return `gains ${-d.ion} e⁻ → ${e}${chg(d.ion)}, or shares ${d.cov}`;
  return `shares ${d.cov} e⁻ (${d.cov} bonds)`; }

/* ---------- named species ---------- */
const NAMES={H2:'hydrogen',O2:'oxygen',N2:'nitrogen',Cl2:'chlorine',F2:'fluorine',Br2:'bromine',I2:'iodine',H2O:'water',CH4:'methane',CO2:'carbon dioxide',NH3:'ammonia',HCl:'hydrogen chloride',HF:'hydrogen fluoride',
 CH2O:'formaldehyde (here: the (CH₂O) sugar unit)',C2H6:'ethane',C2H4:'ethene',C2H2:'ethyne',CO:'carbon monoxide',HCN:'hydrogen cyanide',H2S:'hydrogen sulfide',CCl4:'carbon tetrachloride',CH4O:'methanol',H2O2:'hydrogen peroxide',
 BF3:'boron trifluoride',SiO2:'silicon dioxide (real: a network solid)',PH3:'phosphine',PCl3:'phosphorus trichloride',NaCl:'sodium chloride (table salt)',MgO:'magnesium oxide',CaCl2:'calcium chloride',MgCl2:'magnesium chloride',
 KCl:'potassium chloride',LiF:'lithium fluoride',Al2O3:'aluminium oxide',NaOH:'sodium hydroxide',CaO:'calcium oxide (lime)',Na2O:'sodium oxide',KBr:'potassium bromide',NaI:'sodium iodide',FeCl3:'iron(III) chloride',Fe2O3:'iron(III) oxide (rust)',
 CuCl2:'copper(II) chloride',CuO:'copper(II) oxide',ZnO:'zinc oxide',ZnCl2:'zinc chloride',NaH:'sodium hydride',Li3N:'lithium nitride',Mg3N2:'magnesium nitride',CaF2:'calcium fluoride',AlCl3:'aluminium chloride',HBr:'hydrogen bromide',HI:'hydrogen iodide',CH3Cl:'chloromethane'};
const DISPLAY={NH3:'NH₃',H3N:'NH₃',CH4O:'CH₃OH',CH3Cl:'CH₃Cl',H3P:'PH₃',PH3:'PH₃',NaOH:'NaOH',HNaO:'NaOH'};
const HAZ={CO:'Toxic gas in real life (blocks oxygen in blood). Shown only to learn why it is dangerous.',HCN:'Highly toxic in real life. Structure shown for learning only.',H2S:'Toxic, rotten-egg gas. Learning only.',
 Cl2:'Toxic gas in real life. Learning only.',F2:'Extremely reactive and toxic. Learning only.',PH3:'Toxic gas. Learning only.',HF:'Very dangerous acid. Learning only.',CCl4:'Toxic solvent. Learning only.',NH3:'Irritant gas: never mix cleaners.',CH2O:'Real formaldehyde is toxic; here it stands for one sugar unit.'};
function counts(atoms){ const c={}; for(const a of atoms) c[a.e]=(c[a.e]||0)+1; return c; }
function hill(c){ const ks=Object.keys(c); let order;
  if(c.C) order=['C',...(c.H?['H']:[]),...ks.filter(k=>k!=='C'&&k!=='H').sort()];
  else { const met=ks.filter(k=>EL[k].kind==='m').sort(), rest=ks.filter(k=>EL[k].kind!=='m').sort(); order=[...met,...rest]; }
  return order.map(k=>k+(c[k]>1?c[k]:'')).join(''); }
const CANON={H2O:'H2O',HNaO:'NaOH',H3N:'NH3',H3P:'PH3',ClH:'HCl',FH:'HF',BrH:'HBr',HI:'HI',H2S:'H2S'};
function formulaKey(atoms){ const c=counts(atoms), k=Object.keys(c).sort().map(e=>e+(c[e]>1?c[e]:'')).join(''); return CANON[k]||hill(c); }
const pretty=f=>(DISPLAY[f]||f).replace(/(\d+)/g,m=>SUB(m));

/* ---------- molecule model ---------- */
let scene, idc=1; export const MOLS=[];
const sphereG=new THREE.SphereGeometry(1,24,16), cylG=new THREE.CylinderGeometry(1,1,1,10), torusCache={};
const matCache={}; const mat=(c,em=0)=>matCache[c+'_'+em]||(matCache[c+'_'+em]=new THREE.MeshStandardMaterial({color:c,roughness:.35,metalness:.1,emissive:c,emissiveIntensity:em}));
const eMat=new THREE.MeshBasicMaterial({color:0x88ccff}), vMat=new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,1.9,.6)}), pairMat=new THREE.MeshBasicMaterial({color:new THREE.Color(2,1.8,.5)});
const ringMat=new THREE.MeshBasicMaterial({color:0x88aaff,transparent:true,opacity:.28,depthWrite:false}), vRingMat=new THREE.MeshBasicMaterial({color:0xffdd77,transparent:true,opacity:.55,depthWrite:false});
const bondMat=new THREE.MeshStandardMaterial({color:0xdddddd,roughness:.4}), ionBondMat=new THREE.MeshBasicMaterial({color:0xaaaaff,transparent:true,opacity:.35});
const free=a=>a.kind==='cov'?EL[a.e].cov-a.bo:0;
function newMol(atoms,bonds,kind,x,y){ const m={id:idc++,atoms,bonds,kind,x,y,vx:0,vy:0,q:new THREE.Quaternion(),spin:new THREE.Vector3(0,.4,0),g:new THREE.Group(),lab:document.createElement('div'),t:0,born:FX.t};
  m.g.renderOrder=4; scene.add(m.g); m.lab.className='alab'; $('atomLabels').appendChild(m.lab); rebuild(m); MOLS.push(m); return m; }
function delMol(m){ scene.remove(m.g); m.lab.remove(); const i=MOLS.indexOf(m); if(i>=0) MOLS.splice(i,1); }
export function spawnAtom(e,x,y){ return newMol([{e,kind:EL[e].kind==='m'?'ion':EL[e].kind==='g'?'g':'cov',bo:0,charge:0}],[], 'atom',x,y); }

/* VSEPR templates */
const T={1:[[1,0,0]],2:[[1,0,0],[-1,0,0]],3:[[1,0,0],[-.5,.866,0],[-.5,-.866,0]],4:[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>v.map(c=>c/Math.sqrt(3)))};
const lpOf=a=>{ const d=EL[a.e]; return a.kind==='cov'?Math.max(0,(d.val-a.bo)/2|0):0; };
function layout(m){ const A=m.atoms, nb=A.map(()=>[]); for(const b of m.bonds){nb[b.a].push(b.b);nb[b.b].push(b.a);}
  let root=0; A.forEach((a,i)=>{ if(nb[i].length>nb[root].length) root=i; });
  const pos=A.map(()=>null); pos[root]=new THREE.Vector3(); const lps=[];
  const q=[[root,null]];
  while(q.length){ const [u,par]=q.shift(); const sn=Math.max(1,Math.min(4,nb[u].length+lpOf(A[u]))); let dirs=T[sn].map(v=>new THREE.Vector3(...v));
    if(par!==null){ const din=pos[par].clone().sub(pos[u]).normalize(); const r=new THREE.Quaternion().setFromUnitVectors(dirs[0],din); dirs=dirs.map(d=>d.applyQuaternion(r)); }
    else if(sn===4){ const r=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1,-1,1).normalize(),new THREE.Vector3(0,-1,0)); dirs=dirs.map(d=>d.applyQuaternion(r)); }
    let k=par!==null?1:0;
    for(const v of nb[u]){ if(v===par) continue; if(pos[v]){continue;} const d=dirs[k++]||new THREE.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize();
      const b=m.bonds.find(b=>(b.a===u&&b.b===v)||(b.a===v&&b.b===u)); const len=(EL[A[u].e].r+EL[A[v].e].r)*1.75-(b.order-1)*3;
      pos[v]=pos[u].clone().addScaledVector(d,len); q.push([v,u]); }
    for(;k<sn;k++) lps.push({p:pos[u].clone(),d:dirs[k]}); }
  const c=new THREE.Vector3(); pos.forEach(p=>c.add(p)); c.divideScalar(pos.length); pos.forEach(p=>p.sub(c)); lps.forEach(l=>l.p.sub(c));
  return {pos,lps,root,nb}; }
const SHAPE={'2,0':['linear','180°'],'3,0':['trigonal planar','120°'],'3,1':['bent','~117°'],'4,0':['tetrahedral','109.5°'],'4,1':['trigonal pyramidal','~107°'],'4,2':['bent','~104.5°'],'4,3':['linear','180°']};

function bohr(m){ const a=m.atoms[0], d=EL[a.e]; const g=m.g; let shells=[...d.shells];
  // ions: remove or add valence electrons so the picture stays accurate
  if(a.charge>0){ let r=a.charge; while(r>0){ const s=shells.length-1; const take=Math.min(r,shells[s]); shells[s]-=take; r-=take; if(shells[s]===0) shells.pop(); } }
  if(a.charge<0) shells[shells.length-1]+=-a.charge;
  const nuc=new THREE.Mesh(sphereG,mat(d.col,.25)); nuc.scale.setScalar(9); g.add(nuc);
  m.orbits=[]; const vs=shells.length-1;
  shells.forEach((n,si)=>{ const R=20+si*11, isV=si===vs; const key=R;
    const tg=torusCache[key]||(torusCache[key]=new THREE.TorusGeometry(R,.7,6,80)); const piv=new THREE.Group(); piv.rotation.set(1.1+si*.35,si*.7,0);
    piv.add(new THREE.Mesh(tg,isV?vRingMat:ringMat));
    const spin=new THREE.Group(); piv.add(spin);
    const show=Math.min(n,18); for(let i=0;i<show;i++){ const e=new THREE.Mesh(sphereG,isV?vMat:eMat); const ang=i/show*Math.PI*2; e.position.set(Math.cos(ang)*R,Math.sin(ang)*R,0); e.scale.setScalar(isV?3.4:2.2); spin.add(e); }
    g.add(piv); m.orbits.push({spin,w:(isV?1.2:2.2)/(si+1)}); });
  m.R=20+(shells.length-1)*11+6; m.valN=a.charge>0?0:shells[vs]; m.shells=shells; }
function sticks(m){ const {pos,lps,root,nb}=layout(m); m.pos=pos; const A=m.atoms;
  A.forEach((a,i)=>{ const d=EL[a.e]; const s=new THREE.Mesh(sphereG,mat(d.col,.08)); s.scale.setScalar(d.r*.62); s.position.copy(pos[i]); m.g.add(s); });
  for(const b of m.bonds){ const p1=pos[b.a],p2=pos[b.b], dir=p2.clone().sub(p1), len=dir.length(); dir.normalize();
    let perp=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,0,1)); if(perp.lengthSq()<1e-3) perp.set(1,0,0); perp.normalize();
    const offs=b.order===1?[0]:b.order===2?[-3.2,3.2]:[-5,0,5];
    for(const o of offs){ const c=new THREE.Mesh(cylG,b.ionic?ionBondMat:bondMat); c.scale.set(b.ionic?1.2:2.1,len,b.ionic?1.2:2.1); c.position.copy(p1).add(p2).multiplyScalar(.5).addScaledVector(perp,o);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir); m.g.add(c); }
    if(!b.ionic) for(let k=0;k<b.order;k++) for(const s of [-1,1]){ const e=new THREE.Mesh(sphereG,pairMat); e.scale.setScalar(1.8); e.position.copy(p1).add(p2).multiplyScalar(.5).addScaledVector(perp,offs[k]+s*0).addScaledVector(dir,s*3.2); e.userData.pair=true; m.g.add(e); } }
  for(const l of lps){ for(const s of [-1,1]){ const e=new THREE.Mesh(sphereG,eMat); e.scale.setScalar(1.6); const perp=new THREE.Vector3().crossVectors(l.d,new THREE.Vector3(0,0,1)).normalize(); e.position.copy(l.p).addScaledVector(l.d,EL[A[0].e].r*.9+6).addScaledVector(perp,s*2.6); m.g.add(e);} }
  m.R=Math.max(...pos.map(p=>p.length()))+16;
  const sn=nb[root].length+lpOf(A[root]); m.shape=A.length===2?['linear','180°']:SHAPE[`${sn},${lpOf(A[root])}`]||['—','']; }
function lattice(m){ const A=m.atoms, cat=A.filter(a=>a.charge>0), an=A.filter(a=>a.charge<0), seq=[]; const mx=Math.max(cat.length,an.length);
  for(let i=0;i<mx;i++){ if(cat[i]) seq.push(cat[i]); if(an[i]) seq.push(an[i]); }
  const cols=seq.length<=2?2:3; m.pos=[]; seq.forEach((a,i)=>{ const d=EL[a.e], r=a.charge>0?d.r*.7:d.r*1.05; const x=(i%cols-(Math.min(cols,seq.length)-1)/2)*30, y=-(Math.floor(i/cols)-(Math.ceil(seq.length/cols)-1)/2)*30;
    const s=new THREE.Mesh(sphereG,mat(d.col,.15)); s.scale.setScalar(r); s.position.set(x,y,(i%2)*8-4); m.g.add(s); m.pos[A.indexOf(a)]=s.position.clone(); });
  m.R=24+seq.length*8; }
function rebuild(m){ while(m.g.children.length) m.g.remove(m.g.children[0]); m.orbits=null;
  if(m.kind==='atom') bohr(m); else if(m.kind==='ionic') lattice(m); else sticks(m); m.g.scale.setScalar(SC); m.R*=SC; label(m); }
const SC=1.5;
function netCharge(m){ return m.atoms.reduce((s,a)=>s+a.charge,0); }
function ionNet(m){ return m.atoms.reduce((s,a)=>s+(EL[a.e].kind==='m'?EL[a.e].ion:(EL[a.e].ion||0)),0); }
function complete(m){ if(m.kind==='atom') return EL[m.atoms[0].e].kind!=='n'; if(m.kind==='ionic') return ionNet(m)===0; return m.atoms.every(a=>free(a)===0); }
function label(m){ const A=m.atoms;
  if(m.kind==='atom'){ const a=A[0], d=EL[a.e];
    m.lab.innerHTML=`<b>${a.e}${chg(a.charge)}</b> ${d.name} · Z=${d.Z}<br>Group ${d.group} · ${a.charge>0?'0 (gave away)':m.valN} valence e⁻<br><i>${tendency(a.e)}</i>${d.tm?`<br><small>${d.tm}</small>`:''}`; return; }
  const f=formulaKey(A), nm=NAMES[f]||'', hz=HAZ[f];
  if(m.kind==='ionic'){ const n=ionNet(m), ions=[...new Set(A.map(a=>a.e+chg(EL[a.e].kind==='m'?EL[a.e].ion:EL[a.e].ion)))].join(' ');
    m.lab.innerHTML=`<b>${pretty(f)}</b> ${nm}<br>ionic · ${ions}${n?`<br><i>net ${n>0?'+':''}${n}: needs ${n>0?'more anions (non-metal)':'more cations (metal)'}</i>`:'<br>charges cancel ✓'}`; return; }
  const need=A.filter(a=>free(a)>0).map(a=>`${a.e} needs ${free(a)}`).join(', ');
  m.lab.innerHTML=`<b>${pretty(f)}</b> ${nm}<br>${need?`<i>${need} more bond${need.includes(' 1')&&!need.includes(',')?'':'s'}</i>`:`covalent · ${m.shape?.[0]||''} ${m.shape?.[1]||''}`}${hz&&!need?`<div class="haz">${hz}</div>`:''}`; }

/* ---------- bonding rules ---------- */
function explainNoble(e){ return `${EL[e].name} already has a full outer shell (${EL[e].val} e⁻), so it has no reason to share or swap electrons.`; }
export function tryBond(D,T){ const all=[...D.atoms,...T.atoms];
  const g=all.find(a=>EL[a.e].kind==='g'); if(g) return fail(explainNoble(g.e));
  const metals=all.filter(a=>EL[a.e].kind==='m'), nonm=all.filter(a=>EL[a.e].kind==='n');
  const isIonicish=m=>m.kind==='ionic'||(m.kind==='atom');
  if(metals.length){
    if(!nonm.length) return fail('Metal + metal makes a metallic bond (a sea of shared electrons in a solid), not a molecule. Try a metal with a non-metal like Cl or O.');
    if(!isIonicish(D)||!isIonicish(T)) return fail('Metals here give electrons away to make ions. Bring the metal to single non-metal atoms (like Cl or O), not to a finished covalent molecule.');
    const bad=nonm.find(a=>!EL[a.e].ion); if(bad) return fail(`${EL[bad.e].name} doesn't form a simple ion with metals at this level. Try Cl, F, Br, I, O, S, N or H.`);
    const before=[D,T].find(m=>m.kind==='ionic'&&ionNet(m)===0); if(before) return fail(`${pretty(formulaKey(before.atoms))} is already balanced: its + and − charges cancel. Start a new compound.`);
    const net=all.reduce((s,a)=>s+EL[a.e].ion,0), mx=Math.max(...all.map(a=>Math.abs(EL[a.e].ion)));
    if(Math.abs(net)>mx||all.length>5) return fail(`Too many ${net>0?'metal':'non-metal'} atoms: the charges can't balance that way. Each ${metals[0].e} gives ${EL[metals[0].e].ion} e⁻; each ${nonm[0].e} takes ${-EL[nonm[0].e].ion}.`);
    const atoms=all.map(a=>({e:a.e,kind:'ion',bo:0,charge:EL[a.e].ion}));
    transferFx(D,T); const m=newMol(atoms,[],'ionic',(D.x+T.x)/2,(D.y+T.y)/2); delMol(D); delMol(T);
    const f=formulaKey(atoms); say(net===0?`${pretty(f)}: electrons transferred!`:`Ions forming… net charge ${net>0?'+':''}${net}`);
    explain(net===0?`Ionic bond: each metal atom gave its valence electron${metals.length>1||EL[metals[0].e].ion>1?'s':''} to the non-metal. Now everyone has a full outer shell, and opposite charges (${[...new Set(atoms.map(a=>a.e+chg(a.charge)))].join(', ')}) attract.`:`Add ${net>0?'another non-metal atom':'another metal atom'} to cancel the charge.`);
    ev('bond',f); return m; }
  // covalent
  let best=null; for(const a of D.atoms) for(const b of T.atoms){ const fa=free(a), fb=free(b); if(fa>0&&fb>0){ const s=Math.min(fa,fb)*10+fa+fb; if(!best||s>best.s) best={a,b,s}; } }
  if(!best){ const full=[D,T].find(m=>m.atoms.every(a=>free(a)===0));
    const f=full?formulaKey(full.atoms):''; return fail(full?`${pretty(f)} is already complete: every atom has a full octet${full.atoms.some(a=>a.e==='H')?' (H has its duet of 2)':''}. Nothing left to share. Try dragging complete molecules together for a reaction.`:'No atom here has a free bonding spot.'); }
  const order=Math.min(free(best.a),free(best.b),3);
  const atoms=[...D.atoms,...T.atoms], off=D.atoms.length, bonds=[...D.bonds,...T.bonds.map(b=>({...b,a:b.a+off,b:b.b+off}))];
  bonds.push({a:atoms.indexOf(best.a),b:atoms.indexOf(best.b),order}); best.a.bo+=order; best.b.bo+=order;
  shareFx(D,T,order); const m=newMol(atoms,bonds,'cov',(D.x+T.x)/2,(D.y+T.y)/2); m.q.copy(T.q); delMol(D); delMol(T);
  const f=formulaKey(atoms), done=complete(m);
  say(`${['','Single','Double','Triple'][order]} bond: ${order} shared pair${order>1?'s':''}`);
  explain(`${best.a.e} and ${best.b.e} each put in ${order} electron${order>1?'s':''}, making ${order} shared pair${order>1?'s':''} (${order*2} e⁻ between them). ${done?`${pretty(f)} is complete: every atom has 8 around it${atoms.some(a=>a.e==='H')?' and each H has 2':''}. Shape: ${m.shape[0]}${m.shape[1]?' ('+m.shape[1]+')':''}.`:'Still has open bonding spots.'}`);
  ev('bond',f); return m; }
function fail(msg){ say('Not that one…'); explain(msg); ev('refuse'); return null; }

/* ---------- reactions (balanced, real ΔH) ---------- */
const DEF={H2:[['H','H'],[[0,1,1]]],O2:[['O','O'],[[0,1,2]]],N2:[['N','N'],[[0,1,3]]],H2O:[['O','H','H'],[[0,1,1],[0,2,1]]],CH4:[['C','H','H','H','H'],[[0,1,1],[0,2,1],[0,3,1],[0,4,1]]],
 CO2:[['C','O','O'],[[0,1,2],[0,2,2]]],HCl:[['Cl','H'],[[0,1,1]]],CH2O:[['C','O','H','H'],[[0,1,2],[0,2,1],[0,3,1]]],NaOH:[['O','H','Na'],[[0,1,1],[0,2,1,1]]],NH3:[['N','H','H','H'],[[0,1,1],[0,2,1],[0,3,1]]]};
export function buildSpecies(f,x,y){
  if(f==='Na') return spawnAtom('Na',x,y);
  if(f==='NaCl'){ return newMol([{e:'Na',kind:'ion',bo:0,charge:1},{e:'Cl',kind:'ion',bo:0,charge:-1}],[],'ionic',x,y); }
  const [els,bs]=DEF[f]; const atoms=els.map(e=>({e,kind:e==='Na'?'ion':'cov',bo:0,charge:0}));
  const bonds=bs.map(([a,b,o,ion])=>{ if(!ion){atoms[a].bo+=o;atoms[b].bo+=o;} else {atoms[a].bo+=1; atoms[b].charge=1;} return {a,b,order:o,ionic:!!ion}; });
  return newMol(atoms,bonds,'cov',x,y); }
export const RX=[
 {id:'h2',re:{H2:2,O2:1},pr:{H2O:2},eq:'2H₂ + O₂ → 2H₂O',dH:-483.6,per:'per 2 mol H₂O (gas)',fx:'fire',
  note:'Hydrogen burns in oxygen: H–H and O=O bonds break, stronger O–H bonds form, and the difference comes out as heat and light. Real H₂/O₂ mixtures can explode: teacher-only demo.'},
 {id:'ch4',re:{CH4:1,O2:2},pr:{CO2:1,H2O:2},eq:'CH₄ + 2O₂ → CO₂ + 2H₂O',dH:-890,per:'per mol CH₄',fx:'fire',
  note:'This is a gas stove flame. Every C and H atom ends up bonded to O. Count them: 1 C, 4 H, 4 O on each side.'},
 {id:'na',re:{Na:2,H2O:2},pr:{NaOH:2,H2:1},eq:'2Na + 2H₂O → 2NaOH + H₂',dH:-368,per:'per 2 mol Na',fx:'nawater',
  note:'Sodium gives its valence electron to water, forming Na⁺ OH⁻ (a strong base) and hydrogen gas. The heat can ignite the H₂. Teacher-only, tiny pieces, behind a shield.'},
 {id:'neut',re:{HCl:1,NaOH:1},pr:{NaCl:1,H2O:1},eq:'HCl + NaOH → NaCl + H₂O',dH:-57,per:'per mol water formed',fx:'water',
  note:'Acid + base → salt + water. The real action is H⁺ + OH⁻ → H₂O; Na⁺ and Cl⁻ just watch. This is how antacids work.'},
 {id:'photo',re:{CO2:1,H2O:1},pr:{CH2O:1,O2:1},eq:'CO₂ + H₂O → (CH₂O) + O₂   ×6: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',dH:467,per:'per CO₂ (+2803 kJ per mol glucose)',fx:'light',
  note:'Overview of photosynthesis. Plants use sunlight and chlorophyll to store energy in sugar and release O₂. It needs light, many enzyme steps, and happens in leaves, not by mixing two gases. Your plants are doing this right now.'},
];
function speciesKey(m){ if(m.kind==='atom') return m.atoms[0].e; return formulaKey(m.atoms); }
function tryReact(D,T){ const near=MOLS.filter(m=>m!==D&&Math.hypot(m.x-T.x,m.y-T.y)<260&&complete(m)); if(!near.includes(T)) near.push(T); const pool=[D,...near.filter(m=>m!==D)];
  const kd=speciesKey(D), kt=speciesKey(T);
  const cands=RX.filter(r=>r.re[kd]&&r.re[kt]&&(kd!==kt||r.re[kd]>=2));
  if(!cands.length) return null;
  for(const r of cands){ const use=[], left=[...pool]; let ok=true;
    for(const [k,n] of Object.entries(r.re)){ for(let i=0;i<n;i++){ const j=left.findIndex(m=>speciesKey(m)===k); if(j<0){ok=false;break;} use.push(left.splice(j,1)[0]); } if(!ok) break; }
    if(ok){ runReaction(r,use); return true; } }
  const r=cands[0]; const have={}; pool.forEach(m=>{const k=speciesKey(m); have[k]=(have[k]||0)+1;});
  const miss=Object.entries(r.re).filter(([k,n])=>(have[k]||0)<n).map(([k,n])=>`${n-(have[k]||0)} more ${pretty(k)}`).join(' and ');
  say('Almost!'); explain(`To balance ${r.eq.split('   ')[0]} you need ${miss} nearby. Atoms can't appear or vanish: both sides must have the same atoms.`); return true; }
const tweens=[];
function runReaction(r,use){ const cx=use.reduce((s,m)=>s+m.x,0)/use.length, cy=use.reduce((s,m)=>s+m.y,0)/use.length;
  // where every reactant atom is on screen now
  const src=[]; for(const m of use){ m.g.updateMatrixWorld(true); const pos=m.pos||[new THREE.Vector3()]; m.atoms.forEach((a,i)=>{ const p=(pos[i]||new THREE.Vector3()).clone().applyQuaternion(m.q).multiplyScalar(SC); src.push({e:a.e,x:m.x+p.x,y:m.y-p.y,used:false}); }); delMol(m); }
  const prods=[]; let k=0; const tot=Object.values(r.pr).reduce((a,b)=>a+b,0);
  for(const [f,n] of Object.entries(r.pr)) for(let i=0;i<n;i++){ const ang=(k++/tot)*Math.PI*2; const p=buildSpecies(f,cx+Math.cos(ang)*80,cy+Math.sin(ang)*70); p.g.visible=false; p.lab.style.opacity=0; prods.push(p); }
  for(const p of prods){ const pos=p.pos||[new THREE.Vector3()]; p.atoms.forEach((a,i)=>{ const s=src.find(s=>!s.used&&s.e===a.e); if(!s) return; s.used=true;
      const t=(pos[i]||new THREE.Vector3()).clone().applyQuaternion(p.q).multiplyScalar(SC); const ball=new THREE.Mesh(sphereG,mat(EL[a.e].col,.3)); ball.scale.setScalar(EL[a.e].r*.62); scene.add(ball);
      tweens.push({e:a.e,ball,x0:s.x,y0:s.y,x1:p.x+t.x,y1:p.y-t.y,mx:cx+rnd(-30,30),my:cy+rnd(-30,30),t:0,done:p}); }); }
  setTimeout(()=>{ for(const p of prods){ p.g.visible=true; p.lab.style.opacity=1; } },1500);
  E_.reaction={r,t:0,x:cx,y:cy}; energy(r); say(r.dH<0?'Exothermic! Energy out':'Endothermic: energy in'); explain(r.note); ev('react',r.id); }
function energy(r){ const p=$('energy'); p.hidden=false; const exo=r.dH<0, w=Math.min(100,Math.abs(r.dH)/9);
  p.innerHTML=`<div class="eqn">${r.eq}</div><div class="ebar ${exo?'exo':'endo'}"><div style="width:${w}%"></div></div><div>ΔH = ${r.dH>0?'+':''}${r.dH} kJ <small>${r.per}</small> · <b>${exo?'EXOTHERMIC: releases energy':'ENDOTHERMIC: absorbs energy (light)'}</b></div>`; }
function reactionFx(dt){ const R=E_.reaction; if(!R) return; R.t+=dt; const {x,y}=R, k=FX.Q;
  if(R.t>3){E_.reaction=null;return;}
  if(R.r.fx==='fire'||R.r.fx==='nawater'){ if(R.t<2) for(let i=0;i<16*k;i++){ const a=rnd(0,6.28),s=rnd(60,320); L.fire.spawn(x+rnd(-20,20),y+rnd(-20,20),Math.cos(a)*s,Math.sin(a)*s-120,{size:rnd(22,44),grow:1.4,life:rnd(.4,.8),curl:2,a:.6,c:R.r.fx==='nawater'?[1.2,.8,.3]:[1,.9,.8]}); }
    lightAt(x,y,[1,.6,.25],4*(1-R.t/3)); if(R.t<.05) FX.flash=.5; }
  if(R.r.fx==='water'||R.r.fx==='nawater'){ if(R.t<.6&&Math.random()<.7) for(let i=0;i<4;i++){ const a=rnd(Math.PI,2*Math.PI),s=rnd(150,450); waterSpawn(x,y+20,Math.cos(a)*s,Math.sin(a)*s,0,1.2);} }
  if(R.r.fx==='light'){ for(let i=0;i<6*k;i++) L.glow.spawn(x+rnd(-160,160),y-220+rnd(-30,30),rnd(-10,10),rnd(160,260),{c:[1.2,1.1,.5],size:rnd(8,16),life:1.1,a:.8});
    if(Math.random()<.5) L.glow.spawn(x+rnd(-40,40),y+rnd(-40,40),0,0,{c:[.3,1.2,.4],size:rnd(60,110),life:.5,a:.35}); } }
function transferFx(D,T){ const [m,n]=EL[D.atoms[0].e]?.kind==='m'?[D,T]:[T,D]; E_.fly.push({x0:m.x,y0:m.y,x1:n.x,y1:n.y,t:0,c:[1.4,1.2,.4]}); }
function shareFx(D,T,o){ for(let i=0;i<o;i++){ E_.fly.push({x0:D.x,y0:D.y,x1:(D.x+T.x)/2,y1:(D.y+T.y)/2,t:-i*.12,c:[1.3,1.2,.5]}); E_.fly.push({x0:T.x,y0:T.y,x1:(D.x+T.x)/2,y1:(D.y+T.y)/2,t:-i*.12,c:[1.3,1.2,.5]}); } }
function flyStep(dt){ for(let i=E_.fly.length-1;i>=0;i--){ const f=E_.fly[i]; f.t+=dt/.7; if(f.t<0) continue; if(f.t>1){E_.fly.splice(i,1);continue;}
  const s=f.t*f.t*(3-2*f.t), x=f.x0+(f.x1-f.x0)*s, y=f.y0+(f.y1-f.y0)*s-Math.sin(f.t*Math.PI)*40;
  L.glow.spawn(x,y,0,0,{c:f.c,size:22,life:.12,field:0}); L.streak.spawn(x,y,0,0,{tx:x-(f.x1-f.x0)*.05,ty:y-(f.y1-f.y0)*.05,life:.3,w:3,c:[1,.9,.5]}); } }

/* ---------- UI: palette, labels, explain, events ---------- */
export const E_={held:null,fly:[],reaction:null,ui:false,events:[]};
let say=()=>{}, onEv=[];
function explain(m){ const b=$('atip'); b.hidden=false; b.innerHTML=m; clearTimeout(explain.t); explain.t=setTimeout(()=>b.hidden=true,9000); }
function ev(type,data){ E_.events.push({type,data}); window.labEvent?.(type==='bond'||type==='react'?type+':'+data:'atoms:'+type); onEv.forEach(f=>f(type,data)); }
export function init(sc,sayFn){ scene=sc; say=sayFn;
  const p=$('ptable'); p.innerHTML=PALETTE.map(e=>`<button class="pt k-${EL[e].kind}" data-e="${e}"><small>${EL[e].Z}</small>${e}</button>`).join('')+
   ['H2','O2','H2O','CH4','CO2','HCl','NaOH'].map(f=>`<button class="pt kit" data-f="${f}">${pretty(f)}</button>`).join('')+`<button class="pt kit" id="aClear">Clear</button><button class="pt kit" id="aChal">Challenge</button>`;
  $('aClear').onclick=()=>{ [...MOLS].forEach(delMol); $('energy').hidden=true; };
  $('aChal').onclick=()=>challenge(); }
export function show(on){ $('ptable').hidden=!on; $('gest').style.display=on?'none':''; $('status').style.visibility=on?'hidden':''; $('atomLabels').hidden=!on; if(!on){ $('energy').hidden=true; $('atip').hidden=true; $('chal').hidden=true; [...MOLS].forEach(m=>m.g.visible=false);} else MOLS.forEach(m=>m.g.visible=true); }
function tileAt(x,y){ for(const b of document.querySelectorAll('#ptable .pt')){ const r=b.getBoundingClientRect(); if(x>=r.left-4&&x<=r.right+4&&y>=r.top-4&&y<=r.bottom+4) return b; } return null; }
function pick(x,y,ex){ let best=null,bd=1e9; for(const m of MOLS){ if(m===ex) continue; const d=Math.hypot(m.x-x,m.y-y); if(d<m.R+(ex?ex.R+10:34)&&d<bd){bd=d;best=m;} } return best; }

/* ---------- per-frame update from hands ---------- */
export function update(hands,dt){
  const H=hands[0];
  if(H){ const p=H.pinchPt;
    if(H.g==='poke'&&!E_.held&&H.changed){ const t=tileAt(p.x,p.y);
      if(t&&t.dataset.e){ E_.held=spawnAtom(t.dataset.e,p.x,p.y-60); say(EL[t.dataset.e].name); }
      else if(t&&t.dataset.f){ E_.held=buildSpecies(t.dataset.f,p.x,p.y-60); say(pretty(t.dataset.f)); }
      else if(t) t.click();
      else E_.held=pick(p.x,p.y); }
    if(E_.held&&H.g==='poke'){ const m=E_.held; m.x+=(p.x-m.x)*.5; m.y+=(Math.min(p.y-(H.src==='touch'?0:0),FX.H-140)-m.y)*.5; const t=pick(m.x,m.y,m);
      MOLS.forEach(o=>o.lab.classList.toggle('hot',o===t)); }
    if(E_.held&&H.g!=='poke'){ const D=E_.held; E_.held=null; MOLS.forEach(o=>o.lab.classList.remove('hot'));
      const T=pick(D.x,D.y,D);
      if(T){ const bothDone=complete(D)&&complete(T); let r=null; if(bothDone||(D.kind==='atom'&&EL[D.atoms[0].e].kind==='m'&&T.kind==='cov')) r=tryReact(D,T);
        if(!r) tryBond(D,T); } }
    // open palm near a molecule rotates it with the hand
    if(H.g==='vee'||H.g==='open'){ const m=pick(H.palm.x,H.palm.y)||pick(H.palm.x,H.palm.y-60); if(m){ m.spin.y+=H.vx*.0009; m.spin.x+=H.vy*.0009; } }
    if(H.g==='fist'){ const m=pick(H.palm.x,H.palm.y); if(m&&m.kind!=='atom'){ m.fistT=(m.fistT||0)+dt; if(m.fistT>.7) split(m); } } }
  for(const m of MOLS){ if(m!==E_.held){ m.spin.multiplyScalar(Math.pow(.6,dt)); if(m.spin.length()<.25) m.spin.y+=.2*dt; }
    const dq=new THREE.Quaternion().setFromEuler(new THREE.Euler(m.spin.x*dt,m.spin.y*dt,0)); m.q.premultiply(dq);
    if(m.kind==='atom'){ m.g.quaternion.identity(); m.orbits?.forEach(o=>o.spin.rotation.z+=o.w*dt); const a=m.atoms[0];
      if(m.valN&&Math.random()<.5) L.glow.spawn(m.x,m.y,0,0,{c:[1,.85,.35],size:m.R*2.6,life:.08,a:.12,field:0}); }
    else m.g.quaternion.copy(m.q);
    // keep separate: gentle push apart
    for(const o of MOLS){ if(o===m||o===E_.held||m===E_.held) continue; const dx=m.x-o.x,dy=m.y-o.y,d=Math.hypot(dx,dy)||1, min=m.R+o.R-6; if(d<min){ m.x+=dx/d*(min-d)*.05; m.y+=dy/d*(min-d)*.05; } }
    m.x=Math.max(m.R,Math.min(FX.W-m.R,m.x)); m.y=Math.max(110+m.R,Math.min(FX.H-150,m.y));
    m.g.position.set(m.x,-m.y,0);
    m.lab.style.transform=`translate(${m.x}px,${m.y+m.R+6}px) translateX(-50%)`; }
  for(let i=tweens.length-1;i>=0;i--){ const t=tweens[i]; t.t+=dt/1.4; const s=Math.min(1,t.t), e=s*s*(3-2*s);
    const x=(1-e)*(1-e)*t.x0+2*(1-e)*e*t.mx+e*e*t.x1, y=(1-e)*(1-e)*t.y0+2*(1-e)*e*t.my+e*e*t.y1; t.ball.position.set(x,-y,10); t.ball.scale.setScalar(EL[t.e].r*.62*SC);
    if(s>=1){ scene.remove(t.ball); tweens.splice(i,1); } }
  flyStep(dt); reactionFx(dt); chalTick(); }
function split(m){ const n=m.atoms.length; m.atoms.forEach((a,i)=>{ const ang=i/n*6.28; spawnAtom(a.e,m.x+Math.cos(ang)*70,m.y+Math.sin(ang)*60); }); delMol(m); say('Split into atoms'); explain('Breaking bonds always takes energy in. Making bonds gives energy out. That balance is what ΔH measures.'); }

/* ---------- mini challenges (WIR School format: 3 per set, Easy / Medium / Hard, then recap) ---------- */
const has=f=>MOLS.some(m=>m.kind!=='atom'&&complete(m)&&formulaKey(m.atoms)===f);
const did=id=>E_.events.some(e=>e.type==='react'&&(id==='exo'?RX.find(r=>r.id===e.data)?.dH<0:e.data===id));
const SETS=[
 {title:'Water world',qs:[
   {lv:'Easy',q:'Build a water molecule, H₂O. Pinch H, O, H and bring them together.',check:()=>has('H2O')},
   {lv:'Medium',q:'Why is water bent, not straight?',opts:['O has 2 bonds and 2 lone pairs pushing the H atoms down','H atoms repel the screen','Water is actually straight','Oxygen has 4 bonds'],a:0},
   {lv:'Hard',q:'Run a reaction that releases energy (exothermic). Hint: H₂ + H₂ + O₂ from the kits.',check:()=>did('exo')}],
  recap:['Water is H₂O: two single O–H bonds, so O gets 8 electrons and each H gets 2.','Its two lone pairs bend it to about 104.5°.','Forming strong O–H bonds releases energy, so burning hydrogen is exothermic.']},
 {title:'Salt and swaps',qs:[
   {lv:'Easy',q:'Make table salt: bring Na to Cl.',check:()=>has('NaCl')},
   {lv:'Medium',q:'In NaCl, what does sodium do with its 1 valence electron?',opts:['Gives it to chlorine','Shares it with chlorine','Keeps it','Turns it into a proton'],a:0},
   {lv:'Hard',q:'Build N₂. How many shared pairs does it need?',check:()=>has('N2')}],
  recap:['Metals give electrons away and non-metals take them: that is an ionic bond (Na⁺ Cl⁻).','Each N has 5 valence electrons and needs 3 more, so N₂ has a triple bond (3 shared pairs).','Full outer shells are the goal either way.']},
 {title:'Fuel and fire',qs:[
   {lv:'Easy',q:'Build methane, CH₄ (one C, four H).',check:()=>has('CH4')},
   {lv:'Medium',q:'What is the H–C–H angle in methane?',opts:['109.5° (tetrahedral)','90°','120°','180°'],a:0},
   {lv:'Hard',q:'Burn methane: bring CH₄ together with two O₂.',check:()=>did('ch4')}],
  recap:['Carbon makes 4 bonds, which gives the tetrahedral shape at 109.5°.','CH₄ + 2O₂ → CO₂ + 2H₂O is balanced: 1 C, 4 H and 4 O on each side.','It releases 890 kJ per mole, which is why gas stoves get hot.']},
 {title:'Leaf power',qs:[
   {lv:'Easy',q:'How many valence electrons does oxygen have?',opts:['6','2','8','16'],a:0},
   {lv:'Medium',q:'Build carbon dioxide, CO₂ (two double bonds).',check:()=>has('CO2')},
   {lv:'Hard',q:'Photosynthesis is…',opts:['Endothermic: it stores sunlight energy in sugar','Exothermic: it releases heat','Neither','A kind of combustion'],a:0}],
  recap:['Oxygen is in group 16 with 6 valence electrons, so it needs 2 more and makes 2 bonds.','CO₂ is linear: O=C=O.','Plants run combustion backwards with light: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, absorbing energy.']},
 {title:'Acids, bases, nobles',qs:[
   {lv:'Easy',q:'Build O₂. It should end up with a double bond.',check:()=>has('O2')},
   {lv:'Medium',q:'Why won\'t neon bond?',opts:['Its outer shell is already full (8)','It is too heavy','It is a metal','It has no electrons'],a:0},
   {lv:'Hard',q:'Neutralize an acid: bring HCl and NaOH together.',check:()=>did('neut')}],
  recap:['O₂ has a double bond (2 shared pairs).','Noble gases have full shells, so they stay single.','Acid + base → salt + water: H⁺ + OH⁻ → H₂O.']},
];
let C=null;
export function challenge(){ const set=SETS[(C?SETS.indexOf(C.set)+1:Math.floor(Math.random()*SETS.length))%SETS.length]; C={set,i:0,start:E_.events.length}; drawChal(); }
function drawChal(){ const b=$('chal'); b.hidden=false; const s=C.set;
  if(C.i>=3){ b.innerHTML=`<h3>${s.title}: done ✓</h3><b>What you know now</b><ul>${s.recap.map(r=>`<li>${r}</li>`).join('')}</ul><button id="chNext">Next set</button> <button id="chX">Close</button>`;
    $('chNext').onclick=challenge; $('chX').onclick=()=>{b.hidden=true;C=null;}; return; }
  const q=s.qs[C.i];
  b.innerHTML=`<div class="lv lv-${q.lv}">${q.lv} · ${C.i+1}/3</div><p>${q.q}</p>${q.opts?shuffleOpts(q).map(([o,j])=>`<button class="chop" data-j="${j}">${o}</button>`).join(''):'<p class="small">Do it in the lab. This card checks itself.</p>'}<button id="chX" class="ghost">Close</button>`;
  $('chX').onclick=()=>{b.hidden=true;C=null;};
  b.querySelectorAll('.chop').forEach(x=>x.onclick=()=>{ if(+x.dataset.j===q.a){ x.classList.add('ok'); setTimeout(()=>{C.i++;drawChal();},500); } else { x.classList.add('no'); explain('Not quite. Look at the atom labels: valence electrons and shells tell the story.'); } }); }
function shuffleOpts(q){ const o=q.opts.map((t,j)=>[t,j]); for(let i=o.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[o[i],o[j]]=[o[j],o[i]];} return o; }
function chalTick(){ if(!C||C.i>=3) return; const q=C.set.qs[C.i]; if(q.check&&q.check()){ say(`${q.lv} ✓`); C.i++; drawChal(); } }
export const _test={MOLS,tryBond,spawnAtom,buildSpecies,formulaKey,complete,E_,challenge,tryReact};
