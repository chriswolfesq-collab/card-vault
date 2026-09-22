// Views. Each function returns an HTML string; app.js owns state and events.

import {
  CONDITIONS, GRADERS, completion, conditionLabel, expandSubset, money, moneyShort,
  parallelName, qtyOf, serialLabel, setLabel, setSize, totals, valueOf, paidOf,
} from './model.js';
import { SORTS, allTags } from './search.js';

export const h = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const numOf = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[$,]/g, '')) : v;
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ top bar */

export function topStats(store) {
  const t = totals(store.holdings);
  const gainClass = t.gain > 0 ? 'pos' : t.gain < 0 ? 'neg' : '';
  return `
    <div class="topstat"><b>${t.cards.toLocaleString()}</b><span>Cards</span></div>
    <div class="topstat"><b>${moneyShort(t.value)}</b><span>Value</span></div>
    <div class="topstat ${gainClass}"><b>${t.gain >= 0 ? '+' : ''}${moneyShort(t.gain)}</b><span>Gain</span></div>`;
}

/* --------------------------------------------------------------- collection */

function cardTile(holding, set) {
  const card = set?.cards?.[String(holding.number)];
  const value = valueOf(holding);
  const paid = paidOf(holding);
  const delta = value - paid;
  const img = holding.photoFront;
  const serial = serialLabel(holding, set);
  const par = holding.parallel && holding.parallel !== 'base' ? parallelName(set, holding.parallel) : '';
  const qty = qtyOf(holding);

  return `
  <article class="card" data-id="${h(holding.id)}" tabindex="0">
    <div class="card-img">
      ${img ? `<img src="${h(img)}" alt="" loading="lazy">` : '<span>no photo</span>'}
      <span class="card-num">#${h(holding.number)}</span>
      ${holding.grader ? `<span class="card-badge">${h(conditionLabel(holding))}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-player ${card?.player ? '' : 'unnamed'}">${h(card?.player || 'Unnamed card')}</div>
      <div class="card-set">${h(set ? setLabel(set) : holding.setId)}</div>
      <div class="card-meta">
        ${par ? `<span>${h(par)}</span>` : ''}
        ${serial ? `<span class="mono">${h(serial)}</span>` : ''}
        ${!holding.grader ? `<span>${h(conditionLabel(holding))}</span>` : ''}
        ${qty > 1 ? `<span>&times;${qty}</span>` : ''}
      </div>
      <div class="card-foot">
        <span class="card-value">${value ? money(value) : '<span style="color:var(--ink-faint);font-weight:400">no value</span>'}</span>
        ${paid && value ? `<span class="card-delta ${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${moneyShort(delta)}</span>` : ''}
      </div>
    </div>
  </article>`;
}

export function collectionView(store, ui, visible) {
  const tags = allTags(store.holdings);
  const parallels = new Map();
  for (const s of store.sets) for (const p of s.parallels || []) parallels.set(p.id, p.name);

  const toolbar = `
    <div class="toolbar">
      <input class="grow" type="search" id="q" placeholder="Search player, set, number, cert, notes…" value="${h(ui.query)}">
      <select id="f-set"><option value="">All sets</option>${store.sets
        .map((s) => `<option value="${h(s.id)}" ${ui.setId === s.id ? 'selected' : ''}>${h(setLabel(s))}</option>`)
        .join('')}</select>
      <select id="f-parallel"><option value="">All parallels</option>${[...parallels]
        .map(([id, name]) => `<option value="${h(id)}" ${ui.parallel === id ? 'selected' : ''}>${h(name)}</option>`)
        .join('')}</select>
      <select id="f-graded">
        <option value="">Raw &amp; graded</option>
        <option value="yes" ${ui.graded === 'yes' ? 'selected' : ''}>Graded only</option>
        <option value="no" ${ui.graded === 'no' ? 'selected' : ''}>Raw only</option>
      </select>
      <select id="f-sort">${Object.entries(SORTS)
        .map(([k, v]) => `<option value="${k}" ${ui.sort === k ? 'selected' : ''}>${h(v.label)}</option>`)
        .join('')}</select>
      <button class="btn btn-primary" id="add-card">Add card</button>
    </div>
    ${tags.length ? `<div class="chiprow">${tags
      .map(([t, n]) => `<button class="chip ${ui.tag === t ? 'is-on' : ''}" data-tag="${h(t)}">${h(t)} <span style="opacity:.65">${n}</span></button>`)
      .join('')}</div>` : ''}`;

  if (!store.holdings.length) {
    return toolbar + `
      <div class="empty">
        <h3>Nothing in the box yet</h3>
        <p>The fastest way in is the <b>Checklists</b> tab: pick a set, then click the card
        numbers you own. Names and values can be filled in later — the grid works
        off numbering from the start.</p>
        <button class="btn btn-primary" data-goto="checklists">Open a checklist</button>
      </div>`;
  }

  if (!visible.length) {
    return toolbar + `<div class="empty"><h3>No cards match</h3><p>Nothing here fits those filters.</p>
      <button class="btn" id="clear-filters">Clear filters</button></div>`;
  }

  const t = totals(visible);
  const summary = visible.length === store.holdings.length
    ? ''
    : `<p class="sub">${visible.length.toLocaleString()} of ${store.holdings.length.toLocaleString()} holdings · ${money(t.value)} value</p>`;

  const getSet = (id) => store.sets.find((s) => s.id === id);
  return toolbar + summary + `<div class="cards">${visible.map((x) => cardTile(x, getSet(x.setId))).join('')}</div>`;
}

/* --------------------------------------------------------------- checklists */

export function checklistsView(store, ui) {
  if (ui.openSet) return checklistDetail(store, ui);

  if (!store.sets.length) {
    return `<div class="empty"><h3>No sets yet</h3>
      <p>Add one from the Data tab, or run <code>node tools/seed-sets.mjs</code>.</p></div>`;
  }

  const cards = store.sets.map((set) => {
    const c = completion(set, store.holdings, { baseOnly: ui.baseOnly });
    const mine = store.holdings.filter((x) => x.setId === set.id);
    const t = totals(mine);
    return `
    <article class="setcard" data-set="${h(set.id)}" tabindex="0">
      <h3>${h(setLabel(set))}</h3>
      <p class="sub">${setSize(set).toLocaleString()} cards · ${(set.parallels || []).length} parallels${set.verified ? '' : ' · <span title="Structure not checked against a published checklist">unverified</span>'}</p>
      <div class="bar"><i style="width:${(c.pct * 100).toFixed(1)}%"></i></div>
      <div class="bar-label">
        <span>${c.have} / ${c.total} &nbsp;<b>${(c.pct * 100).toFixed(1)}%</b></span>
        <span>${t.value ? money(t.value) : ''}</span>
      </div>
    </article>`;
  }).join('');

  return `
    <div class="toolbar">
      <div class="grow"><h2>Checklists</h2><p class="sub" style="margin:0">Click a set to open its number grid. Click a number to add the card.</p></div>
      <button class="chip ${ui.baseOnly ? 'is-on' : ''}" id="base-only">Base set only</button>
      <button class="btn" data-goto="data">New set</button>
    </div>
    <div class="setlist">${cards}</div>`;
}

function checklistDetail(store, ui) {
  const set = store.sets.find((s) => s.id === ui.openSet);
  if (!set) return `<div class="empty"><h3>Set not found</h3></div>`;

  const c = completion(set, store.holdings, { baseOnly: ui.baseOnly });
  const mine = store.holdings.filter((x) => x.setId === set.id);
  const t = totals(mine);

  // How many copies of each number, so duplicates show on the grid.
  const counts = new Map();
  for (const x of mine) {
    if (ui.baseOnly && (x.parallel || 'base') !== 'base') continue;
    counts.set(String(x.number), (counts.get(String(x.number)) || 0) + 1);
  }

  const grids = (set.subsets || []).map((sub) => {
    const cells = expandSubset(sub).map((n) => {
      const card = set.cards?.[n];
      const count = counts.get(n) || 0;
      const cls = ['numcell', count ? 'owned' : '', card?.player ? 'named' : ''].filter(Boolean).join(' ');
      const title = card?.player ? `#${n} ${card.player}${card.team ? ` (${card.team})` : ''}` : `#${n}`;
      return `<button class="${cls}" data-number="${h(n)}" title="${h(title)}">
        <span class="n">${h(n)}</span>${count > 1 ? `<span class="dupe">${count}</span>` : ''}</button>`;
    }).join('');
    return `${(set.subsets.length > 1) ? `<div class="subset-head"><b style="color:var(--ink)">${h(sub.name)}</b><span>${sub.prefix || ''}${sub.from}–${sub.prefix || ''}${sub.to}</span></div>` : ''}
      <div class="numgrid">${cells}</div>`;
  }).join('');

  return `
    <div class="toolbar">
      <button class="btn" id="back-to-sets">&larr; All sets</button>
      <div class="grow"><h2 style="margin:0">${h(setLabel(set))}</h2>
        <p class="sub" style="margin:0">${c.have} of ${c.total} · ${(c.pct * 100).toFixed(1)}% complete${t.value ? ` · ${money(t.value)}` : ''}</p></div>
      <button class="chip ${ui.baseOnly ? 'is-on' : ''}" id="base-only">Base set only</button>
      <button class="btn" id="edit-set">Edit set</button>
    </div>
    <div class="bar" style="margin-bottom:6px"><i style="width:${(c.pct * 100).toFixed(1)}%"></i></div>
    <p class="hint">${c.missing.length
      ? `Missing ${c.missing.length.toLocaleString()}: <span class="mono">${c.missing.slice(0, 40).map(h).join(', ')}${c.missing.length > 40 ? ` … +${c.missing.length - 40} more` : ''}</span>`
      : 'Set complete.'}</p>
    ${grids}`;
}

