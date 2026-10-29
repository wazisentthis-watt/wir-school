// Runner. `node tests/*.js` expands to this file first (alphabetical) and runs it; it runs every other test file in this folder.
import {spawnSync} from 'child_process'; import fs from 'fs';
const dir=new URL('.',import.meta.url).pathname; const files=fs.readdirSync(dir).filter(f=>/\.test\.js$/.test(f)&&f!=='all.test.js').sort(); let bad=0,total=0;
for(const f of files){ const r=spawnSync(process.execPath,[dir+f],{encoding:'utf8'}); const out=r.stdout+r.stderr; process.stdout.write(`\n=== ${f} ===\n`+out);
  const m=out.match(/(\d+) passed, (\d+) failed/); if(!m||r.status!==0){ bad++; } else total+=+m[1]; }
console.log(`\nALL: ${files.length} files, ${total} checks passed, ${bad?bad+' FILE(S) FAILED':'0 failed'}`); process.exit(bad?1:0);
