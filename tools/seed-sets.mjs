// Writes the starting set definitions.
//
// These carry STRUCTURE only -- numbering ranges and parallel names/print runs.
// The per-card player names are deliberately empty: they get filled in as you
// enter cards, or imported wholesale from a real checklist with import-checklist.mjs.
// Nothing here is invented.

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './build-manifest.mjs';

const SETS = join(fileURLToPath(new URL('..', import.meta.url)), 'data', 'sets');

// Topps flagship parallel ladder. Print runs follow long-standing Topps
// conventions (Gold is numbered to the year), but VERIFY against the set's own
// printing before you trust a valuation -- every one of these is editable in the app.
const toppsParallels = (year) => [
  { id: 'base', name: 'Base', print: null },
  { id: 'rainbow-foil', name: 'Rainbow Foil', print: null },
  { id: 'gold-foil', name: 'Gold Foil', print: null },
  { id: 'gold', name: 'Gold', print: year },
  { id: 'vintage-stock', name: 'Vintage Stock', print: 99 },
  { id: 'independence-day', name: 'Independence Day', print: 76 },
  { id: 'black', name: 'Black', print: 71 },
  { id: 'fathers-day', name: "Father's Day Powder Blue", print: 50 },
  { id: 'mothers-day', name: "Mother's Day Hot Pink", print: 50 },
  { id: 'memorial-day', name: 'Memorial Day Camo', print: 25 },
  { id: 'platinum', name: 'Platinum', print: 1 },
  { id: 'printing-plate', name: 'Printing Plate', print: 1 },
];

const bowmanParallels = [
  { id: 'base', name: 'Base', print: null },
  { id: 'refractor', name: 'Refractor', print: null },
  { id: 'sky-blue', name: 'Sky Blue Refractor', print: null },
  { id: 'purple', name: 'Purple Refractor', print: null },
  { id: 'aqua', name: 'Aqua Refractor', print: 125 },
  { id: 'green', name: 'Green Refractor', print: 99 },
  { id: 'yellow', name: 'Yellow Refractor', print: 75 },
  { id: 'orange', name: 'Orange Refractor', print: 25 },
  { id: 'red', name: 'Red Refractor', print: 5 },
  { id: 'superfractor', name: 'Superfractor', print: 1 },
  { id: 'printing-plate', name: 'Printing Plate', print: 1 },
];

const sets = [
  {
    id: '2025-topps-series-1', brand: 'Topps', year: 2025, name: 'Series 1',
    subsets: [{ id: 'base', name: 'Base', prefix: '', from: 1, to: 350 }],
    parallels: toppsParallels(2025),
  },
  {
    id: '2025-topps-series-2', brand: 'Topps', year: 2025, name: 'Series 2',
    subsets: [{ id: 'base', name: 'Base', prefix: '', from: 351, to: 700 }],
    parallels: toppsParallels(2025),
  },
  {
    id: '2025-topps-update', brand: 'Topps', year: 2025, name: 'Update Series',
    subsets: [{ id: 'base', name: 'Base', prefix: 'US', from: 1, to: 330 }],
    parallels: toppsParallels(2025),
  },
  {
    id: '2024-topps-series-1', brand: 'Topps', year: 2024, name: 'Series 1',
    subsets: [{ id: 'base', name: 'Base', prefix: '', from: 1, to: 350 }],
    parallels: toppsParallels(2024),
  },
  {
    id: '2024-topps-series-2', brand: 'Topps', year: 2024, name: 'Series 2',
    subsets: [{ id: 'base', name: 'Base', prefix: '', from: 351, to: 700 }],
    parallels: toppsParallels(2024),
  },
  {
    id: '2025-bowman', brand: 'Bowman', year: 2025, name: 'Bowman',
    subsets: [
      { id: 'base', name: 'Veterans', prefix: '', from: 1, to: 150 },
      { id: 'prospects', name: 'Prospects', prefix: 'BP', from: 1, to: 150 },
    ],
    parallels: bowmanParallels,
  },
  {
    id: '2025-bowman-chrome', brand: 'Bowman', year: 2025, name: 'Bowman Chrome',
    subsets: [{ id: 'prospects', name: 'Prospects', prefix: 'BCP', from: 1, to: 150 }],
    parallels: bowmanParallels,
  },
];

await mkdir(SETS, { recursive: true });
for (const set of sets) {
  const body = {
    ...set,
    sport: 'baseball',
    cards: {},
    // Card counts and parallel print runs came from set structure, not from a
    // checklist scrape. Flip this once you've checked it against a real source.
    verified: false,
    source: '',
  };
  await writeFile(join(SETS, `${set.id}.json`), JSON.stringify(body, null, 2) + '\n');
  const total = set.subsets.reduce((n, s) => n + (s.to - s.from + 1), 0);
  console.log(`${set.id.padEnd(24)} ${String(total).padStart(4)} cards  ${set.parallels.length} parallels`);
}

await buildManifest(true);
