// WIR Connected save slots v1: additive, independent of legacy profile saves.
export const SAVE_PREFIX='wir-connected-slot-v1-';
export function saveSlot(slot, state) {
  if(!Number.isInteger(slot)||slot<1||slot>3) throw Error('Invalid save slot');
  const data={version:1,savedAt:new Date().toISOString(),state:structuredClone(state)};
  localStorage.setItem(SAVE_PREFIX+slot,JSON.stringify(data));
  return data;
}
export function loadSlot(slot) {
  if(!Number.isInteger(slot)||slot<1||slot>3) throw Error('Invalid save slot');
  const raw=localStorage.getItem(SAVE_PREFIX+slot);
  if(!raw) return null;
  try {
    const data=JSON.parse(raw);
    return data?.version===1 && data.state && typeof data.state==='object'?data:null;
  } catch { return null; }
}
export function listSlots(){return [1,2,3].map(slot=>({slot,save:loadSlot(slot)}));}
export function deleteSlot(slot){
  if(!Number.isInteger(slot)||slot<1||slot>3) throw Error('Invalid save slot');
  localStorage.removeItem(SAVE_PREFIX+slot);
}
