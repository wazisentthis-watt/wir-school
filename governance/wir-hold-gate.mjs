// WIR governance gate. Reads APPROVALS ONLY from the trusted base branch.
// The PR head must never authorize itself. No runtime dependencies.
// Intentional failure while PROPOSAL/HOLD is active.
import {readFileSync,appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const SHA=/^[a-f0-9]{40}$/i;
const isCommit=x=>typeof x==='string'&&SHA.test(x);
const positiveInteger=x=>Number.isSafeInteger(x)&&x>0;
const nonempty=x=>typeof x==='string'&&x.trim().length>=12;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);

export function evaluateWIRHold(policy,request={}){
 const blocked=(code,reason)=>({allowed:false,code,reason});
 if(!policy||typeof policy!=='object'||policy.version!==1||
    !['HOLD','CONTROLLED'].includes(policy.mode)||!nonempty(policy.owner))
   return blocked('INVALID_POLICY','Missing or invalid trusted base-branch WIR approval policy');
 const mode=request.action;
 if(!['merge','publish'].includes(mode))return blocked('UNKNOWN_ACTION','Unsupported action, fail closed');
 if(policy.mode==='HOLD')
   return blocked('OWNER_HOLD','WIR is on PROPOSAL/HOLD; neither merge nor publication is authorized');
 const sha=request.sha;
 if(!isCommit(sha))return blocked('INVALID_SHA','Full 40-character candidate commit SHA required');
 if(mode==='merge'){
  if(request.draft!==false)return blocked('DRAFT_OR_UNKNOWN','Only explicitly ready-for-review PRs may merge');
  if(!positiveInteger(request.pr))return blocked('INVALID_PR','PR number missing or invalid');
  const items=Array.isArray(policy.approvedMerges)?policy.approvedMerges:[];
  const approval=items.find(x=>x&&x.pr===request.pr&&x.sha===sha);
  if(!approval)return blocked('NO_PR_APPROVAL','No exact PR-number + head-SHA authorization exists in protected base');
  if(approval.approvedBy!==policy.owner||!nonempty(approval.reason)||!nonempty(approval.approvedAt))
   return blocked('INVALID_APPROVAL','Approval record missing owner, reason, or signed-off date');
  return {allowed:true,code:'PR_APPROVED',reason:'Exact protected-base owner approval matched this PR head'};
 }
 if(policy.allowPublicPublish!==true)
  return blocked('PUBLISH_HOLD','Public publishing is disabled regardless of merge approval');
 const items=Array.isArray(policy.approvedReleases)?policy.approvedReleases:[];
 const approval=items.find(x=>x&&x.sha===sha);
 if(!approval)return blocked('NO_RELEASE_APPROVAL','No exact release commit SHA approval exists in protected base');
 if(approval.approvedBy!==policy.owner||!nonempty(approval.reason)||!nonempty(approval.approvedAt))
  return blocked('INVALID_APPROVAL','Release approval record missing owner, reason or date');
 return {allowed:true,code:'RELEASE_APPROVED',reason:'Protected-base approval matched release SHA'};
}
export function holdStatus(policy){
 return {mode:policy?.mode??'UNKNOWN',owner:policy?.owner??null,
  allowPublicPublish:policy?.allowPublicPublish===true};
}
function cli(){
 const path=process.env.WIR_TRUSTED_POLICY||'.github/wir-hold-policy.json';
 let policy=null;
 try{policy=JSON.parse(readFileSync(path,'utf8'))}catch(e){
  console.error('WIR HOLD FAIL CLOSED: cannot read trusted policy',String(e.message||e));
  process.exitCode=1;return;
 }
 const request={action:process.env.WIR_GUARD_ACTION||'merge',sha:process.env.WIR_CANDIDATE_SHA,
  pr:Number(process.env.WIR_PR_NUMBER||0),draft:process.env.WIR_PR_DRAFT==='false'};
 const result=evaluateWIRHold(policy,request);
 const msg='WIR '+request.action.toUpperCase()+' GUARD: '+(result.allowed?'APPROVED':'BLOCKED')+
  ' ['+result.code+'] '+result.reason+' (candidate '+String(request.sha||'none')+')';
 if(result.allowed)console.log(msg);else console.error(msg);
 if(process.env.GITHUB_STEP_SUMMARY){
  const line='### '+(result.allowed?'✅':'🚫')+' WIR HOLD '+request.action.toUpperCase()+' gate\\n'+
   '- Base policy: '+String(policy.mode)+'\\n- '+result.code+': '+result.reason+'\\n'+
   '- This check only prevents merges when required by branch protection.\\n';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,line);
 }
 if(!result.allowed)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)cli();
