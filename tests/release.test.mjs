import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildRelease} from '../scripts/build-release.mjs';

test('release manifests identify exact source and immutable binary bytes',async t=>{
  const root=await mkdtemp(join(tmpdir(),'remote-release-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const name of ['config','config_detail']) {
    await writeFile(join(root,name+'.json'),JSON.stringify({elements:[]}));
    await writeFile(join(root,name+'.rc'),Buffer.from([0,1,128,255]));
  }
  const out=join(root,'site');
  await buildRelease(root,out,'a'.repeat(40));
  const first=JSON.parse(await readFile(join(out,'config.manifest.json'),'utf8'));
  const bytes=await readFile(join(out,first.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),first.sha256);
  assert.equal(first.revision,'a'.repeat(40));
  await writeFile(join(root,'config.rc'),Buffer.from([0,2,128,255]));
  await buildRelease(root,out,'b'.repeat(40));
  const second=JSON.parse(await readFile(join(out,'config.manifest.json'),'utf8'));
  assert.notEqual(first.file,second.file);
  assert.deepEqual(await readFile(join(out,first.file)),bytes);
  await assert.rejects(buildRelease(root,out,'invalid'));
});
