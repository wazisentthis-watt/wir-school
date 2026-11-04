import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/metal_aerial_duel_pilot.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../labs/reframer-animation-pack-01/manifest.json',import.meta.url),'utf8'));
test('Pack 01 attaches only with BOTH isolated duel and pack flag, no change to default gameplay',()=>{
 assert.match(source,/get\('reframer_pack'\)==='1'/);
 assert.ok(source.includes('if(this.packEnabled&&!this.reframerPack&&this.enemy?.mixer)'));
 assert.ok(main.includes("get('aerial_duel')==='1'"));
 assert.ok(source.includes('this.reframerPack?.reset()'));
});
test('Pack 01 reuses true GLB rig, same mixer and retains original rival model',()=>{
 assert.ok(source.includes('new ReframerAnimationPack01'));
 assert.ok(source.includes("playSource:(fighter,alias)=>this.playOpponent(fighter,alias)"));
 assert.equal(manifest.verification.bone_count,65);
 assert.equal(manifest.verification.unique_animations,21);
 assert.ok(!source.includes('new THREE.AnimationMixer'));
});
test('Game events drive animation, without altering separate core physics or save records',()=>{
 assert.ok(source.includes('this.reframerPack?.onEvent(event.type)'));
 assert.ok(source.includes("if(!handled&&event.type==='roof-floor-impact')"));
 assert.ok(source.includes('this.reframerPack?.update(dt)'));
 assert.ok(source.includes('if(this.reframerPack?.preview)'));
 assert.ok(!source.includes('localStorage.setItem'));
 assert.ok(main.includes('aerialDuelRestore={pos:P.o.position.clone()'));
});
test('manifest covers eight exact requested priorities and explicitly names missing motion capture',()=>{
 assert.deepEqual(manifest.motions.map(x=>x.id),['combat_idle','melee_three','uppercut_launcher','aerial_pursuit','airborne_tumble','rooftop_recovery','shield_formation','aerial_counter']);
 assert.equal(manifest.source_clips.length,21);
 for(const a of manifest.motions)assert.ok(a.reuse.length&&a.new&&a.pending.length);
 assert.equal(manifest.integration.changes_to_source_model,false);
 assert.equal(manifest.integration.collidable_shield,false);
 assert.equal(manifest.integration.imported_external_FBX_count,0);
});
test('geometry remains non-destructive and preview does not mutate pilot match state',()=>{
 assert.ok(!source.includes('colliders.push'));
 assert.ok(source.includes('this.actions.length=0;this.advanceMixers(dt);this.reframerPack.update(dt);'));
 assert.ok(source.includes('playerWorld:{x:'));
});
