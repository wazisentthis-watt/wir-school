# WIR School — Campus module (3D map + AR only; free, no backend)
Entry: `school/campus/index.html`. Login, classes, grades = Domawaye's system (not here).
API: `campus.registerDoor({id,name,url,building,placeholder})` → adds a building (8 slots).
Event: `window.addEventListener('wir-campus-door', e => e.detail /* {id,url,name,building} */)`; call `e.preventDefault()` to stop auto-navigation to url. Ready: `wir-campus-ready`.
URL params: `?door=id|Name|url` (repeatable), `?empty=1` (no example doors), `?follow=0` (never navigate).
Example doors (Science/Math/Reading/WIR Lore) are PLACEHOLDER; WIR Lore is not canon.
AR: WebXR immersive-ar (Android Chrome + ARCore); otherwise a fallback message. three.js (MIT) reused from ../../connected.
