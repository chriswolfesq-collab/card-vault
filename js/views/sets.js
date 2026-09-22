// Sets: completion across every checklist, then the set itself as a grid of
// numbers you can click to add.
//
// The grid is paginated rather than virtualised -- a 350-card set is 15 pages
// of 24, which is how the design shows it and is far less code than a virtual
// list that has to be right about scroll height.

import {
  cardOf, completion, expandSubset, money, setLabel, setSize, totals,
} from '../model.js';
import { paginate } from '../search.js';
import { teamColor, teamKey, teamName } from '../teams.js';
import { icon } from '../icons.js';
import { artwork, bar, cardBadges, empty, h, initials, pager } from './common.js';

export function setsView(S, ui) {
  if (ui.openSet) return setDetail(S, ui);

  if (!S.sets.length) {
    return empty('sets', 'No sets yet', 'Add one from Settings, or run <code>node tools/seed-sets.mjs</code>.');
  }

  const cards = S.sets.map((set) => {
    const c = completion(set, S.holdings, { baseOnly: ui.baseOnly });
    const t = totals(S.holdings.filter((x) => x.setId === set.id));
    return `
    <article class="panel" data-set="${h(set.id)}" tabindex="0" style="cursor:pointer;padding:16px">
      <h3 style="font-size:15px">${h(setLabel(set))}</h3>
      <p style="margin:3px 0 12px;font-size:12.5px;color:var(--ink-3)">
        ${setSize(set).toLocaleString()} cards · ${(set.parallels || []).length} parallels${
          set.verified ? '' : ' · <span title="Structure not checked against a published checklist">unverified</span>'}
      </p>
      ${bar(c.pct, c.pct >= 1)}
      <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-3);margin-top:8px">
        <span>${c.have} / ${c.total} <b style="color:var(--ink)">${(c.pct * 100).toFixed(1)}%</b></span>
        <span>${t.value ? h(money(t.value)) : ''}</span>
      </div>
    </article>`;
  }).join('');

  return `
  <div class="page-head">
    <div><h1>Sets</h1><p class="sub">Click a set to open its checklist. Click a card number to add it.</p></div>
    <div class="actions">
      <button class="chip ${ui.baseOnly ? 'is-on' : ''}" data-act="base-only">Base set only</button>
      <button class="btn" data-goto="settings">${icon('add')} New Set</button>
    </div>
  </div>
  <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(285px,1fr))">${cards}</div>`;
}

