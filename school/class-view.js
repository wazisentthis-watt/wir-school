/* Generic class renderer: WIRSchool.ui.classRoom(el, classId) — lessons with source tags + quiz with auto-grading. PROPOSAL / demo. */
(function(){var S=window.WIRSchool;function e(s){return String(s).replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';'})}
var TAG={observed:'OBSERVED',experimental:'EXPERIMENTAL',simulated:'SIMULATED',hypothetical:'HYPOTHETICAL',fictional:'FICTIONAL'};
S.ui.classRoom=function(el,id){var c=S.getClass(id);if(!c){el.textContent='Class not found';return}
 var fm={};(c.facts||[]).forEach(function(f){fm[f.id]=f});
 var h='<div class="wir-panel" data-class-id="'+e(id)+'"><h2>'+e(c.title)+' <small class="wir-label">'+e(c.label||'PROPOSAL / demo')+'</small></h2>';
 if(!c.lessons.length&&!c.quizzes.length)h+='<p class="wir-note">Content coming from AMU. Lessons and quizzes will appear here once dropped into this class\'s JSON.</p>';
 c.lessons.forEach(function(l){h+='<details class="wir-lesson" open><summary>'+e(l.title)+'</summary><p>'+e(l.body)+'</p><ul>'+l.factIds.map(function(fid){var f=fm[fid],s=f.src&&c.sources[f.src];
   return '<li data-class="'+f.data_class+'"><span class="wir-tag wir-'+f.data_class+'">'+TAG[f.data_class]+'</span> <span class="wir-sq">source_quality: '+e(f.source_quality)+'</span><br>'+e(f.text)+(s?' <cite><a href="'+s.u+'" target="_blank" rel="noopener noreferrer">'+e(s.c)+'</a></cite>':'')+'</li>'}).join('')+'</ul></details>'});
 c.quizzes.forEach(function(q){h+='<form class="wir-quiz" data-q="'+q.id+'"><h3>'+e(q.title)+'</h3>'+q.questions.map(function(qq,i){return '<fieldset><legend>'+(i+1)+'. '+e(qq.q)+'</legend>'+qq.choices.map(function(ch,j){return '<label><input type="radio" name="q'+i+'" value="'+j+'"> '+e(ch)+'</label>'}).join('')+'<div class="wir-fb"></div></fieldset>'}).join('')+'<button type="submit">Turn in</button><div class="wir-result"></div></form>'});
 el.innerHTML=h+'</div>';
 el.querySelectorAll('.wir-quiz').forEach(function(f){f.onsubmit=function(ev){ev.preventDefault();var q=c.quizzes.find(function(x){return x.id===f.dataset.q});
  var ans=q.questions.map(function(_,i){var r=f.querySelector('input[name=q'+i+']:checked');return r?+r.value:-1});
  var a=S.gradeQuiz(id,q.id,ans);f.querySelectorAll('.wir-fb').forEach(function(d,i){d.textContent=(a.feedback[i].ok?'✔ ':'✘ ')+a.feedback[i].explain;d.className='wir-fb '+(a.feedback[i].ok?'ok':'no')});
  f.querySelector('.wir-result').textContent='Score: '+a.score+'/'+a.max+' ('+a.pct+'%) — '+S.letter(a.pct)+'. Saved to your transcript.'}})};})();
