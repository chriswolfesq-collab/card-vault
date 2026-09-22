// The three edit forms. Each returns the innards of the one <dialog>.

import {
  ACQUIRED_VIA, CARD_TYPES, CONDITIONS, GRADERS, PURCHASE_TYPES,
  cardOf, qtyOf, setLabel, shortDate, toNumber,
} from '../model.js';
import { TEAM_KEYS, teamName } from '../teams.js';
import { PRIORITIES } from './wants.js';
import { h } from './common.js';

const photoSlot = (side, path, bust = 0) => `
  <div class="photo" data-side="${side}">
    ${path
      ? `<img src="${h(path)}${bust ? `?v=${bust}` : ''}" alt="${side}">
         <button type="button" class="clear" data-clear="${side}" title="Remove">&times;</button>`
      : `<span>+ ${side}</span>`}
  </div>`;

export { photoSlot };

export function cardForm(holding, S, { isNew }) {
  const set = S.sets.find((s) => s.id === holding.setId);
  const card = cardOf(set, holding.number);
  const parallels = set?.parallels || [{ id: 'base', name: 'Base', print: null }];

  return `
  <div class="editor-head">
    <div>
      <h2>${isNew ? 'Add Card' : h(card?.player || `Card #${holding.number}`)}</h2>
      <p class="sub">${h(set ? setLabel(set) : 'Pick a set')}${holding.number ? ` · #${h(holding.number)}` : ''}</p>
    </div>
    <button class="btn btn-sm" value="cancel" formnovalidate>Close</button>
  </div>

  <div class="editor-body">
    <fieldset>
      <legend>Card</legend>
      <div class="row">
        <label class="field" style="grid-column:span 2"><span>Set</span>
          <select name="setId" required>
            <option value="">Choose a set…</option>
            ${S.sets.map((s) => `<option value="${h(s.id)}" ${s.id === holding.setId ? 'selected' : ''}>${h(setLabel(s))}</option>`).join('')}
          </select></label>
        <label class="field"><span>Card number</span><input type="text" name="number" value="${h(holding.number)}" required placeholder="100"></label>
        <label class="field"><span>Quantity</span><input type="number" name="qty" min="1" value="${qtyOf(holding)}"></label>
      </div>
      <div class="row">
        <label class="field" style="grid-column:span 2"><span>Player${card?.player ? '' : ' — saved to the checklist'}</span>
          <input type="text" name="player" value="${h(card?.player || '')}" placeholder="Name on the card" list="player-list"></label>
        <label class="field"><span>Team</span>
          <select name="team">
            <option value="">—</option>
            ${TEAM_KEYS.map((k) => `<option value="${k}" ${k === (card?.team || '').toUpperCase() ? 'selected' : ''}>${h(teamName(k))}</option>`).join('')}
          </select></label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Version</legend>
      <div class="row">
        <label class="field"><span>Parallel</span>
          <select name="parallel">${parallels.map((p) =>
            `<option value="${h(p.id)}" ${p.id === (holding.parallel || 'base') ? 'selected' : ''}>${h(p.name)}${p.print ? ` /${p.print}` : ''}</option>`).join('')}</select></label>
        <label class="field"><span>Card type</span>
          <select name="cardType">${CARD_TYPES.map((t) =>
            `<option value="${t.id}" ${t.id === (holding.cardType || 'base') ? 'selected' : ''}>${h(t.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Serial #</span><input type="number" name="serialNum" value="${h(holding.serialNum)}" placeholder="12"></label>
        <label class="field"><span>Out of</span><input type="number" name="serialOf" value="${h(holding.serialOf ?? '')}" placeholder="auto"></label>
      </div>
      <div class="row" style="grid-template-columns:repeat(3,1fr)">
        <label class="check"><input type="checkbox" name="rookie" ${holding.rookie ? 'checked' : ''}> Rookie card</label>
        <label class="check"><input type="checkbox" name="auto" ${holding.auto ? 'checked' : ''}> Autograph</label>
        <label class="check"><input type="checkbox" name="relic" ${holding.relic ? 'checked' : ''}> Relic</label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Condition</legend>
      <div class="row">
        <label class="field"><span>Grader</span>
          <select name="grader"><option value="">Raw (ungraded)</option>
            ${GRADERS.map((g) => `<option value="${g}" ${g === holding.grader ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <label class="field"><span>Grade</span><input type="text" name="grade" value="${h(holding.grade)}" placeholder="10"></label>
        <label class="field"><span>Cert #</span><input type="text" name="cert" value="${h(holding.cert)}"></label>
        <label class="field"><span>Raw condition</span>
          <select name="condition">${CONDITIONS.map((c) =>
            `<option value="${c.id}" ${c.id === holding.condition ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select></label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Money</legend>
      <div class="row">
        <label class="field"><span>Paid (each)</span><input type="text" name="price" value="${h(holding.price)}" placeholder="0.00" inputmode="decimal"></label>
        <label class="field"><span>Acquired</span><input type="date" name="acquired" value="${h(holding.acquired)}"></label>
        <label class="field"><span>How</span>
          <select name="acquiredVia">${ACQUIRED_VIA.map((a) =>
            `<option value="${a.id}" ${a.id === holding.acquiredVia ? 'selected' : ''}>${h(a.name)}</option>`).join('')}</select></label>
        <label class="field"><span>From</span><input type="text" name="source" value="${h(holding.source)}" placeholder="eBay, card show…"></label>
      </div>
      <div class="row">
        <label class="field"><span>Value (each)</span><input type="text" name="value" value="${h(holding.value)}" placeholder="0.00" inputmode="decimal"></label>
        <label class="field"><span>Valued on</span><input type="date" name="valueAsOf" value="${h(holding.valueAsOf)}"></label>
        <label class="field"><span>Based on</span><input type="text" name="valueSource" value="${h(holding.valueSource)}" placeholder="130 Point comp…"></label>
      </div>
      ${S.purchases.length ? `<div class="row">
        <label class="field" style="grid-column:span 2"><span>Part of purchase</span>
          <select name="purchaseId">
            <option value="">— not linked —</option>
            ${[...S.purchases].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((p) =>
              `<option value="${h(p.id)}" ${p.id === holding.purchaseId ? 'selected' : ''}>${h(shortDate(p.date))} · ${h(p.item || 'untitled')}</option>`).join('')}
          </select></label>
      </div>` : ''}
      <p class="hint">Values are yours to maintain — nothing fetches live comps.</p>
    </fieldset>

    <fieldset>
      <legend>Photos</legend>
      <div class="photos">${photoSlot('front', holding.photoFront)}${photoSlot('back', holding.photoBack)}</div>
      <input type="file" id="photo-input" accept="image/*" hidden>
      <p class="hint">Click a slot, drop a file on it, or paste an image.</p>
    </fieldset>

    <fieldset>
      <legend>Notes &amp; tags</legend>
      <label class="field"><span>Tags (comma separated)</span>
        <input type="text" name="tags" value="${h((holding.tags || []).join(', '))}" placeholder="pc, for sale, graded-pending"></label>
      <label class="field" style="margin-top:11px"><span>Notes</span>
        <textarea name="notes" rows="2">${h(holding.notes)}</textarea></label>
    </fieldset>
  </div>

  <div class="editor-foot">
    ${isNew ? '' : '<button class="btn btn-sm btn-danger spacer" value="delete" formnovalidate>Delete</button>'}
    ${isNew ? '<button class="btn" value="save-again">Save &amp; add another</button>' : ''}
    <button class="btn btn-primary" value="save">${isNew ? 'Add to Collection' : 'Save'}</button>
  </div>`;
}

export function purchaseForm(purchase, S, { isNew }) {
  return `
  <div class="editor-head">
    <div><h2>${isNew ? 'Add Purchase' : 'Edit Purchase'}</h2>
      <p class="sub">A box, a break, a single, a trade — anything that cost you something.</p></div>
    <button class="btn btn-sm" value="cancel" formnovalidate>Close</button>
  </div>

  <div class="editor-body">
    <fieldset>
      <legend>Purchase</legend>
      <div class="row">
        <label class="field"><span>Date</span><input type="date" name="date" value="${h(purchase.date)}" required></label>
        <label class="field"><span>Type</span>
          <select name="type">${PURCHASE_TYPES.map((t) =>
            `<option value="${t.id}" ${t.id === purchase.type ? 'selected' : ''}>${h(t.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Cost</span><input type="text" name="cost" value="${h(purchase.cost)}" placeholder="0.00" inputmode="decimal"></label>
      </div>
      <div class="row">
        <label class="field" style="grid-column:span 2"><span>Item</span>
          <input type="text" name="item" value="${h(purchase.item)}" placeholder="2025 Topps Series 1 Hobby Box" required></label>
        <label class="field"><span>Source</span><input type="text" name="source" value="${h(purchase.source)}" placeholder="eBay, local shop…"></label>
      </div>
      <label class="field" style="margin-top:11px"><span>Notes</span>
        <textarea name="notes" rows="2">${h(purchase.notes)}</textarea></label>
      <p class="hint">Link cards to this purchase from the card editor to see what it returned.</p>
    </fieldset>
  </div>

  <div class="editor-foot">
    ${isNew ? '' : '<button class="btn btn-sm btn-danger spacer" value="delete" formnovalidate>Delete</button>'}
    <button class="btn btn-primary" value="save">${isNew ? 'Add Purchase' : 'Save'}</button>
  </div>`;
}

export function wantForm(want, S, { isNew }) {
  return `
  <div class="editor-head">
    <div><h2>${isNew ? 'Add to Want List' : 'Edit Want'}</h2>
      <p class="sub">A card you're hunting. Nothing here counts toward your collection totals.</p></div>
    <button class="btn btn-sm" value="cancel" formnovalidate>Close</button>
  </div>

  <div class="editor-body">
    <fieldset>
      <legend>Wanted card</legend>
      <div class="row">
        <label class="field" style="grid-column:span 2"><span>Player</span>
          <input type="text" name="player" value="${h(want.player)}" placeholder="Name on the card" required></label>
        <label class="field"><span>Card number</span><input type="text" name="number" value="${h(want.number)}" placeholder="100"></label>
      </div>
      <div class="row">
        <label class="field" style="grid-column:span 2"><span>Set</span>
          <select name="setId">
            <option value="">— any —</option>
            ${S.sets.map((s) => `<option value="${h(s.id)}" ${s.id === want.setId ? 'selected' : ''}>${h(setLabel(s))}</option>`).join('')}
          </select></label>
        <label class="field"><span>Variant</span><input type="text" name="variant" value="${h(want.variant)}" placeholder="Gold /2025"></label>
      </div>
      <div class="row">
        <label class="field"><span>Max price</span><input type="text" name="maxPrice" value="${h(want.maxPrice)}" placeholder="0.00" inputmode="decimal"></label>
        <label class="field"><span>Priority</span>
          <select name="priority">${PRIORITIES.map((p) =>
            `<option value="${p.id}" ${p.id === want.priority ? 'selected' : ''}>${h(p.name)}</option>`).join('')}</select></label>
      </div>
      <label class="field" style="margin-top:11px"><span>Notes</span>
        <textarea name="notes" rows="2">${h(want.notes)}</textarea></label>
    </fieldset>
  </div>

  <div class="editor-foot">
    ${isNew ? '' : '<button class="btn btn-sm btn-danger spacer" value="delete" formnovalidate>Delete</button>'}
    <button class="btn btn-primary" value="save">${isNew ? 'Add Want' : 'Save'}</button>
  </div>`;
}