function setDetail(S, ui) {
  const set = S.sets.find((s) => s.id === ui.openSet);
  if (!set) return empty('sets', 'Set not found', 'That set is no longer on file.');

  const mine = S.holdings.filter((x) => x.setId === set.id);
  const c = completion(set, S.holdings, { baseOnly: ui.baseOnly });
  const t = totals(mine);

  const subsets = set.subsets || [];
  const activeId = subsets.find((s) => s.id === ui.subset)?.id || subsets[0]?.id;
  const subset = subsets.find((s) => s.id === activeId);
  if (!subset) return empty('sets', 'This set has no numbering', 'Edit the set to give it a card range.');

  // Copies per number, so duplicates and parallels are visible on the grid.
  const owned = new Map();
  for (const x of mine) {
    if (ui.baseOnly && (x.parallel || 'base') !== 'base') continue;
    const key = String(x.number);
    if (!owned.has(key)) owned.set(key, []);
    owned.get(key).push(x);
  }

  let numbers = expandSubset(subset);
  if (ui.setFilter === 'owned') numbers = numbers.filter((n) => owned.has(n));
  if (ui.setFilter === 'missing') numbers = numbers.filter((n) => !owned.has(n));
  if (ui.setQuery) {
    const q = ui.setQuery.toLowerCase();
    numbers = numbers.filter((n) =>
      n.toLowerCase().includes(q) || (cardOf(set, n)?.player || '').toLowerCase().includes(q));
  }

  const page = paginate(numbers, ui.page, 24);
  const teamOfSet = teamKey(cardOf(set, numbers[0])?.team);

  const tiles = page.rows.map((n) => {
    const card = cardOf(set, n);
    const copies = owned.get(n) || [];
    const first = copies[0];
    const team = teamKey(card?.team);

    return `
    <article class="card ${copies.length ? 'owned' : ''}" data-number="${h(n)}" tabindex="0">
      <div class="card-img">
        ${first
          ? artwork(first, set)
          : `<span class="plate" style="--team:${card ? teamColor(team) : '#94a3b8'};opacity:.5">
               <span class="initials">${h(card ? initials(card.player) : '—')}</span>
               <span class="plate-num">#${h(n)}</span></span>`}
        ${first ? `<div class="card-badges">${cardBadges(first, set)}</div>` : ''}
        ${copies.length ? `<span class="tick">${copies.length > 1 ? copies.length : '✓'}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-player ${card?.player ? '' : 'unnamed'}">${h(card?.player || `Card #${n}`)}</div>
        <div class="card-set">#${h(n)}${card?.team ? ` · ${h(card.team)}` : ''}</div>
      </div>
    </article>`;
  }).join('');

  return `
  <div class="crumbs"><button data-goto="sets">Sets</button> &rsaquo; ${h(setLabel(set))}</div>

  <div class="page-head">
    <span class="teamdot" style="--team:${teamOfSet ? teamColor(teamOfSet) : 'var(--brand)'};width:46px;height:46px;font-size:14px">
      ${h(teamOfSet || set.brand.slice(0, 3).toUpperCase())}</span>
    <div>
      <h1>${h(setLabel(set))}</h1>
      <p class="sub">${setSize(set).toLocaleString()} cards${t.value ? ` · ${h(money(t.value))} owned` : ''}${
        set.verified ? '' : ' · structure unverified'}</p>
    </div>
    <div class="actions" style="align-items:flex-end;flex-direction:column;gap:6px">
      <div style="display:flex;align-items:center;gap:12px">
        <b style="font-size:17px">${c.have} / ${c.total}</b>
        <span class="chip ${ui.baseOnly ? 'is-on' : ''}" data-act="base-only" role="button">Base only</span>
      </div>
      <div style="width:220px">${bar(c.pct, c.pct >= 1)}</div>
      <span style="font-size:12px;color:var(--ink-3)">${(c.pct * 100).toFixed(1)}% Complete</span>
    </div>
  </div>

  ${subsets.length > 1 ? `<div class="chiprow">${subsets.map((sub) => {
    const count = expandSubset(sub).filter((n) => owned.has(n)).length;
    return `<button class="chip ${sub.id === activeId ? 'is-on' : ''}" data-subset="${h(sub.id)}">
      ${h(sub.name)} <span style="opacity:.7">${count}/${sub.to - sub.from + 1}</span></button>`;
  }).join('')}</div>` : ''}

  <div class="filters">
    <label>Show:
      <select data-filter="setFilter">
        <option value="" ${!ui.setFilter ? 'selected' : ''}>All Cards</option>
        <option value="owned" ${ui.setFilter === 'owned' ? 'selected' : ''}>Owned</option>
        <option value="missing" ${ui.setFilter === 'missing' ? 'selected' : ''}>Missing</option>
      </select>
    </label>
    <input type="search" data-filter="setQuery" placeholder="Search this set…" value="${h(ui.setQuery)}" style="max-width:220px">
    <span class="spacer showing">Showing ${page.from}–${page.to} of ${page.total.toLocaleString()}</span>
    ${pager(page.page, page.pages)}
  </div>

  ${numbers.length
    ? `<div class="cards dense">${tiles}</div>
       ${page.pages > 1 ? `<div class="filters" style="margin:18px 0 0;justify-content:flex-end">${pager(page.page, page.pages)}</div>` : ''}`
    : empty('sets', 'Nothing to show', 'No cards in this subset match that filter.')}

  ${c.missing.length && !ui.setFilter ? `<div class="note" style="margin-top:18px">
    Missing ${c.missing.length.toLocaleString()}: <span class="mono">${c.missing.slice(0, 40).map(h).join(', ')}${
      c.missing.length > 40 ? ` … +${c.missing.length - 40} more` : ''}</span></div>` : ''}`;
}
