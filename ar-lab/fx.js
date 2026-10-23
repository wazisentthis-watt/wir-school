/* WIR AR Lab particle engine: textured GPU sprites, curl noise, force fields, metaball water with
   camera refraction, CC0 rock meshes, wind streaks, bloom. Screen-pixel coords (y down). */
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export const FX={Q:1, low:false, t:0, fields:[], basins:[], W:innerWidth, H:innerHeight, flash:0};
const TL=new THREE.TextureLoader();
const tex=(n,srgb=true)=>{const t=TL.load('assets/'+n); if(srgb) t.colorSpace=THREE.SRGBColorSpace; return t;};
const rnd=(a,b)=>a+Math.random()*(b-a);
export {rnd};
let renderer,scene,cam,composer,bloom,video,bgMat,camTex,wScene,wRT,wComp,dprNow=1;

/* ---- noise + fields ---- */
function curl(x,y,t){ const a=.008,b=.011,c=.005,d=.007;
  const s1=x*a+t, s2=y*b-t*.7, s3=x*c+y*d+t*1.3;
  const dNx=a*Math.cos(s1)*Math.cos(s2)+.5*c*Math.cos(s3), dNy=-b*Math.sin(s1)*Math.sin(s2)+.5*d*Math.cos(s3);
  return [dNy*100,-dNx*100]; }
export function field(x,y){ let ax=0,ay=0;
  for(const f of FX.fields){ const dx=x-f.x, dy=y-f.y, d=Math.hypot(dx,dy)+1; if(d>f.r) continue; const k=(1-d/f.r)*Math.min(1,f.life);
    if(f.type==='vortex'){ ax+=(-dy/d*f.dir*f.str - dx/d*f.str*.45)*k; ay+=(dx/d*f.dir*f.str - dy/d*f.str*.45)*k; }
    else if(f.type==='push'){ ax+=f.vx*k*3; ay+=f.vy*k*3; }
    else if(f.type==='blast'){ ax+=dx/d*f.str*k; ay+=dy/d*f.str*k; } }
  return [ax,ay]; }
export function addField(f){ FX.fields.push({life:1,dir:1,...f}); }

