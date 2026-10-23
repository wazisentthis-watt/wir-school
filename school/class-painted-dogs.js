/* Science Wing Lab 1 — Painted Dogs & Heat. PROPOSAL / demo lesson. Not WIR canon.
   Values from /workspace/domowaye/waveweb/painted_dogs/RESEARCH_v0.md (2026-10-23).
   data_class uses the Directive's five labels (observed, experimental, simulated, hypothetical, fictional). source_quality is separate: primary / secondary / source needed. Secondhand or unchecked values are hypothetical until someone opens the original. */
(function(){
var SRC={
 W17:{c:'Woodroffe, Groom & McNutt 2017, J Anim Ecol 86:1329',u:'https://doi.org/10.1111/1365-2656.12719'},
 A13:{c:'Angulo et al. 2013, Front Zool 10:11',u:'https://doi.org/10.1186/1742-9994-10-11'},
 H16:{c:'Hubel et al. 2016, Nat Commun 7:11034',u:'https://doi.org/10.1038/ncomms11034'},
 R19:{c:'Rabaiotti & Woodroffe 2019, Oecologia 189:587',u:'https://doi.org/10.1007/s00442-018-04329-1'},
 IUCN:{c:'Woodroffe, Ginsberg & Macdonald 1997, IUCN Action Plan',u:'https://portals.iucn.org/library/efiles/documents/1997-052.pdf'}};
var facts=[
 {id:'pup_cool',text:'Botswana 1989–2000 (mean max temp while denning 26.8 °C): 51.4% of pups survived to 12 months (CI 47.1–55.7%).',src:'W17',data_class:'observed',source_quality:'primary'},
 {id:'pup_warm',text:'Botswana 2001–2012 (mean max 27.9 °C): 38.7% survived (CI 32.9–44.6%).',src:'W17',data_class:'observed',source_quality:'primary'},
 {id:'ibi',text:'Kenya (Laikipia): mean gap between litters 331 days; each +1 °C during denning added ~25 days.',src:'W17',data_class:'observed',source_quality:'primary'},
 {id:'night',text:'In heat, dogs shift some activity to night, but barely while denning, and mostly only on moonlit nights.',src:'R19',data_class:'observed',source_quality:'primary'},
 {id:'pack_best',text:'Hwange: pup survival was highest at a pack size of ~11.76 dogs.',src:'A13',data_class:'observed',source_quality:'primary'},
 {id:'pack_min',text:'Hwange: packs grew only at 4 or more dogs.',src:'A13',data_class:'observed',source_quality:'primary'},
 {id:'hunt',text:'Okavango: 2.43 chases per dog per day; 0.155 kills per chase.',src:'H16',data_class:'observed',source_quality:'primary'},
 {id:'impala',text:'Okavango: over 80% of kills were impala (~15 impala/km²).',src:'H16',data_class:'hypothetical',source_quality:'secondary'},
 {id:'lions',text:'Lions caused 89% of pup deaths attributed to predators (17/19, multi-site).',src:'IUCN',data_class:'hypothetical',source_quality:'secondary'},
 {id:'litter',text:'Average litter size: not yet verified.',src:null,data_class:'hypothetical',source_quality:'source needed'}];
var cls={id:'sci-painted-dogs',wing:'science',room:'Lab 1',title:'Science Lab 1: Painted Dogs & Heat',label:'PROPOSAL / demo',
 sources:SRC,facts:facts,
 lessons:[
  {id:'L1',title:'Meet the painted dog (Lycaon pictus)',body:'Painted dogs (African wild dogs) live and hunt in packs. Pups stay at a den for their first months while the pack hunts and brings food back.',factIds:['hunt','impala','pack_min']},
  {id:'L2',title:'Heat during denning',body:'Researchers compared two 12-year periods in Botswana. Denning seasons got about 1.1 °C hotter, and fewer pups survived. Heat cuts daytime hunting, and dogs at a den can\'t fully make it up at night.',factIds:['pup_cool','pup_warm','ibi','night']},
  {id:'L3',title:'Pack size and pups',body:'More helpers means more food and guards for pups, up to a point.',factIds:['pack_best','pack_min','lions','litter']},
  {id:'L4',title:'Observed vs simulated',body:'WIR Scientific Exploration rule: a number from a field paper someone actually opened is OBSERVED. A number cited secondhand, or not yet checked, is HYPOTHETICAL until someone opens the original paper (its source quality says secondary or source needed). A number our ecosim produces is SIMULATED and is never presented as a field result. Experimental is for lab results; Fictional is for story-world content.',factIds:[]}],
 quizzes:[{id:'Q1',title:'Assignment 1: Heat, packs and pups',questions:[
  {q:'In Botswana, pup survival to 12 months fell from 51.4% to about what in the hotter period?',choices:['48%','38.7%','20%','It went up'],answer:1,explain:'38.7% in 2001–2012 (Woodroffe et al. 2017, observed).'},
  {q:'Why do pups survive less in hotter denning seasons? Best supported answer:',choices:['Pups melt','Heat cuts daytime hunting and denning dogs can\'t fully hunt more at night, so less food reaches pups','Lions like heat','Impala vanish in summer'],answer:1,explain:'Rabaiotti & Woodroffe 2019: nocturnal activity did not fully compensate, especially while denning.'},
  {q:'Pup survival was highest at roughly what pack size in Hwange?',choices:['2','6','12','40'],answer:2,explain:'~11.76 dogs (Angulo et al. 2013).'},
  {q:'Below what pack size did packs stop growing?',choices:['4','10','20','No limit'],answer:0,explain:'Growth was positive at 4 or more (Angulo et al. 2013).'},
  {q:'Each +1 °C during denning added about how many days between litters in Kenya?',choices:['1','25','100','331'],answer:1,explain:'~25 days (Woodroffe et al. 2017).'},
  {q:'Our ecosim predicts a pack crash. How should we label that number?',choices:['Observed','Primary','Simulated','Canon'],answer:2,explain:'Model output is SIMULATED, never observed.'},
  {q:'"Impala are over 80% of kills" is cited from another study. Its source quality is:',choices:['primary','secondary','simulated','source needed'],answer:1,explain:'Hubel 2016 cites McNutt 1996, so it is secondary.'}]}]};
if(window.WIRSchool)WIRSchool.registerClass(cls);else window.WIR_PENDING_CLASSES=(window.WIR_PENDING_CLASSES||[]).concat([cls]);
})();
