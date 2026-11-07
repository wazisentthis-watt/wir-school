// Deterministic no-save Galaxy Gallium forge. PROPOSAL/PUBLISH HOLD.
export const FORGE_COST=.08,FORGE_REFUND=.05;
export class ForgeState{
 constructor(){this.phase='IDLE';this.elapsed=0;this.error='';}
 get busy(){return !['IDLE','SKATING'].includes(this.phase);}
 begin({grounded,hasMaterial,gallium}={}){
  this.error='';
  if(this.phase!=='IDLE')this.error='already busy';
  else if(!grounded)this.error='stand on a surface';
  else if(!hasMaterial)this.error='no nearby material';
  else if(!Number.isFinite(gallium)||gallium<FORGE_COST)this.error='not enough Galaxy Gallium';
  if(this.error)return false;
  this.phase='DETECTING';this.elapsed=0;return true;
 }
 tick(dt){if(!Number.isFinite(dt)||dt<=0||this.phase==='IDLE'||this.phase==='SKATING')return this.phase;
  this.elapsed+=Math.min(.1,dt);
  const t=this.elapsed;
  if(this.phase==='DISSOLVING'){if(t>=.55){this.phase='IDLE';this.elapsed=0;}return this.phase;}
  this.phase=t>=3.3?'SKATING':t>=2.65?'MOUNTING':t>=2.2?'ACTIVATED':t>=1.55?'COMPRESSION':t>=.9?'GATHERING':t>=.35?'EXTRACTION':'DETECTING';
  return this.phase;
 }
 dissolve(){if(this.phase!=='SKATING')return false;this.phase='DISSOLVING';this.elapsed=0;return true;}
 cancel(){this.phase='IDLE';this.elapsed=0;}
}