/* ---- sprite layers ---- */
const VS=`attribute vec4 acol;attribute float size,rot,age;varying vec4 vC;varying float vR,vA;uniform float dpr;
void main(){vC=acol;vR=rot;vA=age;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*dpr;}`;
const FS=`uniform sampler2D map;uniform float heat,add,fin,gain,sat,outline;varying vec4 vC;varying float vR,vA;
void main(){vec2 p=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);p=mat2(c,-s,s,c)*p*1.25+.5;
 if(p.x<0.||p.y<0.||p.x>1.||p.y>1.) discard; vec4 t=texture2D(map,p);
 float fade=smoothstep(0.,fin,vA)*(1.-smoothstep(add>.5?.6:.35,add>.5?1.:.8,vA)); vec3 col=vC.rgb; float ta=t.a;
 if(heat>.5){ // v7: layered, saturated flame with NORMAL blending (no additive blowout to white)
  ta=smoothstep(.04,.4,t.a); float core=smoothstep(.45,.9,t.a); fade=smoothstep(0.,fin,vA)*(1.-smoothstep(.5,1.,vA));
  vec3 h=mix(vec3(1.,.62,.12),vec3(.95,.32,.03),smoothstep(.1,.45,vA));    // orange mid
  h=mix(h,vec3(.72,.07,.02),smoothstep(.45,.8,vA)); h=mix(h,vec3(.32,.02,.01),smoothstep(.8,1.,vA)); // deep red outer / tail
  h=mix(h,vec3(1.,.86,.28),max(core,.5)*(1.-smoothstep(.0,.35,vA)));                 // yellow core
  h=mix(h,vec3(1.,.98,.9),core*core*core*(1.-smoothstep(0.,.1,vA))*.55);     // small white only at the hottest point
  float rim=smoothstep(.03,.1,t.a)*(1.-smoothstep(.12,.3,t.a)); h*=1.-rim*outline; // soft dark edge so it reads on skin / bright walls
  float g=dot(h,vec3(.3,.59,.11)); h=clamp(mix(vec3(g),h,sat),0.,1.); h=clamp((h-.5)*(1.+(sat-1.)*.5)+.5,0.,1.);
  float a=min(1.,ta*vC.a*fade*(1.15+.35*outline)); if(!(a>.002)) discard; gl_FragColor=vec4(h*vC.rgb,a);
 } else {
 float a=ta*vC.a*fade*gain; if(!(a>.002)) discard; col=clamp(col,0.,add>.5?1.6:3.); if(add<.5) a=min(a,.3); gl_FragColor=add>.5?vec4(col*a,a):vec4(col*t.rgb,a); }
 #include <colorspace_fragment>
}`;
class Layer{
  constructor({map,max,add=true,heat=false,fin=.08,order=5,rate=1,lifeK=1,sizeK=1,aK=1,growK=1}){ Object.assign(this,{max,n:0,rate,lifeK,sizeK,aK,growK});
    const A=(k)=>new Float32Array(max*k);
    this.x=A(1);this.y=A(1);this.vx=A(1);this.vy=A(1);this.life=A(1);this.maxl=A(1);this.drag=A(1);this.grav=A(1);this.grow=A(1);this.spin=A(1);this.cu=A(1);this.base=A(1);this.fld=A(1);
    this.pos=A(3);this.col=A(4);this.sz=A(1);this.rot=A(1);this.age=A(1);
    const g=this.g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(this.pos,3));g.setAttribute('acol',new THREE.BufferAttribute(this.col,4));
    g.setAttribute('size',new THREE.BufferAttribute(this.sz,1));g.setAttribute('rot',new THREE.BufferAttribute(this.rot,1));g.setAttribute('age',new THREE.BufferAttribute(this.age,1));
    this.mat=new THREE.ShaderMaterial({uniforms:{map:{value:map},dpr:{value:1},heat:{value:heat?1:0},add:{value:add&&!heat?1:0},fin:{value:fin},gain:{value:1},sat:{value:1},outline:{value:.35}},vertexShader:VS,fragmentShader:FS,
      transparent:true,depthTest:false,depthWrite:false,blending:add&&!heat?THREE.AdditiveBlending:THREE.NormalBlending});
    this.pts=new THREE.Points(g,this.mat); this.pts.frustumCulled=false; this.pts.renderOrder=order; }
  spawn(x,y,vx,vy,o={}){ if(this.n>=this.max*FX.Q||(this.rate<1&&Math.random()>this.rate)) return -1; if(FX.clip&&this.clip&&!inClip(x,y)) return -1; const i=this.n++, c=o.c||[1,1,1];
    this.x[i]=x;this.y[i]=y;this.vx[i]=vx;this.vy[i]=vy;this.life[i]=this.maxl[i]=(o.life||1)*this.lifeK;this.drag[i]=o.drag??.985;this.grav[i]=o.grav||0;
    this.grow[i]=(o.grow||0)*this.growK;this.spin[i]=o.spin??rnd(-2,2);this.cu[i]=o.curl||0;this.base[i]=(o.size||20)*this.sizeK;this.rot[i]=rnd(0,6.28);this.fld[i]=o.field??1;
    this.col[i*4]=c[0];this.col[i*4+1]=c[1];this.col[i*4+2]=c[2];this.col[i*4+3]=(o.a??1)*this.aK; return i; }
  kill(i){ const j=--this.n; if(i===j) return;
    for(const k of ['x','y','vx','vy','life','maxl','drag','grav','grow','spin','cu','base','rot','fld']) this[k][i]=this[k][j];
    for(let q=0;q<4;q++) this.col[i*4+q]=this.col[j*4+q]; }
  step(dt){ const t=FX.t, hasF=FX.fields.length;
    for(let i=this.n-1;i>=0;i--){ if((this.life[i]-=dt)<=0){this.kill(i);continue;}
      const dr=Math.pow(this.drag[i],dt*60); this.vx[i]*=dr; this.vy[i]=this.vy[i]*dr+this.grav[i]*dt;
      if(this.cu[i]){const [cx,cy]=curl(this.x[i],this.y[i],t);this.vx[i]+=cx*this.cu[i]*dt;this.vy[i]+=cy*this.cu[i]*dt;}
      if(hasF&&this.fld[i]){const [ax,ay]=field(this.x[i],this.y[i]);this.vx[i]+=ax*dt*this.fld[i];this.vy[i]+=ay*dt*this.fld[i];}
      this.x[i]+=this.vx[i]*dt; this.y[i]+=this.vy[i]*dt; this.rot[i]+=this.spin[i]*dt;
      if(FX.clip&&this.clip&&!inClip(this.x[i],this.y[i])){ this.life[i]=Math.min(this.life[i],.06); }
      const age=1-this.life[i]/this.maxl[i]; this.age[i]=age; this.sz[i]=this.base[i]*(1+this.grow[i]*age);
      this.pos[i*3]=this.x[i]; this.pos[i*3+1]=-this.y[i]; }
    this.g.setDrawRange(0,this.n); for(const a of ['position','acol','size','rot','age']) this.g.attributes[a].needsUpdate=true; }
}
export const L={};
/* Stationary mode: FX.clip = [{x,y,w,h}] zones (detected objects + a small fingertip zone). Clipped layers only live inside them. */
export function inClip(x,y){ for(const r of FX.clip) if(x>r.x-20&&x<r.x+r.w+20&&y>r.y-(r.up??60)&&y<r.y+r.h+20) return true; return false; }

