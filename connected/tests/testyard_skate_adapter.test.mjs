import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {createTestYardSkateAdapter,trickDirection,classifyFall,FLIPS,GRABS,FALLS,fightClipHint} from '../assets/testyard_skate_adapter.mjs';

const simulate=(n,options={})=>{
 const a=createTestYardSkateAdapter();a.queueFlip(options.dir||'N');
 for(let i=0;i<n;i++)a.onAir(1/60,{dir:options.dir||'N',grabHeld:false});
 return a;
};
test('five actual Test Yard directional flips are offered, mapped from direction',()=>{
 assert.deepEqual(Object.keys(FLIPS),['N','L','R','B','F']);
 assert.equal(trickDirection(-1,0),'L');
 assert.equal(trickDirection(1,0),'R');
 assert.equal(trickDirection(0,-1),'F');
 assert.equal(trickDirection(0,1),'B');
 assert.equal(trickDirection(NaN,2),'N');
 assert.equal(FLIPS.R.name,'Tre Flip');
});
test('five Test Yard grabs are available, with an actual held grab reward',()=>{
 assert.equal(Object.keys(GRABS).length,5);
 const a=createTestYardSkateAdapter();
 a.onAir(.1,{grabHeld:true,dir:'F'});
 a.onAir(.1,{grabHeld:true,dir:'F'});
 a.onAir(.04,{grabHeld:false,dir:'F'});
 const land=a.land();
 assert.equal(land.failed,false);
 assert.equal(land.names[0],'Nosegrab');
 assert.ok(land.points>=150);
});
test('completed kickflip banks only at a real landing event',()=>{
 const a=simulate(36);
 assert.equal(a.snapshot().flip,'Kickflip');
 assert.equal(a.snapshot().landedTricks,0);
 assert.deepEqual(a.land(),{failed:false,points:150,names:['Kickflip']});
 assert.equal(a.snapshot().landedTricks,1);
});
test('late flip returns a fall intent, not a fake landed trick',()=>{
 const a=simulate(12,{dir:'R'});
 const out=a.land();
 assert.equal(out.failed,true);
 assert.match(out.reason,/BACKWARD/);
 assert.equal(a.snapshot().landedTricks,0);
});
test('all eight cause-specific falls select original Phase 6 clips/recovery',()=>{
 assert.equal(Object.keys(FALLS).length,8);
 const probes=[
 ['hit wall','wall'],['hard landing','slam'],['sideways pavement','slide'],
 ['nose first','nose'],['looped out','backward'],['fell from rail','rail'],
 ['board lost','board'],['grab late','grab']
 ];
 for(const [reason,kind] of probes){
  const f=classifyFall(reason);
  assert.equal(f.kind,kind);
  assert.ok(['slam','slide','bail','dodge'].includes(f.clip));
  assert.ok(['step','stand'].includes(f.recovery));
 }
 const a=createTestYardSkateAdapter();
 const fall=a.startFall('rail spill');assert.equal(fall.kind,'rail');
 let gotRecovery=false;
 for(let i=0;i<125;i++){const pose=a.stepFall(1/60);assert.ok(Number.isFinite(pose.pitch+pose.roll));if(pose.recover)gotRecovery=true;}
 assert.equal(gotRecovery,true);
});
test('manual balance is finite, directional and respects clamped substeps',()=>{
 const a=createTestYardSkateAdapter();
 let balance=0,velocity=0;
 for(let i=0;i<80;i++){
  const t=a.manualBalance(balance,velocity,1/60,.35);
  assert.ok(Number.isFinite(t.balance));
  assert.ok(Number.isFinite(t.velocity));
  balance=t.balance;velocity=t.velocity;
 }
 assert.ok(Math.abs(balance)<10);
});
test('grind style and elapsed contact produce a single line reward',()=>{
 const a=createTestYardSkateAdapter();
 for(let i=0;i<48;i++)assert.equal(a.grind(1/60,{active:true,dir:'L',speed:5}),null);
 const result=a.grind(1/60,{active:false,dir:'L',speed:5});
 assert.equal(result.kind,'grind');assert.equal(result.name,'Crooked');
 assert.ok(result.points>0);
 assert.equal(a.grind(1/60,{active:false}),null);
});
test('motion hint only; existing punch/kick/charge and blast systems remain authoritative',()=>{
 assert.equal(fightClipHint('jab'),'punch_l');
 assert.equal(fightClipHint('kickR'),'kick_r');
 assert.equal(fightClipHint('blast'),'blast');
 assert.equal(fightClipHint('unknown'),null);
 const a=createTestYardSkateAdapter();
 assert.equal(a.snapshot().writesSaves,false);
 assert.equal(a.snapshot().authority,'VISUAL_AND_TRICK_INTENT_ONLY');
});
test('main game remains opt-in with original skate, mission and powers code',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const baseline=main.replace(/^import[^\n]*\n/gm,'');
 assert.doesNotThrow(()=>new Script(baseline));
 assert.match(main,/skate_yard'\)==='1'/);
 assert.match(main,/function skateGround\(dt,wish,il\)/);
 assert.match(main,/function skOllie\(\)/);
 assert.match(main,/function swingStep/);
 assert.match(main,/function fightTick/);
 assert.match(main,/function updateMetalStory/);
 assert.match(main,/function finishYardAir\(\)/);
 assert.match(main,/bodyMachine\.fall/);
 assert.match(main,/yard\?\.startFall/);
 assert.match(main,/yard\.onAir\(dt/);
 assert.match(main,/yard\.grind\(dt/);
 assert.match(main,/if\(yard&&st\.board&&!onGround/);
});
test('adapter neither stores state nor imports another physics/render loop',()=>{
 const js=readFileSync(new URL('../assets/testyard_skate_adapter.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|document\.|window\./);
 assert.doesNotMatch(js,/setInterval|requestAnimationFrame|new Rapier|new THREE/);
 assert.doesNotMatch(js,/createSourceSiphon|writeMetalCheckpoint|st\.gal\s*=/);
});
