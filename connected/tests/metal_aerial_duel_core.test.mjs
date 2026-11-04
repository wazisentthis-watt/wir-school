// Baseline PR #34 deterministic duel physics tests, unchanged and reused for Mission05.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRooftopDuel,duelAction,stepRooftopDuel,duelSnapshot,DUEL_ROOF} from '../assets/metal_aerial_duel_core.mjs';
const step=(s,n=1,dt=.02,c={})=>{for(let i=0;i<n;i++)stepRooftopDuel(s,dt,c);};
const begin=()=>createRooftopDuel();
test('non-canon duel state starts locally without touching story or Gallium saves',()=>{
 const s=begin();assert.equal(s.mode,'ACTIVE');assert.equal(s.player.hp,1);assert.equal(s.enemy.hp,.78);assert.equal(s.energy,1);
 assert.ok(!('localStorage' in s));assert.ok(!('gal' in s));assert.ok(!('story' in s));
});
test('grounded quick combo requires two confirmed hits for launcher',()=>{
 const s=begin();assert.equal(duelAction(s,'launch').ok,false);
 assert.ok(duelAction(s,'light').ok);step(s,13);assert.ok(duelAction(s,'light').ok);
 assert.equal(s.combo,2);step(s,13);
 const launch=duelAction(s,'launch');assert.ok(launch.ok);assert.equal(launch.event.type,'launch');assert.ok(s.enemy.vy>10);
});
test('launch physics reaches visible aerial altitude, with normal gravity',()=>{
 const s=begin();duelAction(s,'light');step(s,13);duelAction(s,'light');step(s,13);duelAction(s,'launch');
 step(s,25);assert.ok(s.enemy.y>2);assert.ok(s.enemy.vy<13,'gravity should reduce vertical velocity');
});
test('air pursuit is finite velocity, never teleport or hover',()=>{
 const s=begin();duelAction(s,'light');step(s,13);duelAction(s,'light');step(s,13);duelAction(s,'launch');step(s,10);
 const first={...s.player};assert.ok(duelAction(s,'pursue').ok);step(s,2);
 assert.ok(s.player.y>first.y);assert.ok(Math.hypot(s.player.x-first.x,s.player.z-first.z)<5);
 assert.ok(s.energy<1);assert.ok(s.airChase>0);
});
test('pursuit + finisher + physical roof impact results in a legitimate win',()=>{
 const s=begin();assert.ok(duelAction(s,'light').ok);step(s,13);assert.ok(duelAction(s,'light').ok);step(s,13);
 assert.ok(duelAction(s,'launch').ok);step(s,10);assert.ok(duelAction(s,'pursue').ok);
 step(s,20);const f=duelAction(s,'finisher');
 assert.ok(f.ok,'finisher should connect after pursuing: '+JSON.stringify(f)+' positions '+JSON.stringify({p:s.player,e:s.enemy}));
 assert.ok(s.enemy.vy<0);
 for(let i=0;i<250&&s.mode==='ACTIVE';i++)step(s);
 assert.equal(s.mode,'VICTORY');assert.ok(s.roofImpacts>=1);
 assert.equal(s.events.at(-1).type,'victory');
});
test('cannot fire aerial finisher while standing, out of range, or without energy',()=>{
 const s=begin();assert.equal(duelAction(s,'finisher').ok,false);
 s.player.y=2;s.enemy.y=2;s.airChase=1;s.energy=.05;assert.equal(duelAction(s,'finisher').ok,false);
 s.energy=1;s.enemy.x=12;assert.equal(duelAction(s,'finisher').ok,false);
});
test('ReFramer telegraphs and delivers finite non-lethal hit, dodge prevents it',()=>{
 const s=begin();step(s,150);assert.ok(s.events.some(e=>e.type==='reframer-telegraph'));
 assert.ok(s.enemyAttacks>=1);assert.ok(s.player.hp<=1&&s.player.hp>=0);
 const t=begin();t.aiCooldown=0;t.enemy.x=t.player.x+1.1;
 step(t,1);assert.ok(t.aiWindup>0);step(t,22);assert.ok(duelAction(t,'dodge').ok);step(t,15);
 assert.ok(t.events.some(e=>e.type==='perfect-evade'),'dodge i-frames should evade hit');
});
test('roof perimeter clamps both fighters and records enemy structure collision',()=>{
 const s=begin();s.enemy.x=DUEL_ROOF.halfX-.02;s.enemy.vx=18;s.enemy.stun=1;
 step(s,10);assert.ok(s.enemy.x<=DUEL_ROOF.halfX);assert.ok(s.wallImpacts>=1);
 assert.ok(s.events.some(e=>e.type==='roof-wall-impact'));
});
test('downed player or timed-out duel has clean terminal state',()=>{
 const s=begin();s.player.hp=.01;s.aiCooldown=0;s.enemy.x=s.player.x+1;
 step(s,60);assert.equal(s.mode,'DEFEAT');
 const t=begin();t.time=149.99;step(t,4);assert.equal(t.mode,'DEFEAT');
});
test('unknown inputs, invalid dt and post-victory actions are harmless',()=>{
 const s=begin();assert.equal(duelAction(s,'planetary-blast').ok,false);
 stepRooftopDuel(s,NaN);assert.equal(s.time,0);
 s.mode='VICTORY';assert.equal(duelAction(s,'light').ok,false);
 assert.equal(stepRooftopDuel(s,.05),s);
});
test('snapshot is immutable copy suitable for browser QA and HUD',()=>{
 const s=begin(),a=duelSnapshot(s);a.player.hp=0;a.events.push({type:'cheat'});
 assert.equal(s.player.hp,1);assert.equal(s.events.length,0);
});
