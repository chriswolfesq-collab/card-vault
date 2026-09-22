// My Collection: grid or table over everything you own, with the filter row
// from the design and pagination so a few thousand cards stay snappy.

import {
  CARD_TYPES, conditionLabel, money, moneyShort, paidOf, qtyOf, setLabel,
  totals, valueOf, variantLabel, cardOf,
} from '../model.js';
import { SORTS, facets, paginate } from '../search.js';
import { teamName } from '../teams.js';
import { icon } from '../icons.js';
import { cardTile, empty, h, pager, thumb } from './common.js';

export function collectionView(S, ui, visible) {
  const getSet = (id) => S.sets.find((s) => s.id === id);
  const f = facets(S.holdings, getSet);
  const page = paginate(visible, ui.page);
  const t = totals(visible);

  if (!S.holdings.length) {
    return head(S, ui, f, 0) + empty('collection', 'Your collection is empty',
      `Open a set checklist and click the numbers you own, or add a card directly.`,
      `<button class="btn btn-primary" data-goto="sets">${icon('sets')} Open a checklist</button>
       <button class="btn" data-act="add-card">${icon('add')} Add a card</button>`);
  }

  const body = !visible.length
    ? empty('search', 'No cards match', 'Nothing here fits those filters.',
        `<button class="btn" data-act="clear-filters">Clear filters</button>`)
    : ui.layout === 'table'
      ? tableBody(page.rows, getSet)
      : `<div class="cards">${page.rows.map((x) => cardTile(x, getSet(x.setId))).join('')}</div>`;

  return `
    ${head(S, ui, f, visible.length)}
    ${filterRow(S, ui, f)}
    <div class="filters" style="margin-bottom:16px">
      <label>Sort by:
        <select data-filter="sort">${Object.entries(SORTS)
          .map(([k, v]) => `<option value="${k}" ${ui.sort === k ? 'selected' : ''}>${h(v.label)}</option>`).join('')}</select>
      </label>
      <span class="spacer showing">
        Showing ${page.from}–${page.to} of ${page.total.toLocaleString()} card${page.total === 1 ? '' : 's'}${
          visible.length !== S.holdings.length ? ` · ${h(money(t.value))}` : ''}
      </span>
      ${pager(page.page, page.pages)}
    </div>
    ${body}
    ${page.pages > 1 ? `<div class="filters" style="margin:18px 0 0;justify-content:flex-end">${pager(page.page, page.pages)}</div>` : ''}`;
}

function head(S, ui, f, count) {
  return `
  <div class="page-head">
    <div>
      <h1>My Collection</h1>
      <p class="sub">${S.holdings.length.toLocaleString()} holding${S.holdings.length === 1 ? '' : 's'}${
        count !== S.holdings.length ? ` · ${count.toLocaleString()} shown` : ''}</p>
    </div>
    <div class="actions">
      <div class="seg">
        <button data-layout="grid" class="${ui.layout !== 'table' ? 'is-on' : ''}">${icon('grid')} Grid</button>
        <button data-layout="table" class="${ui.layout === 'table' ? 'is-on' : ''}">${icon('table')} Table</button>
      </div>
      <button class="btn btn-primary" data-act="add-card">${icon('add')} Add Card</button>
    </div>
  </div>`;
}

function filterRow(S, ui, f) {
  const sel = (key, label, options, selected) => `
    <select data-filter="${key}">
      <option value="">${h(label)}</option>
      ${options.map((o) => `<option value="${h(o.value)}" ${String(selected) === String(o.value) ? 'selected' : ''}>${h(o.label)}</option>`).join('')}
    </select>`;

  return `<div class="filters">
    ${sel('year', 'All Years', f.years.map((y) => ({ value: y, label: y })), ui.year)}
    ${sel('brand', 'All Manufacturers', f.brands.map((b) => ({ value: b, label: b })), ui.brand)}
    ${sel('team', 'All Teams', f.teams.map((k) => ({ value: k, label: teamName(k) })), ui.team)}
    ${sel('player', 'All Players', f.players.map((p) => ({ value: p, label: p })), ui.player)}
    ${sel('cardType', 'All Card Types', [
      ...CARD_TYPES.map((c) => ({ value: c.id, label: c.name })),
      { value: 'rookie', label: 'Rookie' },
    ], ui.cardType)}
    ${sel('setId', 'All Sets', S.sets.map((s) => ({ value: s.id, label: setLabel(s) })), ui.setId)}
    ${sel('graded', 'Raw & Graded', [{ value: 'yes', label: 'Graded only' }, { value: 'no', label: 'Raw only' }], ui.graded)}
    ${sel('numbered', 'Any Print Run', [{ value: 'yes', label: 'Numbered only' }], ui.numbered)}
    <button class="chip ${ui.favorite ? 'is-on' : ''}" data-act="toggle-fav">${icon('heart')} Favourites</button>
    ${hasFilters(ui) ? `<button class="chip" data-act="clear-filters">Clear</button>` : ''}
  </div>`;
}

export const hasFilters = (ui) =>
  Boolean(ui.year || ui.brand || ui.team || ui.player || ui.cardType || ui.setId ||
          ui.graded || ui.numbered || ui.favorite || ui.tag || ui.query);

function tableBody(rows, getSet) {
  return `<div class="panel"><div class="tablewrap"><table>
    <thead><tr>
      <th>Card</th><th>Set</th><th>Variant</th><th>Condition</th>
      <th class="num">Qty</th><th class="num">Paid</th><th class="num">Value</th><th class="num">Gain</th>
    </tr></thead>
    <tbody>${rows.map((x) => {
      const set = getSet(x.setId);
      const card = cardOf(set, x.number);
      const delta = valueOf(x) - paidOf(x);
      return `<tr data-id="${h(x.id)}">
        <td style="display:flex;align-items:center;gap:10px">${thumb(x, set)}
          <span><b>${h(card?.player || `Card #${x.number}`)}</b><br>
          <span style="color:var(--ink-3);font-size:11.5px">#${h(x.number)}</span></span></td>
        <td>${h(setLabel(set))}</td>
        <td>${h(variantLabel(x, set))}</td>
        <td>${h(conditionLabel(x))}</td>
        <td class="num mono">${qtyOf(x)}</td>
        <td class="num mono">${paidOf(x) ? h(money(paidOf(x))) : '—'}</td>
        <td class="num mono">${valueOf(x) ? h(money(valueOf(x))) : '—'}</td>
        <td class="num mono ${delta >= 0 ? 'pos' : 'neg'}">${paidOf(x) && valueOf(x) ? (delta >= 0 ? '+' : '') + h(moneyShort(delta)) : '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;
}
