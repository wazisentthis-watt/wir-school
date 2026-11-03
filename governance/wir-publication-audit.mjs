// WIR workflow publication surface scan. This detects direct GitHub Actions
// publisher steps, not external CI, direct GitHub Pages branch publishing, or
// admin settings. Branch rules and Pages controls are still mandatory.
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const RULES=[
 ['GitHub Pages deploy action',/\bactions\/deploy-pages@/i],
 ['GitHub Pages upload artifact',/\bactions\/upload-pages-artifact@/i],
 ['third-party Pages deploy action',/\b(?:peaceiris\/actions-gh-pages|JamesIves\/github-pages-deploy-action)@/i],
 ['Pages write permission',/^\s*pages:\s*write\s*(?:#.*)?$/mi],
 ['Deployments write permission',/^\s*deployments:\s*write\s*(?:#.*)?$/mi],
 ['Contents write permission',/^\s*contents:\s*write\s*(?:#.*)?$/mi],
 ['release creation command',/\bgh\s+release\s+create\b/i],
 ['push to a Pages branch',/\bgit\s+push\b[^\n]*\bgh-pages\b/i]
];
export function findWIRPublishers(files){
 const results=[];
 for(const [path,content] of Object.entries(files)){
  if(!/\.github\/workflows\/[^/]+\.ya?ml$/.test(path))continue;
  for(const [reason,re] of RULES)if(re.test(content))results.push({path,reason});
 }
 return results;
}
function main(){
 const root=process.env.WIR_PUBLISH_SCAN_ROOT||'.github/workflows';
 const files={};
 try{
  for(const name of readdirSync(root)){
   if(!/\.ya?ml$/i.test(name))continue;
   files['.github/workflows/'+name]=readFileSync(root+'/'+name,'utf8');
  }
 }catch(e){console.error('WIR publisher scan failed closed:',String(e));process.exitCode=1;return;}
 const flagged=findWIRPublishers(files);
 if(flagged.length){
  for(const r of flagged)console.error('PUBLISHING HOLD REVIEW REQUIRED',r.path,r.reason);
  process.exitCode=1;
 }else console.log('PASS: no direct publisher workflows detected in',Object.keys(files).length,'files. GitHub Pages settings remain unverified.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
