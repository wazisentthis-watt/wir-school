/* v8 object-detection helpers (pure parts Node-tested):
   - normalizeRGBA: CLAHE-ish local contrast stretch (tiled lo/hi percentiles, bilinear-blended, clip-limited) before the detector,
     so a white cup on a black table (or dark mug on white) has usable mid-tones
   - Voter: low detector threshold + temporal voting (k hits in the last n runs) to keep weak-but-consistent objects, drop flicker
   - regionBox: tap-to-identify: grow a region of similar color from the tapped pixel → a box for the object under your finger
   - colorSig / sigDist: remembered manual tags ("this is a cup") matched by color+shape signature, per profile */
export function normalizeRGBA(d,W,H,T=4,mix=.75){ const tw=Math.ceil(W/T), th=Math.ceil(H/T), lo=new Float32Array(T*T), hi=new Float32Array(T*T);
  for(let ty=0;ty<T;ty++) for(let tx=0;tx<T;tx++){ const hist=new Uint32Array(64); let n=0;
    for(let y=ty*th;y<Math.min(H,(ty+1)*th);y+=2) for(let x=tx*tw;x<Math.min(W,(tx+1)*tw);x+=2){ const k=(y*W+x)*4; hist[(d[k]*.3+d[k+1]*.59+d[k+2]*.11)>>2]++; n++; }
    let a=0,c=0; for(;a<63&&c+hist[a]<n*.02;a++) c+=hist[a]; let b=63; c=0; for(;b>0&&c+hist[b]<n*.02;b--) c+=hist[b];
    let L=a*4, Hh=b*4+3; const minR=48; if(Hh-L<minR){ const m=(L+Hh)/2; L=Math.max(0,m-minR/2); Hh=Math.min(255,m+minR/2); } // clip limit: never over-amplify flat noise
    lo[ty*T+tx]=L; hi[ty*T+tx]=Hh; }
  for(let y=0;y<H;y++){ const fy=Math.min(T-1.001,Math.max(0,y/th-.5)), y0=fy|0, wy=fy-y0;
    for(let x=0;x<W;x++){ const fx=Math.min(T-1.001,Math.max(0,x/tw-.5)), x0=fx|0, wx=fx-x0, i00=y0*T+x0, i10=i00+1, i01=i00+T, i11=i01+1;
      const L=(lo[i00]*(1-wx)+lo[i10]*wx)*(1-wy)+(lo[i01]*(1-wx)+lo[i11]*wx)*wy, Hh=(hi[i00]*(1-wx)+hi[i10]*wx)*(1-wy)+(hi[i01]*(1-wx)+hi[i11]*wx)*wy, sc=255/Math.max(1,Hh-L);
      const k=(y*W+x)*4; for(let q=0;q<3;q++){ const v=d[k+q], s=(v-L)*sc; d[k+q]=Math.max(0,Math.min(255,v+(s-v)*mix)); } } }
  return d; }
export class Voter{ constructor(n=5,k=3,strong=.42){ Object.assign(this,{n,k,strong}); this.tr=[]; this.run=0; }
  /* dets: [{label,score,box}] → confirmed list; tracks by label + center distance */
  push(dets){ this.run++; const R=this.run;
    for(const d of dets){ let best=null,bd=1e9; for(const t of this.tr){ if(t.label!==d.label) continue; const dd=Math.hypot(t.box.x+t.box.w/2-d.box.x-d.box.w/2,t.box.y+t.box.h/2-d.box.y-d.box.h/2); if(dd<bd&&dd<Math.max(d.box.w,d.box.h)*.7){bd=dd;best=t;} }
      if(best){ best.hits.push(R); best.box=d.box; best.score=Math.max(d.score,best.score*.8); } else this.tr.push({label:d.label,box:d.box,score:d.score,hits:[R]}); }
    for(const t of this.tr) t.hits=t.hits.filter(r=>R-r<this.n); this.tr=this.tr.filter(t=>t.hits.length);
    return this.tr.filter(t=>t.hits.includes(R)&&(t.hits.length>=this.k||t.score>=this.strong)).map(t=>({label:t.label,score:t.score,box:t.box})); } }
/* region grow on an RGBA image from (sx,sy); tolerance adapts to local contrast. returns {x,y,w,h,n} in image px or null */
export function regionBox(d,W,H,sx,sy,tol=38,maxFrac=.45){ sx=Math.round(sx); sy=Math.round(sy); if(sx<0||sy<0||sx>=W||sy>=H) return null;
  const k0=(sy*W+sx)*4, r0=d[k0],g0=d[k0+1],b0=d[k0+2]; const seen=new Uint8Array(W*H), st=[sy*W+sx]; seen[sy*W+sx]=1;
  let n=0,x0=sx,x1=sx,y0=sy,y1=sy; const lim=W*H*maxFrac;
  while(st.length){ const i=st.pop(), x=i%W, y=(i/W)|0; n++; if(n>lim) return null; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    for(const j of [i-1,i+1,i-W,i+W]){ if(j<0||j>=W*H||seen[j]) continue; const jx=j%W; if(Math.abs(jx-x)>1) continue; const k=j*4;
      if(Math.abs(d[k]-r0)+Math.abs(d[k+1]-g0)+Math.abs(d[k+2]-b0)<tol*3){ seen[j]=1; st.push(j); } } }
  if(n<30) return null; return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,n}; }
export function colorSig(d,W,b){ let r=0,g=0,bl=0,n=0; for(let y=b.y;y<b.y+b.h;y+=3) for(let x=b.x;x<b.x+b.w;x+=3){ const k=(y*W+x)*4; r+=d[k];g+=d[k+1];bl+=d[k+2];n++; } n=n||1; return [r/n,g/n,bl/n,b.w/Math.max(1,b.h)]; }
export function sigDist(a,b){ return (Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]))/255+Math.abs(Math.log(a[3]/b[3])); }
export const TAG_LABELS=['cup','mug','bottle','can','glass','book','paper','box','phone','remote','toy','plant','candle','pen','bowl','spoon'];
