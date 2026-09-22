// State plus persistence.
//
// Writes are debounced and coalesced: typing a price fires a change per keystroke,
// but the file is written at most once every 600ms. Every write goes through a
// single in-flight promise so two saves can never interleave and produce a
// collection.json that is half old and half new.

import { uid } from './model.js';

const SAVE_DELAY = 600;

export const store = {
  sets: [],
  holdings: [],
  purchases: [],
  wants: [],
  updated: null,
  status: 'loading', // loading | saved | saving | dirty | error
  error: null,
  // 'server' -- talking to tools/serve.mjs, writes land in real files.
  // 'static' -- no server (GitHub Pages, or index.html opened directly):
  //             the JSON files are read-only, so edits live in this browser.
  mode: 'server',
};

// Relative, so the app works from a subpath like /card-vault/ as well as from
// the server's root.
const API = 'api/';
const LOCAL = { collection: 'cv-collection', cards: 'cv-setcards', sets: 'cv-sets' };

const readLocal = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const listeners = new Set();
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((fn) => fn(store));

function setStatus(status, error = null) {
  store.status = status;
  store.error = error;
  emit();
}

const sortSets = (sets) =>
  sets.sort((a, b) => b.year - a.year || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));

export async function load() {
  try {
    const res = await fetch(`${API}state`);
    if (!res.ok) throw new Error(`server returned ${res.status}`);
    const { sets, collection } = await res.json();
    store.mode = 'server';
    store.sets = sortSets(sets || []);
    store.holdings = collection?.holdings || [];
    store.purchases = collection?.purchases || [];
    store.wants = collection?.wants || [];
    store.updated = collection?.updated || null;
    setStatus('saved');
    return store;
  } catch {
    // No server. Fall back to reading the JSON files directly.
  }

  try {
    await loadStatic();
  } catch (err) {
    setStatus('error', `Could not load the collection files. Run it locally with: node tools/serve.mjs  (${err.message})`);
  }
  return store;
}

/**
 * Static mode: read the committed JSON straight off the host.
 *
 * There is no directory listing without a server, hence data/index.json. Any
 * edits made here are layered on top from localStorage -- they cannot reach the
 * files, and the UI says so rather than letting someone type a real collection
 * into a page that will lose it.
 */
async function loadStatic() {
  const grab = async (path) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return res.json();
  };

  const manifest = await grab('data/index.json');
  const files = await Promise.all(
    (manifest.sets || []).map((id) => grab(`data/sets/${id}.json`).catch(() => null))
  );
  const sets = files.filter(Boolean);

  // Sets you created in this browser, and checklist names you filled in here.
  for (const extra of readLocal(LOCAL.sets, [])) {
    if (!sets.find((s) => s.id === extra.id)) sets.push(extra);
  }
  const nameOverlay = readLocal(LOCAL.cards, {});
  for (const set of sets) {
    const mine = nameOverlay[set.id];
    if (mine) set.cards = { ...set.cards, ...mine };
  }

  const base = await grab('data/collection.json').catch(() => ({}));
  const local = readLocal(LOCAL.collection);

  store.mode = 'static';
  store.sets = sortSets(sets);
  store.holdings = local?.holdings ?? base.holdings ?? [];
  store.purchases = local?.purchases ?? base.purchases ?? [];
  store.wants = local?.wants ?? base.wants ?? [];
  store.updated = local?.updated ?? base.updated ?? null;
  setStatus('saved');
}

let timer = null;
let inFlight = Promise.resolve();
let pending = false;

// `_stamp` is a search-cache counter, not collection data -- it never belongs in
// the file a human reads or git diffs.
const clean = (list) => list.map(({ _stamp, ...rest }) => rest);

