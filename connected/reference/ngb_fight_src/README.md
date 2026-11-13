# NGB: The Glazed Ring v3.1 — Balance Engine, The Corner, Direct Footwork, Body Sync (PHATOM PMK)

Play the fight with your body: your hands are the gloves, your shoulders and hips are the fighter's.

## Put it online (camera needs https://)
1. On a computer: go to https://app.netlify.com/drop and drag **this whole folder** onto the page (or upload it to any static HTTPS host).
2. Open the https:// link it gives you in Safari or Chrome (its own tab — not inside Instagram/TikTok/chat previews).
3. Menu → **📷 BODY CONTROL** → START. Allow the camera.

Testing on the same computer instead: run `python3 -m http.server 8080` in this folder and open http://localhost:8080.

## First time: BODY SYNC (about 3 minutes)
Menu → **📷 BODY SYNC**. The fighter shows each move, then you do it:
1. Get in the picture — head, both gloves, hips **and feet** (2–3 m back, phone at chest height, landscape, light in front of you).
2. Guard up, hold still. Then ONE straight punch with your **LEFT** hand (this tells the game if your camera flips the picture).
3. Jab ×3, cross ×3, lead hook ×3, rear hook ×3, lead uppercut ×3, rear uppercut ×3, body shots ×3 each side.
4. Body guard (elbows over the ribs), slip left/right, duck, lean back — twice each.
5. Switch to your other stance and hold, then switch back.
You get speed, reach and "back to the chin" feedback on every rep, and a summary at the end. The game saves how YOU throw each punch and uses it from then on. **DOWNLOAD MY SYNC DATA** saves a file you can send over for tuning.

Quick start without syncing: 📷 BODY CONTROL → START → guard up → left jab → right jab.

## What's in here
- `index.html` — the whole game (one file).
- `vendor/mediapipe-pose/` — Google's on-device body tracker (Apache-2.0), so nothing is fetched from another site. If this folder is missing, the game falls back to the same tracker from the jsDelivr CDN.
- Camera frames are processed on your device and never uploaded.

## v2.5 — feet, Body Camp, feel tuning
- Feet from your body (when your knees and ankles are in the picture):
  - lengthen your stance = rear foot scoots back (A);
  - bring your right foot up = B;
  - turn clockwise on your planted left foot = pivot (X);
  - turn counter-clockwise on your planted right foot = pivot (Y);
  - put the other foot in front = switch stance.
  A controller's A/B/X/Y still work too. Squaring back up to the camera is never counted as a pivot.
- Training Camp turns into **Body Camp** when body control is on. Its cues: guard, jab, hook, uppercut, body shot, overhand, feint, leave it out, slip, duck, lean back, hip power, clinch, one-hand release, plus feet if they're in view.
- Feel settings in the BODY panel:
  - REACH: how far your punches carry;
  - TRIGGER: easy / normal / firm — how hard you have to throw;
  - FEEL: smooth / normal / snappy;
  - LAB: a live readout of what the tracker sees, with frame timing.

## v2.6 — any camera angle, more natural arms
- Film yourself however you train: phone in front, or off to the side like your bag videos (portrait is fine). The two calibration punches tell the game which way you face, and "forward" follows your hips as you move around.
- Tuned on real bag-work footage: jabs, crosses and hooks read correctly from a side-on, tilted phone.
- Arms: the shoulder rolls up and forward on long punches, the elbow line is steadier, held guards stay calm, and fast hands stay instant.

## v2.7 — Sweet Science
- **Damage:**
  - Clean head shots swell the side they land on; hard ones can open cuts, and blood runs into that eye. Your screen closes on that side, and shots from the blind side land harder.
  - Straights hurt the nose; uppercuts hurt the jaw and can knock the mouthpiece out.
- **Body shots:**
  - Lead-hand hook to the body = liver shot: a beat later the legs can fold.
  - Straight to the body = solar plexus: the wind goes out.
