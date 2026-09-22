// The one idea this app is built on:
//
//   a CARD is a slot in a checklist   (2025 Topps Series 1 #100)
//   a HOLDING is a piece of cardboard you actually own
//
// They are not the same thing and collapsing them breaks everything downstream.
// One card slot can hold several holdings -- a raw base copy, a PSA 9, and a Gold
// /2025 are three holdings pointing at one slot. Keep them separate and set
// completion, duplicate detection, and value totals all read off the same store
// without fighting each other.

export const CONDITIONS = [
  { id: 'gem', name: 'Gem Mint' },
  { id: 'mint', name: 'Mint' },
  { id: 'nm-mt', name: 'Near Mint-Mint' },
  { id: 'nm', name: 'Near Mint' },
  { id: 'ex', name: 'Excellent' },
  { id: 'vg', name: 'Very Good' },
  { id: 'good', name: 'Good' },
  { id: 'poor', name: 'Poor' },
];

export const GRADERS = ['PSA', 'BGS', 'SGC', 'CGC'];

export const uid = () =>
  'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Every card number in a subset, in order, with its prefix applied. */
export function expandSubset(subset) {
  const out = [];
  for (let n = subset.from; n <= subset.to; n++) out.push(`${subset.prefix || ''}${n}`);
  return out;
}

/** Every card number in a set, across all its subsets. */
export function expandSet(set) {
  return (set.subsets || []).flatMap(expandSubset);
}

export function setSize(set) {
  return (set.subsets || []).reduce((n, s) => n + (s.to - s.from + 1), 0);
}

export function setLabel(set) {
  // "2025 Bowman" + name "Bowman" must not come out as "2025 Bowman Bowman",
  // and "Bowman Chrome" must not become "Bowman Bowman Chrome".
  const rest = String(set.name || '').startsWith(set.brand) ? set.name : `${set.brand} ${set.name}`;
  return `${set.year} ${rest}`.trim();
}

export function parallelName(set, parallelId) {
  const p = (set?.parallels || []).find((x) => x.id === parallelId);
  return p ? p.name : parallelId || 'Base';
}

/** "PSA 10" for a graded card, otherwise the raw condition, otherwise "Raw". */
export function conditionLabel(holding) {
  if (holding.grader && holding.grade != null && holding.grade !== '') {
    return `${holding.grader} ${holding.grade}`;
  }
  const c = CONDITIONS.find((x) => x.id === holding.condition);
  return c ? c.name : 'Raw';
}

export const isGraded = (h) => Boolean(h.grader && h.grade !== '' && h.grade != null);

/** "/2025" or "12/99" when the card is serial-numbered. */
export function serialLabel(holding, set) {
  const print = holding.serialOf ?? (set?.parallels || []).find((p) => p.id === holding.parallel)?.print;
  if (!print) return '';
  return holding.serialNum ? `${holding.serialNum}/${print}` : `/${print}`;
}

const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[$,]/g, '')) : v;
  return Number.isFinite(n) ? n : 0;
};

export const qtyOf = (h) => Math.max(1, Number(h.qty) || 1);
export const paidOf = (h) => num(h.price) * qtyOf(h);
export const valueOf = (h) => num(h.value) * qtyOf(h);

/**
 * Totals for any slice of the collection. `unvalued` is the number of holdings
 * with no value entered -- shown alongside the total so a big number is never
 * mistaken for a complete one.
 */
export function totals(holdings) {
  let paid = 0, value = 0, cards = 0, unvalued = 0, graded = 0;
  for (const h of holdings) {
    paid += paidOf(h);
    value += valueOf(h);
    cards += qtyOf(h);
    if (!num(h.value)) unvalued++;
    if (isGraded(h)) graded++;
  }
  return { paid, value, cards, unvalued, graded, gain: value - paid, holdings: holdings.length };
}

/**
 * Set completion.
 *
 * `baseOnly` is the difference between two genuinely different questions:
 * "have I finished the base set" (base parallel only) and "do I have this number
 * in any form at all". Both are real; the toggle belongs to the user, not to me.
 */
export function completion(set, holdings, { baseOnly = false } = {}) {
  const numbers = expandSet(set);
  const owned = new Set();
  for (const h of holdings) {
    if (h.setId !== set.id) continue;
    if (baseOnly && (h.parallel || 'base') !== 'base') continue;
    owned.add(String(h.number));
  }
  const have = numbers.filter((n) => owned.has(n));
  const missing = numbers.filter((n) => !owned.has(n));
  return {
    total: numbers.length,
    have: have.length,
    missing,
    ownedSet: owned,
    pct: numbers.length ? have.length / numbers.length : 0,
  };
}

export const money = (n) =>
  (n < 0 ? '-' : '') +
  '$' +
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const moneyShort = (n) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  return `${sign}$${a.toFixed(a % 1 === 0 ? 0 : 2)}`;
};
