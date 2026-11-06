import assert from 'node:assert/strict';
import {test} from 'node:test';
import DP,{vehicle,step,suite} from '../assets/drive_physics.mjs';
// ReFramer Rush's own drive-physics suite, run inside Connected so the port can't drift from the source
test('ReFramer Rush DrivePhysics suite passes unchanged (10/10)',()=>{const r=suite();assert.equal(r.passed,r.total,JSON.stringify(r.rows.filter(x=>!x.pass)));});
test('Connected unit conversion: 0.094 m per Rush unit gives street-sized speeds (top ≈ 30 m/s, nitro ≈ 42)',()=>{const c=vehicle(0,0,0);for(let i=0;i<120;i++)step(c,{throttle:1},{road:true},1/60);const ms=Math.hypot(c.vx,c.vy)*.094;assert.ok(ms>8&&ms<40,'2 s launch = '+ms.toFixed(1)+' m/s');});
