/* AR Safe Lab -> WIR School gradebook bridge (PROPOSAL / demo, not canon).
   Matches /workspace/domowaye/school/GRADEBOOK_API.md:
   - same page: window.WIRSchool.recordAttempt(classId,itemId,score,max,meta)
   - iframe:    parent.postMessage({wir:'school-call',id,method:'recordAttempt',args:[...]})
   Every payload is labeled data_class 'simulated'. No network calls. Silent if no gradebook.
   Only observes window.labEvent; never touches physics or feel. */
(function(root){
  var CLASS_ID='sci-ar-safe-lab';
  var TEACHERS={flow:'Sefa of the Drifting Reef',fire:'Kaen of the Ember Hall',water:'Mira of the Still Lake',
    wrist:'Oru of the Quiet Wrist',orb:'Lio of the Steady Palm',air:'Tavi of the High Wind',earth:'Bram of the Deep Stone'};
  var TABLE={'table:set':'Set the table plane','table:place':'Place a pinch on the table','table:push':'Push an item along the table'};
  var sent={}, seq=0;
  function payload(ev){
    var m;
    if((m=/^train:(\w+)$/.exec(ev))&&TEACHERS[m[1]]) return {itemId:'lesson-'+m[1],title:'Lesson: '+TEACHERS[m[1]],kind:'lesson'};
    if(TABLE[ev]) return {itemId:'table-'+ev.slice(6),title:'Table mode: '+TABLE[ev],kind:'table-task'};
    return null; }
  function build(ev){ var p=payload(ev); if(!p) return null;
    return {classId:CLASS_ID,itemId:p.itemId,score:1,max:1,meta:{title:p.title,kind:p.kind,event:ev,
      source:'AR Safe Lab',data_class:'simulated',label:'Simulated',note:'Simulated AR lab result, not an observed measurement'}}; }
  function ensureClass(S){ try{ if(!S.getClass(CLASS_ID)) S.registerClass({id:CLASS_ID,wing:'science',room:'AR Safe Lab',
    title:'AR Safe Lab (Simulated)',label:'PROPOSAL / demo',sources:{},facts:[],lessons:[],quizzes:[]}); }catch(e){} }
  function report(ev){
    var g=build(ev); if(!g||sent[g.itemId]) return null; // once per session per item
    var args=[g.classId,g.itemId,g.score,g.max,g.meta], ok=false;
    try{ var S=root.WIRSchool; if(S&&typeof S.recordAttempt==='function'){ ensureClass(S); S.recordAttempt.apply(S,args); ok=true; } }catch(e){}
    if(!ok){ try{ if(root.parent&&root.parent!==root){
      root.parent.postMessage({wir:'school-call',id:'arlab-'+(++seq),method:'recordAttempt',args:args},'*'); ok=true; } }catch(e){} }
    if(ok) sent[g.itemId]=1;
    return ok?g:null; }
  function install(){ var prev=root.labEvent;
    root.labEvent=function(n){ try{ if(prev) prev(n); } finally { try{ report(n); }catch(e){} } }; }
  var api={CLASS_ID:CLASS_ID,build:build,report:report,install:install,_reset:function(){sent={};}};
  root.ARLabGrade=api; if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof document!=='undefined') install();
})(typeof window!=='undefined'?window:globalThis);
