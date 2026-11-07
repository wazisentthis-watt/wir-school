// Derived, read-only Forge HUD state. Never touches current missions or save storage.
export const FORGE_LABELS=Object.freeze({
 DETECTING:'SCANNING MATERIAL',EXTRACTION:'EXTRACTING MATTER',
 GATHERING:'GALAXY GALLIUM GATHER',COMPRESSION:'FORMING DECK + WHEELS',
 ACTIVATED:'SOLIDIFYING BOARD',MOUNTING:'STEPPING ONTO BOARD',
 DISSOLVING:'RETURNING GALLIUM'
});
export function forgeDisplay(state){
 const phase=state?.phase;
 if(!FORGE_LABELS[phase])return {visible:false,label:'',percent:0,phase:phase||'IDLE'};
 const duration=phase==='DISSOLVING'?.55:3.3;
 const elapsed=Number.isFinite(state?.elapsed)?state.elapsed:0;
 const percent=Math.max(0,Math.min(100,Math.round(elapsed/duration*100)));
 return {visible:true,label:FORGE_LABELS[phase],percent,phase};
}