function flush() {
  pending = false;

  if (store.mode === 'static') {
    const ok = writeLocal(LOCAL.collection, {
      holdings: clean(store.holdings),
      purchases: store.purchases,
      wants: store.wants,
      updated: new Date().toISOString(),
    });
    if (ok) {
      store.updated = new Date().toISOString();
      setStatus('saved');
    } else {
      setStatus('error', 'This browser refused to store the change (private window, or storage full).');
    }
    return Promise.resolve();
  }

  setStatus('saving');
  inFlight = inFlight
    .then(() =>
      fetch(`${API}collection`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          holdings: clean(store.holdings),
          purchases: store.purchases,
          wants: store.wants,
        }),
      })
    )
    .then(async (res) => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
      const { updated } = await res.json();
      store.updated = updated;
      // Another edit landed while this write was in the air -- it queued itself,
      // so don't claim "saved" and paper over it.
      if (!pending && !timer) setStatus('saved');
    })
    .catch((err) => setStatus('error', `Save failed: ${err.message}`));
  return inFlight;
}

export function save() {
  pending = true;
  setStatus('dirty');
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, SAVE_DELAY);
}

/** Write immediately -- used before export and on page hide. */
export function saveNow() {
  clearTimeout(timer);
  timer = null;
  return flush();
}

/* -------------------------------------------------------------- holdings */

export const blankHolding = () => ({
  id: '',
  setId: '',
  number: '',
  parallel: 'base',
  cardType: 'base',
  rookie: false,
  auto: false,
  relic: false,
  favorite: false,
  condition: 'nm-mt',
  grader: '',
  grade: '',
  cert: '',
  serialNum: '',
  serialOf: null,
  qty: 1,
  price: '',
  acquired: new Date().toISOString().slice(0, 10),
  acquiredVia: 'single',
  purchaseId: '',
  source: '',
  value: '',
  valueAsOf: '',
  valueSource: '',
  photoFront: '',
  photoBack: '',
  notes: '',
  tags: [],
  added: '',
});

export function addHolding(fields) {
  const holding = { ...blankHolding(), ...fields, id: fields.id || uid('h'), added: new Date().toISOString() };
  store.holdings.push(holding);
  save();
  emit();
  return holding;
}

export function updateHolding(id, patch) {
  const h = store.holdings.find((x) => x.id === id);
  if (!h) return null;
  Object.assign(h, patch);
  save();
  emit();
  return h;
}

export async function removeHolding(id) {
  const h = store.holdings.find((x) => x.id === id);
  if (!h) return;
  // Photos are files on disk, not rows -- deleting the holding has to take them
  // with it or images/cards/ silently fills with orphans.
  for (const path of [h.photoFront, h.photoBack].filter(Boolean)) {
    await deletePhoto(path).catch(() => {});
  }
  store.holdings = store.holdings.filter((x) => x.id !== id);
  save();
  emit();
}

export function toggleFavorite(id) {
  const h = store.holdings.find((x) => x.id === id);
  if (!h) return;
  h.favorite = !h.favorite;
  save();
  emit();
}

/* ------------------------------------------------------------- purchases */

export const blankPurchase = () => ({
  id: '',
  date: new Date().toISOString().slice(0, 10),
  item: '',
  source: '',
  type: 'single',
  cost: '',
  notes: '',
});

export function addPurchase(fields) {
  const p = { ...blankPurchase(), ...fields, id: fields.id || uid('p') };
  store.purchases.push(p);
  save();
  emit();
  return p;
}

export function updatePurchase(id, patch) {
  const p = store.purchases.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, patch);
  save();
  emit();
  return p;
}

export function removePurchase(id) {
  store.purchases = store.purchases.filter((x) => x.id !== id);
  // The cards stay -- you still own them. They just lose their receipt.
  for (const h of store.holdings) if (h.purchaseId === id) h.purchaseId = '';
  save();
  emit();
}

/* ------------------------------------------------------------- want list */

export const blankWant = () => ({
  id: '',
  setId: '',
  number: '',
  player: '',
  variant: '',
  maxPrice: '',
  priority: 'normal',
  notes: '',
  added: '',
});

export function addWant(fields) {
  const w = { ...blankWant(), ...fields, id: fields.id || uid('w'), added: new Date().toISOString() };
  store.wants.push(w);
  save();
  emit();
  return w;
}

