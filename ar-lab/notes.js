/* v7 Lab notes: tiny, dismissable chemistry/physics toasts tied to what you just did. One at a time, rate-limited.
   pickNote is pure (Node-tested). "Learn more" opens an Atoms-mode explainer. Original wording, PROPOSAL-level school notes. */
export const NOTES={
 cellulose:{on:/^item:lit:(paper|leaf)/,t:'Burning paper',b:'Paper is cellulose. Burning: (C₆H₁₀O₅)n + O₂ → CO₂ + H₂O + ash.',more:'Cellulose is a long chain of glucose units. Combustion breaks C–C and C–H bonds and makes CO₂ and water vapor; the minerals that cannot burn are left as ash.',atoms:['C','H','O']},
 triangle:{on:/^(fire:flame|fire:keep|item:lit)/,t:'Fire triangle',b:'Fire needs fuel + oxygen + heat. Take away any one and it goes out.',more:'Fuel (paper, wax, wood) reacts with O₂ from the air once heat gets it hot enough (ignition temperature). Smothering removes oxygen, water removes heat, burning it up removes fuel.',atoms:['C','H','O']},
 color:{on:/^(fire:focus|fire:burst|blast:release)/,mode:'fire',t:'Flame color = temperature',b:'Red is coolest (~600–800 °C), orange-yellow hotter, white/blue hottest.',more:'Hot soot particles glow like a heated stove coil: the hotter, the shorter the wavelength. A blue flame means clean, complete burning with lots of oxygen.',atoms:['C']},
 latent:{on:/^(item:melt|item:lit:ice|water:freeze)/,t:'Melting takes energy',b:'Ice stays at 0 °C while it melts: the heat breaks bonds instead of raising temperature (latent heat).',more:'It takes 334 J to melt 1 g of ice with no temperature change. That is why ice keeps a drink cold so long.',atoms:['H','O']},
 hbond:{on:/^(water:ribbon|water:strands5|water:raise|water:pool)/,t:'Why water holds together',b:'H₂O molecules stick to each other with hydrogen bonds. That makes surface tension.',more:'Oxygen pulls electrons harder than hydrogen, so water is polar: slightly − at O, slightly + at H. Neighbors attract, so drops bead up and strands hold together.',atoms:['H','O']},
 vortex:{on:/^(air:spin|air:keep|air:ball)/,t:'Spinning air',b:'Fast-spinning air has low pressure in the middle; it pulls things inward, like a tornado.',more:'Faster-moving air pushes less on what is around it (Bernoulli). A spinning ball of air keeps its shape because its fast, low-pressure core is held in by the slower air around it.',atoms:['N','O']},
 rock:{on:/^earth:(rise|shatter|grab)/,t:'Rock types',b:'Igneous (cooled magma), sedimentary (pressed layers), metamorphic (changed by heat and pressure).',more:'Most rock is made of silicate minerals: silicon and oxygen (SiO₂) plus metals like aluminum, iron, calcium.',atoms:['Si','O']},
 blast:{on:/^blast:full/,t:'Stored energy',b:'Charging = storing energy; the clap releases it all at once, like a spring.',more:'Energy is never created or lost, only changed in form. In chemistry, bonds store energy; reactions that release it are exothermic (like burning).',atoms:['C','O']},
};
export const RATE=25; // seconds between toasts
export function notesNew(){ return {shown:new Set(),last:-1e9,open:null}; }
/* returns note key or null */
export function pickNote(N,ev,t,mode){ if(N.open||t-N.last<RATE) return null;
  for(const [k,n] of Object.entries(NOTES)){ if(N.shown.has(k)) continue; if(n.mode&&n.mode!==mode) continue; if(n.on.test(ev)){ N.shown.add(k); N.last=t; N.open=k; return k; } } return null; }
/* mini quests: ordered steps, each an event regex, last step a question */
export const QUESTS=[
 {id:'candle',name:'Light the candle',steps:[{on:/^item:candle$/,say:'Pull a candle out of the 🧺 tray.'},{on:/^item:lit:candle$/,say:'Light its wick with your flame.'},{q:'What three things does a fire need?',a:['Fuel, oxygen, heat','Water, air, light','Smoke, ash, sparks'],ok:0}]},
 {id:'ice',name:'Melt the ice cube',steps:[{on:/^item:ice$/,say:'Pull out an ice cube.'},{on:/^item:melt/,say:'Hold it near the flame.'},{q:'While ice melts, its temperature…',a:['stays at 0 °C','rises steadily','drops'],ok:0}]},
];
export function questStep(Q,ev){ const q=QUESTS.find(x=>x.id===Q.id); if(!q) return null; const s=q.steps[Q.i]; if(s&&s.on&&s.on.test(ev)){ Q.i++; return q.steps[Q.i]||null; } return null; }
