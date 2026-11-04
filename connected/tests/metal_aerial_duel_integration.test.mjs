import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
const pilot=readFileSync(new URL('../assets/metal_aerial_duel_pilot.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('opt-in prototype explicitly gated and only overrides input when active',()=>{
 assert.match(main,/get\('aerial_duel'\)==='1'/);
 assert.match(main,/if\(aerialDuel\?\.active\)\{aerialDuel\.update\(dt\);return;\}/);
 assert.match(main,/if\(AERIAL_DUEL_PILOT\)\s*\{\s*initAerialDuelPilot\(\)/);
 assert.ok(main.includes('if(REFRAMER_IK_PROBE&&aerialDuel)'),'Experimental extension stays inside the opt-in rooftop gate');
 assert.ok(pilot.includes('if(!this.active)return;'));
});
test('real first mission, actual METAL rig and model remain mounted',()=>{
 assert.ok(main.includes('missionAsset(\'assets/models/metal/metal_phase6_fight.glb\''));
 assert.ok(main.includes('metal_skateboard_4wheel_PLACEHOLDER.glb'));
 assert.ok(main.includes('initMetalStory()'));
 assert.ok(main.includes('forgeController=new MetalForgeController'));
});
test('training scene does not mutate city colliders or save data',()=>{
 assert.ok(!pilot.includes('localStorage'));
 assert.ok(!pilot.includes('colliders.push'));
 assert.ok(!pilot.includes('saveMetalStory'));
 assert.ok(!main.includes("plog('achievements','Won ReFramer aerial duel"));
 assert.ok(main.includes('aerialDuelRestore={pos:P.o.position.clone()'));
 assert.ok(main.includes('P.o.position.copy(aerialDuelRestore.pos)'));
});
test('controller and touch controls expose all five actions and preserve normal gamepad path',()=>{
 assert.ok(pilot.includes("0:on(0),1:on(1),2:on(2),3:on(3),6:on(6),7:on(7)"));
 for(const a of ['light','launch','pursue','finisher','dodge'])assert.ok(pilot.includes('data-duel="'+a+'"'));
 assert.ok(pilot.includes('pointercancel'));assert.ok(pilot.includes('lostpointercapture'));
 assert.ok(main.includes('function pollPad(dt=1/60)'));
});
test('ReFramer rendered from existing rig, not made-up assets or false licenses',()=>{
 assert.ok(main.includes('rivalGLTF?makeFighter(rivalGLTF'));
 assert.ok(pilot.includes('this.enemy.o.visible=true'));
 assert.ok(pilot.includes('this.roof.visible=false'));
 assert.ok(!pilot.includes('Mixamo'));
});
test('training exit restores all movement and camera ownership',()=>{
 for(const phrase of ['vel.copy(aerialDuelRestore.vel)','st.flying=aerialDuelRestore.flying','st.swing=aerialDuelRestore.swing','camYaw=aerialDuelRestore.yaw'])assert.ok(main.includes(phrase));
 assert.ok(pilot.includes('this.onExit()'));
 assert.ok(html.includes('id="aerialDuelPortal"'));
});
