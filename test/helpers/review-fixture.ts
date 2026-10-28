/** Synthetic receipts used only in disposable completion fixtures. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {appendReviewFixture,appendSelfReviewFixture} = await import(pathToFileURL(resolve('template/workflows/specdev/common/tools/tests/review-fixture.mjs')).href);
export {appendReviewFixture,appendSelfReviewFixture};
export function attachReviewFixture(repo: string, root: string, artifact = 'README.md', strategy: 'independent' | 'self' = 'independent') {
  const append = strategy === 'self' ? appendSelfReviewFixture : appendReviewFixture;
  const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  if(!existsSync(join(repo,'.git'))) git('init','-b','main');
  git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
  const file='reviewed-value.txt';writeFileSync(join(repo,file),'before\n');git('add','--',file);git('-c','commit.gpgsign=false','commit','-m','review fixture baseline');
  const base=git('rev-parse','HEAD');writeFileSync(join(repo,file),'after\n');
  const path=join(root,artifact);
  if(artifact !== 'README.md') return append({repo,root,artifact,base,files:[file],spec:join(root,'spec.md')});
  writeFileSync(path,readFileSync(path,'utf8')+'\n<a id="fixture-standards"></a>\n## Fixture standards\nPreserve behavior and verify the actual change.\n\n## Review record\n');
  const locator=relative(repo,path).split('\\').join('/');
  return append({repo,root,artifact,base,files:[file],sourceLocators:[{kind:'standards',locator:locator+'#fixture-standards'},{kind:'specification',locator:locator+'#scope'},{kind:'specification',locator:locator+'#acceptance'}]});
}

