// Wiring: UI state, routing, events.

import * as store from './store.js';
import { apply, touch } from './search.js';
import { qtyOf } from './model.js';
import {
  collectionView, checklistsView, valueView, dataView, editorForm, topStats, h,
} from './render.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ui = {
  view: 'collection',
  query: '',
  setId: '',      // collection filter
  parallel: '',
  graded: '',
  tag: '',
  sort: 'added-desc',
  openSet: '',    // checklist detail
  baseOnly: false,
};

const view = $('#view');
const S = store.store;
const getSet = (id) => S.sets.find((s) => s.id === id);

/* ------------------------------------------------------------------- toast */

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ------------------------------------------------------------------ render */

function render() {
  $('#topstats').innerHTML = topStats(S);

  const save = $('#savestate');
  save.dataset.s = S.status;
  const label = { loading: 'loading', saved: 'saved to disk', saving: 'saving…', dirty: 'unsaved', error: 'error' }[S.status];
  $('.savetext', save).textContent = label;
  save.title = S.error || 'data/collection.json';

  $$('.tab').forEach((t) => t.classList.toggle('is-on', t.dataset.view === ui.view));

  let html = '';
  if (S.status === 'error' && !S.holdings.length) {
    html = `<div class="banner">${h(S.error)}</div>`;
  } else if (ui.view === 'collection') {
    const visible = apply(S.holdings, ui, getSet);
    html = collectionView(S, ui, visible);
  } else if (ui.view === 'checklists') {
    html = checklistsView(S, ui);
  } else if (ui.view === 'value') {
    html = valueView(S);
  } else {
    html = dataView(S);
  }

  // Preserve the search box's caret across re-renders.
  const q = $('#q');
  const caret = q && document.activeElement === q ? q.selectionStart : null;
  view.innerHTML = html;
  if (caret != null) {
    const next = $('#q');
    if (next) { next.focus(); next.setSelectionRange(caret, caret); }
  }
}

store.subscribe(render);

/* ------------------------------------------------------------------ editor */

const dialog = $('#editor');
const form = $('#editor-form');
let editing = null;   // { holding, isNew }
let photoSide = null;

function openEditor(holding, isNew = false) {
  editing = { holding: { ...holding }, isNew };
  form.innerHTML = editorForm(editing.holding, S, { isNew });
  dialog.showModal();
  // Straight to the number field when the set is already known -- that is the
  // only thing left to type when adding from a checklist grid.
  const first = isNew ? (holding.setId ? form.number : form.setId) : null;
  if (first) { first.focus(); first.select?.(); }
}

// Re-render the form when the set changes, because the parallel list belongs to it.
form.addEventListener('change', (e) => {
  if (e.target.name === 'setId') {
    const draft = readForm();
    editing.holding = { ...editing.holding, ...draft };
    const isNew = editing.isNew;
    form.innerHTML = editorForm(editing.holding, S, { isNew });
  }
});

