// Dashboard: the five numbers that matter, then the three lists you actually
// act on -- what came in, what's worth the most, what you spent.

import {
  money, moneyShort, moneyWhole, setLabel, shortDate, totals, valueOf, variantLabel,
  cardOf, purchaseResult, toNumber, pct,
} from '../model.js';
import { teamColor, teamName, teamShort } from '../teams.js';
import { bySet, focusTeam, recentAdditions, recentPurchases, topCards } from '../insights.js';
import { icon } from '../icons.js';
import { cardTile, empty, h, initials, tile, thumb } from './common.js';

export function dashboardView(S, ui) {
  const getSet = (id) => S.sets.find((s) => s.id === id);
  const t = totals(S.holdings);

  if (!S.holdings.length) {
    return `
    <div class="welcome">
      <div><h1>Welcome to Card Vault</h1><p>Track. Organize. Collect. Build what you love.</p></div>
    </div>
    ${empty('cards', 'No cards yet',
      `The quickest way in is <b>Sets</b>: open a checklist and click the numbers you own.
       Names and values fill in later — completion works off numbering from the start.`,
      `<button class="btn btn-primary" data-goto="sets">${icon('sets')} Open a checklist</button>
       <button class="btn" data-act="add-card">${icon('add')} Add a card</button>`)}`;
  }

  const focus = focusTeam(S.holdings, getSet);
  const sets = bySet(S.holdings, S.sets, { baseOnly: ui.baseOnly });

  // Month-over-month change in value, which is what the "+12%" on a collection
  // tile has to mean if it means anything.
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const older = S.holdings.filter((x) => (x.acquired || x.added || '').slice(0, 10) < monthAgo);
  const olderValue = totals(older).value;
  const change = olderValue ? (t.value - olderValue) / olderValue : 0;

  return `
  <div class="welcome">
    <div>
      <h1>Welcome back!</h1>
      <p>Track. Organize. Collect. Build what you love.</p>
    </div>
    <div class="quote">“It's more than cards. It's a story.”</div>
  </div>

  <div class="tiles">
    ${tile('Total Cards', t.cards.toLocaleString(), { iconName: 'cards' })}
    ${tile('Est. Collection Value', moneyWhole(t.value), {
      delta: olderValue ? `${change >= 0 ? '+' : ''}${pct(change, 0)}` : '',
      deltaClass: change >= 0 ? 'pos' : 'neg', good: true, iconName: 'dollar',
    })}
    ${tile('Total Spent', moneyWhole(t.paid), { iconName: 'wallet' })}
    ${focus ? tile(`${teamShort(focus.team)} Cards`, focus.cards.toLocaleString(), { iconName: 'star' }) : ''}
    ${tile('Autos & Relics', (t.autos + t.relics).toLocaleString(), { iconName: 'pen' })}
  </div>

  <div class="dash">
    ${focus ? teamPanel(focus, sets) : '<div></div>'}

    <div style="display:grid;gap:16px;min-width:0">
      ${recentPanel(S, getSet)}
      <div class="grid2">
        ${valuablePanel(S, getSet)}
        ${purchasesPanel(S)}
      </div>
    </div>
  </div>`;
}

function teamPanel(focus, sets) {
  return `
  <section class="panel">
    <div class="teamhead">
      <span class="teamdot" style="--team:${teamColor(focus.team)}">${h(focus.team)}</span>
      <div class="grow">
        <h2>${h(teamName(focus.team))}</h2>
        <p style="margin:1px 0 0;font-size:12.5px;color:var(--ink-3)">${focus.cards.toLocaleString()} cards · ${h(moneyShort(focus.value))}</p>
      </div>
    </div>
    <div style="padding:0 16px 10px">
      <button class="btn btn-sm" data-team="${h(focus.team)}" style="width:100%;justify-content:center">View Team Collection →</button>
    </div>
    <div style="border-top:1px solid var(--line-soft);padding:8px 0 10px">
      ${sets.length
        ? sets.slice(0, 8).map((row) => `
          <div class="setrow" data-set="${h(row.set.id)}" role="button" tabindex="0">
            <span class="grow">${h(setLabel(row.set))}</span>
            ${row.completion.pct >= 1
              ? `<span class="done">${icon('check')}</span><span class="done">100%</span>`
              : `<span class="pctnum">${(row.completion.pct * 100).toFixed(row.completion.pct < 0.1 ? 1 : 0)}%</span>`}
          </div>`).join('')
        : '<p class="hint" style="padding:0 16px">No sets tracked yet.</p>'}
    </div>
  </section>`;
}

function recentPanel(S, getSet) {
  const recent = recentAdditions(S.holdings, 3);
  return `
  <section class="panel">
    <div class="panel-head">
      <h2>Recent Additions</h2>
      <button class="link" data-goto="collection">View All</button>
    </div>
    <div class="panel-body">
      <div class="cards">${recent.map((x) => cardTile(x, getSet(x.setId))).join('')}</div>
    </div>
  </section>`;
}

function valuablePanel(S, getSet) {
  const top = topCards(S.holdings, getSet, 4);
  return `
  <section class="panel">
    <div class="panel-head">
      <h2>Most Valuable Cards</h2>
      <button class="link" data-goto="collection" data-sort="value-desc">View All</button>
    </div>
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
        : '<p class="hint" style="padding:14px 16px">No values entered yet.</p>'}
    </div>
  </section>`;
}

function purchasesPanel(S) {
  const recent = recentPurchases(S.purchases, S.holdings, 4);
  return `
  <section class="panel">
    <div class="panel-head">
      <h2>Recent Purchases</h2>
      <button class="link" data-goto="purchases">View All</button>
    </div>
    <div class="rowlist">
      ${recent.length ? recent.map(({ purchase, result }) => `
        <div class="rowitem" data-purchase="${h(purchase.id)}">
          <span class="grow">
            <span class="name">${h(purchase.item || 'Untitled purchase')}</span>
            <span class="meta">${h(shortDate(purchase.date))}${result.cards ? ` · ${result.cards} card${result.cards === 1 ? '' : 's'}` : ''}</span>
          </span>
          <span class="amount">${h(money(toNumber(purchase.cost)))}</span>
        </div>`).join('')
        : `<p class="hint" style="padding:14px 16px">No purchases logged.
           <button class="link" data-goto="purchases" style="padding:0">Add one →</button></p>`}
    </div>
  </section>`;
}
