# AR Safe Lab: assets and licenses

All bundled art is **CC0 1.0 (public domain)**. No Nexus Mods assets are used: their pages don't grant reuse rights, so we treat them as off-limits.

| File(s) | Used for | Source | Author | License |
|---|---|---|---|---|
| assets/kenney_flame_02.png, kenney_flame_04.png | fire jet, ember ball, burner, flame tests | Particle Pack 1.1, https://kenney.nl/assets/particle-pack | Kenney (kenney.nl) | CC0 1.0 |
| assets/kenney_smoke_03.png, kenney_smoke_07.png | smoke, MgO smoke, earth dust | same pack | Kenney | CC0 1.0 |
| assets/kenney_spark_01.png, kenney_light_01.png | sparks, glow cores (Mg, Na/K balls) | same pack | Kenney | CC0 1.0 |
| assets/kenney_twirl_02.png | reserved, not used yet | same pack | Kenney | CC0 1.0 |
| assets/kenney_flame_01, smoke_01, spark_04, spark_05, flare_01, trace_01, circle_05, dirt_02, magic_02 (.png) | bundled for future effects | same pack | Kenney | CC0 1.0 |
| assets/polyhaven_rock_face_03_diff_512.jpg, polyhaven_rock_face_03_nor_gl_512.jpg | earth rocks (color + normal map) | https://polyhaven.com/a/rock_face_03 (1k, resized to 512) | Poly Haven | CC0 1.0 |
| assets/polyhaven_wood_table_001_512.jpg | not used in the current UI (was the old tile background) | https://polyhaven.com/a/wood_table_001 | Poly Haven | CC0 1.0 |
| assets/ambientcg_paper001_256.jpg | paper sheet that chars in the chem lab | https://ambientcg.com/view?id=Paper001 (1K-JPG color, resized) | ambientCG (Lennart Demes) | CC0 1.0 |

The rock meshes are generated in code (displaced icosahedrons). The water is a metaball shader that refracts the camera image. Neither uses third-party models.

Runtime libraries come from a CDN: three.js r160 (MIT, incl. EffectComposer/UnrealBloomPass) and MediaPipe Tasks Vision 0.10.14 with the hand_landmarker model (Apache 2.0).
