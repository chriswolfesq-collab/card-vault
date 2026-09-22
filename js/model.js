// The one idea this app is built on:
//
//   a CARD is a slot in a checklist   (2025 Topps Series 1 #100)
//   a HOLDING is a piece of cardboard you actually own
//   a PURCHASE is a transaction that produced holdings
//
// They are three different things and collapsing any pair breaks something.
// One card slot holds many holdings -- a raw base copy, a PSA 10, and a Gold
// /2025 are three holdings on one slot. One purchase yields many holdings: a
// $120 hobby box becomes 24 cards, and the only way to know whether the box was
// worth opening is to sum what came out of it. Keep all three apart and set
// completion, value totals, and break profit/loss each read off the same store
// without fighting each other.

import { teamKey } from './teams.js';

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

export const CARD_TYPES = [
  { id: 'base', name: 'Base' },
  { id: 'insert', name: 'Insert' },
  { id: 'parallel', name: 'Parallel' },
  { id: 'auto', name: 'Autograph' },
  { id: 'relic', name: 'Relic' },
];

export const ACQUIRED_VIA = [
  { id: 'single', name: 'Single' },
  { id: 'pack', name: 'Pack' },
  { id: 'box', name: 'Box' },
  { id: 'break', name: 'Break' },
  { id: 'trade', name: 'Trade' },
  { id: 'gift', name: 'Gift' },
];

export const PURCHASE_TYPES = [
  { id: 'single', name: 'Single', group: 'singles' },
  { id: 'box', name: 'Box', group: 'boxes' },
  { id: 'pack', name: 'Pack', group: 'boxes' },
  { id: 'break', name: 'Break', group: 'breaks' },
  { id: 'trade', name: 'Trade', group: 'trades' },
  { id: 'gift', name: 'Gift', group: 'gifts' },
];

export const uid = (p = 'h') =>
  p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ------------------------------------------------------------- checklists */

/** Every card number in a subset, in order, with its prefix applied. */
export function expandSubset(subset) {
  const out = [];
  for (let n = subset.from; n <= subset.to; n++) out.push(`${subset.prefix || ''}${n}`);
  return out;
}

export function expandSet(set) {
  return (set.subsets || []).flatMap(expandSubset);
}

export function setSize(set) {
  return (set.subsets || []).reduce((n, s) => n + (s.to - s.from + 1), 0);
}

export function setLabel(set) {
  if (!set) return 'Unknown set';
  // "2025 Bowman" + name "Bowman" must not come out as "2025 Bowman Bowman",
  // and "Bowman Chrome" must not become "Bowman Bowman Chrome".
  const rest = String(set.name || '').startsWith(set.brand) ? set.name : `${set.brand} ${set.name}`;
  return `${set.year} ${rest}`.trim();
}

export function parallelName(set, parallelId) {
  const p = (set?.parallels || []).find((x) => x.id === parallelId);
  return p ? p.name : parallelId || 'Base';
}

export const cardOf = (set, number) => set?.cards?.[String(number)] || null;
export const playerOf = (set, holding) => cardOf(set, holding.number)?.player || '';
export const teamOf = (set, holding) => teamKey(cardOf(set, holding.number)?.team || '');

/* -------------------------------------------------------------- holdings */

/** "PSA 10" for a graded card, otherwise the raw condition. */
export function conditionLabel(holding) {
  if (holding.grader && holding.grade != null && holding.grade !== '') {
    return `${holding.grader} ${holding.grade}`;
  }
  const c = CONDITIONS.find((x) => x.id === holding.condition);
  return c ? c.name : 'Raw';
}

export const isGraded = (h) => Boolean(h.grader && h.grade !== '' && h.grade != null);

export const printRun = (holding, set) =>
  holding.serialOf ?? (set?.parallels || []).find((p) => p.id === holding.parallel)?.print ?? null;

/** "/2025" or "12/99" when the card is serial-numbered. */
export function serialLabel(holding, set) {
  const print = printRun(holding, set);
  if (!print) return '';
  return holding.serialNum ? `${holding.serialNum}/${print}` : `/${print}`;
}

