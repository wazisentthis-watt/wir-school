import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {findWIRPublishers} from './wir-publication-audit.mjs';

test('detects Pages deployment and privileged release/push workflow snippets',()=>{
 const snippets=[
  'steps:\n - uses: actions/deploy-pages@v4',
  'steps:\n - uses: actions/upload-pages-artifact@v3',
  'permissions:\n  pages: write',
  'permissions:\n  deployments: write',
  'permissions:\n  contents: write',
  'steps:\n  - run: gh release create v1',
  'steps:\n  - run: git push origin gh-pages'
 ];
 for(const snippet of snippets)assert.ok(findWIRPublishers({
  '.github/workflows/new-publish.yml':snippet
 }).length>=1,'Did not flag: '+snippet);
});
test('ignores harmless source documentation, draft keeper and read-only CI checks',()=>{
 assert.deepEqual(findWIRPublishers({
  'governance/README.md':'pages: write',
  '.github/workflows/read-only.yml':'permissions:\n  contents: read\n  pull-requests: write\n'
 }),[]);
});
test('existing workflow files have no direct publishing steps as currently reviewed',()=>{
 const root=new URL('../.github/workflows/',import.meta.url);
 const files=Object.fromEntries(readdirSync(root).filter(x=>/\.ya?ml$/i.test(x))
 .map(x=>['.github/workflows/'+x,readFileSync(new URL(x,root),'utf8')]));
 assert.deepEqual(findWIRPublishers(files),[]);
 assert.ok(Object.keys(files).length>=4);
});
