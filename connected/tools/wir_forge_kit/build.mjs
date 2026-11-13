// Builds forge.html (standalone, with the doctype) and wir_forge.html (the Claude artifact body) from page_src.html.
// Usage: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const order = ['boxer', 'cast_iron', 'octopus', 'ember_fox'];
const examples = {};
for (const k of order) examples[k] = JSON.parse(read(`examples/${k}.json`));
const prompt = read('PROMPT.md');

let out = read('page_src.html');
const put = (token, text) => {
  if (out.split(token).length !== 2) throw new Error('token must appear exactly once: ' + token);
  out = out.replace(token, () => text); // a function, so "$" in the engine code is copied as-is
};
put('/*__FORGE__*/', read('forge.js'));
put('/*__EXAMPLES__*/', JSON.stringify(examples));
put('/*__PROMPT__*/', JSON.stringify(prompt));

fs.writeFileSync(path.join(dir, 'wir_forge.html'), out);
fs.writeFileSync(path.join(dir, 'forge.html'),
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + out + '</body></html>');
console.log('built forge.html and wir_forge.html —', out.length.toLocaleString(), 'characters');
