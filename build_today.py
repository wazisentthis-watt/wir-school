#!/usr/bin/env python3
"""Re-copy classes into site/classes and regenerate site/today.html. Rerun anytime."""
import os,shutil,json
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=os.path.join(R,"site")
src=os.path.join(R,"classes");dst=os.path.join(S,"classes")
shutil.copytree(src,dst,dirs_exist_ok=True)
C=[("RAMAZA","AMU","Code Sorcery","amu/2026-10-20.html"),("BMM","AMU","BMM B1 Steady Ground","amu/2026-10-20-bmm.html"),
("WIR Academy","WIR CANON BOT","Canon Lab","wir-canon-bot/2026-10-20.html"),("WIR Academy","Za'Ra","Scout School: Check the Score","zara/2026-10-20.html"),
("WIR Academy","Phatom","Game Physics: Momentum","phatom/2026-10-20.html"),("School of the Absurd","Oscar Absurd","School of the Absurd","oscar/2026-10-20.html")]
h=[];cur=None
for sc,t,n,p in C:
    if sc!=cur: h.append(f"<h2>{sc}</h2>");cur=sc
    if os.path.exists(os.path.join(dst,p)): h.append(f'<a class="d" data-t="{t}" href="classes/{p}">{n}<small>{t}</small><span></span></a>')
    else: h.append(f'<div class="d l">{n}<small>{t}: coming soon</small></div>')
html=f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WIR School: Today 2026-10-20</title>
<style>body{{font-family:system-ui,sans-serif;background:#10182b;color:#fff;max-width:520px;margin:auto;padding:16px}}.d{{display:block;background:#22305a;color:#fff;text-decoration:none;padding:18px;border-radius:14px;margin:10px 0;font-size:1.15rem;font-weight:700}}.d small{{display:block;font-weight:400;opacity:.7;font-size:.8rem}}.l{{opacity:.5}}.ok{{background:#1e6b4a}}h2{{font-size:.9rem;opacity:.8;margin-top:20px}}</style></head><body>
<a href="index.html" style="color:#9cf">← All days</a><h1>📅 Today's Classes: 2026-10-20</h1><p id="n"></p>
{''.join(h)}
<p style="opacity:.7;font-size:.8rem">Classes are PROPOSALS, not canon.</p>
<script>let B=[];try{{B=JSON.parse(localStorage.getItem("wirBricks"))||[]}}catch(e){{}}
const T=B.filter(b=>b&&b.date=="2026-10-20").map(b=>b.teacher+"|"+(b.class||"")+"|"+(b.school||""));let d=0;
document.querySelectorAll("a.d").forEach(a=>{{const t=a.dataset.t,nm=a.firstChild.textContent;const hit=T.some(x=>{{const[te,cl,sc]=x.split("|");return te.toLowerCase().includes(t.toLowerCase().split(" ")[0])&&(cl.includes(nm.split(":")[0].split(" ")[0])||sc.includes(nm.split(":")[0].split(" ")[0])||nm.includes(cl))}});if(hit){{a.classList.add("ok");a.lastChild.textContent=" ✅";d++}}}});
document.getElementById("n").textContent="Done: "+d+"/{len(C)}";</script></body></html>"""
open(os.path.join(S,"today.html"),"w").write(html)
ix=os.path.join(S,"index.html");s=open(ix).read()
if "today.html" not in s:
    s=s.replace('<a class="d" href="day1.html">','<a class="d" href="today.html" style="background:#ff9f1c;color:#000">📅 TODAY · 6 Classes (2026-10-20)</a>\n<a class="d" href="day1.html">',1);open(ix,"w").write(s)
print("ok")
