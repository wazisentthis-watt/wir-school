/* WIR Gradebook v1 — PROPOSAL / demo. Offline, localStorage only, no network, no analytics.
   Only personal data stored: a student display name + avatar emoji. */
(function(){
'use strict';
var KEY='wir_school_v1', VER=1, AVATARS=['🐺','🦓','🦅','🐘','🦒','🐆','🦛','🐢','🌱','🥕','🌊','⭐'];
var classes={}; var listeners=[];
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{profiles:{},current:null}}catch(e){return {profiles:{},current:null}}}
var db=load();
function save(){localStorage.setItem(KEY,JSON.stringify(db));emit('change',{});}
function emit(t,d){listeners.forEach(function(f){try{f(t,d)}catch(e){}});
  try{if(window.parent!==window)window.parent.postMessage({wir:'school',type:t,data:d},'*')}catch(e){}}
function uid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function cur(){return db.current&&db.profiles[db.current]||null}
function clean(n){return String(n||'').replace(/[<>&"']/g,'').trim().slice(0,24)}
function letter(p){return p>=90?'A':p>=80?'B':p>=70?'C':p>=60?'D':'F'}
function fnv(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
function b64e(s){return btoa(unescape(encodeURIComponent(s)))}
function b64d(s){return decodeURIComponent(escape(atob(s)))}
var API={
  version:VER, avatars:AVATARS, letter:letter,
  on:function(f){listeners.push(f)},
  // profiles
  listProfiles:function(){return Object.values(db.profiles).map(function(p){return {id:p.id,name:p.name,avatar:p.avatar}})},
  createProfile:function(name,avatar){name=clean(name);if(!name)throw Error('name required');
    var p={id:uid(),name:name,avatar:AVATARS.indexOf(avatar)>=0?avatar:AVATARS[0],created:new Date().toISOString(),attempts:[],attendance:[]};
    db.profiles[p.id]=p;db.current=p.id;API.checkIn();save();emit('login',{id:p.id});return p.id},
  login:function(id){if(!db.profiles[id])return false;db.current=id;API.checkIn();save();emit('login',{id:id});return true},
  logout:function(){db.current=null;save();emit('logout',{})},
  deleteProfile:function(id){delete db.profiles[id];if(db.current===id)db.current=null;save()},
  current:function(){var p=cur();return p?{id:p.id,name:p.name,avatar:p.avatar}:null},
  // attendance
  checkIn:function(){var p=cur();if(!p)return;var t=today();if(p.attendance.indexOf(t)<0)p.attendance.push(t)},
  streak:function(){var p=cur();if(!p)return 0;var s=new Set(p.attendance),n=0,d=new Date();
    while(s.has(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))){n++;d.setDate(d.getDate()-1)}return n},
  // classes
  registerClass:function(def){if(!def||!def.id)throw Error('class id required');classes[def.id]=def;emit('classRegistered',{id:def.id})},
  classes:function(){return Object.values(classes)},
  getClass:function(id){return classes[id]},
  // grading
  recordAttempt:function(classId,itemId,score,max,meta){var p=cur();if(!p)throw Error('not logged in');
    var a={classId:classId,itemId:itemId,score:+score,max:+max,pct:max?Math.round(1000*score/max)/10:0,at:new Date().toISOString(),meta:meta||{}};
    p.attempts.push(a);save();emit('graded',a);return a},
  gradeQuiz:function(classId,quizId,answers){var c=classes[classId];var q=c&&(c.quizzes||[]).find(function(x){return x.id===quizId});
    if(!q)throw Error('quiz not found');var s=0,fb=[];
    q.questions.forEach(function(qq,i){var ok=answers[i]===qq.answer;if(ok)s++;fb.push({ok:ok,explain:qq.explain||''})});
    var a=API.recordAttempt(classId,quizId,s,q.questions.length,{feedback:fb});a.feedback=fb;return a},
  transcript:function(){var p=cur();return p?p.attempts.slice():[]},
  reportCard:function(){var p=cur();if(!p)return [];var by={};
    p.attempts.forEach(function(a){(by[a.classId]=by[a.classId]||{})[a.itemId]=Math.max((by[a.classId][a.itemId]||0),a.pct)}); // best attempt per item
    return Object.keys(Object.assign({},classes,by)).map(function(id){var it=by[id];var v=it?Object.values(it):[];
      var pct=v.length?Math.round(10*v.reduce(function(x,y){return x+y},0)/v.length)/10:null;
      return {classId:id,title:(classes[id]||{}).title||id,pct:pct,letter:pct==null?'—':letter(pct),items:v.length}})},
  // progress code
  exportCode:function(){var p=cur();if(!p)throw Error('not logged in');var body=JSON.stringify({v:VER,p:p});return 'WIR1.'+fnv(body)+'.'+b64e(body)},
  importCode:function(code){var m=/^WIR1\.([0-9a-f]{8})\.(.+)$/.exec(String(code).trim().replace(/\s+/g,''));if(!m)throw Error('Not a WIR progress code');
    var body;try{body=b64d(m[2])}catch(e){throw Error('Code is damaged')}if(fnv(body)!==m[1])throw Error('Checksum failed — code was changed or cut off');
    var o=JSON.parse(body),p=o.p;if(!p||!p.id||!Array.isArray(p.attempts))throw Error('Invalid profile');
    p.name=clean(p.name);p.attempts=p.attempts.filter(function(a){return a&&typeof a.classId==='string'&&isFinite(a.score)});p.attendance=(p.attendance||[]).filter(function(d){return /^\d{4}-\d\d-\d\d$/.test(d)});
    var ex=db.profiles[p.id];if(ex){var k=new Set(ex.attempts.map(function(a){return a.at+a.itemId}));p.attempts.forEach(function(a){if(!k.has(a.at+a.itemId))ex.attempts.push(a)});
      ex.attendance=Array.from(new Set(ex.attendance.concat(p.attendance))).sort()}else db.profiles[p.id]=p;
    db.current=p.id;save();emit('login',{id:p.id});return p.id},
  // UI panels (render into any element)
  ui:{}
};
function h(t){var d=document.createElement('div');d.innerHTML=t;return d}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';'})}
API.ui.login=function(el){var ps=API.listProfiles();el.innerHTML='<div class="wir-panel"><h2>Sign in to WIR School <small>(PROPOSAL / demo)</small></h2>'+
  '<p class="wir-note">Only your name + avatar are saved, on this device. Grades stay here unless you use a progress code. No passwords, no internet.</p>'+
  (ps.length?'<h3>Choose profile</h3>'+ps.map(function(p){return '<button class="wir-prof" data-id="'+p.id+'">'+p.avatar+' '+esc(p.name)+'</button>'}).join(' '):'')+
  '<h3>New student</h3><input id="wirName" maxlength="24" placeholder="First name or nickname"><div id="wirAv">'+AVATARS.map(function(a,i){return '<button class="wir-av'+(i?'':' sel')+'" data-a="'+a+'">'+a+'</button>'}).join('')+'</div>'+
  '<button id="wirCreate">Create &amp; enter</button><h3>Have a progress code?</h3><textarea id="wirCodeIn" rows="2" placeholder="WIR1..."></textarea><button id="wirImport">Import</button><div id="wirMsg"></div></div>';
  var av=AVATARS[0];
  el.querySelectorAll('.wir-av').forEach(function(b){b.onclick=function(){av=b.dataset.a;el.querySelectorAll('.wir-av').forEach(function(x){x.classList.remove('sel')});b.classList.add('sel')}});
  el.querySelectorAll('.wir-prof').forEach(function(b){b.onclick=function(){API.login(b.dataset.id)}});
  el.querySelector('#wirCreate').onclick=function(){try{API.createProfile(el.querySelector('#wirName').value,av)}catch(e){el.querySelector('#wirMsg').textContent=e.message}};
  el.querySelector('#wirImport').onclick=function(){try{API.importCode(el.querySelector('#wirCodeIn').value)}catch(e){el.querySelector('#wirMsg').textContent=e.message}}};