/* ---- wind streaks: head/tail quads ---- */
class Streaks{
  constructor(max){ this.max=max;this.n=0; const A=k=>new Float32Array(max*k);
    this.hx=A(1);this.hy=A(1);this.tx=A(1);this.ty=A(1);this.vx=A(1);this.vy=A(1);this.life=A(1);this.maxl=A(1);this.w=A(1);this.c=A(3);this.lag=A(1);this.grav=A(1);
    this.pos=A(12);this.colA=A(16); const idx=new Uint16Array(max*6);
    for(let i=0;i<max;i++){const v=i*4;idx.set([v,v+1,v+2,v+2,v+1,v+3],i*6);}
    const g=this.g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(this.pos,3)); g.setAttribute('acol',new THREE.BufferAttribute(this.colA,4)); g.setIndex(new THREE.BufferAttribute(idx,1));
    this.mesh=new THREE.Mesh(g,new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:`attribute vec4 acol;varying vec4 vC;void main(){vC=acol;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec4 vC;void main(){gl_FragColor=vec4(vC.rgb*vC.a,vC.a);
 #include <colorspace_fragment>
}`}));
    this.mesh.frustumCulled=false; this.mesh.renderOrder=6; }
  spawn(x,y,vx,vy,o={}){ if(this.n>=this.max*FX.Q) return; const i=this.n++, c=o.c||[.8,.92,1];
    this.hx[i]=x;this.hy[i]=y;this.tx[i]=o.tx??x-vx*.03;this.ty[i]=o.ty??y-vy*.03;this.vx[i]=vx;this.vy[i]=vy;this.life[i]=this.maxl[i]=o.life||.8;this.w[i]=o.w||3;this.lag[i]=o.lag??10;this.grav[i]=o.grav||0;
    this.c[i*3]=c[0];this.c[i*3+1]=c[1];this.c[i*3+2]=c[2]; }
  step(dt){ const t=FX.t;
    for(let i=this.n-1;i>=0;i--){ if((this.life[i]-=dt)<=0){ const j=--this.n; if(i!==j) for(const k of ['hx','hy','tx','ty','vx','vy','life','maxl','w','lag','grav']) this[k][i]=this[k][j], 0;
        if(i!==j) for(let q=0;q<3;q++) this.c[i*3+q]=this.c[j*3+q]; continue; }
      const [cx,cy]=curl(this.hx[i],this.hy[i],t), [ax,ay]=field(this.hx[i],this.hy[i]);
      this.vx[i]+=(cx*60+ax)*dt; this.vy[i]+=(cy*60+ay+this.grav[i])*dt; this.vx[i]*=Math.pow(.985,dt*60); this.vy[i]*=Math.pow(.985,dt*60);
      this.hx[i]+=this.vx[i]*dt; this.hy[i]+=this.vy[i]*dt; const k=Math.min(1,this.lag[i]*dt); this.tx[i]+=(this.hx[i]-this.tx[i])*k; this.ty[i]+=(this.hy[i]-this.ty[i])*k; }
    for(let i=0;i<this.n;i++){ let dx=this.hx[i]-this.tx[i], dy=this.hy[i]-this.ty[i]; const d=Math.hypot(dx,dy)||1, a=this.life[i]/this.maxl[i];
      const w=this.w[i]*(.4+.6*a), px=-dy/d*w, py=dx/d*w, P=this.pos, o=i*12;
      P[o]=this.hx[i]+px;P[o+1]=-(this.hy[i]+py);P[o+3]=this.hx[i]-px;P[o+4]=-(this.hy[i]-py);
      P[o+6]=this.tx[i]+px*.2;P[o+7]=-(this.ty[i]+py*.2);P[o+9]=this.tx[i]-px*.2;P[o+10]=-(this.ty[i]-py*.2);
      const C=this.colA, q=i*16, r=this.c[i*3],g=this.c[i*3+1],b=this.c[i*3+2], fa=Math.min(1,a*1.6)*Math.min(1,(1-a)*8+.2);
      C.set([r,g,b,fa,r,g,b,fa,r,g,b,0,r,g,b,0],q); }
    this.g.setDrawRange(0,this.n*6); this.g.attributes.position.needsUpdate=true; this.g.attributes.acol.needsUpdate=true; }
}

/* ---- water: spring-bound particles + metaball refraction ---- */
export const WATER={max:700,n:0};
{ const A=()=>new Float32Array(WATER.max); for(const k of ['x','y','vx','vy','life','mode','phi','rr','idx','sid']) WATER[k]=A(); WATER.pos=new Float32Array(WATER.max*3); }
WATER.orb=null; WATER.path=[];
/* waterbending: mode 3 = resting pool on the ground line FX.groundY, mode 4 = strand s (one per fingertip) pulled up out of it */
export const POOL={cx:0,n:0}; WATER.strands=[0,1,2,3,4].map(()=>({on:false,rx:0,tx:0,ty:0,w:6,n:0}));
export function waterSpawn(x,y,vx,vy,mode=0,life=4){ const W=WATER; if(W.n>=W.max*FX.Q) return -1; const i=W.n++;
  W.x[i]=x;W.y[i]=y;W.vx[i]=vx;W.vy[i]=vy;W.mode[i]=mode;W.life[i]=life;W.phi[i]=rnd(0,6.28);W.rr[i]=Math.sqrt(Math.random());W.idx[i]=Math.random(); return i; }
function waterKill(i){ const W=WATER,j=--W.n; if(i===j) return; for(const k of ['x','y','vx','vy','life','mode','phi','rr','idx','sid']) W[k][i]=W[k][j]; }
export function waterThrow(vx,vy,mode){ const W=WATER; let n=0; for(let i=0;i<W.n;i++) if(W.mode[i]===mode||(mode<0&&W.mode[i]>0)){ W.mode[i]=0; W.vx[i]=vx*rnd(.85,1.15)+rnd(-80,80); W.vy[i]=vy*rnd(.85,1.15)+rnd(-80,80); W.life[i]=3; n++; } return n; }
export function waterCount(mode){ let n=0; for(let i=0;i<WATER.n;i++) if(WATER.mode[i]===mode) n++; return n; }
function splash(x,y,vx,vy){ for(let k=0;k<3;k++) waterSpawn(x,y-4,vx*.2+rnd(-150,150),-Math.abs(vy)*rnd(.15,.35)-rnd(60,200),0,rnd(.4,.9));
  L.glow.spawn(x,y,0,0,{c:[.5,.75,1],a:.35,size:40,life:.25}); }
