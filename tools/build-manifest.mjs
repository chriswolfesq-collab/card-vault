// Writes data/index.json: the list of set files.
//
// With the server running the app just reads the directory. On static hosting
// -- GitHub Pages -- there is no directory listing and no API, so the client
// needs a file telling it which sets exist. The server rewrites this whenever a
// set changes, so it cannot drift.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SETS = join(ROOT, 'data', 'sets');

export async function buildManifest(quiet = false) {
  if (!existsSync(SETS)) return { sets: [] };
  const files = (await readdir(SETS)).filter((f) => f.endsWith('.json')).sort();
  const sets = [];
  for (const f of files) {
    try {
      const set = JSON.parse(await readFile(join(SETS, f), 'utf8'));
      sets.push(set.id || basename(f, '.json'));
    } catch {
      // A malformed set file should not take the manifest down with it.
    }
  }
  const manifest = { generated: new Date().toISOString(), sets };
  await writeFile(join(ROOT, 'data', 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (!quiet) console.log(`data/index.json -> ${sets.length} sets`);
  return manifest;
}

// Runnable on its own as well as importable.
if (import.meta.url === `file://${process.argv[1]}`) await buildManifest();
