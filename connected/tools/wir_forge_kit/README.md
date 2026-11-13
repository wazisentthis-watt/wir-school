# WIR Forge — picture or idea → rigged 3D character

The same technique that builds the NGB: The Glazed Ring fighters, opened up so any AI can design models.

## Files
- `forge.html` — the whole tool in one file. Drop in a picture or describe an idea → recipe → live 3D → download. Works on its own; inside the Claude viewer FORGE IT asks Claude directly, with your picture.
- `forge.js` — the engine (ES module, three.js r160). `forge(recipe, THREE)` → `{ group, skeleton, bones, meshes, stats, errors }`; `validate(recipe)` → list of problems to send back to the AI; `animate(model, t, mode)` → preview motion (`guard`, `walk`, `wave`, `rest`).
- `PROMPT.md` — the instruction sheet. Paste it into any AI (Claude, ChatGPT, Gemini). Add `IDEA: …` and/or attach a picture, and it returns a recipe. It has a PICTURE section: read the silhouette, proportions and colours from the image.
- `examples/*.json` — four recipes: a Cocoa-Ramen boxer, a cast-iron brawler with glowing cracks, an octopus (8 bone-chain tentacles), a quadruped ember fox.
- `page_src.html` and `build.mjs` — the page source, and the script that builds `forge.html` from it (`node build.mjs`).

## Pictures
- Drop, paste or choose a picture (PNG, JPG, WebP or GIF). The page reads its colours itself, so the palette is exact, and puts it in the brief as `PALETTE FROM THE PICTURE`.
- In the Claude viewer the picture goes to Claude with the prompt. Elsewhere, press COPY AI PROMPT and attach the same picture to the chat.

## Downloads
- **3D model (.glb):** a direct download. In the Claude viewer it arrives as `name_model.zip`, holding `name.glb` and `name.recipe.json`, because the viewer's save list doesn't include .glb. Unzip it.
- **Picture (.png):** a snapshot of the stage.
- **Recipe (.json):** the recipe text, ready to edit or paste back in.

## The loop an AI runs
1. `recipe = AI(PROMPT + "\n\n" + "IDEA: " + idea + (picture ? "\nPALETTE FROM THE PICTURE: …" : ""))`
2. `errs = validate(recipe)` → if any, send them back: "fix these, return the whole JSON"
3. `model = forge(recipe, THREE)` → render, or export with `GLTFExporter` (`binary: true`) to `.glb`

Humanoids use Mixamo bone names, so Mixamo/mocap clips retarget onto them (NGB's `tools/retarget.mjs` does world-space rest-delta retargeting).