function waterStep(dt){ const W=WATER,H=FX.H,Wd=FX.W,t=FX.t,o=W.orb,path=W.path, hasF=FX.fields.length;
  for(let i=W.n-1;i>=0;i--){ if((W.life[i]-=dt)<=0){waterKill(i);continue;}
    let ax=0, ay=0; const m=W.mode[i];
    if(m===1&&o){ W.life[i]=Math.max(W.life[i],1); const ang=W.phi[i]+t*(2.2+W.rr[i]), R=o.r*(.25+.75*W.rr[i]);
      const tx=o.x+Math.cos(ang)*R, ty=o.y+Math.sin(ang)*R*.9+Math.sin(t*3+W.phi[i])*4; ax=(tx-W.x[i])*70-W.vx[i]*9; ay=(ty-W.y[i])*70-W.vy[i]*9; }
    else if(m===2&&path.length>1){ W.life[i]=Math.max(W.life[i],1); const f=W.idx[i]*(path.length-1), a=path[Math.floor(f)], b=path[Math.min(path.length-1,Math.ceil(f))], fr=f%1;
      const wob=Math.sin(t*9+W.phi[i]*3)*(6+18*W.idx[i]);
      const tx=a.x+(b.x-a.x)*fr+Math.cos(W.phi[i])*wob, ty=a.y+(b.y-a.y)*fr+Math.sin(W.phi[i])*wob; ax=(tx-W.x[i])*90-W.vx[i]*10; ay=(ty-W.y[i])*90-W.vy[i]*10; }
    else if(m===3&&FX.groundY){ W.life[i]=5; const gy=FX.groundY, w=Math.min(FX.W*.92,Math.max(90,POOL.n*2.6)), depth=8+Math.min(30,POOL.n*.08);
      const tx=Math.max(8,Math.min(FX.W-8,POOL.cx+(W.idx[i]-.5)*w)), ty=gy-W.rr[i]*depth+Math.sin(t*2+W.phi[i]*5)*1.5; ax=(tx-W.x[i])*10-W.vx[i]*4; ay=(ty-W.y[i])*40-W.vy[i]*7; }
    else if(m===4&&W.strands[W.sid[i]]?.on&&FX.groundY){ W.life[i]=5; const S=W.strands[W.sid[i]], f=W.idx[i], gy=FX.groundY;
      const wob=Math.sin(t*6+f*7+W.phi[i])*S.w*(1-f*.6), bx=S.rx+(S.tx-S.rx)*f, by=gy+(S.ty-gy)*f;
      ax=(bx+wob-W.x[i])*85-W.vx[i]*9; ay=(by-W.y[i])*85-W.vy[i]*9; }
    else { if(m!==0) W.mode[i]=0; ay=1500; W.vx[i]*=Math.pow(.995,dt*60); }
    if(hasF){const [fx,fy]=field(W.x[i],W.y[i]); ax+=fx*1.4; ay+=fy*1.4;}
    W.vx[i]+=ax*dt; W.vy[i]+=ay*dt; W.x[i]+=W.vx[i]*dt; W.y[i]+=W.vy[i]*dt;
    if(W.mode[i]===0){ let inB=false;
      for(const b of FX.basins){ if(W.x[i]>b.x-10&&W.x[i]<b.x+b.w+10&&W.y[i]>b.y-40&&W.y[i]<b.y+b.h+20){ inB=true; W.life[i]=Math.max(W.life[i],2);
        if(W.x[i]<b.x+6){W.x[i]=b.x+6;W.vx[i]=Math.abs(W.vx[i])*.4;} if(W.x[i]>b.x+b.w-6){W.x[i]=b.x+b.w-6;W.vx[i]=-Math.abs(W.vx[i])*.4;}
        if(W.y[i]>b.y+b.h-6){W.y[i]=b.y+b.h-6;W.vy[i]=-Math.abs(W.vy[i])*.2;W.vx[i]+=rnd(-30,30);} } }
      if(!inB&&FX.groundY&&W.y[i]>FX.groundY-2&&POOL.n<320){ if(POOL.n<3) POOL.cx=W.x[i]; else POOL.cx+=(W.x[i]-POOL.cx)*.01; W.mode[i]=3; W.life[i]=5; if(Math.abs(W.vy[i])>500&&Math.random()<.15) splash(W.x[i],FX.groundY,W.vx[i],W.vy[i]); }
      else if(!inB){ if(W.y[i]>H-4){ if(Math.abs(W.vy[i])>350&&Math.random()<.5) splash(W.x[i],H-4,W.vx[i],W.vy[i]); W.y[i]=H-4; W.vy[i]*=-.25; W.vx[i]*=.6; W.life[i]=Math.min(W.life[i],.6); }
        if(W.x[i]<4||W.x[i]>Wd-4){ if(Math.abs(W.vx[i])>400&&Math.random()<.4) splash(W.x[i]<4?4:Wd-4,W.y[i],-W.vx[i]*.3,W.vx[i]); W.x[i]=Math.max(4,Math.min(Wd-4,W.x[i])); W.vx[i]*=-.3; } } }
    W.pos[i*3]=W.x[i]; W.pos[i*3+1]=-W.y[i]; }
  { let p=0; const sc=[0,0,0,0,0]; for(let i=0;i<W.n;i++){ if(W.mode[i]===3) p++; else if(W.mode[i]===4) sc[W.sid[i]]++; } POOL.n=p; sc.forEach((c,s)=>W.strands[s].n=c); }
  W.geo.setDrawRange(0,W.n); W.geo.attributes.position.needsUpdate=true; }

