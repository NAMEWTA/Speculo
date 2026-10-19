import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, rename, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { DEFAULT_ROOTS } from '../src/paths.js';
import { designTools, designValidator, document, writeDesignFixture, time } from './helpers/design-fixture.js';

const changeName = '2026-10-14-design';
const validatorPath = join(process.cwd(), 'template/workflows/specdev/common/tools/validate-specdev.mjs');
async function fixture() {
  const repo = await mkdtemp(join(tmpdir(), 'specdev-design-'));
  const state = join(repo, DEFAULT_ROOTS.state, 'specdev'), change = join(state, 'changes', changeName);
  await mkdir(change, { recursive: true });
  await writeFile(join(repo, DEFAULT_ROOTS.state, 'workspace.json'), JSON.stringify({schema_version:2,layout_version:'agents-v2',installation_id:'00000000-0000-0000-0000-000000000000',path_base:'project-root',roots:DEFAULT_ROOTS}));
  await writeFile(join(change,'README.md'),'# Design\n\nOutcome: active\n\n## Ownership\nOwner: test\nWork: specdev/prototype\nEvidence: owner.md\n');
  await writeFile(join(change,'owner.md'),'Owner: test\nWork: specdev/prototype\nSource: fixture simulated assignment\n');
  const path = await writeDesignFixture(change);
  return {repo,state,change,path,root:dirname(path),cleanup:()=>rm(repo,{recursive:true,force:true})};
}
async function edit(path: string, change: (meta: any) => void) {
  const api = await designTools(), record = await api.readDesign(path);change(record.meta);
  await writeFile(path,document(record.meta,record.body.trim()));
}

