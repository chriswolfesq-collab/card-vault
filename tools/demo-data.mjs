// Fill the app with a sample collection so the dashboard and stats pages can be
// seen working before you have entered anything.
//
//   node tools/demo-data.mjs           # load it (refuses if you already have cards)
//   node tools/demo-data.mjs --force   # load it anyway
//   node tools/demo-data.mjs --clear   # remove every trace of it
//
// Everything it writes is namespaced `demo-`: the sets it creates are their own
// files, so your real set files are never touched and clearing is exact. The
// players are real; the card numbers are not claims about any published
// checklist, because these sets do not exist.

import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './build-manifest.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(ROOT, 'data');
const SETS = join(DATA, 'sets');
const COLLECTION = join(DATA, 'collection.json');

const flags = process.argv.slice(2);
const clearing = flags.includes('--clear');
const force = flags.includes('--force');

const EMPTY = { version: 2, updated: null, holdings: [], purchases: [], wants: [] };

async function loadCollection() {
  if (!existsSync(COLLECTION)) return { ...EMPTY };
  const c = JSON.parse(await readFile(COLLECTION, 'utf8'));
  return { ...EMPTY, ...c };
}

async function writeCollection(c) {
  c.updated = new Date().toISOString();
  await mkdir(DATA, { recursive: true });
  await writeFile(COLLECTION, JSON.stringify(c, null, 2) + '\n');
}

/* --------------------------------------------------------------- clearing */

if (clearing) {
  const c = await loadCollection();
  const before = c.holdings.length + c.purchases.length + c.wants.length;
  c.holdings = c.holdings.filter((h) => !h.id.startsWith('h_demo'));
  c.purchases = c.purchases.filter((p) => !p.id.startsWith('p_demo'));
  c.wants = c.wants.filter((w) => !w.id.startsWith('w_demo'));
  await writeCollection(c);

  let files = 0;
  if (existsSync(SETS)) {
    for (const f of await readdir(SETS)) {
      if (f.startsWith('demo-')) { await unlink(join(SETS, f)); files++; }
    }
  }
  await buildManifest(true);
  const after = c.holdings.length + c.purchases.length + c.wants.length;
  console.log(`removed ${before - after} demo rows and ${files} demo set file(s)`);
  console.log(`${after} of your own rows left untouched`);
  process.exit(0);
}

/* ---------------------------------------------------------------- loading */

const existing = await loadCollection();
const yours = existing.holdings.filter((h) => !h.id.startsWith('h_demo'));
if (yours.length && !force) {
  console.error(`You already have ${yours.length} real holding(s). Refusing to add demo data.`);
  console.error('Pass --force if you really want both mixed together.');
  process.exit(1);
}

// Real players, on sets that do not exist. No claim is made about any published
// checklist -- that is the whole reason the demo gets its own sets.
const ROSTER = [
  ['Shohei Ohtani', 'LAD'], ['Mookie Betts', 'LAD'], ['Freddie Freeman', 'LAD'],
  ['Will Smith', 'LAD'], ['Tyler Glasnow', 'LAD'], ['Yoshinobu Yamamoto', 'LAD'],
  ['Aaron Judge', 'NYY'], ['Juan Soto', 'NYM'], ['Gerrit Cole', 'NYY'],
  ['Bobby Witt Jr.', 'KC'], ['Gunnar Henderson', 'BAL'], ['Adley Rutschman', 'BAL'],
  ['Julio Rodríguez', 'SEA'], ['Corbin Carroll', 'ARI'], ['Elly De La Cruz', 'CIN'],
  ['Ronald Acuña Jr.', 'ATL'], ['Fernando Tatis Jr.', 'SD'], ['Paul Skenes', 'PIT'],
  ['Jackson Chourio', 'MIL'], ['James Wood', 'WSH'], ['Wyatt Langford', 'TEX'],
  ['Jackson Holliday', 'BAL'], ['Dylan Crews', 'WSH'], ['Roman Anthony', 'BOS'],
];

