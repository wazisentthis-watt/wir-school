// METAL Campaign Mold: opt-in Season One storyboard plus a single real-skate
// first-mission beat. Uses unchanged Savannah movement and 4-chapter saves.
// All future 30-episode mission combat remains design-only until implemented.
import {METAL_MOLD_KEY,METAL_SEASON_30,METAL_SEASON_ARCS,METAL_SERIES_LOCKS,
 FIRST_PUSH,FINAL_BEATS,loadMetalMold,saveMetalMold,metalMoldSnapshot,
 attemptFirstPush} from './metal_story_mold_core.mjs';
const css=(o,s)=>{o.style.cssText=s;return o;};
const el=(t,txt)=>{const d=document.createElement(t);d.textContent=txt||'';return d;};
export function mountMetalStoryMold({P,st,vel,grounded,skatepark,storage,legacyStory}){
 if(!P?.o?.position||!st||!vel||!skatepark)
  throw Error('METAL_STORY_MOLD_REQUIRES_EXISTING_PLAYER_AND_SKATEPARK');
 const S=loadMetalMold(storage);
 const root=css(el('div'),'position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:78;color:#f4f0ff;font:12px system-ui;pointer-events:none');
 root.id='metalStoryMold';root.classList.add('wir-keep');
 const open=css(el('button','🎬 METAL STORY · FIRST PUSH'),'pointer-events:auto;min-height:44px;padding:9px 13px;border-radius:12px;background:#241d39;border:1px solid #b596ff;color:white;font:bold 12px system-ui;touch-action:manipulation;cursor:pointer');
 open.id='metalStoryMoldToggle';open.type='button';open.setAttribute('aria-expanded','false');
 const panel=css(el('section'),'pointer-events:auto;display:none;position:absolute;bottom:51px;left:0;max-height:65vh;overflow:auto;width:min(350px,92vw);border-radius:14px;border:1px solid #8b74b4;background:#11101ef2;padding:12px;box-shadow:0 15px 30px #000a');
 panel.id='metalStoryMoldPanel';panel.hidden=true;
 const heading=el('div','METAL InDa RIFFT · Story Campaign');
 heading.style.cssText='font:bold 15px system-ui;margin-bottom:7px';
 const context=el('p','Current Savannah prototype is a gameplay bridge, not a finished Morrow City campaign.');
 context.style.cssText='font:11px/1.4 system-ui;color:#d3bddf;margin:3px 0 9px';
 const current=el('p','');current.id='metalStoryMoldCurrent';current.style.cssText='font:12px/1.45 system-ui;margin:5px 0';
 const status=el('p','');status.id='metalStoryMoldStatus';status.setAttribute('role','status');
 status.style.cssText='font:11px/1.5 system-ui;color:#a5e5ff;margin:7px 0';
 const capture=el('button','RECORD FIRST PUSH');capture.type='button';capture.id='metalStoryFirstPush';
 capture.style.cssText='min-height:44px;width:100%;background:#4c2d6e;color:white;border:1px solid #bca2ff;border-radius:10px;font:bold 12px system-ui;touch-action:manipulation;cursor:pointer';
 const hint=el('p',FIRST_PUSH.requirement);hint.style.cssText='font:10px/1.3 system-ui;color:#c4bdce;margin:6px 0';
 const arcList=el('details','');arcList.id='metalStorySeasonIndex';
 const arcSummary=el('summary','30-MISSION STORY MAP · 5 ARCS');
 arcSummary.style.cssText='font:bold 11px system-ui;cursor:pointer;margin:9px 0';
 arcList.append(arcSummary);
 for(const arc of METAL_SEASON_ARCS){
  const h=el('h4',arc.title);h.style.cssText='font:bold 11px system-ui;color:#dfcbff;margin:9px 0 3px';arcList.append(h);
  for(const episode of METAL_SEASON_30.filter(x=>x.arc===arc.id)){
   const p=el('p',episode.number+'. '+episode.title+' · '+episode.opposition+' · '+episode.albumStem);
   p.dataset.episode=episode.id;p.style.cssText='font:10px/1.35 system-ui;color:#c1bace;margin:3px 0';arcList.append(p);
  }
 }
 const finish=el('details','');finish.id='metalStoryFinalePreview';
 const finishTitle=el('summary','🏁 END IN MIND · EVERYBODY OUT');
 finishTitle.style.cssText='font:bold 11px system-ui;cursor:pointer;margin:8px 0';
 finish.append(finishTitle);
 const finaleText=el('p','The victory is not defeating the Foreman first. Evacuate the districts, put people in control, catch the central floor, bring everybody home, then finish City Under My Wheels.');
 finaleText.style.cssText='font:11px/1.45 system-ui;color:#e7dafa';
 finish.append(finaleText);
 for(const b of FINAL_BEATS){
  const p=el('p','• '+b.title+' · '+b.evidence);
  p.style.cssText='font:10px/1.5 system-ui;color:#c7bacd;margin:4px 0';finish.append(p);
 }
 const provenance=el('p','SOURCE: September 2026 30 Episode Season Bible. Design-only episodes are NOT yet playable. This story preview never overwrites existing Savannah saves.');
 provenance.style.cssText='font:10px/1.4 system-ui;color:#aeb0be;margin:9px 0 1px';
 panel.append(heading,context,current,status,capture,hint,arcList,finish,provenance);
 root.append(open,panel);document.body.append(root);
 let alive=true,frame=0;
 const state=()=>({position:P.o.position,skatepark,board:st.board===true&&!!st.board,
  grounded:grounded?.()===true,speed:Math.hypot(vel.x,vel.z)});
 function refresh(){
  if(!alive)return;
  const v=metalMoldSnapshot(S),facts=state(),d=Math.hypot(facts.position.x-skatepark.x,facts.position.z-skatepark.z);
  current.textContent='01 · Concrete Has a Tempo · Opponent: Ballast. Stem: First Push. Existing Savannah chapter: '+(legacyStory?.()?.title||'Unknown')+'.';
  if(v.firstPush){status.textContent='FIRST PUSH LOGGED ✓ · opening rhythm captured as a game event (no audio file recorded). Ballast and the awning rescue are next implementation targets.';capture.disabled=true;capture.textContent='FIRST PUSH LOGGED ✓';}
  else{status.textContent='Next: Skate to the park with a rolling board · '+Math.round(d)+'m from capture zone';capture.disabled=false;capture.textContent='RECORD FIRST PUSH';}
  capture.style.opacity=capture.disabled?'.55':'1';
  open.textContent=v.firstPush?'🎬 FIRST PUSH ✓':'🎬 METAL STORY · FIRST PUSH';
 }
 open.addEventListener('click',()=>{
  panel.hidden=!panel.hidden;panel.style.display=panel.hidden?'none':'block';
  open.setAttribute('aria-expanded',String(!panel.hidden));refresh();
 });
 capture.addEventListener('click',()=>{
  const result=attemptFirstPush(S,state());
  if(result.ok)saveMetalMold(storage,S);
  refresh();
  status.textContent=result.ok?'FIRST PUSH RECORDED · the board’s actual roll qualified · next: Ballast / awning rescue (not yet built)'
   :'NOT YET · '+result.reason.replace(/-/g,' ');
 });
 finish.addEventListener('toggle',()=>{if(finish.open){S.finalePreviewSeen=true;saveMetalMold(storage,S)}});
 refresh();
 function tick(){
  if(!alive)return;
  if(++frame%40===0&&!panel.hidden)refresh();
 }
 function snapshot(){return {...metalMoldSnapshot(S),sceneAttached:true,visible:!panel.hidden,saveKey:METAL_MOLD_KEY,recordingStatus:FIRST_PUSH.beat}}
 function destroy(){alive=false;root.remove();}
 return Object.freeze({tick,snapshot,destroy});
}