/* ---- rocks ---- */
export const ROCKS=[]; let rockGeos=[], rockMat;
function makeRockGeo(seed){ const g=new THREE.IcosahedronGeometry(1,1), p=g.attributes.position, key={};
  for(let i=0;i<p.count;i++){ const x=p.getX(i),y=p.getY(i),z=p.getZ(i), k=`${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    const s=key[k]??(key[k]=.72+.5*Math.abs(Math.sin(x*3.1+seed)*Math.cos(y*2.7-seed*1.7)+.4*Math.sin(z*4.3+seed*2.1)));
    p.setXYZ(i,x*s*1.1,y*s*.85,z*s); }
  g.computeVertexNormals(); return g; }
export function rockSpawn(x,targetY,r=rnd(48,78)){ if(ROCKS.length>=Math.max(2,Math.round(5*FX.Q))) { const old=ROCKS.find(k=>k.mode!=='held'); if(old) rockCrumble(old); else return null; }
  const m=new THREE.Mesh(rockGeos[Math.floor(Math.random()*rockGeos.length)],rockMat); m.scale.setScalar(r); m.renderOrder=4; m.frustumCulled=false; scene.add(m);
  const k={m,x,y:FX.H+r,vx:0,vy:0,r,ty:Math.min(FX.H-r,targetY),mode:'rise',life:14,sx:rnd(-1,1),sy:rnd(-1,1)}; m.rotation.set(rnd(0,6),rnd(0,6),0); ROCKS.push(k);
  dust(x,FX.H-6,40,1.4); for(let i=0;i<10;i++) L.dust.spawn(x+rnd(-r,r),FX.H,rnd(-60,60),rnd(-500,-200),{c:[.35,.28,.2],size:rnd(6,12),life:rnd(.5,1),grav:1400,a:1,drag:.99});
  return k; }
export function dust(x,y,n,s=1){ for(let i=0;i<n*FX.Q;i++){const a=rnd(Math.PI,2*Math.PI); const sp=rnd(60,260)*s;
  L.dust.spawn(x+rnd(-20,20),y,Math.cos(a)*sp,Math.sin(a)*sp*.45,{c:[.62,.52,.4],a:.55,size:rnd(30,70)*s,grow:1.5,life:rnd(.8,1.6),drag:.95,curl:.3,spin:rnd(-1,1)});} }
export function rockCrumble(k){ dust(k.x,k.y,25,1); for(let i=0;i<14;i++) L.dust.spawn(k.x+rnd(-k.r,k.r)*.6,k.y+rnd(-k.r,k.r)*.6,rnd(-300,300),rnd(-400,50),{c:[.3,.25,.2],size:rnd(6,14),life:rnd(.6,1.2),grav:1500,a:1,drag:.99});
  scene.remove(k.m); ROCKS.splice(ROCKS.indexOf(k),1); }
function rockStep(dt){ const H=FX.H,W=FX.W;
  for(const k of [...ROCKS]){
    if(k.mode==='rise'){ k.vy+=((k.ty-k.y)*26-k.vy*7)*dt; if(Math.abs(k.ty-k.y)<8&&Math.abs(k.vy)<40) k.mode='hover'; }
    else if(k.mode==='hover'){ k.vy+=((k.ty+Math.sin(FX.t*2+k.sx*3)*6-k.y)*20-k.vy*6)*dt; k.vx*=.9; k.life-=dt; }
    else if(k.mode==='held'){ k.vx+=((k.hx-k.x)*80-k.vx*12)*dt; k.vy+=((k.hy-k.y)*80-k.vy*12)*dt; }
    else { k.vy+=1500*dt; k.life-=dt; }
    const [ax,ay]=field(k.x,k.y); k.vx+=ax*dt*.6; k.vy+=ay*dt*.6;
    k.x+=k.vx*dt; k.y+=k.vy*dt;
    if(k.mode==='free'){ const sp=Math.hypot(k.vx,k.vy);
      if(k.y>H-k.r*.7){ k.y=H-k.r*.7; if(sp>250){dust(k.x,H-4,18,.9); FX.shake=Math.min(12,sp/120);} k.vy*=-.35; k.vx*=.7; }
      if(k.x<k.r*.7||k.x>W-k.r*.7){ k.x=Math.max(k.r*.7,Math.min(W-k.r*.7,k.x)); if(sp>250) dust(k.x,k.y,12,.7); k.vx*=-.4; } }
    const sp=Math.hypot(k.vx,k.vy)/k.r; k.m.rotation.x+=(k.sy*.4+k.vy/k.r*.6)*dt; k.m.rotation.y+=(k.sx*.4+k.vx/k.r*.6)*dt;
    k.m.position.set(k.x,-k.y,0);
    if(k.life<=0) rockCrumble(k); } }

/* ---- background camera quad + water composite ---- */
const QUAD_VS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const CAMFN=`uniform sampler2D cam;uniform float hasCam,mirror,shT;uniform vec2 fr;uniform vec3 shP;
vec3 camAt(vec2 uv){ if(shP.z>0.){ vec2 q=(uv-shP.xy)/vec2(shP.z,shP.z*1.6); float k=exp(-dot(q,q)*2.)*step(shP.y-shP.z*.4,uv.y); uv+=k*vec2(sin(uv.y*90.+shT*9.),cos(uv.x*70.+shT*7.))*.0035; } if(hasCam<.5) return mix(vec3(.02,.01,.05),vec3(.1,.05,.2),uv.y); vec2 v=vec2(.5+(uv.x-.5)*fr.x*(mirror>.5?-1.:1.),.5+(uv.y-.5)*fr.y); return texture2D(cam,v).rgb; }`;
let CAMU;
function initBG(){
  camTex=new THREE.VideoTexture(video); camTex.colorSpace=THREE.SRGBColorSpace;
  const U=CAMU={cam:{value:camTex},hasCam:{value:0},mirror:{value:0},fr:{value:new THREE.Vector2(1,1)},shT:{value:0},shP:{value:new THREE.Vector3(0,0,0)}};
  bgMat=new THREE.ShaderMaterial({uniforms:U,vertexShader:QUAD_VS,depthTest:false,depthWrite:false,
    fragmentShader:CAMFN+`varying vec2 vUv;void main(){gl_FragColor=vec4(camAt(vUv),1.);
 #include <colorspace_fragment>
}`});
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(2,2),bgMat); bg.frustumCulled=false; bg.renderOrder=-10; scene.add(bg);
  // water density pass
  wScene=new THREE.Scene(); wRT=new THREE.WebGLRenderTarget(4,4,{type:THREE.UnsignedByteType});
  const g=WATER.geo=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(WATER.pos,3));
  WATER.mat=new THREE.ShaderMaterial({uniforms:{sz:{value:30}},transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float sz;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=sz;}`,
    fragmentShader:`void main(){vec2 p=gl_PointCoord-.5;float d=exp(-dot(p,p)*14.);gl_FragColor=vec4(d*.55,d*.55,d*.55,1.);}`});
  const wp=new THREE.Points(g,WATER.mat); wp.frustumCulled=false; wScene.add(wp);
  wComp=new THREE.ShaderMaterial({uniforms:{...U,dens:{value:wRT.texture},vis:{value:0},px:{value:new THREE.Vector2(.01,.01)},time:{value:0}},vertexShader:QUAD_VS,transparent:true,depthTest:false,depthWrite:false,
    fragmentShader:CAMFN+`uniform sampler2D dens;uniform vec2 px;uniform float time,vis;varying vec2 vUv;
void main(){ float d=texture2D(dens,vUv).r; float m=smoothstep(.4,.46,d); if(m<.01) discard;
 float dx=texture2D(dens,vUv+vec2(px.x,0.)).r-texture2D(dens,vUv-vec2(px.x,0.)).r, dy=texture2D(dens,vUv+vec2(0.,px.y)).r-texture2D(dens,vUv-vec2(0.,px.y)).r;
 vec3 n=normalize(vec3(-dx*5.,-dy*5.,.6+d*.4));
 vec3 bg=camAt(vUv+n.xy*.09+vec2(sin(time*2.+vUv.y*30.)*.004,cos(time*1.7+vUv.x*25.)*.003));
 float edge=1.-smoothstep(.4,.52,d); vec3 col=bg*vec3(.86,.95,1.02)+vec3(.0,.03,.06); col=mix(col,vec3(.1,.3,.45),.08+.25*(1.-n.z)); col*=1.-edge*.28; col=mix(col,vec3(.02,.12,.3),edge*(.35+.3*vis));
 float spec=pow(max(dot(normalize(reflect(vec3(0.,0.,-1.),n)),normalize(vec3(-.45,.55,.7))),0.),40.);
 float rim=pow(1.-n.z,3.); float caus=pow(max(0.,sin(vUv.x*37.+time*1.3+n.x*14.+sin(vUv.y*23.))*sin(vUv.y*29.-time*1.1+n.y*14.)),8.)*.12; col+=spec*vec3(1.4+vis)+rim*vec3(.55,.8,1.)*.55+caus + smoothstep(.48,.36,d)*.0;
 gl_FragColor=vec4(col,m*.9);
 #include <colorspace_fragment>
}`});
  const wq=new THREE.Mesh(new THREE.PlaneGeometry(2,2),wComp); wq.frustumCulled=false; wq.renderOrder=3; scene.add(wq);
}
export function setCamera(hasCam,mirror){ const u=bgMat.uniforms; u.hasCam.value=hasCam?1:0; u.mirror.value=mirror?1:0; updFr(); }
function updFr(){ const vw=video.videoWidth||16,vh=video.videoHeight||9,s=Math.max(FX.W/vw,FX.H/vh); bgMat.uniforms.fr.value.set(FX.W/(vw*s),FX.H/(vh*s)); }

