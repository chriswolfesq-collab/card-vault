// Card Vault local server.
//
// A static site cannot write to disk, and a collection that lives in localStorage
// is one cleared cache away from gone. So the site is served by this instead: it
// hands over the static files and exposes a small API that writes real files into
// data/ and images/. Everything it writes is plain JSON or a JPEG in the repo,
// readable without this server and diffable in git.
//
// Binds to 127.0.0.1 only. There is no auth because nothing off this machine can
// reach it.

import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, unlink, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './build-manifest.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(ROOT, 'data');
const SETS = join(DATA, 'sets');
const PHOTOS = join(ROOT, 'images', 'cards');
const PORT = Number(process.env.PORT) || 4188;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
};

// Every path that reaches the filesystem goes through here. Rejects anything that
// escapes the project root, so a crafted URL cannot read ~/.ssh.
function safePath(base, candidate) {
  const resolved = normalize(join(base, candidate));
  if (!resolved.startsWith(normalize(base))) return null;
  return resolved;
}

const SET_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PHOTO_NAME = /^[a-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$/i;

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error(`body over ${limit} bytes`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Write to a temp file and rename over the target. A crash mid-write leaves the
// previous collection intact rather than a half-written one -- this file is the
// whole point of the app, so it never gets truncated in place.
async function writeAtomic(path, contents) {
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, contents);
  await rename(tmp, path);
}

async function loadJSON(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function loadSets() {
  if (!existsSync(SETS)) return [];
  const files = (await readdir(SETS)).filter((f) => f.endsWith('.json'));
  const sets = await Promise.all(
    files.map(async (f) => {
      const set = await loadJSON(join(SETS, f), null);
      if (set && !set.id) set.id = basename(f, '.json');
      return set;
    })
  );
  return sets.filter(Boolean);
}

const EMPTY_COLLECTION = { version: 2, updated: null, holdings: [], purchases: [], wants: [] };

async function handleAPI(req, res, url) {
  const route = url.pathname.replace(/^\/api\//, '');

  if (req.method === 'GET' && route === 'state') {
    const [sets, collection] = await Promise.all([
      loadSets(),
      loadJSON(join(DATA, 'collection.json'), EMPTY_COLLECTION),
    ]);
    return json(res, 200, { sets, collection });
  }

  if (req.method === 'PUT' && route === 'collection') {
    const body = JSON.parse(await readBody(req, 32 * 1024 * 1024));
    for (const key of ['holdings', 'purchases', 'wants']) {
      if (body[key] != null && !Array.isArray(body[key])) {
        return json(res, 400, { error: `${key} must be an array` });
      }
      body[key] = body[key] || [];
    }
    body.version = 2;
    body.updated = new Date().toISOString();
    await mkdir(DATA, { recursive: true });
    await writeAtomic(join(DATA, 'collection.json'), JSON.stringify(body, null, 2) + '\n');
    return json(res, 200, { ok: true, updated: body.updated, count: body.holdings.length });
  }

  if (route.startsWith('sets/')) {
    const id = route.slice('sets/'.length);
    if (!SET_ID.test(id)) return json(res, 400, { error: 'bad set id' });
    const path = safePath(SETS, `${id}.json`);
    if (!path) return json(res, 400, { error: 'bad set id' });

    if (req.method === 'PUT') {
      const body = JSON.parse(await readBody(req, 8 * 1024 * 1024));
      body.id = id;
      await mkdir(SETS, { recursive: true });
      await writeAtomic(path, JSON.stringify(body, null, 2) + '\n');
      // Keep the static manifest in step, so a Pages deploy never ships a
      // set list that disagrees with the set files next to it.
      await buildManifest(true);
      return json(res, 200, { ok: true, id });
    }
    if (req.method === 'DELETE') {
      if (existsSync(path)) await unlink(path);
      await buildManifest(true);
      return json(res, 200, { ok: true, id });
    }
  }

  if (req.method === 'POST' && route === 'photo') {
    const name = url.searchParams.get('name') || '';
    if (!PHOTO_NAME.test(name)) return json(res, 400, { error: 'bad photo name' });
    const path = safePath(PHOTOS, name);
    if (!path) return json(res, 400, { error: 'bad photo name' });
    const bytes = await readBody(req, 12 * 1024 * 1024);
    await mkdir(PHOTOS, { recursive: true });
    await writeFile(path, bytes);
    return json(res, 200, { ok: true, path: `images/cards/${name}` });
  }

  if (req.method === 'DELETE' && route === 'photo') {
    const name = url.searchParams.get('name') || '';
    if (!PHOTO_NAME.test(name)) return json(res, 400, { error: 'bad photo name' });
    const path = safePath(PHOTOS, name);
    if (path && existsSync(path)) await unlink(path);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'no such endpoint' });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname.startsWith('/api/')) return await handleAPI(req, res, url);

    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const path = safePath(ROOT, rel);
    if (!path || !existsSync(path)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
    const body = await readFile(path);
    res.writeHead(200, {
      'content-type': MIME[extname(path).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch (err) {
    json(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Card Vault -> http://localhost:${PORT}`);
  console.log(`  collection: ${join(DATA, 'collection.json')}`);
  console.log(`  photos:     ${PHOTOS}`);
});