const demoSets = [
  {
    id: 'demo-2025-topps-showcase', brand: 'Topps', year: 2025, name: 'Showcase (Demo)',
    subsets: [{ id: 'base', name: 'Base', prefix: '', from: 1, to: 120 }],
    parallels: [
      { id: 'base', name: 'Base', print: null },
      { id: 'gold', name: 'Gold', print: 2025 },
      { id: 'black', name: 'Black', print: 71 },
      { id: 'red', name: 'Red', print: 25 },
      { id: 'platinum', name: 'Platinum', print: 1 },
    ],
  },
  {
    id: 'demo-2025-chrome-prospects', brand: 'Bowman', year: 2025, name: 'Chrome Prospects (Demo)',
    subsets: [{ id: 'prospects', name: 'Prospects', prefix: 'CP', from: 1, to: 60 }],
    parallels: [
      { id: 'base', name: 'Base', print: null },
      { id: 'refractor', name: 'Refractor', print: null },
      { id: 'orange', name: 'Orange Refractor', print: 25 },
      { id: 'red', name: 'Red Refractor', print: 5 },
      { id: 'superfractor', name: 'Superfractor', print: 1 },
    ],
  },
  {
    id: 'demo-2024-heritage', brand: 'Topps', year: 2024, name: 'Heritage (Demo)',
    subsets: [{ id: 'base', name: 'Base', prefix: '', from: 1, to: 90 }],
    parallels: [
      { id: 'base', name: 'Base', print: null },
      { id: 'chrome', name: 'Chrome', print: 999 },
      { id: 'black', name: 'Black Border', print: 50 },
    ],
  },
];

// Deterministic pseudo-randomness, so re-running produces the same demo and a
// git diff of collection.json stays readable.
let seed = 20260922;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));
const money2 = (n) => n.toFixed(2);

// Six months of dates, so the growth and month charts have something to say.
const MONTHS = 6;
const dateFor = (monthsAgo, day) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.min(day, 28));
  return d.toISOString().slice(0, 10);
};

await mkdir(SETS, { recursive: true });

// Write the demo set files, naming a slice of each checklist as it goes.
const setCards = new Map();
for (const set of demoSets) {
  const cards = {};
  const sub = set.subsets[0];
  for (let n = sub.from; n <= sub.to; n++) {
    // Name roughly the first third -- a partly-filled checklist is what a real
    // one looks like, and it exercises both the named and unnamed tile states.
    if (n <= sub.from + Math.floor((sub.to - sub.from) / 3)) {
      const [player, team] = ROSTER[(n - sub.from) % ROSTER.length];
      cards[`${sub.prefix}${n}`] = { player, team };
    }
  }
  setCards.set(set.id, cards);
  await writeFile(
    join(SETS, `${set.id}.json`),
    JSON.stringify({ ...set, sport: 'baseball', cards, verified: false, source: 'demo-data.mjs' }, null, 2) + '\n'
  );
}

/* ------------------------------------------------------------- purchases */

const purchases = [];
const PURCHASE_PLAN = [
  { type: 'box', item: '2025 Topps Showcase Hobby Box', source: 'Local shop', cost: 119.99 },
  { type: 'break', item: 'Dodgers team break — Chrome Prospects', source: 'Layton Breaks', cost: 42 },
  { type: 'single', item: 'Shohei Ohtani Gold /2025', source: 'eBay', cost: 88 },
  { type: 'box', item: '2024 Heritage Hobby Box', source: 'Dave & Adam\'s', cost: 94.5 },
  { type: 'single', item: 'Paul Skenes Refractor', source: 'COMC', cost: 31.25 },
  { type: 'break', item: 'Orioles prospects break', source: 'Layton Breaks', cost: 28 },
  { type: 'pack', item: 'Showcase retail blaster ×3', source: 'Target', cost: 71.97 },
  { type: 'trade', item: 'Traded duplicate Judge for Witt Jr.', source: 'Card show', cost: 0 },
  { type: 'single', item: 'Gunnar Henderson Black /71', source: 'eBay', cost: 140 },
  { type: 'gift', item: 'Birthday — 2024 Heritage singles', source: 'Dad', cost: 0 },
];

PURCHASE_PLAN.forEach((p, i) => {
  purchases.push({
    id: `p_demo${String(i + 1).padStart(2, '0')}`,
    date: dateFor(MONTHS - 1 - Math.floor(i / 2), between(3, 26)),
    item: p.item,
    source: p.source,
    type: p.type,
    cost: money2(p.cost),
    notes: '',
  });
});

/* -------------------------------------------------------------- holdings */

const holdings = [];
let n = 0;