/* ---- chem props drawn in 3D: paper sheet ---- */
let paper; export function paperAt(r){ if(!paper){ paper=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshLambertMaterial({map:tex('ambientcg_paper001_256.jpg'),color:0xb0aaa0})); paper.renderOrder=2; paper.frustumCulled=false; scene.add(paper);}
  if(!r){paper.visible=false;return paper;} paper.visible=true; paper.scale.set(r.width*.86,r.height*.6,1); paper.position.set(r.left+r.width/2,-(r.top+r.height*.45),-50); paper.rotation.set(-.5,0,.06); return paper; }
export function paperChar(k){ if(paper) paper.material.color.setRGB(.69*(1-k*.9),.67*(1-k*.92),.63*(1-k*.94)); }

/* ---- init / resize / render ---- */
export function init(canvas,videoEl){ video=videoEl;
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'}); renderer.setClearColor(0x000000,1);
  scene=new THREE.Scene(); cam=new THREE.OrthographicCamera(0,1,0,-1,-2000,2000);
  const map=n=>tex(n);
  L.smoke=new Layer({map:map('kenney_smoke_03.png'),max:140,add:false,fin:.15,order:5,rate:.3,lifeK:.5,aK:.55,growK:.6});
  L.dust=new Layer({map:map('kenney_smoke_07.png'),max:280,add:false,fin:.1,order:5,rate:.6,lifeK:.65,aK:.8});
  L.fire=new Layer({map:map('kenney_flame_02.png'),max:900,heat:true,order:6,rate:.5,lifeK:.75,sizeK:.8,growK:.7});
  L.flame=new Layer({map:map('kenney_flame_04.png'),max:350,heat:true,order:6,rate:.6,lifeK:.8});
  L.glow=new Layer({map:map('kenney_light_01.png'),max:400,order:7});
  L.spark=new Layer({map:map('kenney_spark_01.png'),max:500,order:7,fin:.02,rate:.6,lifeK:.8});
  L.magic=new Layer({map:map('kenney_twirl_02.png'),max:300,order:6});
  for(const k of ['smoke','dust','fire','flame','spark']) L[k].clip=true;
  for(const k in L) scene.add(L[k].pts);
  L.streak=new Streaks(1400); scene.add(L.streak.mesh);
  const rd=tex('polyhaven_rock_face_03_diff_512.jpg'), rn=tex('polyhaven_rock_face_03_nor_gl_512.jpg',false);
  rockMat=new THREE.MeshStandardMaterial({map:rd,normalMap:rn,normalScale:new THREE.Vector2(1.4,1.4),roughness:.95,flatShading:true});
  rockGeos=[1,2,3,4].map(makeRockGeo);
  scene.add(new THREE.HemisphereLight(0xdfe8ff,0x3a2a1a,1.4)); const sun=new THREE.DirectionalLight(0xfff2dd,2.4); sun.position.set(-.5,1,1.2); scene.add(sun);
  FX.light=new THREE.PointLight(0xff8833,0,600,1.2); FX.light.position.set(0,0,200); scene.add(FX.light);
  initBG();
  composer=new EffectComposer(renderer); composer.addPass(new RenderPass(scene,cam));
  bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.7,.4,.86); composer.addPass(bloom); composer.addPass(new OutputPass());
  resize(); addEventListener('resize',resize);
  FX.scene=scene; return {renderer,scene,cam}; }
