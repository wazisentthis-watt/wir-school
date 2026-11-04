import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
const cases=[
 {name:'baseline',query:'?lite=1',mobile:false,enabled:false},
 {name:'skate-desktop',query:'?lite=1&skate_yard=1',mobile:false,enabled:true},
 {name:'skate-mobile',query:'?lite=1&skate_yard=1',mobile:true,enabled:true}
];
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const results=[];
try{
 for(const c of cases){
  const context=await browser.newContext({viewport:c.mobile?{width:390,height:844}:{width:1160,height:780},
    isMobile:c.mobile,hasTouch:c.mobile,deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  try{
   await page.goto(base+'/connected/'+c.query,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().error,null,{timeout:90000});
   const startup=await page.evaluate(()=>({
    ready:window.__ready===true,mission:window.__game?.metalStoryChapter?.()?.title||null,
    renderer:!!document.querySelector('canvas'),
    adapter:typeof window.__game?.testYard==='function',
    tools:document.querySelectorAll('#testyardSkateActions button').length,
    status:window.__bootRecovery?.getStatus?.()||null
   }));
   assert.equal(startup.ready,true,'Failed actual game boot: '+JSON.stringify(startup));
   assert.ok(startup.renderer,'Real Three.js canvas missing');
   assert.match(startup.mission||'',/Metal Awakens/,'Original first mission missing');
   assert.equal(startup.adapter,c.enabled,'Unexpected Test Yard flag state');
   assert.equal(startup.tools,c.enabled?3:0,'Touch tools unexpected');
   if(c.enabled){
    const effect=await page.evaluate(()=>{
     const g=window.__game;if(!g)return {error:'No game debug'};
     localStorage.setItem('testyard-qa-sentinel','unchanged');
     const original={gal:g.st.gal,charge:g.st.charge,root:g.st.root,board:g.st.board};
     if(!g.st.board){g.pressed.KeyB=true;g.stepForTest(2,1/60);}
     const boardReady=!!g.st.board;
     let trickStarted=false;
     if(boardReady&&g.ground()){
      g.pressed.BracketLeft=true;g.stepForTest(9,1/60);
      trickStarted=g.testYard()?.flip==='Kickflip';
     }
     const snapshot=g.testYard(),preserved=localStorage.getItem('testyard-qa-sentinel')==='unchanged';
     return {boardReady,trickStarted,snapshot,preserved,original,
       galNow:g.st.gal,phase6Clips:Object.keys(g.P.acts||{}).length,
       canSwing:typeof g.startWallForTest==='function'};
    });
    assert.equal(effect.boardReady,true,'Four-wheel board did not equip in existing game');
    assert.equal(effect.trickStarted,true,'Real in-scene flip was not started through original board path');
    assert.equal(effect.preserved,true,'Storage sentinel changed');
    assert.equal(effect.snapshot?.authority,'VISUAL_AND_TRICK_INTENT_ONLY');
    assert.ok(effect.phase6Clips>0,'Rig animations missing');
    assert.equal(errors.length,0,'Browser exceptions: '+errors.join(' | '));
    results.push({name:c.name,pass:true,startup,effect});
   }else{
    assert.equal(errors.length,0,'Baseline JS errors: '+errors.join(' | '));
    results.push({name:c.name,pass:true,startup});
   }
   console.log('PASS TEST YARD BROWSER',c.name,JSON.stringify(startup));
  }catch(e){
   console.error('FAIL TEST YARD BROWSER',c.name,String(e.stack||e),'errors',errors);
   results.push({name:c.name,pass:false,error:String(e.stack||e),errors});
   try{await page.screenshot({path:'test-results/testyard-'+c.name+'.png',fullPage:true});}catch{}
  }finally{await context.close();}
 }
 writeFileSync('test-results/testyard_connected_browser.json',JSON.stringify(results,null,2));
 if(results.some(x=>!x.pass))process.exitCode=1;
}finally{await browser.close();}