function readForm() {
  const d = Object.fromEntries(new FormData(form));
  return {
    setId: d.setId || '',
    number: String(d.number || '').trim(),
    qty: Math.max(1, Number(d.qty) || 1),
    parallel: d.parallel || 'base',
    serialNum: d.serialNum || '',
    serialOf: d.serialOf === '' || d.serialOf == null ? null : Number(d.serialOf),
    grader: d.grader || '',
    grade: String(d.grade || '').trim(),
    cert: String(d.cert || '').trim(),
    condition: d.condition || 'nm-mt',
    price: String(d.price || '').trim(),
    acquired: d.acquired || '',
    source: String(d.source || '').trim(),
    value: String(d.value || '').trim(),
    valueAsOf: d.valueAsOf || '',
    valueSource: String(d.valueSource || '').trim(),
    notes: String(d.notes || '').trim(),
    tags: String(d.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    _player: String(d.player || '').trim(),
    _team: String(d.team || '').trim(),
  };
}

form.addEventListener('submit', async (e) => {
  const action = e.submitter?.value;
  if (action === 'cancel') return;

  if (action === 'delete') {
    if (!confirm('Delete this card from the collection? Its photos are deleted too.')) {
      e.preventDefault();
      return;
    }
    await store.removeHolding(editing.holding.id);
    toast('Card deleted');
    return;
  }

  const fields = readForm();
  const { _player, _team, ...rest } = fields;
  if (!rest.setId || !rest.number) { e.preventDefault(); return; }

  // Photos were uploaded as the user picked them; carry the paths over.
  rest.photoFront = editing.holding.photoFront || '';
  rest.photoBack = editing.holding.photoBack || '';

  if (editing.isNew) {
    const created = store.addHolding(rest);
    touch(created);
    toast(`Added #${rest.number}`);
  } else {
    const updated = store.updateHolding(editing.holding.id, rest);
    if (updated) touch(updated);
    toast('Saved');
  }

  if (_player) store.nameCard(rest.setId, rest.number, _player, _team);

  if (action === 'save-again') {
    e.preventDefault();
    // Keep the set and roll the number forward -- adding a run of a set is the
    // common case, and retyping the set every time is the thing that makes
    // entering a few hundred cards a chore.
    const nextNum = String(rest.number).replace(/(\d+)$/, (m) => String(Number(m) + 1));
    openEditor({ ...blank(), setId: rest.setId, number: nextNum, parallel: rest.parallel, source: rest.source }, true);
  }
});

const blank = () => ({
  id: '', setId: '', number: '', parallel: 'base', condition: 'nm-mt', grader: '', grade: '',
  cert: '', serialNum: '', serialOf: null, qty: 1, price: '', acquired: new Date().toISOString().slice(0, 10),
  source: '', value: '', valueAsOf: '', valueSource: '', photoFront: '', photoBack: '', notes: '', tags: [],
});

/* ------------------------------------------------------------------ photos */

form.addEventListener('click', async (e) => {
  const clear = e.target.closest('[data-clear]');
  if (clear) {
    e.preventDefault();
    const side = clear.dataset.clear;
    const key = side === 'front' ? 'photoFront' : 'photoBack';
    const path = editing.holding[key];
    editing.holding[key] = '';
    if (path) store.deletePhoto(path).catch(() => {});
    if (!editing.isNew) store.updateHolding(editing.holding.id, { [key]: '' });
    redrawPhotos();
    return;
  }
  const slot = e.target.closest('.photo');
  if (slot) {
    e.preventDefault();
    photoSide = slot.dataset.side;
    $('#photo-input', form).click();
  }
});

async function usePhoto(side, file) {
  if (!file || !editing) return;
  if (!/^image\//.test(file.type)) { toast('That is not an image'); return; }

  // A new holding has no id yet, so it gets one now -- the photo filename is
  // built from it and has to stay stable.
  if (!editing.holding.id) editing.holding.id = 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  try {
    const path = await store.uploadPhoto(editing.holding.id, side, file);
    const key = side === 'front' ? 'photoFront' : 'photoBack';
    editing.holding[key] = path;
    if (!editing.isNew) store.updateHolding(editing.holding.id, { [key]: path });
    redrawPhotos();
    toast(`${side === 'front' ? 'Front' : 'Back'} photo saved`);
  } catch (err) {
    toast(`Photo upload failed: ${err.message}`);
  }
}

form.addEventListener('change', async (e) => {
  if (e.target.id !== 'photo-input') return;
  await usePhoto(photoSide, e.target.files[0]);
  e.target.value = '';
});

// Dropping a file onto a slot, and pasting an image anywhere in the dialog.
// A card photo usually starts life as a phone shot or a screenshot of a listing,
// and making the user round-trip through a file picker for that is friction for
// no reason.
form.addEventListener('dragover', (e) => {
  if (e.target.closest('.photo')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
});

form.addEventListener('drop', (e) => {
  const slot = e.target.closest('.photo');
  if (!slot) return;
  e.preventDefault();
  usePhoto(slot.dataset.side, e.dataTransfer.files[0]);
});

document.addEventListener('paste', (e) => {
  if (!dialog.open || !editing) return;
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  // Fill the empty side, so paste-paste gives you front then back.
  const side = editing.holding.photoFront ? 'back' : 'front';
  usePhoto(side, item.getAsFile());
});

// Replacing a photo reuses the filename, so the browser would keep showing the
// old image. The buster belongs here, at render time -- putting it in the stored
// path would bake a timestamp into collection.json forever.
let photoBust = 0;

function redrawPhotos() {
  const wrap = $('.photos', form);
  if (!wrap) return;
  photoBust++;
  const slot = (side, path) => `<div class="photo" data-side="${side}">
    ${path ? `<img src="${h(path)}?v=${photoBust}" alt="${side}"><button type="button" class="clear" data-clear="${side}" title="Remove">&times;</button>` : `<span>+ ${side}</span>`}
  </div>`;
  wrap.innerHTML = slot('front', editing.holding.photoFront) + slot('back', editing.holding.photoBack);
}

/* ------------------------------------------------------------------ events */

$('#tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  ui.view = tab.dataset.view;
  if (ui.view !== 'checklists') ui.openSet = '';
  render();
});

view.addEventListener('input', (e) => {
  if (e.target.id === 'q') { ui.query = e.target.value; render(); }
});

view.addEventListener('change', (e) => {
  const map = { 'f-set': 'setId', 'f-parallel': 'parallel', 'f-graded': 'graded', 'f-sort': 'sort' };
  const key = map[e.target.id];
  if (key) { ui[key] = e.target.value; render(); }
});

view.addEventListener('click', async (e) => {
  const t = e.target;

  const goto = t.closest('[data-goto]');
  if (goto) { ui.view = goto.dataset.goto; render(); return; }

  if (t.closest('#add-card')) { openEditor({ ...blank(), setId: ui.setId }, true); return; }

  if (t.closest('#clear-filters')) {
    Object.assign(ui, { query: '', setId: '', parallel: '', graded: '', tag: '' });
    render(); return;
  }

  const chip = t.closest('[data-tag]');
  if (chip) { ui.tag = ui.tag === chip.dataset.tag ? '' : chip.dataset.tag; render(); return; }

  if (t.closest('#base-only')) { ui.baseOnly = !ui.baseOnly; render(); return; }
  if (t.closest('#back-to-sets')) { ui.openSet = ''; render(); return; }

  // A card tile, or a row in the value tables.
  const holdingEl = t.closest('[data-id]');
  if (holdingEl) {
    const holding = S.holdings.find((x) => x.id === holdingEl.dataset.id);
    if (holding) openEditor(holding, false);
    return;
  }

  const setEl = t.closest('[data-set]');
  if (setEl) {
    if (ui.view === 'value') { ui.view = 'collection'; ui.setId = setEl.dataset.set; }
    else { ui.openSet = setEl.dataset.set; }
    render();
    return;
  }

  // A number on a checklist grid: open the copy you own, or start a new one.
  const cell = t.closest('[data-number]');
  if (cell) {
    const number = cell.dataset.number;
    const mine = S.holdings.filter((x) => x.setId === ui.openSet && String(x.number) === number);
    if (mine.length === 1) openEditor(mine[0], false);
    else if (mine.length > 1) { ui.view = 'collection'; ui.setId = ui.openSet; ui.query = number; render(); }
    else openEditor({ ...blank(), setId: ui.openSet, number }, true);
    return;
  }

  if (t.closest('#edit-set')) { ui.view = 'data'; render(); return; }

  if (t.closest('#export')) {
    await store.saveNow();
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shoebox-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }

  if (t.closest('#import')) { $('#import-file').click(); return; }
});

view.addEventListener('change', async (e) => {
  if (e.target.id !== 'import-file') return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { added, skipped } = store.importJSON(await file.text());
    toast(`Imported ${added} card${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} already here` : ''}`);
  } catch (err) {
    toast(`Import failed: ${err.message}`);
  }
  e.target.value = '';
});

view.addEventListener('submit', async (e) => {
  if (e.target.id !== 'new-set') return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const id = `${d.year}-${d.brand}-${d.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    await store.saveSet({
      id, brand: d.brand, year: Number(d.year), name: d.name, sport: 'baseball',
      subsets: [{ id: 'base', name: 'Base', prefix: String(d.prefix || '').trim(), from: Number(d.from), to: Number(d.to) }],
      parallels: [{ id: 'base', name: 'Base', print: null }],
      cards: {}, verified: false, source: '',
    });
    ui.view = 'checklists'; ui.openSet = id;
    render();
    toast('Set created');
  } catch (err) {
    toast(`Could not create set: ${err.message}`);
  }
});

// Keyboard: / focuses search, n adds a card.
document.addEventListener('keydown', (e) => {
  if (dialog.open || e.metaKey || e.ctrlKey) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); ui.view = 'collection'; render(); $('#q')?.focus(); }
  if (e.key === 'n') { e.preventDefault(); openEditor({ ...blank(), setId: ui.openSet || ui.setId }, true); }
});

// Don't lose the last keystrokes to a debounce timer on the way out.
window.addEventListener('pagehide', () => { if (S.status === 'dirty') store.saveNow(); });

store.load().then(render);