export function resize(){ if(!renderer) return; FX.W=innerWidth; FX.H=innerHeight;
  dprNow=FX.low?1:Math.min(devicePixelRatio,1.25+FX.Q*.75);
  renderer.setPixelRatio(dprNow); renderer.setSize(FX.W,FX.H,false); composer.setPixelRatio(dprNow); composer.setSize(FX.W,FX.H);
  bloom.resolution.set(FX.W*.5,FX.H*.5);
  cam.right=FX.W; cam.bottom=-FX.H; cam.updateProjectionMatrix();
  for(const k in L) if(L[k].mat?.uniforms?.dpr) L[k].mat.uniforms.dpr.value=dprNow;
  const ws=.5; wRT.setSize(Math.ceil(FX.W*ws),Math.ceil(FX.H*ws)); WATER.mat.uniforms.sz.value=30*ws*(1+.3*(1-FX.Q))*2; wComp.uniforms.px.value.set(1.5/(FX.W*ws),1.5/(FX.H*ws)); updFr(); }
export function step(dt){ FX.t+=dt;
  for(let i=FX.fields.length-1;i>=0;i--){ const f=FX.fields[i]; f.life-=dt/(f.dur||1); if(f.life<=0) FX.fields.splice(i,1); }
  for(const k in L) L[k].step(dt); waterStep(dt); rockStep(dt); airStep(dt);
  wComp.uniforms.time.value=FX.t;
  if(FX.shake>0){ FX.shake*=Math.pow(.02,dt); cam.position.set(rnd(-1,1)*FX.shake,rnd(-1,1)*FX.shake,0); if(FX.shake<.3){FX.shake=0;cam.position.set(0,0,0);} }
  FX.light.intensity*=Math.pow(.05,dt);
  if(FX.flash>0){ FX.flash*=Math.pow(.001,dt); }
  { const Lm=FX.sceneL??.4, bright=Math.max(0,Lm-.42)/.58; FX.vis=bright; // v7 scene-adaptive visibility
    for(const k of ['fire','flame']){ const u=L[k].mat.uniforms; u.sat.value=1.15+bright*.9; u.outline.value=.3+.45*bright; }
    for(const k of ['glow','spark','magic']) L[k].mat.uniforms.gain.value=(FX.glowK??1)*(1-.55*bright);
    wComp.uniforms.vis.value=bright; CAMU.shT.value=FX.t; const sh=FX.shimmer&&FX.t-(FX.shimT||0)<.15?FX.shimmer:null; if(sh) CAMU.shP.value.set(sh.x/FX.W,1-sh.y/FX.H,sh.r/FX.W); else CAMU.shP.value.z=0; }
  bloom.strength=(FX.bloomK??.6)*(1-.5*(FX.vis||0))+Math.min(.8,FX.flash*1.0);
  renderer.setRenderTarget(wRT); renderer.setClearColor(0,1); renderer.clear(); renderer.render(wScene,cam); renderer.setRenderTarget(null);
  if(FX.low||FX.Q<.45) renderer.render(scene,cam); else composer.render(); }