/* -------------------------------------------------------------------- value */

export function valueView(store) {
  const t = totals(store.holdings);
  if (!store.holdings.length) {
    return `<div class="empty"><h3>No value to report yet</h3><p>Add cards and enter what you paid and what they're worth.</p></div>`;
  }

  const roi = t.paid ? (t.gain / t.paid) * 100 : 0;
  const getSet = (id) => store.sets.find((s) => s.id === id);

  const bySet = [...new Set(store.holdings.map((x) => x.setId))]
    .map((id) => {
      const mine = store.holdings.filter((x) => x.setId === id);
      return { set: getSet(id), id, t: totals(mine) };
    })
    .sort((a, b) => b.t.value - a.t.value);

  const top = [...store.holdings]
    .filter((x) => valueOf(x))
    .sort((a, b) => valueOf(b) - valueOf(a))
    .slice(0, 15);

  const row = (x) => {
    const set = getSet(x.setId);
    const card = set?.cards?.[String(x.number)];
    const delta = valueOf(x) - paidOf(x);
    return `<tr data-id="${h(x.id)}">
      <td>${h(card?.player || `#${x.number}`)}<div style="font-size:12px;color:var(--ink-faint)">${h(set ? setLabel(set) : x.setId)} #${h(x.number)}${x.parallel !== 'base' ? ` · ${h(parallelName(set, x.parallel))}` : ''}</div></td>
      <td>${h(conditionLabel(x))}</td>
      <td class="num mono">${paidOf(x) ? money(paidOf(x)) : '—'}</td>
      <td class="num mono">${money(valueOf(x))}</td>
      <td class="num mono ${delta >= 0 ? 'pos' : 'neg'}">${paidOf(x) ? (delta >= 0 ? '+' : '') + money(delta) : '—'}</td>
    </tr>`;
  };

  return `
    <div class="statgrid">
      <div class="stat"><span>Cost basis</span><b>${money(t.paid)}</b><small>${t.holdings.toLocaleString()} holdings, ${t.cards.toLocaleString()} cards</small></div>
      <div class="stat"><span>Current value</span><b>${money(t.value)}</b>
        <small>${t.unvalued ? `${t.unvalued} card${t.unvalued === 1 ? '' : 's'} with no value entered` : 'every card valued'}</small></div>
      <div class="stat"><span>Unrealized gain</span><b class="${t.gain >= 0 ? 'pos' : 'neg'}">${t.gain >= 0 ? '+' : ''}${money(t.gain)}</b>
        <small class="${roi >= 0 ? 'pos' : 'neg'}">${roi >= 0 ? '+' : ''}${roi.toFixed(1)}% on cost</small></div>
      <div class="stat"><span>Graded</span><b>${t.graded}</b><small>${((t.graded / Math.max(1, t.holdings)) * 100).toFixed(0)}% of holdings</small></div>
    </div>

    ${t.unvalued ? `<p class="hint" style="margin-bottom:18px">Values are whatever you typed in — nothing here is a live market price.
      ${t.unvalued} holding${t.unvalued === 1 ? '' : 's'} count as $0 until you enter one.</p>` : ''}

    <div class="panel" style="margin-bottom:18px">
      <h3>By set</h3>
      <table><thead><tr><th>Set</th><th class="num">Cards</th><th class="num">Paid</th><th class="num">Value</th><th class="num">Gain</th></tr></thead>
      <tbody>${bySet.map(({ set, id, t: st }) => `<tr data-set="${h(id)}">
        <td>${h(set ? setLabel(set) : id)}</td>
        <td class="num mono">${st.cards}</td>
        <td class="num mono">${st.paid ? money(st.paid) : '—'}</td>
        <td class="num mono">${money(st.value)}</td>
        <td class="num mono ${st.gain >= 0 ? 'pos' : 'neg'}">${st.paid ? (st.gain >= 0 ? '+' : '') + money(st.gain) : '—'}</td>
      </tr>`).join('')}</tbody></table>
    </div>

    <div class="panel">
      <h3>Most valuable</h3>
      ${top.length
        ? `<table><thead><tr><th>Card</th><th>Condition</th><th class="num">Paid</th><th class="num">Value</th><th class="num">Gain</th></tr></thead>
           <tbody>${top.map(row).join('')}</tbody></table>`
        : '<p class="sub">No values entered yet.</p>'}
    </div>`;
}

/* --------------------------------------------------------------------- data */

export function dataView(store) {
  return `
    <div class="statgrid">
      <div class="stat"><span>Collection file</span><b style="font-size:15px;font-family:var(--mono)">data/collection.json</b>
        <small>${store.updated ? `last written ${new Date(store.updated).toLocaleString()}` : 'not written yet'}</small></div>
      <div class="stat"><span>Sets on file</span><b>${store.sets.length}</b><small>data/sets/*.json</small></div>
      <div class="stat"><span>Photos</span><b>${store.holdings.filter((x) => x.photoFront || x.photoBack).length}</b><small>images/cards/</small></div>
    </div>

    <div class="panel" style="margin-bottom:18px">
      <h3>Backup</h3>
      <p class="sub">Your collection already lives in a plain JSON file you can commit to git. This is for
      moving it somewhere else, or pulling it back after a mistake.</p>
      <div class="toolbar" style="margin:0">
        <button class="btn" id="export">Export JSON</button>
        <button class="btn" id="import">Import JSON</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
    </div>

    <div class="panel">
      <h3>Add a set</h3>
      <p class="sub">Card numbers are all that's needed to start tracking completion — player names fill in as you enter cards.</p>
      <form id="new-set" class="row" style="align-items:end">
        <label class="field"><span>Year</span><input type="number" name="year" value="${new Date().getFullYear()}" required></label>
        <label class="field"><span>Brand</span><input type="text" name="brand" placeholder="Topps" required></label>
        <label class="field"><span>Set name</span><input type="text" name="name" placeholder="Series 1" required></label>
        <label class="field"><span>Prefix</span><input type="text" name="prefix" placeholder="US"></label>
        <label class="field"><span>First #</span><input type="number" name="from" value="1" required></label>
        <label class="field"><span>Last #</span><input type="number" name="to" value="350" required></label>
        <button class="btn btn-primary" type="submit">Create set</button>
      </form>
    </div>`;
}

/* ------------------------------------------------------------------- editor */

export function editorForm(holding, store, { isNew }) {
  const set = store.sets.find((s) => s.id === holding.setId);
  const card = set?.cards?.[String(holding.number)];
  const parallels = set?.parallels || [{ id: 'base', name: 'Base', print: null }];

  return `
    <div class="editor-head">
      <div>
        <h2>${isNew ? 'Add card' : h(card?.player || `#${holding.number}`)}</h2>
        <p class="sub" style="margin:2px 0 0">${h(set ? setLabel(set) : 'Pick a set')}${holding.number ? ` · #${h(holding.number)}` : ''}</p>
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
              ${store.sets.map((s) => `<option value="${h(s.id)}" ${s.id === holding.setId ? 'selected' : ''}>${h(setLabel(s))}</option>`).join('')}
            </select></label>
          <label class="field"><span>Card number</span><input type="text" name="number" value="${h(holding.number)}" required placeholder="100"></label>
          <label class="field"><span>Quantity</span><input type="number" name="qty" min="1" value="${qtyOf(holding)}"></label>
        </div>
        <div class="row" style="margin-top:11px">
          <label class="field" style="grid-column:span 2"><span>Player${card?.player ? '' : ' — saved to the checklist'}</span>
            <input type="text" name="player" value="${h(card?.player || '')}" placeholder="Name on the card"></label>
          <label class="field"><span>Team</span><input type="text" name="team" value="${h(card?.team || '')}"></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Version</legend>
        <div class="row">
          <label class="field"><span>Parallel</span>
            <select name="parallel">${parallels.map((p) => `<option value="${h(p.id)}" ${p.id === (holding.parallel || 'base') ? 'selected' : ''}>${h(p.name)}${p.print ? ` /${p.print}` : ''}</option>`).join('')}</select></label>
          <label class="field"><span>Serial #</span><input type="number" name="serialNum" value="${h(holding.serialNum)}" placeholder="12"></label>
          <label class="field"><span>Out of</span><input type="number" name="serialOf" value="${h(holding.serialOf ?? '')}" placeholder="auto"></label>
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
            <select name="condition">${CONDITIONS.map((c) => `<option value="${c.id}" ${c.id === holding.condition ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Money</legend>
        <div class="row">
          <label class="field"><span>Paid (each)</span><input type="text" name="price" value="${h(holding.price)}" placeholder="0.00" inputmode="decimal"></label>
          <label class="field"><span>Acquired</span><input type="date" name="acquired" value="${h(holding.acquired)}"></label>
          <label class="field"><span>From</span><input type="text" name="source" value="${h(holding.source)}" placeholder="eBay, card show…"></label>
        </div>
        <div class="row" style="margin-top:11px">
          <label class="field"><span>Value (each)</span><input type="text" name="value" value="${h(holding.value)}" placeholder="0.00" inputmode="decimal"></label>
          <label class="field"><span>Valued on</span><input type="date" name="valueAsOf" value="${h(holding.valueAsOf)}"></label>
          <label class="field"><span>Based on</span><input type="text" name="valueSource" value="${h(holding.valueSource)}" placeholder="130 Point comp…"></label>
        </div>
        <p class="hint">Values are yours to maintain — nothing fetches live comps.</p>
      </fieldset>

      <fieldset>
        <legend>Photos</legend>
        <div class="photos">
          ${photoSlot('front', holding.photoFront)}
          ${photoSlot('back', holding.photoBack)}
        </div>
        <input type="file" id="photo-input" accept="image/*" hidden>
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
      <button class="btn btn-primary" value="save">${isNew ? 'Add to collection' : 'Save'}</button>
    </div>`;
}

function photoSlot(side, path) {
  return `<div class="photo" data-side="${side}">
    ${path ? `<img src="${h(path)}" alt="${side}"><button type="button" class="clear" data-clear="${side}" title="Remove">&times;</button>`
           : `<span>+ ${side}</span>`}
  </div>`;
}
