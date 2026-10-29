# Bend stage checker (PROPOSAL / Simulated only)
Scores a kinetic-chain move (Gate -> Root -> Hips -> Torso -> Shoulders -> Hands -> calm Settle) from a time series of SIMULATED pose landmarks.
Aligned to AMU spec v0.2 (sec. 12). Weights order .45 / smooth .25 / timing .20 / hold .10. Order by each link's peak-speed time; speeds in shoulder-widths; gaps relative to chain span so slow movers are not penalized. Never scores force. Jump = score 0. Variants: full, seated, handsOnly; lead left/right/auto. All thresholds untested guesses. Not for live camera.
Run: `node --test tests/`

## Revisions 2026-10-28 (AMU, PROPOSAL, Simulated)
- Fixed +-150 ms tolerance is default; cfg.tolMode="relative" is opt-in. `node compare_tolerance.js` prints both on the same clips.
- Torso = shoulder-line angle (default) or hip-to-shoulder lean (cfg.torsoMode="lean"), not the midpoint.
- Over-rotation: soft cap at 60 deg shoulder turn (penalty up to 50%); full spin capped at 0.3 and flagged.
- Synthetic clips now have a separate torso stage (shoulder-line tilt). All thresholds untested guesses.

## 2026-10-28 evening: turn cap now 90 degrees (Coach ruling in RAMAZA room)
`turnSoftDeg` default is 90 (was 60). Past 90 the score is penalised by up to 500ver the next 30 degrees; full spins still cap at 0.3. 60 is still settable. Simulated / PROPOSAL; thresholds untested on real poses.
Note: with the cap at 90 (side-on), the soft over-rotation penalty is nearly unreachable on foreshortening alone; anything past side-on reads as a flip and is capped as a spin. Use cfg {turnSoftDeg: 60} to get the soft zone back.

## Correction 2026-10-28 7:50 PM: default turn cap is back at 60 degrees
Coach said 90 only if the ladder is CCR-like; canon has no CCR movement ladder, so 90 is opt-in via cfg {turnSoftDeg: 90} until Coach confirms the ladder. (Ignore the earlier note that the default was 90.)
