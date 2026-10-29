/* config.js - defaults and labels shared by the page and the tests. PLACEHOLDER / PROPOSAL – not canon. Everything is Simulated. */
export const BADGE='PLACEHOLDER / PROPOSAL – not canon';
export const DEFAULTS={
  flowLayer:false,   // flow meter + palms charge / clap: OFF until you turn it on
  string:-1,         // faint string: OFF by default (-1 = off, 0..2 = String A..C, neutral placeholders)
  hud:true,          // HUD expanded; the collapse button hides it (badge and safety prompts stay)
  pool:false,
  restEveryMs:5*60000, restMs:15000,
};
export const LABELS={calm:'calm (Simulated)',flow:'flow (Simulated)',charge:'charge (Simulated)',sim:'Simulated'};
export const ALLOWED_HOSTS=['cdn.jsdelivr.net','storage.googleapis.com']; // the only network use: MediaPipe library + models, when you press camera