describe('versioned design lifecycle',()=>{
  it('accepts a complete fixture and binds confirmation to normative values',async()=>{
    const f=await fixture();try{
      await (await designValidator()).validate(f.path);
      await edit(join(f.change,'DESIGN.md'),m=>{m.updated_at='2026-10-15T00:00:00Z'});
      await (await designValidator()).validate(f.path);
      await edit(join(f.change,'DESIGN.md'),m=>{m.tokens.text='#888888'});
      await assert.rejects((await designValidator()).validate(f.path),/confirmation digest is stale/);
    }finally{await f.cleanup()}
  });
  it('rejects title-only candidates before accepting any confirmation',async()=>{
    const f=await fixture();try{
      await writeFile(join(f.root,'comparison/variants/dense-ide.html'),'<title>Only title</title>');
      await assert.rejects((await designValidator()).validate(f.path),/task surface/);
    }finally{await f.cleanup()}
  });
  it('rejects recoloring identical task markup and missing candidate viewport evidence',async()=>{
    const f=await fixture();try{
      const validator=await designValidator();
      const first=await readFile(join(f.root,'comparison/variants/dense-ide.html'),'utf8');
      await writeFile(join(f.root,'comparison/variants/responsive-web.html'),first.replace('<body>','<body style="color:blue">'));
      await assert.rejects(validator.validate(f.path),/same task structure/);
      await writeDesignFixture(f.change);
      const path=join(f.root,'evidence/browser.json'), evidence=JSON.parse(await readFile(path,'utf8'));
      evidence.cases=evidence.cases.filter((c:any)=>c.entry==='final/index.html');await writeFile(path,JSON.stringify(evidence));
      await assert.rejects(validator.validate(f.path),/comparison\/variants\/.*390px/);
    }finally{await f.cleanup()}
  });
  it('validates preview before approval without pretending the initial baseline is published',async()=>{
    const f=await fixture();try{
      const validator=await designValidator();
      await edit(join(f.change,'DESIGN.md'),m=>{m.status='draft';m.confirmation=null});
      await edit(f.path,m=>{m.status='awaiting-confirmation'});
      await rm(join(f.state,'design'),{recursive:true});
      await validator.validate(f.path,{checkPreview:true});
      await assert.rejects(validator.validate(f.path,{checkReady:true}),/approved status/);
    }finally{await f.cleanup()}
  });
  it('rejects network mocks, unresolved CSS imports and resources outside confirmation coverage',async()=>{
    const f=await fixture();try{
      const validator=await designValidator();
      const {materialize}=await import(pathToFileURL(join(process.cwd(),'template/workflows/specdev/specdev-p-prototype/scripts/materialize-prototype.mjs')).href);
      const original=await readFile(f.path,'utf8');
      await writeFile(f.path,original.replace('document.querySelector("#approve")','fetch("https://example.com/live-data");document.querySelector("#approve")'));
      await materialize(f.path);await assert.rejects(validator.validate(f.path),/local mock state/);
      await writeFile(f.path,original.replace('*{box-sizing:border-box}','@import "missing.css";*{box-sizing:border-box}'));
      await materialize(f.path);await assert.rejects(validator.validate(f.path),/ENOENT|path-unsafe/);
      await writeFile(join(f.root,'extra.css'),'body{color:blue}');
      await writeFile(f.path,original.replace('href="styles.css"','href="../extra.css"'));
      await materialize(f.path);await assert.rejects(validator.validate(f.path),/outside digest coverage/);
    }finally{await f.cleanup()}
  });
  it('rejects changed comparisons, absent screenshots, missing states and stale browser evidence',async()=>{
    const f=await fixture();try{
      const validator=await designValidator();
      const evidencePath=join(f.root,'evidence/browser.json'),text=await readFile(evidencePath,'utf8'),e=JSON.parse(text);
      e.prototype_digest='a'.repeat(64);await writeFile(evidencePath,JSON.stringify(e));await assert.rejects(validator.validate(f.path),/browser evidence digest is stale/);
      await writeFile(evidencePath,text);await rm(join(f.root,'evidence/390.png'));await assert.rejects(validator.validate(f.path),/ENOENT|path-unsafe/);
      await writeDesignFixture(f.change);
      const candidate=join(f.root,'comparison/variants/dense-ide.html');await writeFile(candidate,(await readFile(candidate,'utf8'))+'<!-- new revision -->');
      await assert.rejects(validator.validate(f.path),/does not approve/);
    }finally{await f.cleanup()}
  });
  it('supports explicit count overrides and scoped compositions, not unknown references',async()=>{
    const f=await fixture();try{
      const validator=await designValidator();
      await edit(f.path,m=>{m.status='selecting';m.candidates=m.candidates.slice(0,1);m.candidate_count_override={count:1,request:'User requested one inherited design.'};m.candidates[0].auxiliaries=[{reference_id:'mintlify',dimension:'reading typography'}]});
      await validator.validate(f.path);
      await edit(f.path,m=>{m.candidate_count_override=null});await assert.rejects(validator.validate(f.path),/candidate count/);
      await edit(f.path,m=>{m.candidate_count_override={count:1,request:'one'};m.candidates[0].primary_reference='unknown'});await assert.rejects(validator.validate(f.path),/unknown visual reference/);
    }finally{await f.cleanup()}
  });
  it('rejects duplicate YAML keys, cyclic tokens, legacy schemas and path escapes',async()=>{
    const f=await fixture();try{
      const validator=await designValidator(),api=await designTools();
      const original=await readFile(f.path,'utf8');await writeFile(f.path,original.replace('schema_version: 3','schema_version: 3\nschema_version: 3'));await assert.rejects(validator.validate(f.path),/unique|duplicat/i);
      await writeFile(f.path,original.replace('schema_version: 3','schema_version: 2'));await assert.rejects(validator.validate(f.path),/unsupported design package schema/);
      assert.throws(()=>api.validateTokens({a:'{b}',b:'{a}'}),/cyclic/);
      await assert.rejects(api.safePath(f.root,'../../DESIGN.md'),/unsafe/);
      await symlink(join(f.change,'LOG.md'),join(f.root,'evidence/link.md'));await assert.rejects(api.safePath(f.root,'evidence/link.md'),/symlink|symbolic links/);
    }finally{await f.cleanup()}
  });
  it('requires selecting a package and never lets an older ready one satisfy a draft target',async()=>{
    const f=await fixture();try{
      await mkdir(join(f.change,'prototypes/UI-002'));
      const original=await readFile(f.path,'utf8');await writeFile(join(f.change,'prototypes/UI-002/design-system.md'),original.replace('design_id: UI-001','design_id: UI-002').replace('status: ready','status: selecting'));
      const run=(extra:string[])=>spawnSync(process.execPath,[validatorPath,'--stage','prototype',...extra,f.change],{encoding:'utf8'});
      let result=run([]);assert.equal(result.status,1);assert.match(result.stderr,/requires --prototype-id/);
      result=run(['--prototype-id','UI-002']);assert.equal(result.status,1);assert.match(result.stderr,/selected ready/);
      result=run(['--prototype-id','UI-001']);assert.equal(result.status,0,result.stderr);
    }finally{await f.cleanup()}
  });
  it('does not accept a blocked bound package or require validation of retained historical packages',async()=>{
    const f=await fixture();try{
      const api=await designTools();
      await edit(f.path,m=>{m.status='blocked'});
      // The structural Spec prerequisite may also fail, but the design-specific
      // diagnostic must appear before any downstream stage can accept this UI.
      const run=()=>spawnSync(process.execPath,[validatorPath,'--stage','spec',f.change],{encoding:'utf8'});
      const result=run();assert.equal(result.status,1);assert.match(result.stderr,/bound UI prototype must be ready/);
      await edit(f.path,m=>{m.status='ready'});
      await mkdir(join(f.change,'prototypes/UI-002'));await writeFile(join(f.change,'prototypes/UI-002/design-system.md'),'---\nschema_version: 2\nstatus: ready\n---\nRead-only history.');
      const general=spawnSync(process.execPath,[validatorPath,f.change],{encoding:'utf8'});assert.equal(general.status,0,general.stderr);
      await writeFile(join(f.change,'LOG.md'),'Unrelated confirmation record.');await assert.rejects(api.validateChangeDesign(join(f.change,'DESIGN.md')),/confirmation record digest/);
    }finally{await f.cleanup()}
  });
  it('keeps a confirmed change pinned to its immutable baseline',async()=>{
    const f=await fixture();try{
      await edit(join(f.state,'design/DESIGN.md'),m=>{m.revision='DESIGN-0002';m.tokens.text='#111111'});
      await (await designValidator()).validate(f.path);
      await edit(join(f.state,'design/revisions/DESIGN-0001.md'),m=>{m.tokens.text='#111111'});
      await assert.rejects((await designValidator()).validate(f.path),/baseline revision\/digest mismatch/);
    }finally{await f.cleanup()}
  });
  it('refuses unsupported status archives without rewriting their design evidence',async()=>{
    const f=await fixture();try{
      const target=join(f.state,'changes/archive',changeName);await mkdir(dirname(target),{recursive:true});await rename(f.change,target);
      const frozen=JSON.stringify({schema_version:6,change:changeName,change_status:'archived'});
      await writeFile(join(target,'.status.json'),frozen);
      const designBefore=await readFile(join(target,'DESIGN.md'));
      const result=spawnSync(process.execPath,[validatorPath,'--stage','archived',target],{encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/unsupported|mixed-protocol|legacy/);
      assert.equal(await readFile(join(target,'.status.json'),'utf8'),frozen);assert.deepEqual(await readFile(join(target,'DESIGN.md')),designBefore);
    }finally{await f.cleanup()}
  });
  it('enforces UI Ticket design references while leaving non-UI work independent',async()=>{
    const f=await fixture();try{
      const api=await designTools();await mkdir(join(f.change,'ticket'));
      const path=join(f.change,'ticket/01-review.md');
      const meta:any={id:'T-01',status:'ready',expected_changes:['<Path>src/page.tsx</Path>']};
      await writeFile(path,document(meta,'# UI implementation'));
      await assert.rejects(api.validateDesignHandoff(f.change),/UI Ticket requires/);
      const design=await api.readDesign(join(f.change,'DESIGN.md'));meta.design_ref={revision:1,digest:design.digest,pages:['review'],acceptance:['UI-AC-01']};await writeFile(path,document(meta,'# UI implementation'));await api.validateDesignHandoff(f.change);
      meta.status='done';await writeFile(path,document(meta,'# UI implementation'));await assert.rejects(api.validateDesignHandoff(f.change),/ENOENT|path-unsafe/);
      await mkdir(join(f.change,'evidence'));await writeFile(join(f.change,'evidence/T-01.md'),`## Design Conformance\n${design.digest}\nreview UI-AC-01: production rendering checked`);await api.validateDesignHandoff(f.change);
      await writeFile(path,document({id:'T-01',status:'ready',expected_changes:['<Path>src/api.ts</Path>']},'# Backend'));await rm(join(f.change,'DESIGN.md'));await api.validateDesignHandoff(f.change);
    }finally{await f.cleanup()}
  });
});
