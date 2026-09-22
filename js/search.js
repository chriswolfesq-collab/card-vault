// Search, filtering, and pagination over holdings.
//
// The search text is matched against a flattened haystack built once per holding
// and cached, because the alternative -- reaching into the set file for the player
// name on every keystroke for every row -- is what makes collection apps feel slow
// at a few thousand cards.

import { conditionLabel, setLabel, variantLabel, cardOf, toNumber } from './model.js';
import { teamKey, teamName } from './teams.js';

const haystacks = new WeakMap();

export function haystack(holding, set) {
  const cached = haystacks.get(holding);
  if (cached && cached.stamp === holding._stamp) return cached.text;
  const card = cardOf(set, holding.number);
  const text = [
    card?.player,
    card?.team,
    teamName(teamKey(card?.team)),
    holding.number,
    set ? setLabel(set) : holding.setId,
    variantLabel(holding, set),
    conditionLabel(holding),
    holding.cert,
    holding.source,
    holding.notes,
    holding.rookie ? 'rookie rc' : '',
    holding.auto ? 'auto autograph' : '',
    holding.relic ? 'relic' : '',
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
  if (holding) holding._stamp = (holding._stamp || 0) + 1;
};

// "US123" and "BP7" have to sort numerically, not as strings, or #10 lands
// between #1 and #2 in every checklist view.
const cardNum = (h) => parseInt(String(h.number).replace(/\D/g, ''), 10) || 0;

export const SORTS = {
  'added-desc': { label: 'Date Added (Newest)' },
  'added-asc': { label: 'Date Added (Oldest)' },
  'value-desc': { label: 'Value (High to Low)' },
  'value-asc': { label: 'Value (Low to High)' },
  'gain-desc': { label: 'Biggest Gain' },
  'player': { label: 'Player (A–Z)' },
  'set': { label: 'Set, then Number' },
};

export const PAGE_SIZE = 24;

export function apply(holdings, f, getSet) {
  const terms = String(f.query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);

  const out = holdings.filter((h) => {
    const set = getSet(h.setId);
    if (f.setId && h.setId !== f.setId) return false;
    if (f.year && String(set?.year) !== String(f.year)) return false;
    if (f.brand && set?.brand !== f.brand) return false;
    if (f.parallel && (h.parallel || 'base') !== f.parallel) return false;
    if (f.cardType) {
      if (f.cardType === 'auto' && !h.auto) return false;
      if (f.cardType === 'relic' && !h.relic) return false;
      if (f.cardType === 'rookie' && !h.rookie) return false;
      if (!['auto', 'relic', 'rookie'].includes(f.cardType) && (h.cardType || 'base') !== f.cardType) return false;
    }
    if (f.team) {
      const card = cardOf(set, h.number);
      if (teamKey(card?.team) !== f.team) return false;
    }
    if (f.player) {
      const card = cardOf(set, h.number);
      if ((card?.player || '') !== f.player) return false;
    }
    if (f.graded === 'yes' && !h.grader) return false;
    if (f.graded === 'no' && h.grader) return false;
    if (f.numbered === 'yes' && !(h.serialNum || h.serialOf)) return false;
    if (f.favorite && !h.favorite) return false;
    if (f.tag && !(h.tags || []).includes(f.tag)) return false;
    if (!terms.length) return true;
    const hay = haystack(h, set);
    return terms.every((t) => hay.includes(t));
  });

  const playerName = (h) => cardOf(getSet(h.setId), h.number)?.player || '￿';
  const val = (h) => toNumber(h.value) * Math.max(1, Number(h.qty) || 1);
  const paid = (h) => toNumber(h.price) * Math.max(1, Number(h.qty) || 1);

  const sorters = {
    'added-desc': (a, b) => String(b.added).localeCompare(String(a.added)),
    'added-asc': (a, b) => String(a.added).localeCompare(String(b.added)),
    'value-desc': (a, b) => val(b) - val(a),
    'value-asc': (a, b) => val(a) - val(b),
    'gain-desc': (a, b) => (val(b) - paid(b)) - (val(a) - paid(a)),
    'player': (a, b) => playerName(a).localeCompare(playerName(b)) || cardNum(a) - cardNum(b),
    'set': (a, b) => String(a.setId).localeCompare(String(b.setId)) || cardNum(a) - cardNum(b),
  };
  out.sort(sorters[f.sort] || sorters['added-desc']);
  return out;
}

/** Slice a list into a page, clamping the page number so filters can't strand you. */
export function paginate(rows, page, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page || 1), pages);
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    page: current,
    pages,
    total: rows.length,
    from: rows.length ? start + 1 : 0,
    to: Math.min(start + size, rows.length),
  };
}

/** The distinct values actually present in the collection, for the filter bar. */
export function facets(holdings, getSet) {
  const years = new Set(), brands = new Set(), teams = new Set(), players = new Set(), tags = new Map();
  for (const h of holdings) {
    const set = getSet(h.setId);
    if (set?.year) years.add(set.year);
    if (set?.brand) brands.add(set.brand);
    const card = cardOf(set, h.number);
    const tk = teamKey(card?.team);
    if (tk) teams.add(tk);
    if (card?.player) players.add(card.player);
    for (const t of h.tags || []) tags.set(t, (tags.get(t) || 0) + 1);
  }
  return {
    years: [...years].sort((a, b) => b - a),
    brands: [...brands].sort(),
    teams: [...teams].sort((a, b) => teamName(a).localeCompare(teamName(b))),
    players: [...players].sort(),
    tags: [...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}