for (const set of demoSets) {
  const sub = set.subsets[0];
  const named = Object.keys(setCards.get(set.id));
  const count = set.id.includes('chrome') ? 16 : set.id.includes('heritage') ? 14 : 22;

  for (let i = 0; i < count; i++) {
    n++;
    // Mostly from the named part of the checklist, so tiles show players.
    const number = rand() < 0.82 && named.length
      ? named[between(0, named.length - 1)]
      : `${sub.prefix}${between(sub.from, sub.to)}`;

    const parallel = rand() < 0.62 ? 'base' : pick(set.parallels.slice(1)).id;
    const parDef = set.parallels.find((p) => p.id === parallel);
    const isAuto = rand() < 0.14;
    const isRelic = rand() < 0.1;
    const isRookie = rand() < 0.28;
    const graded = rand() < 0.16;

    // Rarer parallels and hits are worth more -- enough structure that the
    // "most valuable" list and the team chart are not uniform noise. The curve
    // is deliberately gentle and capped: a 1/1 worth 200x the base would make
    // one card the entire collection and flatten every chart behind it.
    const scarcity = parDef?.print ? Math.min(9, Math.max(1, Math.sqrt(500 / parDef.print))) : 1;
    const base = 3 + rand() * 12;
    const value = base * scarcity * (isAuto ? 3 : 1) * (isRelic ? 1.8 : 1) * (graded ? 2.2 : 1);
    const paid = value * (0.45 + rand() * 0.7);

    const purchase = rand() < 0.72 ? pick(purchases) : null;
    const monthsAgo = purchase ? MONTHS - 1 - Math.floor(purchases.indexOf(purchase) / 2) : between(0, MONTHS - 1);

    holdings.push({
      id: `h_demo${String(n).padStart(3, '0')}`,
      setId: set.id,
      number,
      parallel,
      cardType: isAuto ? 'auto' : isRelic ? 'relic' : parallel === 'base' ? 'base' : 'parallel',
      rookie: isRookie,
      auto: isAuto,
      relic: isRelic,
      favorite: rand() < 0.12,
      condition: 'nm-mt',
      grader: graded ? pick(['PSA', 'BGS', 'SGC']) : '',
      grade: graded ? pick(['9', '9.5', '10']) : '',
      cert: graded ? String(between(60000000, 99999999)) : '',
      serialNum: parDef?.print && parDef.print > 1 ? String(between(1, parDef.print)) : '',
      serialOf: null,
      qty: 1,
      price: money2(paid),
      acquired: purchase ? purchase.date : dateFor(monthsAgo, between(2, 27)),
      acquiredVia: purchase ? (purchase.type === 'pack' ? 'pack' : purchase.type) : 'single',
      purchaseId: purchase ? purchase.id : '',
      source: purchase ? purchase.source : pick(['eBay', 'COMC', 'Card show']),
      value: money2(value),
      valueAsOf: dateFor(0, 12),
      valueSource: pick(['130 Point comp', 'eBay sold', 'Card Ladder', '']),
      photoFront: '',
      photoBack: '',
      notes: rand() < 0.15 ? 'Great centering and corners.' : '',
      tags: rand() < 0.2 ? ['pc'] : [],
      added: new Date(Date.now() - between(1, 170) * 864e5).toISOString(),
    });
  }
}

/* ------------------------------------------------------------------ wants */

const wants = [
  { player: 'Paul Skenes', setId: 'demo-2025-chrome-prospects', number: 'CP1', variant: 'Superfractor 1/1', maxPrice: '2500.00', priority: 'high', notes: 'The one.' },
  { player: 'Shohei Ohtani', setId: 'demo-2025-topps-showcase', number: '1', variant: 'Platinum 1/1', maxPrice: '1800.00', priority: 'high', notes: '' },
  { player: 'Roman Anthony', setId: 'demo-2025-chrome-prospects', number: 'CP24', variant: 'Red /5', maxPrice: '400.00', priority: 'normal', notes: 'Watching sold listings.' },
  { player: 'Jackson Holliday', setId: 'demo-2025-topps-showcase', number: '22', variant: 'Black /71', maxPrice: '120.00', priority: 'normal', notes: '' },
  { player: 'Dylan Crews', setId: 'demo-2025-chrome-prospects', number: 'CP23', variant: 'Orange /25', maxPrice: '95.00', priority: 'low', notes: '' },
  { player: 'Mookie Betts', setId: 'demo-2024-heritage', number: '3', variant: 'Black Border /50', maxPrice: '75.00', priority: 'low', notes: 'Only if it drops.' },
].map((w, i) => ({ ...w, id: `w_demo${i + 1}`, added: new Date().toISOString() }));

/* ------------------------------------------------------------------ write */

const collection = await loadCollection();
collection.holdings = [...collection.holdings.filter((h) => !h.id.startsWith('h_demo')), ...holdings];
collection.purchases = [...collection.purchases.filter((p) => !p.id.startsWith('p_demo')), ...purchases];
collection.wants = [...collection.wants.filter((w) => !w.id.startsWith('w_demo')), ...wants];
await writeCollection(collection);

const spend = purchases.reduce((t, p) => t + Number(p.cost), 0);
const value = holdings.reduce((t, h) => t + Number(h.value), 0);
console.log(`loaded demo data:`);
console.log(`  ${demoSets.length} sets   -> data/sets/demo-*.json`);
console.log(`  ${holdings.length} cards  worth about $${value.toFixed(0)}`);
console.log(`  ${purchases.length} purchases totalling $${spend.toFixed(2)}`);
console.log(`  ${wants.length} want-list entries`);
console.log(`\nremove it all with:  node tools/demo-data.mjs --clear`);

await buildManifest(true);
