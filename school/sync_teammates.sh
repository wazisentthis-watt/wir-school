#!/bin/sh
# Re-copy teammate modules and re-apply Phatom's report-card note.
cd "$(dirname "$0")"
cp /workspace/domowaye/school/wir-gradebook.js /workspace/domowaye/school/class-view.js /workspace/domowaye/school/class-painted-dogs.js .
cp /workspace/wir-school/classes/amu/class-amu.js .
grep -q "not official" wir-gradebook.js || python3 - <<'P'
g=open('wir-gradebook.js').read()
g=g.replace("""el.innerHTML='<div class="wir-panel"><h2>Report Card — '""","""el.innerHTML='<div class="wir-panel"><p class="wir-note"><b>Practice grades saved on this device only, not official.</b></p><h2>Report Card — '""",1)
open('wir-gradebook.js','w').write(g)
P
for f in *.js; do node --check $f || echo BAD $f; done
grep -c "not official" wir-gradebook.js
