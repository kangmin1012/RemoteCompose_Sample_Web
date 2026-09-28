import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function buildRelease(source, destination, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('A full source commit SHA is required');
  await mkdir(resolve(destination, 'documents'), { recursive: true });
  for (const base of ['config', 'config_detail']) {
    const config = await readFile(resolve(source, base + '.json'));
    const bytes = await readFile(resolve(source, base + '.rc'));
    if (!bytes.length) throw new Error('Empty document: ' + base);
    const hash = data => createHash('sha256').update(data).digest('hex');
    const sha256 = hash(bytes);
    const file = `documents/${base}.${sha256}.rc`;
    await writeFile(resolve(destination, file), bytes);
    await writeFile(resolve(destination, base + '.manifest.json'), JSON.stringify({
      schemaVersion: 1, revision, sha256, sourceSha256: hash(config), file,
    }, null, 2) + '\n');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildRelease(process.argv[2], process.argv[3], process.argv[4]);
}
