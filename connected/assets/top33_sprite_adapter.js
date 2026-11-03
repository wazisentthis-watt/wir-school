// TOP 33 sprite adapter. PROPOSAL / PUBLISH HOLD.
// Visual source: generated 1536x1024 concept sheet. Place licensed/approved PNG at
// connected/assets/top33_sprite_sheet.png before enabling in the live game.
// Crop coordinates refer to the original concept sheet; NOT a transparent animation atlas.
export const TOP33_NAMES='SLOTTA VANTHEX NEXORA GRAVEM KRYSAL VOLTARIS MORROWSHADE FERRAKAI SOLVEX CHRONELLE BRONTIDE VEYRA NULLEX PYRRION AETHERIS MENDRIX TESSARA RIFTJAW CINDERVANE OSSIKAR SYNAPSE HALOCLINE XYPHRA DREADCOIL ORIVEX LUMINARA BASALISK QUELLION VESPERON AXION UMBRYSS KINETRA OMENZA'.split(' ');
export const TOP33_SPRITE_IMAGE='./assets/top33_sprite_sheet.png';
const ROW_START=[0,327,649], ROW_END=[327,649,968];
export function top33SpriteCrop(index,pose='idle'){
 if(!Number.isInteger(index)||index<0||index>=33)throw new RangeError('TOP 33 index must be 0..32');
 const row=Math.floor(index/11),col=index%11;
 const x0=Math.round(col*1536/11)+7,x1=Math.round((col+1)*1536/11)-7;
 const y=ROW_START[row],end=ROW_END[row];
 const bounds=pose==='run'?[y+151,y+246]:pose==='power'?[y+249,end-10]:[y+38,y+145];
 return {x:x0,y:bounds[0],width:x1-x0,height:bounds[1]-bounds[0]};
}
export function drawTop33Sprite(ctx,image,index,pose,x,y,width,height){
 if(!image||!image.complete||!image.naturalWidth)return false;
 const c=top33SpriteCrop(index,pose);
 ctx.drawImage(image,c.x,c.y,c.width,c.height,x,y,width,height);
 return true;
}
