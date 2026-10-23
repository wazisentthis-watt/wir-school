/* AMU wing classes for WIRSchool. PROPOSAL / demo, not canon. Story facts are FICTIONAL (WIR canon status in text); WIR Canon Bot + RB1 own locks. */
(function(){
var src={CODEX:{c:'AMU9 Codex v1.8',u:''},MS:{c:'AMU_WIR_Whole_Chat_Master_Summary',u:''}};
[{id:'amu-room-1',wing:'amu',room:'AMU Room 1',title:'Octo-Matrix 101: The Champion Tracks',label:'PROPOSAL / demo — FICTIONAL world data',sources:src,
 facts:[
  {id:'a1',text:'The AMU9 Codex v1.8 lists seven champion tracks, 01 to 07. The total count is a CONFLICT (Codex 7 vs Master Summary 8), so it is not graded.',src:'CODEX',data_class:'fictional',source_quality:'property master'},
  {id:'a2',text:'Tracks 01-07: Temperature Rex, Galaxy Rabbit, Flux Fly, DNA Burglar, Timetracker, Resonant Roar, Disco Display (ESTABLISHED in Codex).',src:'CODEX',data_class:'fictional',source_quality:'property master'},
  {id:'a3',text:'The Codex numbers Auto~Matrix as Track 09, the Paragon, not a champion. It has no Track 08, and why that slot is empty is OPEN for Coach.',src:'CODEX',data_class:'fictional',source_quality:'property master'},
  {id:'a4',text:'The total champion count is an OPEN conflict for Coach; other files list extra names. Not taught as fact.',src:'MS',data_class:'hypothetical',source_quality:'CONFLICT'}],
 lessons:[{id:'l1',title:'The seven tracks',body:'Meet the champions the Codex names, in order.',factIds:['a1','a2']},
  {id:'l2',title:'Track 09 and the open question',body:'Auto~Matrix is not a champion. How many champions there are is still Coach\'s call.',factIds:['a3','a4']}],
 quizzes:[{id:'q1',title:'Tracks check',questions:[
  {q:'Which is Track 01?',choices:['Galaxy Rabbit','Temperature Rex','Disco Display'],answer:1,explain:'Temperature Rex opens the Codex.'},
  {q:'In the Codex, what is Auto~Matrix?',choices:['Champion 08','Track 09, the Paragon','A villain'],answer:1,explain:'Track 09, Paragon, not a champion.'}]}]},
 {id:'amu-room-2',wing:'amu',room:'AMU Room 2',title:'Field Trip: The Groove Beneath the Pyramid',label:'PROPOSAL / demo — FICTIONAL story + RESEARCH',sources:src,
 facts:[
  {id:'b1',text:'AMU Episode 1 is The Groove Beneath the Pyramid (CURRENT); only a critique file exists, no titled script.',src:'MS',data_class:'fictional',source_quality:'master summary'},
  {id:'b2',text:'Episode 2 is Borrowed Flavor, Reality Route #001 (CURRENT).',src:'MS',data_class:'fictional',source_quality:'master summary'},
  {id:'b3',text:'The real Giza pyramids are in Egypt; real-world history is RESEARCH, not WIR canon.',src:'',data_class:'hypothetical',source_quality:'add real citation'}],
 lessons:[{id:'l1',title:'Episode map',body:'What the archive says about the first two AMU episodes.',factIds:['b1','b2']},
  {id:'l2',title:'Real place, story place',body:'Keep real history and WIR story apart.',factIds:['b3']}],
 quizzes:[{id:'q1',title:'Episode check',questions:[
  {q:'What is AMU Episode 1?',choices:['Hiatus Hive','The Groove Beneath the Pyramid','Borrowed Flavor'],answer:1,explain:'Ep1, per the Master Summary.'},
  {q:'Borrowed Flavor is which Reality Route?',choices:['#001','#027','#112'],answer:0,explain:'Reality Route #001.'},
  {q:'Real Giza history is labeled as…',choices:['WIR canon','Research'],answer:1,explain:'Real-world material is RESEARCH.'}]}]}
].forEach(function(c){WIRSchool.registerClass(c)});})();
