import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pilot=readFileSync(new URL('../assets/metal_aerial_duel_pilot.js',import.meta.url),'utf8');
const pack=readFileSync(new URL('../assets/reframer_animation_pack01.js',import.meta.url),'utf8');
const scene=readFileSync(new URL('../assets/reframer_animation_pack02.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../labs/reframer-animation-pack-02/manifest.json',import.meta.url),'utf8'));
test('Pack02 is opt in, with Pack01 and ordinary rooftop as fully separate fallbacks',()=>{
 assert.match(pilot,/get\('reframer_pack2'\)==='1'/);
 assert.match(pilot,/this.packEnabled=this.pack2Enabled\|\|/);
 assert.match(pilot,/createRooftopDuel\(\{airCounter:this.pack2Enabled\}\)/);
 assert.ok(pack.includes('if(this.phase2Enabled)this.phase2Data=installReframerPack02(this)'));
});
test('upgrades exactly three existing ReFramer actions without touching GLB or a second mixer',()=>{
 assert.ok(scene.includes('new THREE.QuaternionKeyframeTrack'));
 assert.ok(scene.includes('this.enemy.mixer')===false);
 assert.ok(scene.includes('pack.enemy.mixer.clipAction'));
 assert.ok(scene.includes('uncacheAction(former,model)'));
 assert.ok(!scene.includes('new THREE.AnimationMixer'));
 assert.ok(!scene.includes('localStorage'));
 assert.deepEqual(manifest.new_authored_motions.map(x=>x.id),['uppercut_launcher','airborne_tumble','aerial_counter']);
});
test('actual duel events now play the counter animation and preserve source impacts',()=>{
 assert.ok(pilot.includes('this.reframerPack?.onEvent(event.type)'));
 assert.ok(pilot.includes('REFRAMER AIR COUNTER · B TO EVADE!'));
 assert.ok(pilot.includes('this.reframerPack?.syncPhysicalPresentation(this.state.enemy)'));
 assert.ok(pilot.includes("if(!handled&&(event.type==='launch'||event.type==='aerial-finisher'))"));
});
test('Pack 02 root spin is presentation only and is zeroed on exit',()=>{
 assert.ok(scene.includes('body.quaternion.copy(meta.rest.quaternion)'));
 assert.ok(scene.includes('body.position.copy(meta.rest.position)'));
 assert.ok(pack.includes('resetReframerPack02Pose(this)'));
 assert.ok(pack.includes('this.reframerPack===undefined')===false);
 assert.ok(!scene.includes('colliders.push'));
});
test('manifest discloses no mocap, unverified hardware and physical gameplay safety',()=>{
 assert.equal(manifest.implementation.new_GLBFbx_count,0);
 assert.equal(manifest.implementation.no_save_mutations,true);
 assert.equal(manifest.implementation.no_world_colliders_mutated,true);
 assert.equal(manifest.implementation.source_mixer_reused,true);
 assert.equal(manifest.release.status,'DRAFT HOLD');
});
