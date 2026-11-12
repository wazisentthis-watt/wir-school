// WIR original parametric character specification. This is not a text-to-mesh AI service.
// PROPOSAL / PUBLISH HOLD. The supplied spec is data only, never executable JavaScript.
export const MAX_SEED = 0x7fffffff;
export const METAL_SPEC = Object.freeze({
  name: 'METAL · Intsimbi Solano', seed: 61126, scale: 1,
  appearance: 'metal',
  palette: { skin: 0x593622, armor: 0x12121b, secondary: 0x272436, accent: 0x6b32b5, glow: 0xa66aff, eyes: 0xf4f8ff, hair: 0x111017 },
  proportions: { shoulder: 1.08, chest: 1.03, waist: .92, arm: 1, forearm: 1, leg: 1, head: 1, neck: 1, torsoSquareness: 3.1 },
  features: { headGear: 'afro-crown', shoulderPads: true, handType: 'gauntlets', board: false, sealedSuit: true }
});
const DEFAULT_PROPORTIONS = Object.freeze({ shoulder:1, chest:1, waist:1, arm:1, forearm:1, leg:1, head:1, neck:1, torsoSquareness:2.6 });
const RANGES = Object.freeze({ shoulder:[.7,1.6], chest:[.7,1.6], waist:[.6,1.5], arm:[.7,1.6], forearm:[.7,1.8], leg:[.7,1.5], head:[.7,1.4], neck:[.7,1.5], torsoSquareness:[2,4.5] });
const PALETTE = Object.freeze({ skin:0x683f2c, armor:0x1a1b2b, secondary:0x3b374a, accent:0x8a55d1, glow:0xb279ff, eyes:0xe8f5ff, hair:0x111018 });
export const HEAD_GEAR = Object.freeze(['afro-crown','coils','visor','none']);
export const APPEARANCE = Object.freeze(['metal','civilian']);
export const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
export const smoothstep = t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
export function createSeededRNG(seed=1){let s=(Number(seed)>>>0)||1;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
export function normalizeAISpec(input={}) {
 if(input===null||typeof input!=='object'||Array.isArray(input))throw new TypeError('Character specification must be an object');
 const p={},r=input.proportions??{},pal={};
 if(r===null||typeof r!=='object'||Array.isArray(r))throw new TypeError('proportions must be an object');
 for(const [key,[min,max]] of Object.entries(RANGES)){
  const v=r[key]??DEFAULT_PROPORTIONS[key];if(typeof v!=='number'||!Number.isFinite(v))throw new RangeError('Invalid proportion: '+key);
  p[key]=clamp(v,min,max);
 }
 const colors=input.palette??{};
 if(colors===null||typeof colors!=='object'||Array.isArray(colors))throw new TypeError('palette must be an object');
 for(const [key,value] of Object.entries(PALETTE)){
  let c=colors[key]??value;
  if(typeof c==='string'&&/^(#|0x)[0-9a-f]{6}$/i.test(c))c=parseInt(c.slice(c[0]==='#'?1:2),16);
  if(!Number.isInteger(c)||c<0||c>0xffffff)throw new RangeError('Invalid palette color: '+key);
  pal[key]=c;
 }
 const f=input.features??{};
 if(f===null||typeof f!=='object'||Array.isArray(f))throw new TypeError('features must be an object');
 const headGear=f.headGear??'afro-crown';if(!HEAD_GEAR.includes(headGear))throw new RangeError('Unsupported headGear');
 const appearance=input.appearance??'civilian';if(!APPEARANCE.includes(appearance))throw new RangeError('Unsupported appearance');
 const scale=input.scale??1;if(typeof scale!=='number'||!Number.isFinite(scale))throw new RangeError('Invalid scale');
 const seed=input.seed??1;if(!Number.isSafeInteger(seed)||seed<0||seed>MAX_SEED)throw new RangeError('Invalid seed');
 return {name:String(input.name??'WIR Character').slice(0,96),seed,scale:clamp(scale,.8,1.4),appearance,palette:pal,proportions:p,
  features:{headGear,shoulderPads:f.shoulderPads===true,handType:f.handType==='bare'?'bare':'gauntlets',board:f.board===true,sealedSuit:f.sealedSuit===true||appearance==='metal'}};
}
export function validateCharacterTopology(weights,indices,boneCount){
 if(weights.length!==indices.length||weights.length%4)throw new Error('Skinning buffers must have four influences per vertex');
 for(let i=0;i<weights.length;i+=4){let total=0;for(let j=0;j<4;j++){
  const w=weights[i+j],b=indices[i+j];if(!Number.isFinite(w)||w<0||!Number.isInteger(b)||b<0||b>=boneCount)throw new Error('Invalid skin influence');total+=w;
 }if(Math.abs(total-1)>1e-4)throw new Error('Skin weights must sum to 1, not '+total);
 }return true;
}