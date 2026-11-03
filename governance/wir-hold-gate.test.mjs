import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateWIRHold,holdStatus} from './wir-hold-gate.mjs';

const trusted=JSON.parse(readFileSync(new URL('../.github/wir-hold-policy.json',import.meta.url),'utf8'));
const sha='a'.repeat(40),other='b'.repeat(40);
const approval={pr:13,sha,approvedBy:'wazisentthis-watt',
 reason:'Explicit owner-approved scope and tested change record',
 approvedAt:'2026-11-03T15:00:00Z'};
const controlled=()=>({...trusted,mode:'CONTROLLED',approvedMerges:[approval]});
const merge=(pr=13,hash=sha)=>({action:'merge',pr,sha:hash,draft:false});
const publish=(hash=sha)=>({action:'publish',sha:hash});

test('actual WIR policy begins in HOLD, including public publication',()=>{
 assert.deepEqual(holdStatus(trusted),{
  mode:'HOLD',owner:'wazisentthis-watt',allowPublicPublish:false
 });
 assert.equal(trusted.approvedMerges.length,0);
 assert.equal(trusted.approvedReleases.length,0);
});
test('PRs #9 through #12 would all be stopped by the enforcement check',()=>{
 for(const number of [9,10,11,12]){
  const result=evaluateWIRHold(trusted,merge(number,sha));
  assert.equal(result.allowed,false);assert.equal(result.code,'OWNER_HOLD');
 }
});
test('Draft -> ready transitions or a green CI result never bypass active HOLD',()=>{
 for(const draft of [false,true,undefined]){
  const result=evaluateWIRHold(trusted,{...merge(),draft,ciPassed:true,mergedBy:'wazisentthis-watt'});
  assert.equal(result.allowed,false);assert.equal(result.code,'OWNER_HOLD');
 }
});
test('Changing the policy in an untrusted PR head does not approve that PR',()=>{
 const attackerHeadPolicy={...controlled(),allowPublicPublish:true,approvedReleases:[approval]};
 assert.equal(evaluateWIRHold(trusted,{...merge(),headPolicy:attackerHeadPolicy}).allowed,false);
});
test('Unknown, malformed and missing-base policy fail closed',()=>{
 for(const bad of [null,{}, {version:99,mode:'CONTROLLED',owner:'wazisentthis-watt'},{
  version:1,mode:'RELEASE_ALL',owner:'wazisentthis-watt'}]){
  assert.equal(evaluateWIRHold(bad,merge()).allowed,false);
 }
 assert.equal(evaluateWIRHold(controlled(),{action:'delete-main',sha}).allowed,false);
});
test('Only exact PR number, full head SHA, proper readiness and trusted owner record can authorize merge',()=>{
 const policy=controlled();
 assert.equal(evaluateWIRHold(policy,merge()).allowed,true);
 for(const bad of [merge(14,sha),merge(13,other),merge(13,'abc'),{...merge(),draft:true},
   {...merge(),draft:undefined}]){
  assert.equal(evaluateWIRHold(policy,bad).allowed,false,JSON.stringify(bad));
 }
 const fake={...policy,approvedMerges:[{...approval,approvedBy:'unknown-bot'}]};
 assert.equal(evaluateWIRHold(fake,merge()).allowed,false);
});
test('Public release remains blocked even after explicitly approving a PR merge',()=>{
 const policy=controlled();
 assert.equal(evaluateWIRHold(policy,merge()).allowed,true);
 assert.equal(evaluateWIRHold(policy,publish()).allowed,false);
 assert.equal(evaluateWIRHold(policy,publish()).code,'PUBLISH_HOLD');
});
test('Release requires separate exact SHA, explicit publish enable, and protected-base approval',()=>{
 const ok={...controlled(),allowPublicPublish:true,
  approvedReleases:[{sha,approvedBy:'wazisentthis-watt',reason:'Explicit public publishing release for exact tested build',approvedAt:'2026-11-03T15:00:00Z'}]};
 assert.equal(evaluateWIRHold(ok,publish()).allowed,true);
 assert.equal(evaluateWIRHold(ok,publish(other)).allowed,false);
 assert.equal(evaluateWIRHold({...ok,approvedReleases:[]},publish()).allowed,false);
 assert.equal(evaluateWIRHold({...ok,mode:'HOLD'},publish()).allowed,false);
});
test('Owner governance file and review ownership exist at stable paths',()=>{
 const owners=readFileSync(new URL('../.github/CODEOWNERS',import.meta.url),'utf8');
 assert.match(owners,/\/\.github\/ @wazisentthis-watt/);
 assert.match(owners,/\/governance\/ @wazisentthis-watt/);
 const policy=readFileSync(new URL('../.github/wir-hold-policy.json',import.meta.url),'utf8');
 assert.ok(policy.includes('PROPOSAL/HOLD'));
});
