// Stats & Analytics.
//
// Two rules shape this page. Collection growth is TWO plots, not one with two
// y-scales: a card count and a dollar figure share no unit, and stacking them on
// one axis is the trick that makes every collection look like it is compounding.
// Spending against value acquired IS one chart, because both are dollars.

import {
  money, moneyShort, moneyWhole, pct, setLabel, totals, valueOf, variantLabel, cardOf,
} from '../model.js';
import { byTeam, growth, spendVsValue, spendingByType, topCards } from '../insights.js';
import { barsH, donut, groupedBars, isDark, line } from '../charts.js';
import { teamChartColor, teamShort } from '../teams.js';
import { empty, h, thumb } from './common.js';

export function statsView(S, ui) {
  const getSet = (id) => S.sets.find((s) => s.id === id);
  const t = totals(S.holdings);

  if (!S.holdings.length && !S.purchases.length) {
    return empty('stats', 'Nothing to analyse yet',
      'Add cards and log what you spend, and this page fills in on its own.');
  }

  const teams = byTeam(S.holdings, getSet).slice(0, 8);
  const g = growth(S.holdings);
  const svv = spendVsValue(S.holdings, S.purchases);
  const spend = spendingByType(S.purchases);
  const top = topCards(S.holdings, getSet, 5);

  return `
  <div class="page-head">
    <div><h1>Stats &amp; Analytics</h1><p class="sub">See the bigger picture.</p></div>
  </div>

  <div class="tiles">
    <div class="tile"><b>${h(moneyWhole(t.paid))}</b><span class="label">Total Spent</span></div>
    <div class="tile good"><b>${h(moneyWhole(t.value))}</b><span class="label">Est. Collection Value</span></div>
    <div class="tile"><b class="${t.gain >= 0 ? 'pos' : 'neg'}">${t.gain >= 0 ? '+' : ''}${h(moneyWhole(t.gain))}</b>
      <span class="label">Gain / Loss</span>
      ${t.paid ? `<span class="delta ${t.roi >= 0 ? 'pos' : 'neg'}">${t.roi >= 0 ? '+' : ''}${pct(t.roi, 0)} on cost</span>` : ''}</div>
    <div class="tile"><b>${t.cards.toLocaleString()}</b><span class="label">Total Cards</span></div>
    <div class="tile"><b>${(t.autos + t.relics).toLocaleString()}</b><span class="label">Autos &amp; Relics</span></div>
  </div>

  ${t.unvalued ? `<div class="note">${t.unvalued} holding${t.unvalued === 1 ? '' : 's'} have no value entered and count as $0 here.
    Every figure on this page is built from values you typed in — nothing fetches live comps.</div>` : ''}

  <div class="grid3" style="margin-bottom:16px">
    <section class="panel">
      <div class="panel-head"><h2>Spending by Type</h2></div>
      <div class="panel-body">${spend.length
        ? donut(spend)
        : '<p class="chart-empty">Log a purchase to see where the money goes.</p>'}</div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Collection Value by Team</h2></div>
      <div class="panel-body">${teams.length
        ? barsH(teams.map((r) => ({ label: teamShort(r.team), value: r.value, color: teamChartColor(r.team, isDark()) })))
        : '<p class="chart-empty">No team data yet.</p>'}</div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Collection Growth</h2></div>
      <div class="panel-body">
        ${g.cards.length > 1
          ? line(g.cards, { label: 'Cards', color: 'var(--series-1)', format: (v) => v.toLocaleString() }) +
            line(g.value, { label: 'Est. value', color: 'var(--series-3)', format: moneyShort })
          : '<p class="chart-empty">Two months of history needed before a trend means anything.</p>'}
      </div>
    </section>
  </div>

  <div class="grid2">
    <section class="panel">
      <div class="panel-head"><h2>Top 5 Most Valuable Cards</h2></div>
      <div class="rowlist">
        ${top.length ? top.map(({ holding, set, card }) => `
          <div class="rowitem" data-id="${h(holding.id)}">
            ${thumb(holding, set)}
            <span class="grow">
              <span class="name">${h(card?.player || `Card #${holding.number}`)}</span>
              <span class="meta">${h(setLabel(set))} · ${h(variantLabel(holding, set))}</span>
            </span>
            <span class="amount">${h(money(valueOf(holding)))}</span>
          </div>`).join('')
          : '<p class="chart-empty">No values entered yet.</p>'}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Spending vs. Value by Month</h2></div>
      <div class="panel-body">${svv.length
        ? groupedBars(svv, { series: ['Spent', 'Est. value'] })
        : '<p class="chart-empty">No dated activity yet.</p>'}</div>
    </section>
  </div>`;
}
