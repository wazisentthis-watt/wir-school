import puppeteer from 'puppeteer-core';
const O='/home/box/phatom_backup/shots_2026-10-23/';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage();await p.setViewport({width:1024,height:576});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:8799/connected/');await p.waitForFunction('window.__ready&&window.__game.st.metalForm===1',{timeout:180000});
const sl=t=>new Promise(r=>setTimeout(r,t));const R={};
// board on

// place in front of a tall collider, facing it
R.setup=await p.evaluate(()=>{const g=window.__game,T=g.P.o.position.constructor;const c=g.colliders.filter(b=>b.max.y>6&&b.max.x-b.min.x>4).sort((a,b)=>a.min.distanceTo(g.P.o.position)-b.min.distanceTo(g.P.o.position))[0];
 const z=(c.min.z+c.max.z)/2,x=c.min.x-5;g.P.o.position.set(x,0.25,z);return {x,z,cx:c.min.x};});
let res=[];
for(const form of [1,3]){await p.keyboard.press('Digit'+form);await p.waitForFunction(`window.__game.st.metalForm===${form}`,{timeout:60000});await sl(500);
 await p.evaluate(s=>{const g=window.__game;const c=g.colliders.find(b=>b.min.x===s.cx);g.P.o.position.set(s.cx-.4,0.25,s.z);g.st.board=true;g.board.visible=true;g.vel.set(12,0,0);g.startWallForTest({n:new g.vel.constructor(-1,0,0),hv:new g.vel.constructor(12,0,0),b:c});},R.setup);
 // face +x: rotate camera/yaw via holding D? set yaw through keys not exposed; hold W and push vel each frame
 const samples=await p.evaluate(async()=>{const g=window.__game;const out=[];const t0=performance.now();let rode=false;
  while(performance.now()-t0<5000){g.keys.KeyW=true;await new Promise(r=>requestAnimationFrame(r));
   if(g.st.wall)rode=true;if(g.st.wall||rode)out.push({wall:!!g.st.wall,board:g.st.board,vis:g.board.visible,gap:g.st.boardGap,d:g.board.position.distanceTo(g.P.o.position)});if(rode&&!g.st.wall&&out.length>40)break;}
  g.keys.KeyW=false;return {rode,n:out.length,wallFrames:out.filter(o=>o.wall).length,maxGapOnWall:Math.max(0,...out.filter(o=>o.wall).map(o=>o.gap||0)),maxD:Math.max(0,...out.filter(o=>o.wall).map(o=>o.d)),detached:out.filter(o=>o.wall&&(!o.board||!o.vis)).length};});
 res.push({form,...samples});await p.screenshot({path:O+`wallride_S${form}.png`});}
R.res=res;
// bail test: start wall ride, press B -> board released
await p.evaluate(s=>{const g=window.__game;const c=g.colliders.find(b=>b.min.x===s.cx);g.P.o.position.set(s.cx-.4,0.25,s.z);g.st.board=true;g.board.visible=true;g.startWallForTest({n:new g.vel.constructor(-1,0,0),hv:new g.vel.constructor(12,0,0),b:c});},R.setup);
await sl(200);await p.keyboard.press('KeyB');await sl(300);R.bailReleases=await p.evaluate(()=>!window.__game.st.board&&!window.__game.board.visible);
R.errors=errs.concat(await p.evaluate(()=>window.__errors));
// merkaba S3 from behind cam screenshot
await p.keyboard.press('Digit3');await sl(1000);await p.screenshot({path:O+'merkaba_back_S3.png'});
R.badge=await p.evaluate(()=>[...document.querySelectorAll('div')].map(d=>d.textContent).find(t=>/^FORM S/.test(t))+' | '+document.getElementById('state').textContent);
const pass=res.every(r=>r.rode&&r.wallFrames>5&&r.detached===0&&r.maxD<0.6&&r.maxGapOnWall<0.6)&&R.bailReleases;R.PASS=pass;console.log(JSON.stringify(R,null,1));await b.close();process.exit(pass?0:1);