export function updateWant(id, patch) {
  const w = store.wants.find((x) => x.id === id);
  if (!w) return null;
  Object.assign(w, patch);
  save();
  emit();
  return w;
}

export function removeWant(id) {
  store.wants = store.wants.filter((x) => x.id !== id);
  save();
  emit();
}

/* ------------------------------------------------------------------ sets */

export const getSet = (id) => store.sets.find((s) => s.id === id) || null;

/**
 * Record a player's name against a checklist slot. This is how the checklist
 * fills in: every card you enter teaches the set file one more number, so the
 * grids get more informative the more you collect.
 */
export async function nameCard(setId, number, player, team = '') {
  const set = getSet(setId);
  if (!set || !player) return;
  const existing = set.cards[String(number)];
  if (existing && existing.player === player && (!team || existing.team === team)) return;
  const card = { player, team: team || existing?.team || '' };
  set.cards[String(number)] = card;

  if (store.mode === 'static') {
    // The set file is read-only here, so the name is kept as a per-browser
    // overlay and merged back over the file on the next load.
    const overlay = readLocal(LOCAL.cards, {});
    overlay[set.id] = { ...(overlay[set.id] || {}), [String(number)]: card };
    writeLocal(LOCAL.cards, overlay);
    emit();
    return;
  }

  await fetch(`${API}sets/${set.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(set),
  }).catch(() => {});
  emit();
}

export async function saveSet(set) {
  if (store.mode === 'static') {
    const mine = readLocal(LOCAL.sets, []).filter((s) => s.id !== set.id);
    mine.push(set);
    if (!writeLocal(LOCAL.sets, mine)) throw new Error('this browser refused to store the set');
  } else {
    const res = await fetch(`${API}sets/${set.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(set),
    });
    if (!res.ok) throw new Error('could not save set');
  }
  if (!store.sets.find((s) => s.id === set.id)) store.sets.push(set);
  store.sets.sort((a, b) => b.year - a.year || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
  emit();
  return set;
}

/* ---------------------------------------------------------------- photos */

export async function uploadPhoto(holdingId, side, file) {
  if (store.mode === 'static') {
    // Photos are files on disk. Stuffing them into localStorage as data URLs
    // would blow the quota after a handful of cards and lose them all at once,
    // which is worse than saying no.
    throw new Error('photos need the local server (node tools/serve.mjs)');
  }
  const ext = (file.name?.match(/\.(jpe?g|png|webp)$/i) || ['.jpg'])[0].toLowerCase();
  const name = `${holdingId}-${side}${ext}`;
  const res = await fetch(`${API}photo?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error('upload failed');
  const { path } = await res.json();
  return path;
}

export async function deletePhoto(path) {
  if (store.mode === 'static') return;
  const name = String(path).split('/').pop().split('?')[0];
  await fetch(`${API}photo?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------ export/import */

export function exportJSON() {
  return JSON.stringify(
    {
      version: 2,
      exported: new Date().toISOString(),
      holdings: clean(store.holdings),
      purchases: store.purchases,
      wants: store.wants,
    },
    null,
    2
  );
}

/** Merge an exported file back in. Rows already present (by id) are skipped. */
export function importJSON(text) {
  const data = JSON.parse(text);
  let added = 0, skipped = 0;
  for (const key of ['holdings', 'purchases', 'wants']) {
    const incoming = data[key];
    if (!Array.isArray(incoming)) continue;
    const have = new Set(store[key].map((x) => x.id));
    for (const row of incoming) {
      if (!row || have.has(row.id)) { skipped++; continue; }
      store[key].push({ ...row, id: row.id || uid(key[0]) });
      added++;
    }
  }
  if (!added && !skipped) throw new Error('file had nothing to import');
  save();
  emit();
  return { added, skipped };
}

/** Drop every change made in this browser and go back to the published files. */
export function resetLocal() {
  for (const key of Object.values(LOCAL)) {
    try { localStorage.removeItem(key); } catch { /* nothing to clear */ }
  }
}
