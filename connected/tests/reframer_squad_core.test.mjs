import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SQUAD,createReframerSquad,reserveVehicle,attachVehiclePart,damageVehiclePart,
 releaseVehicle,reserveTentacle,releaseTentacle,squadOrders,squadSnapshot}
 from '../assets/reframer_squad_core.mjs';
import {createReframers,wake,step} from '../assets/reframer_core.mjs';
import {createReframerHunt,stepReframerHunt} from '../assets/reframer_hunt_core.mjs';
const c=()=>createReframerSquad(2);
test('two independent wing IDs plus original ReFramer, with mobile budget of one wing',()=>{
 const s=c();assert.equal(s.wings.length,2);
 assert.deepEqual(s.wings.map(x=>x.id),['RF-W1','RF-W2']);
 assert.deepEqual(s.wings.map(x=>x.role),['interceptor','salvager']);
 assert.equal(createReframerSquad(1).wings.length,1);
 assert.equal(createReframerSquad(50).wings.length,2);
 assert.equal(SQUAD.MAX_ACTIVE_GRABS,1);
});
test('distinct original car donor claims cannot be duplicated between ReFramers',()=>{
 const s=c();assert.equal(reserveVehicle(s,'RF-W1','car-a').ok,true);
 assert.equal(reserveVehicle(s,'RF-W2','car-a').reason,'donor-claimed');
 assert.equal(reserveVehicle(s,'RF-W2','car-b').ok,true);
 assert.equal(s.vehicleClaims.size,2);
 assert.deepEqual([...s.vehicleClaims.keys()],['car-a','car-b']);
 assert.equal(reserveVehicle(s,'RF-W1','car-c').reason,'invalid-or-busy');
});
test('individual mechanical part provenance prevents duplication and external car parts',()=>{
 const s=c();reserveVehicle(s,'RF-W1','car-a');reserveVehicle(s,'RF-W2','car-b');
 assert.equal(attachVehiclePart(s,'RF-W1',{id:'wheel-a',kind:'wheel',vehicleId:'car-a'}).ok,true);
 assert.equal(attachVehiclePart(s,'RF-W1',{id:'wheel-a',kind:'wheel',vehicleId:'car-a'}).reason,'duplicate-or-full');
 assert.equal(attachVehiclePart(s,'RF-W1',{id:'wheel-b',kind:'wheel',vehicleId:'car-b'}).reason,'not-claimed-donor');
 assert.equal(attachVehiclePart(s,'RF-W2',{id:'wheel-b',kind:'wheel',vehicleId:'car-b'}).ok,true);
 assert.equal(s.wings[0].parts.length,1);assert.equal(s.wings[1].parts.length,1);
});
test('damage breaks one part only; it cannot reappear as free matter in the same encounter',()=>{
 const s=c();reserveVehicle(s,'RF-W1','car-a');
 attachVehiclePart(s,'RF-W1',{id:'wheel-a',kind:'wheel',vehicleId:'car-a'});
 const p=damageVehiclePart(s,'RF-W1','wheel-a',.35);assert.equal(p.broken,false);
 assert.ok(p.part.integrity<1);
 const q=damageVehiclePart(s,'RF-W1','wheel-a',1);assert.equal(q.broken,true);
 assert.equal(s.wings[0].parts.length,0);
 assert.equal(damageVehiclePart(s,'RF-W1','wheel-a',1).reason,'invalid-hit');
 assert.equal(attachVehiclePart(s,'RF-W1',{id:'wheel-a',kind:'wheel',vehicleId:'car-a'}).reason,'duplicate-or-full');
});
test('releasing one donor never unclaims another machine car or steals its parts',()=>{
 const s=c();reserveVehicle(s,'RF-W1','car-a');reserveVehicle(s,'RF-W2','car-b');
 attachVehiclePart(s,'RF-W1',{id:'wheel-a',kind:'wheel',vehicleId:'car-a'});
 attachVehiclePart(s,'RF-W2',{id:'wheel-b',kind:'wheel',vehicleId:'car-b'});
 const release=releaseVehicle(s,'RF-W1','roadframeDown');
 assert.equal(release.ok,true);assert.deepEqual(release.parts.map(p=>p.id),['wheel-a']);
 assert.equal(s.vehicleClaims.has('car-a'),false);
 assert.equal(s.vehicleClaims.get('car-b'),'RF-W2');
 assert.equal(s.wings[1].parts.length,1);
 assert.equal(s.wings[0].donor,null);
 assert.equal(releaseVehicle(s,'RF-W1','clean').reason,'none');
});
test('single police-style radio sighting gives other agent shared LAST known coordinates',()=>{
 const s=c(),metal={x:5,z:5};
 const units=[{id:'RF-LEAD',position:{x:0,z:5},sees:true},
  {id:'RF-W1',position:{x:25,z:25},sees:false},
  {id:'RF-W2',position:{x:24,z:24},sees:false}];
 const orders=squadOrders(s,{metal,units,dt:.1});
 assert.equal(orders.length,2);
 assert.equal(orders[0].mode,'search');assert.equal(orders[1].mode,'search');
 assert.deepEqual(orders[0].goal,metal);assert.deepEqual(orders[1].goal,metal);
 assert.equal(s.radioMessages,1);
 for(let i=0;i<74;i++)squadOrders(s,{metal:{x:100,z:100},units:units.map(u=>({...u,sees:false})),dt:.1});
 assert.equal(s.contact,null,'radio may not grant omniscient tracking forever');
 const no=squadOrders(s,{metal:{x:150,z:150},units:units.map(u=>({...u,sees:false})),dt:.1});
 assert.equal(no[0].mode,'patrol');assert.equal(no[1].goal,null);
});
test('one interceptor flanks while scavenger approaches target; no impossible rams',()=>{
 const s=c(),metal={x:0,z:10};
 const orders=squadOrders(s,{metal,units:[
  {id:'RF-W1',position:{x:0,z:0},sees:true},
  {id:'RF-W2',position:{x:2,z:2},sees:true}
 ],dt:.1});
 assert.equal(orders[0].mode,'pursue');assert.equal(orders[1].mode,'pursue');
 assert.notDeepEqual(orders[0].goal,metal,'interceptor must aim beside target');
 assert.deepEqual(orders[1].goal,metal,'scavenger must approach actual location');
 assert.equal(orders.every(x=>x.canRam),true);
});
test('only one wing tentacle may capture Metal at a time; freed lock can transfer',()=>{
 const s=c();
 assert.equal(reserveTentacle(s,'RF-W1'),true);
 assert.equal(reserveTentacle(s,'RF-W2'),false);
 assert.equal(s.activeGrabber,'RF-W1');
 assert.equal(releaseTentacle(s,'RF-W2'),false);
 assert.equal(releaseTentacle(s,'RF-W1',true),true);
 assert.equal(s.wings[0].escapes,1);
 assert.equal(reserveTentacle(s,'RF-W2'),true);
 assert.equal(s.activeGrabber,'RF-W2');
});
test('old eight-arm engine supports two independent original wake/read/reframe FSMs',()=>{
 const W1=createReframers([{x:0,y:12,z:0}]),W2=createReframers([{x:35,y:13,z:0}]);
 const A=wake(W1,{x:0,z:0},[{id:'sedan',x:4,z:0,occupied:true}]);
 const B=wake(W2,{x:35,z:0},[{id:'taxi',x:39,z:0,occupied:true}]);
 assert.ok(A&&B);assert.notEqual(A,W2.enc);
 for(let i=0;i<260;i++){
  step(W1,{x:0,z:0},{x:4,z:0},.05);
  step(W2,{x:35,z:0},{x:39,z:0},.05);
 }
 assert.equal(W1.enc.stage,'chase');assert.equal(W2.enc.stage,'chase');
 assert.equal(W1.enc.donor,'sedan');assert.equal(W2.enc.donor,'taxi');
 assert.equal(W1.stats.encounters,1);assert.equal(W2.stats.encounters,1);
});
test('hunt core honors optional capture lock without changing legacy callers',()=>{
 const h=createReframerHunt();
 const denied=stepReframerHunt(h,{robot:{x:0,z:0},metal:{x:5,z:0},visible:true,allowTether:false},.1);
 assert.equal(denied.tether,'idle');
 const permitted=stepReframerHunt(h,{robot:{x:0,z:0},metal:{x:5,z:0},visible:true},.1);
 assert.equal(permitted.tether,'windup');
});
test('complete current build is isolated behind explicit squad flag and preserves existing actor',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../assets/reframer_squad_world.mjs',import.meta.url),'utf8');
 assert.match(main,/get\('reframer_squad'\)==='1'/);
 assert.match(main,/reframerSquad\?\.tick\(dt\)/);
 assert.match(main,/reframerSquad\?\.hit\(kind,power,pos\)/);
 assert.match(main,/import\('\.\/reframer_squad_world\.mjs'\)/);
 assert.match(main,/REFRAMER_SQUAD&&c\.userData\.reframed/);
 assert.match(main,/reframerInit\(\)/);
 assert.match(world,/createReframers\(\[\{x:sourceNest\.x/);
 assert.match(world,/car\.traverse\(x=>/);
 assert.match(world,/scene\.attach\(w\)/);
 assert.match(world,/drawScrap\.push\(/);
 assert.doesNotMatch(world,/wir_metal_story_v1/);
 assert.doesNotMatch(world,/window\.__game\s*=/);
});
test('malformed contacts cannot corrupt shared dispatch or grant unexplained donor matter',()=>{
 const s=c();
 assert.equal(squadOrders(s,{metal:{x:Infinity,z:0},units:[],dt:.1}).length,0);
 assert.equal(attachVehiclePart(s,'RF-W1',{id:'p',kind:'wheel',vehicleId:'none'}).ok,false);
 assert.equal(reserveVehicle(s,'nonexistent','car-a').ok,false);
 assert.equal(squadSnapshot(s).vehicleClaims.length,0);
});