API.ui.reportCard=function(el){var p=API.current();el.innerHTML='<div class="wir-panel"><p class="wir-note"><b>Practice grades saved on this device only, not official.</b></p><h2>Report Card — '+p.avatar+' '+esc(p.name)+'</h2><p>Attendance streak: <b id="wirStreak">'+API.streak()+'</b> day(s)</p><table class="wir-t"><tr><th>Class</th><th>%</th><th>Grade</th><th>Graded items</th></tr>'+
  API.reportCard().map(function(r){return '<tr data-class="'+esc(r.classId)+'"><td>'+esc(r.title)+'</td><td>'+(r.pct==null?'—':r.pct+'%')+'</td><td class="wir-letter">'+r.letter+'</td><td>'+r.items+'</td></tr>'}).join('')+'</table><p class="wir-note">Best attempt per item counts. Demo grading scale A≥90 B≥80 C≥70 D≥60.</p></div>'};
API.ui.transcript=function(el){el.innerHTML='<div class="wir-panel"><h2>Transcript</h2><table class="wir-t"><tr><th>Date/time</th><th>Class</th><th>Item</th><th>Score</th></tr>'+
  API.transcript().reverse().map(function(a){return '<tr><td>'+new Date(a.at).toLocaleString()+'</td><td>'+esc(a.classId)+'</td><td>'+esc(a.itemId)+'</td><td>'+a.score+'/'+a.max+' ('+a.pct+'%)</td></tr>'}).join('')+'</table></div>'};
API.ui.progressCode=function(el){var c=API.exportCode();el.innerHTML='<div class="wir-panel"><h2>Progress code</h2><p class="wir-note">Copy this to move your profile + grades to another device. Anyone with the code can load your grades.</p><textarea id="wirCodeOut" rows="4" readonly>'+c+'</textarea><button id="wirCopy">Copy</button></div>';
  el.querySelector('#wirCopy').onclick=function(){var t=el.querySelector('#wirCodeOut');t.select();try{navigator.clipboard.writeText(t.value)}catch(e){document.execCommand('copy')}}};
// postMessage bridge for an iframe'd campus (Phatom)
window.addEventListener('message',function(ev){var m=ev.data;if(!m||m.wir!=='school-call'||typeof API[m.method]!=='function'||m.method==='on')return;
  var r,err=null;try{r=API[m.method].apply(null,m.args||[])}catch(e){err=e.message}
  try{ev.source&&ev.source.postMessage({wir:'school-result',id:m.id,result:r,error:err},'*')}catch(e){}});
window.WIRSchool=API;
})();
