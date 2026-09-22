// Load a real checklist into a set file.
//
//   node tools/import-checklist.mjs 2025-topps-series-1 ~/Downloads/checklist.csv
//   node tools/import-checklist.mjs 2025-topps-series-1 list.txt --dry
//
// Accepts CSV, TSV, or the loose "100 Shohei Ohtani Dodgers" shape you get from
// pasting a checklist off a web page. Card numbers already named are left alone
// unless --overwrite is passed, so re-running after a partial import is safe.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [setId, file, ...flags] = process.argv.slice(2);
const dry = flags.includes('--dry');
const overwrite = flags.includes('--overwrite');

if (!setId || !file) {
  console.error('usage: node tools/import-checklist.mjs <set-id> <file> [--dry] [--overwrite]');
  process.exit(1);
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const setPath = join(ROOT, 'data', 'sets', `${setId}.json`);

const set = JSON.parse(await readFile(setPath, 'utf8')).valueOf();
const raw = await readFile(file, 'utf8');

// Split a line into [number, player, team]. Delimited formats win; the loose
// form is the fallback because it guesses, and guessing should be last.
function parseLine(line) {
  const text = line.trim();
  if (!text) return null;

  const delim = text.includes('\t') ? '\t' : text.includes(',') ? ',' : null;
  if (delim) {
    const cols = text.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));
    const [number, player, team] = cols;
    if (!number || !player) return null;
    // A card number always contains a digit. This is also what drops the header
    // row without having to recognise every way a source spells "Card #".
    if (!/\d/.test(number)) return null;
    return { number: number.replace(/^#/, ''), player, team: team || '' };
  }

  // "100 Shohei Ohtani Dodgers" -- number, then name, then an optional team.
  // Only the number is parsed positionally; everything else stays as the player
  // name rather than being split on a guess about where a team starts.
  const m = text.match(/^#?([A-Z]*\d+[A-Za-z]*)\s+(.+)$/);
  if (!m) return null;
  return { number: m[1], player: m[2].trim(), team: '' };
}

const rows = raw.split(/\r?\n/).map(parseLine).filter(Boolean);

// A number outside the set's declared ranges means either the file is for a
// different set or the ranges are wrong. Either way, say so instead of writing it.
const valid = new Set();
for (const sub of set.subsets || []) {
  for (let n = sub.from; n <= sub.to; n++) valid.add(`${sub.prefix || ''}${n}`);
}

let added = 0, updated = 0, skipped = 0;
const strays = [];

for (const row of rows) {
  if (!valid.has(row.number)) { strays.push(row.number); continue; }
  const existing = set.cards[row.number];
  if (existing && !overwrite) { skipped++; continue; }
  set.cards[row.number] = { player: row.player, team: row.team || existing?.team || '' };
  existing ? updated++ : added++;
}

console.log(`parsed ${rows.length} lines from ${file}`);
console.log(`  added    ${added}`);
console.log(`  updated  ${updated}`);
console.log(`  skipped  ${skipped}${skipped ? ' (already named -- pass --overwrite to replace)' : ''}`);
if (strays.length) {
  console.log(`  OUTSIDE THIS SET: ${strays.length} -> ${strays.slice(0, 12).join(', ')}${strays.length > 12 ? ' …' : ''}`);
  console.log(`  (the set declares ${valid.size} numbers; check you have the right set, or fix its ranges)`);
}

const named = Object.keys(set.cards).length;
console.log(`  set now names ${named} of ${valid.size} cards`);

if (dry) {
  console.log('\n--dry: nothing written');
} else {
  set.source = file;
  await writeFile(setPath, JSON.stringify(set, null, 2) + '\n');
  console.log(`\nwrote ${setPath}`);
  console.log('Mark "verified": true in that file once you have checked it against the source.');
}
