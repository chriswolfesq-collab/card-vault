// Derived views over the store. Nothing here is persisted -- every number is
// recomputed from holdings and purchases, so re-valuing one card updates the
// dashboard, the team breakdown, and the profit on the break it came out of
// all at once, with no chance of the three disagreeing.

import {
  cardOf, completion, monthKey, monthLabel, paidOf, purchaseGroup, purchaseResult,
  qtyOf, setLabel, toNumber, totals, valueOf,
} from './model.js';
import { teamKey } from './teams.js';

export function byPlayer(holdings, getSet) {
  const map = new Map();
  for (const h of holdings) {
    const set = getSet(h.setId);
    const card = cardOf(set, h.number);
    const name = card?.player;
    if (!name) continue;
    let row = map.get(name);
    if (!row) {
      row = { player: name, team: teamKey(card?.team), cards: 0, value: 0, paid: 0, autos: 0, relics: 0, rookies: 0, holdings: [] };
      map.set(name, row);
    }
    row.cards += qtyOf(h);
    row.value += valueOf(h);
    row.paid += paidOf(h);
    if (h.auto) row.autos += qtyOf(h);
    if (h.relic) row.relics += qtyOf(h);
    if (h.rookie) row.rookies += qtyOf(h);
    if (!row.team) row.team = teamKey(card?.team);
    row.holdings.push(h);
  }
  return [...map.values()].sort((a, b) => b.value - a.value || b.cards - a.cards);
}

export function byTeam(holdings, getSet) {
  const map = new Map();
  for (const h of holdings) {
    const card = cardOf(getSet(h.setId), h.number);
    const key = teamKey(card?.team);
    if (!key) continue;
    let row = map.get(key);
    if (!row) { row = { team: key, cards: 0, value: 0, paid: 0, autos: 0 }; map.set(key, row); }
    row.cards += qtyOf(h);
    row.value += valueOf(h);
    row.paid += paidOf(h);
    if (h.auto) row.autos += qtyOf(h);
  }
  return [...map.values()].sort((a, b) => b.value - a.value || b.cards - a.cards);
}

/** Sets you actually own cards from, with completion, most-complete first. */
export function bySet(holdings, sets, opts = {}) {
  const used = new Set(holdings.map((h) => h.setId));
  return sets
    .filter((s) => used.has(s.id))
    .map((set) => {
      const mine = holdings.filter((h) => h.setId === set.id);
      return { set, label: setLabel(set), ...totals(mine), completion: completion(set, holdings, opts) };
    })
    .sort((a, b) => b.completion.pct - a.completion.pct || b.value - a.value);
}

export const SPEND_TYPES = [
  { id: 'singles', name: 'Singles' },
  { id: 'breaks', name: 'Breaks' },
  { id: 'boxes', name: 'Packs/Boxes' },
  { id: 'trades', name: 'Trades' },
  { id: 'gifts', name: 'Gifts' },
];

export function spendingByType(purchases) {
  const totalsByGroup = new Map(SPEND_TYPES.map((t) => [t.id, 0]));
  for (const p of purchases) {
    const g = purchaseGroup(p.type);
    totalsByGroup.set(g, (totalsByGroup.get(g) || 0) + toNumber(p.cost));
  }
  return SPEND_TYPES
    .map((t) => ({ label: t.name, value: totalsByGroup.get(t.id) || 0 }))
    .filter((r) => r.value > 0);
}

/**
 * Cumulative collection growth, one point per month that has activity.
 *
 * Cards and value are returned as two separate series on purpose: they are
 * different units and belong on separate plots. Putting a count and a dollar
 * figure on one pair of axes is the chart lie that makes every collection look
 * like it is compounding.
 */
export function growth(holdings) {
  const months = new Map();
  for (const h of holdings) {
    const key = monthKey(h.acquired || h.added);
    if (!key) continue;
    const row = months.get(key) || { cards: 0, value: 0 };
    row.cards += qtyOf(h);
    row.value += valueOf(h);
    months.set(key, row);
  }
  const keys = [...months.keys()].sort();
  let cards = 0, value = 0;
  const cardSeries = [], valueSeries = [];
  for (const k of keys) {
    cards += months.get(k).cards;
    value += months.get(k).value;
    cardSeries.push({ label: monthLabel(k), value: cards, key: k });
    valueSeries.push({ label: monthLabel(k), value, key: k });
  }
  return { cards: cardSeries, value: valueSeries };
}

/** Spent against value acquired, month by month. Same unit, so one scale. */
export function spendVsValue(holdings, purchases, limit = 6) {
  const months = new Map();
  const bump = (key, field, amount) => {
    if (!key) return;
    const row = months.get(key) || { spent: 0, value: 0 };
    row[field] += amount;
    months.set(key, row);
  };
  for (const p of purchases) bump(monthKey(p.date), 'spent', toNumber(p.cost));
  for (const h of holdings) {
    bump(monthKey(h.acquired || h.added), 'value', valueOf(h));
    // A card bought outside a recorded purchase still cost money.
    if (!h.purchaseId) bump(monthKey(h.acquired || h.added), 'spent', paidOf(h));
  }
  return [...months.keys()].sort().slice(-limit).map((k) => ({
    label: monthLabel(k),
    key: k,
    values: [months.get(k).spent, months.get(k).value],
  }));
}

export function recentPurchases(purchases, holdings, limit = 5) {
  return [...purchases]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit)
    .map((p) => ({ purchase: p, result: purchaseResult(p, holdings) }));
}

export function topCards(holdings, getSet, limit = 5) {
  return [...holdings]
    .filter((h) => valueOf(h) > 0)
    .sort((a, b) => valueOf(b) - valueOf(a))
    .slice(0, limit)
    .map((h) => ({ holding: h, set: getSet(h.setId), card: cardOf(getSet(h.setId), h.number) }));
}

export function recentAdditions(holdings, limit = 3) {
  return [...holdings].sort((a, b) => String(b.added).localeCompare(String(a.added))).slice(0, limit);
}

/** The team you collect hardest -- what the dashboard's team panel is about. */
export function focusTeam(holdings, getSet) {
  const teams = byTeam(holdings, getSet);
  return teams[0] || null;
}
