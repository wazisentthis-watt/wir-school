// Metal move implementation inventory, 2026-11-02.
// This registry distinguishes code-backed mechanics from proposed implementations.
// Do not display a move as playable solely because it appears here.
export const METAL_MOVE_CATALOG = Object.freeze([
 {id:'jab',family:'melee',form:'ALL',state:'CODE_BACKED',input:'Numpad4'},
 {id:'cross',family:'melee',form:'ALL',state:'CODE_BACKED',input:'Numpad6'},
 {id:'hook',family:'melee',form:'ALL',state:'CODE_BACKED',input:'Numpad4 combo'},
 {id:'kick-left',family:'melee',form:'ALL',state:'CODE_BACKED',input:'Numpad1'},
 {id:'kick-right',family:'melee',form:'ALL',state:'CODE_BACKED',input:'Numpad3'},
 {id:'guard-parry',family:'defense',form:'ALL',state:'CODE_BACKED',input:'Numpad2'},
 {id:'shield-dash',family:'melee',form:'ALL',state:'CODE_BACKED',input:'Numpad9'},
 {id:'gallium-slug',family:'blast',form:'ALL',state:'CODE_BACKED',input:'Numpad7',resource:'charge'},
 {id:'gallium-brace',family:'defense',form:'S1',state:'PARTIAL',resource:'gallium'},
 {id:'anchor-release',family:'mobility',form:'S1',state:'DESIGN',resource:'gallium'},
 {id:'gallium-gallop',family:'mobility',form:'S1',state:'DESIGN',resource:'gallium'},
 {id:'catch-the-floor',family:'mobility',form:'S1',state:'DESIGN',resource:'gallium'},
 {id:'magnetic-snapline',family:'control',form:'S1',state:'DESIGN',resource:'gallium'},
 {id:'heavy-metal-crash',family:'impact',form:'S2',state:'DESIGN'},
 {id:'black-amp-rifft',family:'blast',form:'S3',state:'DESIGN'},
 {id:'board-blast',family:'blast',form:'S3',state:'DESIGN'},
 {id:'sparky',family:'elemental',form:'S3',state:'DESIGN'},
 {id:'true-rifft-flight',family:'mobility',form:'S3',state:'DESIGN'},
 {id:'gallium-cone',family:'blast',form:'ALL',state:'PROPOSAL'},
 {id:'gallium-pulse',family:'blast',form:'ALL',state:'PROPOSAL'},
 {id:'gallium-tether-strike',family:'control',form:'ALL',state:'PROPOSAL'},
 {id:'gallium-ground-slam',family:'impact',form:'ALL',state:'PROPOSAL'}
]);
