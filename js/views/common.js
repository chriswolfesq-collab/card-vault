// Pieces shared by more than one view.

import {
  cardOf, conditionLabel, isGraded, isNumbered, money, moneyShort, paidOf,
  qtyOf, setLabel, valueOf, variantLabel,
} from '../model.js';
import { teamColor, teamKey } from '../teams.js';
import { icon } from '../icons.js';

export const h = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const initials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

/**
 * A card's artwork. With no photo it falls back to a team-coloured plate rather
 * than a grey box -- a grid of un-photographed cards should still read as a grid
 * of distinct cards, which matters a lot when you are entering a set by number.
 */
export function artwork(holding, set, { number = true } = {}) {
  const card = cardOf(set, holding.number);
  const team = teamKey(card?.team);
  if (holding.photoFront) {
    return `<img src="${h(holding.photoFront)}" alt="" loading="lazy">`;
  }
  return `<span class="plate" style="--team:${teamColor(team)}">
    <span class="initials">${h(initials(card?.player) )}</span>
    ${number ? `<span class="plate-num">#${h(holding.number)}</span>` : ''}
  </span>`;
}

export function cardBadges(holding, set) {
  const out = [];
  if (isGraded(holding)) out.push(`<span class="badge badge-grade">${h(conditionLabel(holding))}</span>`);
  if (holding.auto) out.push('<span class="badge badge-auto">AUTO</span>');
  if (holding.rookie) out.push('<span class="badge badge-rc">RC</span>');
  if (isNumbered(holding, set)) out.push('<span class="badge badge-num">NUM</span>');
  return out.join('');
}

/** The tile used in My Collection, the dashboard and the set grids. */
export function cardTile(holding, set, { fav = true } = {}) {
  const card = cardOf(set, holding.number);
  const value = valueOf(holding);
  const paid = paidOf(holding);
  const delta = value - paid;
  const qty = qtyOf(holding);

  return `
  <article class="card" data-id="${h(holding.id)}" tabindex="0">
    <div class="card-img">
      ${artwork(holding, set)}
      <div class="card-badges">${cardBadges(holding, set)}</div>
      ${fav ? `<button class="card-fav ${holding.favorite ? 'is-on' : ''}" data-fav="${h(holding.id)}"
        aria-label="${holding.favorite ? 'Remove from favourites' : 'Add to favourites'}"
        aria-pressed="${holding.favorite ? 'true' : 'false'}">${icon(holding.favorite ? 'heartFill' : 'heart')}</button>` : ''}
    </div>
    <div class="card-body">
      <div class="card-player ${card?.player ? '' : 'unnamed'}">${h(card?.player || `Card #${holding.number}`)}</div>
      <div class="card-set">${h(set ? setLabel(set) : holding.setId)} #${h(holding.number)}</div>
      <div class="card-variant">${h(variantLabel(holding, set))}${qty > 1 ? ` · ×${qty}` : ''}</div>
      <div class="card-foot">
        ${value
          ? `<span class="card-price">${h(money(value))}</span>`
          : '<span class="card-price none">no value</span>'}
        ${paid && value ? `<span class="card-delta ${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${h(moneyShort(delta))}</span>` : ''}
      </div>
    </div>
  </article>`;
}

/** A small thumbnail for list rows. */
export function thumb(holding, set) {
  return `<span class="thumb">${artwork(holding, set, { number: false })}</span>`;
}

export function pager(page, pages) {
  if (pages <= 1) return '';
  const nums = [];
  const push = (n) => nums.push(
    `<button data-page="${n}" class="${n === page ? 'is-on' : ''}">${n}</button>`
  );

  push(1);
  if (page > 3) nums.push('<span class="gap">…</span>');
  for (let n = Math.max(2, page - 1); n <= Math.min(pages - 1, page + 1); n++) push(n);
  if (page < pages - 2) nums.push('<span class="gap">…</span>');
  if (pages > 1) push(pages);

  return `<div class="pager">
    <button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Previous page">${icon('chevronL')}</button>
    ${nums.join('')}
    <button data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Next page">${icon('chevronR')}</button>
  </div>`;
}

export function empty(iconName, title, body, action = '') {
  return `<div class="empty">
    <div class="ico">${icon(iconName)}</div>
    <h3>${h(title)}</h3>
    <p>${body}</p>
    ${action}
  </div>`;
}

export const tile = (label, value, { delta = '', deltaClass = '', iconName = '', good = false } = {}) => `
  <div class="tile ${good ? 'good' : ''}">
    <b>${h(value)}</b>
    <span class="label">${h(label)}</span>
    ${delta ? `<span class="delta ${deltaClass}">${h(delta)}</span>` : ''}
    ${iconName ? `<span class="ico">${icon(iconName)}</span>` : ''}
  </div>`;

export const bar = (pctValue, good = false) =>
  `<div class="bar ${good ? 'good' : ''}"><i style="width:${(pctValue * 100).toFixed(1)}%"></i></div>`;