export const isNumbered = (holding, set) => printRun(holding, set) != null;

/** The short descriptor under a card's name: "Gold Refractor /50", "Auto /25". */
export function variantLabel(holding, set) {
  const bits = [];
  const par = holding.parallel && holding.parallel !== 'base' ? parallelName(set, holding.parallel) : '';
  if (par) bits.push(par);
  else if (holding.cardType && holding.cardType !== 'base') {
    bits.push(CARD_TYPES.find((t) => t.id === holding.cardType)?.name || holding.cardType);
  }
  if (holding.auto && !/auto/i.test(bits.join(' '))) bits.push('Auto');
  if (holding.relic && !/relic/i.test(bits.join(' '))) bits.push('Relic');
  const serial = serialLabel(holding, set);
  if (serial) bits.push(serial);
  return bits.join(' ') || 'Base';
}

const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[$,]/g, '')) : v;
  return Number.isFinite(n) ? n : 0;
};

export const qtyOf = (h) => Math.max(1, Number(h.qty) || 1);
export const paidOf = (h) => num(h.price) * qtyOf(h);
export const valueOf = (h) => num(h.value) * qtyOf(h);
export const toNumber = num;

/**
 * Totals for any slice of the collection. `unvalued` is carried alongside the
 * total so a big number is never mistaken for a complete one.
 */
export function totals(holdings) {
  let paid = 0, value = 0, cards = 0, unvalued = 0, graded = 0, autos = 0, relics = 0, rookies = 0;
  for (const h of holdings) {
    paid += paidOf(h);
    value += valueOf(h);
    cards += qtyOf(h);
    if (!num(h.value)) unvalued++;
    if (isGraded(h)) graded++;
    if (h.auto) autos += qtyOf(h);
    if (h.relic) relics += qtyOf(h);
    if (h.rookie) rookies += qtyOf(h);
  }
  return {
    paid, value, cards, unvalued, graded, autos, relics, rookies,
    gain: value - paid,
    roi: paid ? (value - paid) / paid : 0,
    holdings: holdings.length,
  };
}

/**
 * Set completion.
 *
 * `baseOnly` separates two genuinely different questions: "have I finished the
 * base set" and "do I have this number in any form". Both are real; which one
 * you mean is the user's call, not mine.
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
  return {
    total: numbers.length,
    have: have.length,
    missing: numbers.filter((n) => !owned.has(n)),
    ownedSet: owned,
    pct: numbers.length ? have.length / numbers.length : 0,
  };
}

/* -------------------------------------------------------------- purchases */

/**
 * What a purchase actually returned. A $120 hobby box is a good buy or a bad one
 * depending entirely on the holdings that point back at it, so this is derived,
 * never stored -- re-valuing a card re-values every break it came out of.
 */
export function purchaseResult(purchase, holdings) {
  const from = holdings.filter((h) => h.purchaseId === purchase.id);
  const t = totals(from);
  const cost = num(purchase.cost);
  return {
    holdings: from,
    cards: t.cards,
    value: t.value,
    autos: t.autos,
    numbered: from.filter((h) => h.serialNum || h.serialOf).length,
    cost,
    profit: t.value - cost,
    // A gift or a trade with no cash cost has no meaningful profit percentage.
    pct: cost ? (t.value - cost) / cost : null,
  };
}

export const purchaseGroup = (type) =>
  PURCHASE_TYPES.find((t) => t.id === type)?.group || 'singles';

/* ------------------------------------------------------------- formatting */

export const money = (n) =>
  (n < 0 ? '-' : '') + '$' +
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const moneyShort = (n) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  return `${sign}$${a.toFixed(a % 1 === 0 ? 0 : 2)}`;
};

export const moneyWhole = (n) =>
  (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');

export const pct = (n, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export const shortDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const monthKey = (iso) => (iso || '').slice(0, 7);
export const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
};
