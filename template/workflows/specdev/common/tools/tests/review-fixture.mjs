/** Synthetic tool receipts for disposable tests only; never runtime evidence. */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join,relative} from 'node:path';
import {resolveReviewScope} from '../review-scope.mjs';
import {reviewInputDigest} from '../review-evidence.mjs';
import {readArtifactSectionSync} from '../../../../../lib/speculo-runtime.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
export function appendReviewFixture({repo,sourceRoot=repo,root,artifact='evidence/direct-spec.md',base,head=null,files=['value.txt'],sourceFiles=false,mode='native',reviewer='native:reviewer',implementers=['native:implementer'],spec=null,sourceLocators=null}) {
  const path=join(root,artifact);mkdirSync(dirname(path),{recursive:true});
  let prior=existsSync(path)?readFileSync(path,'utf8'):'';
  prior=prior.split('\n<!-- synthetic-independent-review -->')[0];
  writeFileSync(path,prior);
  let sources;
  if(sourceLocators) sources=sourceLocators.map(({kind,locator})=>{
    const [file,anchor]=locator.split('#');
    return {kind,locator,sha256:hash(anchor?readArtifactSectionSync(join(sourceRoot,file),anchor).text:readFileSync(join(sourceRoot,file),'utf8'))};
  });
  else {
    const standards=join(root,'evidence/fixture-standards.md');mkdirSync(dirname(standards),{recursive:true});writeFileSync(standards,'# Fixture standards\nPreserve existing behavior and test changes.\n');
    if(!spec) {spec=join(root,'evidence/fixture-spec.md');writeFileSync(spec,'# Fixture Spec\nAC-001: deliver the accepted behavior.\n');}
    sources=[['standards',standards],['specification',spec]].map(([kind,file])=>({kind,locator:relative(sourceRoot,file).split('\\').join('/'),sha256:hash(readFileSync(file,'utf8'))}));
  }
  const scope=resolveReviewScope(sourceFiles?{repo,mode:'source-files',files}:head?{repo,mode:'range',base,head}:{repo,mode:'working-tree',base,files});
  const input={scope,sources,exclusions:'Fixture-only records and unrelated inputs are outside the implementation scope.'};
  const digest=reviewInputDigest(input);
  const report=axis=>`<a id="${axis}-output"></a>\n## Original ${axis} output\nReviewer: ${reviewer}\nAxis: ${axis}\nResult: pass\nInput-SHA256: ${digest}\nObserved: synthetic fixture reviewer inspected the fixed inputs; no blocking findings.\n`;
  const text=`\n<!-- synthetic-independent-review -->\n<a id="review-input"></a>\n## Review Input\n\n\x60\x60\x60json\n${JSON.stringify(input,null,2)}\n\x60\x60\x60\n\n${report('standards')}\n${report('specification')}\n<a id="review-receipt"></a>\n## Original dispatch and verification\nVerified-By: native:lead\nMode: ${mode}\nReviewers: ${reviewer}\nInput-SHA256: ${digest}\nResult: verified\nObserved: synthetic fixture dispatch returned the separate reviewer handle and both original outputs.\n\n## Independent Review\nInput: ${artifact}#review-input\nImplementers: ${implementers.join(', ')}\nMode: ${mode}\nVerified-By: native:lead\nVerification: ${artifact}#review-receipt\n\n| Axis | Reviewer | Result | Report |\n|---|---|---|---|\n| standards | ${reviewer} | pass | ${artifact}#standards-output |\n| specification | ${reviewer} | pass | ${artifact}#specification-output |\n`;
  writeFileSync(path,prior+text);
  return {input,digest,path,text:prior+text};
}


/** Synthetic main-loop checks; deliberately creates no dispatch/return receipt. */
export function appendSelfReviewFixture(options) {
  const implementers=options.implementers ?? ['native:implementer'];
  const review=appendReviewFixture({...options,mode:'self',reviewer:implementers[0],implementers});
  const text=review.text
    .replace(/<a id="review-receipt"><\/a>\n## Original dispatch and verification\n[\s\S]*?(?=\n## Independent Review)/,'')
    .replace('## Independent Review',`## Review\nStrategy: self\nRisk: ${options.risk ?? 'low'}\nIndependence: not-required\nBasis: Local fixture change with observed acceptance tests and no independent-review requirement.`)
    .replace(/^Verification: .*\n/m,'')
    .replace('Verified-By: native:lead',`Verified-By: ${implementers[0]}`);
  writeFileSync(review.path,text);
  return {...review,text};
}
