// Search and filtering over holdings.
//
// The search text is matched against a flattened haystack built once per holding
// and cached, because the alternative -- reaching into the set file for the player
// name on every keystroke for every row -- is what makes collection apps feel slow
// at a few thousand cards.

import { conditionLabel, parallelName, setLabel } from './model.js';

const haystacks = new WeakMap();

export function haystack(holding, set) {
  const cached = haystacks.get(holding);
  if (cached && cached.stamp === holding._stamp) return cached.text;
  const card = set?.cards?.[String(holding.number)];
  const text = [
    card?.player,
    card?.team,
    holding.number,
    set ? setLabel(set) : holding.setId,
    set ? parallelName(set, holding.parallel) : holding.parallel,
    conditionLabel(holding),
    holding.cert,
    holding.source,
    holding.notes,
    (holding.tags || []).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  haystacks.set(holding, { stamp: holding._stamp, text });
  return text;
}

/** Call after editing a holding so its cached haystack is rebuilt. */
export const touch = (holding) => {
  holding._stamp = (holding._stamp || 0) + 1;
};

export const SORTS = {
  'value-desc': { label: 'Value, high to low', fn: (a, b) => num(b.value) - num(a.value) },
  'value-asc': { label: 'Value, low to high', fn: (a, b) => num(a.value) - num(b.value) },
  'gain-desc': { label: 'Biggest gain', fn: (a, b) => (num(b.value) - num(b.price)) - (num(a.value) - num(a.price)) },
  'added-desc': { label: 'Recently added', fn: (a, b) => String(b.added).localeCompare(String(a.added)) },
  'set': { label: 'Set, then number', fn: (a, b) => a.setId.localeCompare(b.setId) || cardNum(a) - cardNum(b) },
  'player': { label: 'Player A–Z', fn: null }, // needs set lookup; handled in apply()
};

const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[$,]/g, '')) : v;
  return Number.isFinite(n) ? n : 0;
};

// "US123" and "BP7" have to sort numerically, not as strings, or #10 lands
// between #1 and #2 in every checklist view.
const cardNum = (h) => parseInt(String(h.number).replace(/\D/g, ''), 10) || 0;

export function apply(holdings, { query = '', setId = '', parallel = '', graded = '', tag = '', sort = 'added-desc' } = {}, getSet) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let out = holdings.filter((h) => {
    if (setId && h.setId !== setId) return false;
    if (parallel && (h.parallel || 'base') !== parallel) return false;
    if (graded === 'yes' && !h.grader) return false;
    if (graded === 'no' && h.grader) return false;
    if (tag && !(h.tags || []).includes(tag)) return false;
    if (!terms.length) return true;
    const hay = haystack(h, getSet(h.setId));
    return terms.every((t) => hay.includes(t));
  });

  if (sort === 'player') {
    out.sort((a, b) => {
      const pa = getSet(a.setId)?.cards?.[String(a.number)]?.player || '￿';
      const pb = getSet(b.setId)?.cards?.[String(b.number)]?.player || '￿';
      return pa.localeCompare(pb) || cardNum(a) - cardNum(b);
    });
  } else {
    out.sort(SORTS[sort]?.fn || SORTS['added-desc'].fn);
  }
  return out;
}

export function allTags(holdings) {
  const counts = new Map();
  for (const h of holdings) for (const t of h.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
