// Read-only diagnostics: never alters velocity, position or controller state.
export class PhysicsTelemetry {
 constructor(limit=600){this.limit=limit;this.samples=[];this.last=null;}
 sample({time,dt,position,velocity,grounded,board,wall,swing,flying,body}){
  const p={x:position.x,y:position.y,z:position.z};
  const v={x:velocity.x,y:velocity.y,z:velocity.z};
  const previous=this.last;
  const acceleration=previous&&dt>0?Math.hypot(v.x-previous.velocity.x,v.y-previous.velocity.y,v.z-previous.velocity.z)/dt:0;
  const entry={time,dt,position:p,velocity:v,speed:Math.hypot(v.x,v.z),verticalSpeed:v.y,acceleration,grounded:!!grounded,board:!!board,wall:!!wall,swing:!!swing,flying:!!flying,bodyMode:body?.mode||'unknown',impact:body?.impact||0};
  this.samples.push(entry);if(this.samples.length>this.limit)this.samples.shift();this.last=entry;return entry;
 }
 snapshot(){return this.last?{...this.last,position:{...this.last.position},velocity:{...this.last.velocity}}:null;}
 export(){return this.samples.map(s=>({...s,position:{...s.position},velocity:{...s.velocity}}));}
 clear(){this.samples.length=0;this.last=null;}
}