export function lightAt(x,y,c,i){ FX.light.position.set(x,-y,220); FX.light.color.setRGB(...c); FX.light.intensity=Math.max(FX.light.intensity,i); }
/* ---- airbending: refractive swirling air balls ---- */
export const AIRB=[];
const AIR_FS=()=>CAMFN+`uniform vec2 c,res;uniform float r,ph,sp,al;
void main(){ vec2 d=(gl_FragCoord.xy-c)/r; float l=length(d); if(l>1.) discard;
 float th=ph*(1.-l)*(1.-l)*.9+sp*2.4*(1.-l); float cs=cos(th),sn=sin(th); vec2 dd=mat2(cs,-sn,sn,cs)*d;
 vec2 suv=(c+dd*r*(.8+.2*l*l))/res; vec3 col=camAt(suv);
 float ang=atan(d.y,d.x), band=.5+.5*sin(ang*3.-l*8.+ph);
 float rim=smoothstep(.72,1.,l)*(1.-smoothstep(.97,1.,l));
 col=col*1.04+vec3(.8,.9,1.)*(rim*(.1+.12*sp)+band*sp*.07*(1.-l));
 gl_FragColor=vec4(col,smoothstep(1.,.9,l)*al);
 #include <colorspace_fragment>
}`;
export function airBall(x,y,r=16){ if(AIRB.length>=3){ const o=AIRB.find(b=>!b.held)||AIRB[0]; airKill(o); }
  const m=new THREE.ShaderMaterial({uniforms:{...CAMU,c:{value:new THREE.Vector2()},res:{value:new THREE.Vector2(1,1)},r:{value:1},ph:{value:0},sp:{value:0},al:{value:0}},vertexShader:`void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:AIR_FS(),transparent:true,depthTest:false,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),m); mesh.renderOrder=4; mesh.frustumCulled=false; scene.add(mesh);
  const b={x,y,r,spin:0,ph:0,vx:0,vy:0,held:true,free:false,life:1,mesh,al:0}; AIRB.push(b); return b; }
function airKill(b){ scene.remove(b.mesh); b.mesh.material.dispose(); b.mesh.geometry.dispose(); AIRB.splice(AIRB.indexOf(b),1); }
export function airClear(){ while(AIRB.length) airKill(AIRB[0]); }
const MOTE=[[.62,.55,.42],[.45,.52,.3],[.7,.68,.62],[.5,.4,.28]];
export function mote(x,y,vx,vy,s=1){ L.dust.spawn(x,y,vx,vy,{c:MOTE[(Math.random()*4)|0],a:.7,size:rnd(2.5,5)*s,grow:0,life:rnd(.5,.9),drag:.96,field:1}); }
function airStep(dt){ for(const b of [...AIRB]){
  if(!b.fed) b.spin*=Math.pow(b.free?.7:.35,dt); b.fed=false;
  if(b.free){ const k=b.spin*.06*dt, c=Math.cos(k), s=Math.sin(k); [b.vx,b.vy]=[b.vx*c-b.vy*s,b.vx*s+b.vy*c]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt*.35;
    if((b.pushT=(b.pushT||0)-dt)<=0){ b.pushT=.08; addField({type:'push',x:b.x,y:b.y,r:b.r*2.4,vx:b.vx*.6,vy:b.vy*.6,dur:.12}); }
    if(b.x<-b.r||b.x>FX.W+b.r||b.y<-b.r||b.y>FX.H+b.r) b.life=0; }
  else if(!b.held){ if(Math.abs(b.spin)<1.5) b.r*=Math.pow(.4,dt); b.life-=dt*.25; }
  b.al+=((b.life>0&&b.r>6?1:0)-b.al)*Math.min(1,dt*8);
  if(b.life<=0||b.r<6){ b.al-=dt*4; if(b.al<=.02){ airKill(b); continue; } }
  b.ph+=b.spin*dt; const sp=Math.min(1,Math.abs(b.spin)/10);
  const n=(.4+sp*3)*FX.Q; for(let i=0;i<n;i++){ const a=rnd(0,6.28), rr=b.r*rnd(.55,1.08), dir=Math.sign(b.spin)||1, v=Math.abs(b.spin)*rr*.9+20;
    mote(b.x+Math.cos(a)*rr,b.y+Math.sin(a)*rr,-Math.sin(a)*v*dir+b.vx*.8-Math.cos(a)*15,Math.cos(a)*v*dir+b.vy*.8-Math.sin(a)*15,.8+b.r/80); }
  const u=b.mesh.material.uniforms, d=dprNow; u.c.value.set(b.x*d,(FX.H-b.y)*d); u.res.value.set(FX.W*d,FX.H*d); u.r.value=b.r*d; u.ph.value=b.ph; u.sp.value=sp; u.al.value=Math.max(0,b.al);
  b.mesh.position.set(b.x,-b.y,0); b.mesh.scale.set(b.r*2.1,b.r*2.1,1); } }
export function counts(){ let n=WATER.n+L.streak.n; for(const k in L) n+=L[k].n; return n; }
