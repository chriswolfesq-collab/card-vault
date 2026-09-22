// Purchases: what you spent and what came back out.
//
// Profit/loss is derived from the holdings that point at each purchase, never
// stored -- so re-valuing one card out of a box immediately re-scores the box.
// A break that cost $42 and yielded eight cards worth $31.50 should say so.

import {
  PURCHASE_TYPES, money, moneyShort, purchaseGroup, purchaseResult, shortDate, toNumber,
} from '../model.js';
import { icon } from '../icons.js';
import { empty, h } from './common.js';

const TABS = [
  { id: '', name: 'All Purchases' },
  { id: 'singles', name: 'Singles' },
  { id: 'boxes', name: 'Packs/Boxes' },
  { id: 'breaks', name: 'Breaks' },
  { id: 'trades', name: 'Trades' },
  { id: 'gifts', name: 'Gifts' },
];

export function purchasesView(S, ui) {
  let rows = [...S.purchases].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (ui.purchaseTab) rows = rows.filter((p) => purchaseGroup(p.type) === ui.purchaseTab);

  const results = rows.map((p) => ({ purchase: p, result: purchaseResult(p, S.holdings) }));
  const spent = results.reduce((n, r) => n + r.result.cost, 0);
  const back = results.reduce((n, r) => n + r.result.value, 0);
  const linked = results.reduce((n, r) => n + r.result.cards, 0);

  return `
  <div class="page-head">
    <div>
      <h1>Purchases</h1>
      <p class="sub">Track your singles, packs, boxes, breaks and more.</p>
    </div>
    <div class="actions"><button class="btn btn-primary" data-act="add-purchase">${icon('add')} Add Purchase</button></div>
  </div>

  ${!S.purchases.length
    ? empty('purchases', 'No purchases logged',
        `Logging what you spend is what turns a pile of cards into a record of whether the boxes were worth opening.
         Link cards to a purchase when you add them and the profit works itself out.`,
        `<button class="btn btn-primary" data-act="add-purchase">${icon('add')} Log a purchase</button>`)
    : `
    <div class="tiles">
      <div class="tile"><b>${h(money(spent))}</b><span class="label">Spent${ui.purchaseTab ? ' (filtered)' : ''}</span></div>
      <div class="tile"><b>${h(money(back))}</b><span class="label">Value of linked cards</span></div>
      <div class="tile"><b class="${back - spent >= 0 ? 'pos' : 'neg'}">${back - spent >= 0 ? '+' : ''}${h(money(back - spent))}</b>
        <span class="label">Net</span></div>
      <div class="tile"><b>${linked.toLocaleString()}</b><span class="label">Cards linked</span></div>
    </div>

    <div class="chiprow">
      ${TABS.map((t) => `<button class="chip ${ui.purchaseTab === t.id ? 'is-on' : ''}" data-ptab="${h(t.id)}">${h(t.name)}</button>`).join('')}
    </div>

    ${results.length ? `<div class="panel"><div class="tablewrap"><table>
      <thead><tr>
        <th>Date</th><th>Item / Source</th><th>Type</th>
        <th class="num">Cost</th><th class="num">Cards</th><th class="num">Est. Value</th>
        <th class="num">Autos</th><th class="num">Numbered</th><th class="num">Profit/Loss</th>
      </tr></thead>
      <tbody>${results.map(({ purchase: p, result: r }) => `
        <tr data-purchase="${h(p.id)}">
          <td style="white-space:nowrap">${h(shortDate(p.date))}</td>
          <td><b>${h(p.item || 'Untitled')}</b>${p.source ? `<br><span style="color:var(--ink-3);font-size:11.5px">${h(p.source)}</span>` : ''}</td>
          <td><span class="pill pill-${h(purchaseGroup(p.type) === 'boxes' ? 'box' : purchaseGroup(p.type).replace(/s$/, ''))}">${
            h(PURCHASE_TYPES.find((t) => t.id === p.type)?.name || p.type)}</span></td>
          <td class="num mono">${h(money(r.cost))}</td>
          <td class="num mono">${r.cards || '—'}</td>
          <td class="num mono">${r.value ? h(money(r.value)) : '—'}</td>
          <td class="num mono">${r.autos || '—'}</td>
          <td class="num mono">${r.numbered || '—'}</td>
          <td class="num mono ${r.cards ? (r.profit >= 0 ? 'pos' : 'neg') : ''}">${
            r.cards ? `${r.profit >= 0 ? '+' : ''}${h(money(r.profit))}` : '—'}</td>
        </tr>`).join('')}</tbody>
    </table></div></div>

    <p class="hint">A purchase shows a profit only once its cards are linked to it and valued.
      Link them from the card editor's <b>Money</b> section.</p>`
    : empty('purchases', 'Nothing in this tab', 'No purchases of that kind yet.')}`}`;
}
