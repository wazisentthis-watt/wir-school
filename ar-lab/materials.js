// materials.js: Material Scouter card table (Binary Bark). PROPOSAL, not canon.
// Real-world values are approximate references. Attunability and move cost stay null until Coach supplies the attunement-strings data.
export const MATERIALS = {
  cement:  {label:'Cement / concrete', prompt:'a photo of cement or concrete', density:[2300,2400], hardness:'Mohs ~3–5', behavior:'hard, brittle, cracks under bending', thicknessM:0.10},
  wood:    {label:'Wood', prompt:'a photo of wood', density:[400,900], hardness:'Janka 1–14 kN', behavior:'medium, splits along grain', thicknessM:0.03},
  rubber:  {label:'Rubber', prompt:'a photo of a black rubber mat', density:[1100,1500], hardness:'Shore A ~60–70', behavior:'flexible, tears before snapping', thicknessM:0.008},
  metal:   {label:'Metal (steel)', prompt:'a photo of metal', density:[7750,7850], hardness:'Mohs ~4–6', behavior:'hard, bends before breaking', thicknessM:0.002},
  water:   {label:'Water', prompt:'a photo of water', density:[1000,1000], hardness:'none (fluid)', behavior:'flows, takes container shape', thicknessM:0.05},
  glass:   {label:'Glass', prompt:'a photo of glass', density:[2400,2600], hardness:'Mohs ~5.5', behavior:'hard, shatters', thicknessM:0.005},
  fabric:  {label:'Fabric / carpet', prompt:'a photo of fabric or carpet', density:[100,400], hardness:'soft', behavior:'drapes, compresses', thicknessM:0.01},
  stone:   {label:'Stone / rock', prompt:'a photo of stone or rock', density:[2500,3000], hardness:'Mohs ~3–7', behavior:'hard, chips', thicknessM:0.15},
  plastic: {label:'Plastic', prompt:'a photo of plastic', density:[900,1400], hardness:'Shore D ~50–80', behavior:'rigid or flexible, melts', thicknessM:0.003},
  soil:    {label:'Soil / dirt', prompt:'a photo of soil or dirt', density:[1200,1700], hardness:'loose', behavior:'crumbles, packs', thicknessM:0.10},
  plant:   {label:'Plant / leaves', prompt:'a photo of plants or leaves', density:[300,800], hardness:'soft', behavior:'living, flexible', thicknessM:0.005},
};
// PROPOSAL: filled in from Coach's attunement-strings data. null means not set.
export const ATTUNE = Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,{attunability:null, chainPrompt:null}]));
export function card(key, confidence, areaM2=0.25){
  const m=MATERIALS[key]; if(!m) return null;
  const d=(m.density[0]+m.density[1])/2;
  const massEst=+(areaM2*m.thicknessM*d).toFixed(2); // ESTIMATE
  const a=ATTUNE[key].attunability;
  return {key,label:m.label,confidence:+confidence.toFixed(2),density:m.density,hardness:m.hardness,behavior:m.behavior,
    massEst, attunability:a, moveCost:a==null?null:+(massEst*(10-a)).toFixed(2), chainPrompt:ATTUNE[key].chainPrompt, tag:'PROPOSAL'};
}
