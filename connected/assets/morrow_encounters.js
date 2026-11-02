// WIR Connected: Morrow encounter rules prototype. PROPOSAL / PUBLISH HOLD.
// Pure deterministic state transitions: no Three.js dependency.
// These are game rules, not assertions about locked Metal canon.
export const FACTIONS=Object.freeze({
 SLOTTA:{role:'fugitive',targets:['Replay Games','interface depot'],escapeSkill:.92},
 FRAMEKEEPER:{role:'municipal enforcement',targets:['suspect','Metal'],bias:.35},
 FRAMEBREAKER:{role:'disruptor',targets:['infrastructure']},
 REFRAMER:{role:'military-game construct',targets:['structural metal'],galliumControl:false}
});
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export function createEncounter(seed=1){return {seed,phase:'robbery',time:0,heat:0,trust:.5,slotta:{distance:22,inventory:['barrier','decoy','board'],retrieve:0,stagger:0,captured:false,escaped:false},metal:{gallium:1,load:0,merkaba:1,form:'normal',tether:0},reframer:{armor:1,windup:0,active:false,construct:0},police:{alert:0,metalSuspected:false},evidence:0,civiliansSafe:false,events:[]};}
function log(s,event){s.events.push(event);if(s.events.length>20)s.events.shift();}
export function stepEncounter(s,action='wait',dt=.1){dt=clamp(dt,.016,.25);s.time+=dt;const m=s.metal,k=s.slotta,r=s.reframer;
 if(action==='pursue'){k.distance=Math.max(0,k.distance-4*dt);m.load=clamp(m.load+.08*dt);}
 if(action==='rescue'){s.civiliansSafe=true;s.trust=clamp(s.trust+.08);k.distance+=1.2;log(s,'Civilian route secured');}
 if(action==='investigate'){s.evidence=clamp(s.evidence+.15);s.trust=clamp(s.trust+.025);}
 if(action==='tether'&&m.gallium>=.12&&m.tether<=0){m.gallium-=.12;m.load=clamp(m.load+.09);m.tether=.8;if(k.distance<7&&k.stagger>0){k.captured=true;s.phase='contained';log(s,'Slotta restrained with anchored Gallium line');}else log(s,'Tether deployed; Slotta evaded');}
 if(action==='anchor'&&m.gallium>=.08){m.gallium-=.08;m.load=clamp(m.load+.04);if(k.distance<5)k.stagger=1.2;log(s,'Grounded anchor set');}
 if(action==='disrupt'&&r.active&&r.construct>0&&m.gallium>=.18){m.gallium-=.18;const wellTimed=r.windup>.55&&r.windup<.85;r.construct=clamp(r.construct-(wellTimed?.8:.15));m.load=clamp(m.load+(wellTimed?.04:.18));log(s,wellTimed?'Timed Gallium disruption shattered construct':'Mistimed disruption strained Metal');}
 if(action==='brace'){m.load=clamp(m.load-.16);m.merkaba=clamp(m.merkaba+.06);}
 if(action==='blast'&&m.gallium>=.2){m.gallium-=.2;m.load=clamp(m.load+.23);s.heat=clamp(s.heat+.12);s.police.alert=clamp(s.police.alert+.15);}
 if(action==='spam'){m.load=clamp(m.load+.3);s.heat=clamp(s.heat+.12);}
 if(action==='deescalate'){s.police.alert=clamp(s.police.alert-.12);s.trust=clamp(s.trust+.025);}
 m.tether=Math.max(0,m.tether-dt);k.stagger=Math.max(0,k.stagger-dt);
 if(s.time>3&&!r.active){r.active=true;r.construct=1;log(s,'ReFramer entered; structural metal at risk');}
 if(r.active){r.windup=(r.windup+dt*.32)%1;}
 if(m.load>.75){m.form='overload';m.merkaba=clamp(m.merkaba-.04*dt);log(s,'Overload: silverback-lion Gallium shell; poor precision');}
 else if(m.load<.35)m.form='normal';
 if(m.form==='overload'&&action==='brace'&&m.merkaba>.15)log(s,'Merkaba assists safe recovery');
 if(s.police.alert>.45&&s.trust<.55)s.police.metalSuspected=true;
 if(!k.captured){k.distance+=dt*(k.stagger>0?.4:1.2);if(k.distance>42){k.escaped=true;s.phase='escaped';}}
 if(k.captured&&s.evidence>=.3&&s.civiliansSafe)s.phase='resolved';
 return s;
}
export function canReframerControl(material){return material==='structural_metal';} // Galaxy Gallium excluded