- **Ring craft:**
  - Rolling with a hook takes the sting out.
  - A pull-counter straight lands harder, and so does a punch your opponent walks onto.
  - Doubled and tripled jabs land a little heavier.
  - Overhands to the skull and body shots into an elbow can hurt your hand.
- **Between rounds:** 60 s on the stool. Spend it on Enswell, adrenaline, Vaseline, ice, breathing or the mouthpiece, or throw in the towel.
- **Officials:** a bad cut brings the doctor (and can stop the fight). Open scoring is announced after rounds 4 and 8, and a 10-second clapper sounds near the end of each round.
- **RULES** (menu): Modern 10 oz · 1920s 5 oz horsehair · Bare knuckle.

## v2.8 — Body Sync (the game learns you)
- **Body Sync tutorial** (menu card, or BODY panel → BODY SYNC): 18 short steps, 3 reps per punch per side, with a demo and a coaching tip for each. It records your own punch paths and classifies your punches against them first (falls back to the general boxing rules if you haven't synced).
- **Your trigger speed and reach** come from your real reps, so soft-but-real punches register and shadow-flinches don't.
- **Guard, per hand:** face guard ■ vs body guard ▼, shown on the BODY chip (e.g. `L■ R▼`) and in the game.
- **Stance from your feet**, both ways: put the other foot in front and the fighter switches orthodox ⇄ southpaw. Sync learns both of your stances (and your hip angle in each).
- **Lower latency:** the tracker runs on every new camera frame the moment it exists (no waiting for the screen refresh), MediaPipe's own smoothing is off (our filter is lighter on the arms), and the glove follows your hand with a short look-ahead. In tests the game glove starts moving one camera frame after your hand does.
- **Direct mapping table** in the BODY panel: every body movement and the game action it triggers.

## v2.9 — Guard styles + signature moves
**Guard styles** (each one really moves the hands, so the arms block different shots, plus the craft that goes with it):
- **Peek-a-Boo** (Cus D'Amato): gloves tight on the cheekbones, elbows on the ribs. Faster head movement, every slip loads a counter, elbows eat body hooks. Weakness: uppercuts split it.
- **Philly Shell** (George Benton): lead arm across the belly, rear glove on the chin. Straights and hooks on the lead side roll off the shoulder (−75%) and open a counter. Weakness: hooks over the rear side.
- **Long Guard** (George Foreman): lead arm out, open glove in his face. Smothers straights. Weakness: the body.
- **Cross-Arm** (Archie Moore): forearms stacked. Straights die on the arms and you get stamina back inside it. Weakness: uppercuts up the middle.
- How to pick one: **camera** — just put your hands in that shell (Body Sync now learns your version of all four). **Controller** — hold both triggers + click L3. **Keyboard** — V. **Menu** — the GUARD pill sets your default.
- Every opponent fights from a shell (Graham = Cross-Arm, Pop Grease = Long Guard, Skillet = Peek-a-Boo, Savannah AI = Philly), and the AI reads yours and goes where it's open.

**Signature moves** — no hotkeys; you earn them by doing the real thing (camera, controller or AI):
- **Check hook** (Mayweather): lead hook while you pivot, or as he walks in. +35%, knocks him off balance.
- **On the angle** (Lomachenko): land while he isn't square to you. +20%.
- **Dempsey roll**: hook thrown out of a roll / from the side your head just weaved to. +30%.
- **Sugar Ray symphony**: alternating hands landing in rhythm; from the 3rd shot each hits harder, the 5th rocks him.
- **Rope-a-dope** (Ali): back on the ropes with your guard up, the ropes soak 40% and every shot costs him stamina; after 3, your rear straight off the ropes hits +50%.

## v3.0 — The corner + footwork that actually works
**Footwork (camera):** the camera stepping code had a bug that made it do nothing — fixed. Now your steps ARE the fighter's steps: step in, he steps in; stop, he stops; step sideways, he moves sideways — in your own body's directions whatever angle the phone sees you from. A big step held keeps pressing that way. A quick hip turn is a pivot even when your feet are out of the picture.
**Pivots (all controls):** a press is a real pivot step — about 70° around your front foot in a quarter second — and he loses you for a beat, so you're on his flank (ON THE ANGLE: +20%). Holding X/Y keeps turning after the step.
**Punch angles:** AIM in the BODY panel. ASSIST (default) bends the end of your real punch onto his head/body so camera angle and tracking error don't send it wide; STRONG bends more; RAW is pure 1:1.
**THE CORNER — 10 seconds, its own mini-game:** close-up of your fighter's face.
- Vaseline: dig your finger in the jar (top-down; the jelly grooves where you drag), smear his brows and cheekbones exactly how you do it. Scored on coverage; grease in his eye blurs it next round.
- Water bottle to his mouth (a sip, not a flood) · bucket under his mouth so he spits (rinses the mouthpiece) · enswell to rub down a swelling.
- TALK: hold the mic and tell him what you saw. "He keeps hitting you with that left jab — slip and roll left more, you got this" → +3 agility, +3 chin and a read on his jab (it lands 20% softer next round). Generic talk gets less, insults cost focus. Works in Chrome/Edge/Safari with mic permission (open the GitHub Pages link, not the claude.ai preview). No mic → type it or tap a line.
- Controller: QUICK GREASE · SIP · SPIT · lines · STAND UP.

## v3.1 — Balance engine (real stance physics)
Every fighter now stands on two real feet, every frame:
- **Base of support** = the two planted feet. A foot in the middle of a real step, a switch or a pivot isn't base — you're on one foot.
- **Centre of mass** = hips + chest + head, plus the lean the game adds (pulling back loads the rear foot ~75%, a rear-hand power shot drives it over the lead foot).
- **Extrapolated centre of mass** (Hof 2005): COM + unplanned momentum / √(g/leg length). Walking where you meant to go doesn't count; a missed power shot, a punch that moves you or a bad pivot does. If it leaves your base and no foot can step in time → **stumble** (can't punch, open to counters).
- **Weight distribution** (the dot on the new balance meter under your bars: REAR ↔ LEAD; green solid, amber narrow, red off-balance/one foot/switching).
- **Pivots are a skill now.** You turn on the ball of a LOADED foot: weight on the lead foot (after a jab or cross) = clean lead-foot pivot; weight back, mid power-cross on the wrong foot, moving the other way, tired legs, hurt, feet crossed = sloppy or you trip. Lead hook + lead-foot pivot is the check hook — it helps. Clean pivots move you ~0.5 m and 30–40° off his line; your Balance + Agility make you consistent, and clean reps grow them.
- **Switch stance actually works**: R3 on the pad, B on the keyboard, A+B still works, camera = switch your feet (or, with feet out of shot and a bladed stance, your hips). Stick forward = step through (moves you in), back = drop step (moves you out), neutral = shuffle. The stance flips when the feet pass — that moment you're on one foot, and a shot lands 25% harder and moves you (CAUGHT SWITCHING).
- **Turning needs feet**: small turns are the upper body; big ones need a foot turn after a reaction delay — so after a clean pivot he really is off-line for a beat (and so are you after his).
- AI fighters use it too: they pivot when their weight is right, off the ropes, and they punish your stumbles.

Sources for the model: Hof, "The condition for dynamic stability" (J Biomech 2005) — [pdf](https://braceworks.ca/wp-content/uploads/2016/05/hof-condition-for-dynamic-stability.pdf); Curtze et al., "Notes on the margin of stability" (2023) — [preprint](https://cris.maastrichtuniversity.nl/files/177130543/Notes_on_the_margin_of_stability_2023_Curtze_Buurke_McCrum_Preprint_v2.pdf); stance & weight: [ExpertBoxing — the perfect stance](https://expertboxing.com/the-perfect-boxing-stance), [3 axes of boxing](https://expertboxing.com/the-3-axes-of-boxing), [2-legged punching](https://expertboxing.com/power-punching-secrets-part-1-2-legged-punching).
