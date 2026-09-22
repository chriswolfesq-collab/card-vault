// Router, UI state, and events.

import * as store from './store.js';
import { apply, touch } from './search.js';
import { attachTooltips } from './charts.js';
import { icon } from './icons.js';
import { cardOf, setLabel } from './model.js';
import { teamKey } from './teams.js';

import { collectionView } from './views/collection.js';
import { dashboardView } from './views/dashboard.js';
import { detailView } from './views/detail.js';
import { setsView } from './views/sets.js';
import { playersView } from './views/players.js';
import { wantsView } from './views/wants.js';
import { purchasesView } from './views/purchases.js';
import { statsView } from './views/stats.js';
import { settingsView } from './views/settings.js';
import { cardForm, purchaseForm, wantForm, photoSlot } from './views/editor.js';
import { h } from './views/common.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const S = store.store;
const getSet = (id) => S.sets.find((s) => s.id === id);

const ui = {
  view: 'dashboard',
  layout: 'grid',
  query: '',
  // collection filters
  year: '', brand: '', team: '', player: '', cardType: '', setId: '',
  graded: '', numbered: '', favorite: false, tag: '',
  sort: 'added-desc',
  page: 1,
  // sub-views
  openCard: '', openSet: '', subset: '', setFilter: '', setQuery: '',
  purchaseTab: '', sortPlayers: 'value', baseOnly: false,
  theme: localStorage.getItem('cv-theme') || 'system',
};

const FILTER_KEYS = ['year', 'brand', 'team', 'player', 'cardType', 'setId', 'graded', 'numbered', 'sort'];

const view = $('#view');
const app = $('#app');

/* ------------------------------------------------------------------ theme */

function applyTheme() {
  const root = document.documentElement;
  if (ui.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', ui.theme);
  localStorage.setItem('cv-theme', ui.theme);
}
applyTheme();

/* ------------------------------------------------------------------ toast */

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* --------------------------------------------------------------- sidebar */

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'collection', label: 'My Collection', icon: 'collection' },
  { id: 'sets', label: 'Sets', icon: 'sets' },
  { id: 'players', label: 'Players', icon: 'players' },
  { id: 'wants', label: 'Want List', icon: 'heart' },
  { id: 'purchases', label: 'Purchases', icon: 'purchases' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
];

function renderSidebar() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (ui.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);

  $('#sidebar').innerHTML = `
    <div class="logo">${icon('vault')}<span>Card Vault</span></div>
    <nav class="nav">
      ${NAV.map((n) => `<button data-goto="${n.id}" class="${isOn(n.id) ? 'is-on' : ''}">${icon(n.icon)}${n.label}</button>`).join('')}
      <div class="nav-title">Tools</div>
      <button data-act="add-card">${icon('add')}Add Card</button>
      <button data-act="import">${icon('import')}Import</button>
      <button data-act="export">${icon('export')}Export</button>
    </nav>
    <div class="sidebar-foot">
      <nav class="nav">
        <button data-goto="settings" class="${ui.view === 'settings' ? 'is-on' : ''}">${icon('settings')}Settings</button>
        <button data-act="theme">${icon(dark ? 'sun' : 'moon')}${dark ? 'Light mode' : 'Dark mode'}</button>
      </nav>
    </div>`;
}

// The card detail and set detail pages live under their list pages, so the nav
// keeps the parent lit rather than going blank.
const isOn = (id) =>
  ui.view === id || (id === 'collection' && ui.view === 'detail') || (id === 'sets' && ui.view === 'setDetail');

/* ------------------------------------------------------------------ render */

function render() {
  renderSidebar();

  const save = $('#savestate');
  save.dataset.s = S.status;
  $('.savetext', save).textContent =
    { loading: 'loading', saved: 'saved', saving: 'saving…', dirty: 'unsaved', error: 'error' }[S.status];
  save.title = S.error || 'data/collection.json';

  const search = $('#global-search');
  if (search.value !== ui.query && document.activeElement !== search) search.value = ui.query;

  let html = '';
  if (S.status === 'error' && !S.holdings.length) {
    html = `<div class="banner">${h(S.error)}</div>`;
  } else {
    // Static mode has to announce itself. The whole premise of this app is that
    // your collection lives in files you can trust; a page that quietly accepts
    // edits it can never persist would be the exact failure it was built to avoid.
    if (S.mode === 'static') html += staticBanner();
    switch (ui.view) {
      case 'dashboard': html += dashboardView(S, ui); break;
      case 'collection': html += collectionView(S, ui, apply(S.holdings, ui, getSet)); break;
      case 'detail': html += detailView(S, ui); break;
      case 'sets': html += setsView(S, { ...ui, openSet: '' }); break;
      case 'setDetail': html += setsView(S, ui); break;
      case 'players': html += playersView(S, ui); break;
      case 'wants': html += wantsView(S, ui); break;
      case 'purchases': html += purchasesView(S, ui); break;
      case 'stats': html += statsView(S, ui); break;
      case 'settings': html += settingsView(S, ui); break;
      default: html += dashboardView(S, ui);
    }
  }

  view.innerHTML = html + datalist();
  view.style.position = 'relative';
  attachTooltips(view);
}

function staticBanner() {
  return `<div class="note note-warn">
    <b>Demo mode — no server.</b>
    You're reading the collection files as published. Anything you add or change is kept
    in this browser only: it won't reach the files, won't follow you to another device,
    and disappears if you clear site data. Photos are off entirely.
    <br>For a collection you can rely on, clone the repo and run
    <code>node tools/serve.mjs</code> — then every edit is written to real files you can commit.
    <button class="btn btn-sm" data-act="reset-local" style="margin-left:8px">Discard my changes</button>
  </div>`;
}

/** Player names already on file, for the editor's autocomplete. */
function datalist() {
  const names = new Set();
  for (const set of S.sets) for (const c of Object.values(set.cards || {})) if (c.player) names.add(c.player);
  return `<datalist id="player-list">${[...names].sort().map((n) => `<option value="${h(n)}"></option>`).join('')}</datalist>`;
}

store.subscribe(render);

function go(viewName, patch = {}) {
  Object.assign(ui, { view: viewName, page: 1 }, patch);
  app.classList.remove('nav-open');
  window.scrollTo(0, 0);
  render();
}

/* ------------------------------------------------------------------ editor */

const dialog = $('#editor');
const form = $('#editor-form');
let editing = null;   // { kind, row, isNew }
let photoSide = null;
let photoBust = 0;

function openCardEditor(holding, isNew = false) {
  editing = { kind: 'card', row: { ...store.blankHolding(), ...holding }, isNew };
  form.innerHTML = cardForm(editing.row, S, { isNew });
  dialog.showModal();
  const first = isNew ? (holding.setId ? form.number : form.setId) : null;
  if (first) { first.focus(); first.select?.(); }
}

function openPurchaseEditor(purchase, isNew = false) {
  editing = { kind: 'purchase', row: { ...store.blankPurchase(), ...purchase }, isNew };
  form.innerHTML = purchaseForm(editing.row, S, { isNew });
  dialog.showModal();
  if (isNew) form.item?.focus();
}

function openWantEditor(want, isNew = false) {
  editing = { kind: 'want', row: { ...store.blankWant(), ...want }, isNew };
  form.innerHTML = wantForm(editing.row, S, { isNew });
  dialog.showModal();
  if (isNew) form.player?.focus();
}

// The parallel list belongs to the set, so changing the set rebuilds the form.
form.addEventListener('change', (e) => {
  if (editing?.kind !== 'card' || e.target.name !== 'setId') return;
  Object.assign(editing.row, readCard());
  form.innerHTML = cardForm(editing.row, S, { isNew: editing.isNew });
});

function readCard() {
  const d = Object.fromEntries(new FormData(form));
  return {
    setId: d.setId || '',
    number: String(d.number || '').trim(),
    qty: Math.max(1, Number(d.qty) || 1),
    parallel: d.parallel || 'base',
    cardType: d.cardType || 'base',
    rookie: !!d.rookie, auto: !!d.auto, relic: !!d.relic,
    serialNum: d.serialNum || '',
    serialOf: d.serialOf === '' || d.serialOf == null ? null : Number(d.serialOf),
    grader: d.grader || '',
    grade: String(d.grade || '').trim(),
    cert: String(d.cert || '').trim(),
    condition: d.condition || 'nm-mt',
    price: String(d.price || '').trim(),
    acquired: d.acquired || '',
    acquiredVia: d.acquiredVia || 'single',
    purchaseId: d.purchaseId || '',
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

const readSimple = () => Object.fromEntries(new FormData(form));

form.addEventListener('submit', async (e) => {
  const action = e.submitter?.value;
  if (action === 'cancel' || !editing) return;

  if (action === 'delete') {
    const what = { card: 'card', purchase: 'purchase', want: 'want' }[editing.kind];
    const extra = editing.kind === 'card' ? ' Its photos are deleted too.' : '';
    if (!confirm(`Delete this ${what}?${extra}`)) { e.preventDefault(); return; }
    if (editing.kind === 'card') {
      await store.removeHolding(editing.row.id);
      if (ui.view === 'detail') go('collection');
    }
    if (editing.kind === 'purchase') store.removePurchase(editing.row.id);
    if (editing.kind === 'want') store.removeWant(editing.row.id);
    toast(`${what[0].toUpperCase()}${what.slice(1)} deleted`);
    return;
  }

  if (editing.kind === 'purchase') {
    const d = readSimple();
    if (editing.isNew) store.addPurchase(d); else store.updatePurchase(editing.row.id, d);
    toast(editing.isNew ? 'Purchase added' : 'Saved');
    return;
  }

  if (editing.kind === 'want') {
    const d = readSimple();
    if (editing.isNew) store.addWant(d); else store.updateWant(editing.row.id, d);
    toast(editing.isNew ? 'Added to want list' : 'Saved');
    return;
  }

  const fields = readCard();
  const { _player, _team, ...rest } = fields;
  if (!rest.setId || !rest.number) { e.preventDefault(); return; }

  // Photos upload as they are picked; carry the paths over.
  rest.photoFront = editing.row.photoFront || '';
  rest.photoBack = editing.row.photoBack || '';
  rest.favorite = editing.row.favorite || false;

  if (editing.isNew) {
    const created = store.addHolding({ ...rest, id: editing.row.id || undefined });
    touch(created);
    toast(`Added #${rest.number}`);
  } else {
    touch(store.updateHolding(editing.row.id, rest));
    toast('Saved');
  }

  if (_player) store.nameCard(rest.setId, rest.number, _player, _team);

  if (action === 'save-again') {
    e.preventDefault();
    // Keep the set and roll the number forward -- entering a run out of a box is
    // the common case, and retyping the set every time is what makes it a chore.
    const next = String(rest.number).replace(/(\d+)$/, (m) => String(Number(m) + 1));
    openCardEditor({ setId: rest.setId, number: next, parallel: rest.parallel, source: rest.source,
                     acquired: rest.acquired, purchaseId: rest.purchaseId, acquiredVia: rest.acquiredVia }, true);
  }
});

/* ------------------------------------------------------------------ photos */

async function usePhoto(side, file) {
  if (!file || !editing || editing.kind !== 'card') return;
  if (!/^image\//.test(file.type)) { toast('That is not an image'); return; }

  // A new holding has no id yet, so it gets one now -- the photo filename is
  // built from it and has to stay stable.
  if (!editing.row.id) editing.row.id = 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  try {
    const path = await store.uploadPhoto(editing.row.id, side, file);
    const key = side === 'front' ? 'photoFront' : 'photoBack';
    editing.row[key] = path;
    if (!editing.isNew) store.updateHolding(editing.row.id, { [key]: path });
    redrawPhotos();
    toast(`${side === 'front' ? 'Front' : 'Back'} photo saved`);
  } catch (err) {
    toast(`Photo upload failed: ${err.message}`);
  }
}

function redrawPhotos() {
  const wrap = $('.photos', form);
  if (!wrap) return;
  // Replacing a photo reuses the filename, so the browser would keep showing the
  // old image. The buster belongs here, at render time -- putting it in the
  // stored path would bake a timestamp into collection.json forever.
  photoBust++;
  wrap.innerHTML = photoSlot('front', editing.row.photoFront, photoBust) +
                   photoSlot('back', editing.row.photoBack, photoBust);
}

form.addEventListener('click', (e) => {
  const clear = e.target.closest('[data-clear]');
  if (clear) {
    e.preventDefault();
    const side = clear.dataset.clear;
    const key = side === 'front' ? 'photoFront' : 'photoBack';
    const path = editing.row[key];
    editing.row[key] = '';
    if (path) store.deletePhoto(path).catch(() => {});
    if (!editing.isNew) store.updateHolding(editing.row.id, { [key]: '' });
    redrawPhotos();
    return;
  }
  const slot = e.target.closest('.photo');
  if (slot) { e.preventDefault(); photoSide = slot.dataset.side; $('#photo-input', form)?.click(); }
});

form.addEventListener('change', async (e) => {
  if (e.target.id !== 'photo-input') return;
  await usePhoto(photoSide, e.target.files[0]);
  e.target.value = '';
  photoSide = null;
});

// Dropping a file on a slot, and pasting anywhere in the dialog. A card photo
// usually starts life as a phone shot or a screenshot of a listing, and making
// the user round-trip through a file picker for that is friction for no reason.
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
  if (!dialog.open || editing?.kind !== 'card') return;
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  usePhoto(editing.row.photoFront ? 'back' : 'front', item.getAsFile());
});

/* ------------------------------------------------------------------ events */

$('#sidebar').addEventListener('click', (e) => handleAction(e));
$('#menu-btn').addEventListener('click', () => app.classList.toggle('nav-open'));
$('#menu-btn').innerHTML = icon('menu');
$('#account').addEventListener('click', () => go('settings'));

$('#global-search').addEventListener('input', (e) => {
  ui.query = e.target.value;
  ui.page = 1;
  if (!['collection', 'players'].includes(ui.view)) ui.view = 'collection';
  render();
});

view.addEventListener('input', (e) => {
  const key = e.target.dataset.filter;
  if (key === 'setQuery') { ui.setQuery = e.target.value; ui.page = 1; render(); }
});

view.addEventListener('change', async (e) => {
  const key = e.target.dataset.filter;
  if (key) {
    ui[key] = e.target.value;
    ui.page = 1;
    if (key === 'theme') { applyTheme(); }
    render();
    return;
  }
  if (e.target.id === 'import-file') {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { added, skipped } = store.importJSON(await file.text());
      toast(`Imported ${added} row${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} already here` : ''}`);
    } catch (err) {
      toast(`Import failed: ${err.message}`);
    }
    e.target.value = '';
  }
});

view.addEventListener('click', (e) => handleAction(e));

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
    go('setDetail', { openSet: id, subset: '' });
    toast('Set created');
  } catch (err) {
    toast(`Could not create set: ${err.message}`);
  }
});

async function handleAction(e) {
  const t = e.target;

  const fav = t.closest('[data-fav]');
  if (fav) { e.stopPropagation(); store.toggleFavorite(fav.dataset.fav); return; }

  const goto = t.closest('[data-goto]');
  if (goto) {
    const patch = {};
    if (goto.dataset.sort) patch.sort = goto.dataset.sort;
    go(goto.dataset.goto, patch);
    return;
  }

  const act = t.closest('[data-act]')?.dataset.act;
  if (act) { await runAction(act, t); return; }

  const pageBtn = t.closest('[data-page]');
  if (pageBtn && !pageBtn.disabled) { ui.page = Number(pageBtn.dataset.page); render(); window.scrollTo(0, 0); return; }

  const ptab = t.closest('[data-ptab]');
  if (ptab) { ui.purchaseTab = ptab.dataset.ptab; render(); return; }

  const sub = t.closest('[data-subset]');
  if (sub) { ui.subset = sub.dataset.subset; ui.page = 1; render(); return; }

  const holdingEl = t.closest('[data-id]');
  if (holdingEl) { go('detail', { openCard: holdingEl.dataset.id }); return; }

  const purchaseEl = t.closest('[data-purchase]');
  if (purchaseEl) {
    const p = S.purchases.find((x) => x.id === purchaseEl.dataset.purchase);
    if (p) openPurchaseEditor(p, false);
    return;
  }

  const wantEl = t.closest('[data-want]');
  if (wantEl) {
    const w = S.wants.find((x) => x.id === wantEl.dataset.want);
    if (w) openWantEditor(w, false);
    return;
  }

  const teamEl = t.closest('[data-team]');
  if (teamEl) { go('collection', { team: teamEl.dataset.team }); return; }

  const playerEl = t.closest('[data-player]');
  if (playerEl) { go('collection', { player: playerEl.dataset.player }); return; }

  const setEl = t.closest('[data-set]');
  if (setEl) { go('setDetail', { openSet: setEl.dataset.set, subset: '', setFilter: '', setQuery: '' }); return; }

  // A number on a set checklist: open the copy you own, or start a new one.
  const cell = t.closest('[data-number]');
  if (cell && ui.view === 'setDetail') {
    const number = cell.dataset.number;
    const mine = S.holdings.filter((x) => x.setId === ui.openSet && String(x.number) === number);
    if (mine.length === 1) go('detail', { openCard: mine[0].id });
    else if (mine.length > 1) go('collection', { setId: ui.openSet, query: number });
    else openCardEditor({ setId: ui.openSet, number }, true);
  }
}

async function runAction(act, target) {
  switch (act) {
    case 'add-card':
      openCardEditor({ setId: ui.openSet || ui.setId }, true);
      break;
    case 'edit-card': {
      const holding = S.holdings.find((x) => x.id === target.closest('[data-id]')?.dataset.id);
      if (holding) openCardEditor(holding, false);
      break;
    }
    case 'delete-card': {
      const id = target.closest('[data-id]')?.dataset.id;
      if (id && confirm('Delete this card? Its photos are deleted too.')) {
        await store.removeHolding(id);
        toast('Card deleted');
        go('collection');
      }
      break;
    }
    case 'add-purchase': openPurchaseEditor({}, true); break;
    case 'add-want': openWantEditor({}, true); break;
    case 'got-want': {
      // Promote a want into a real holding: the want list is a queue, and the
      // whole point of an entry is that one day it stops being one.
      const w = S.wants.find((x) => x.id === target.closest('[data-want]')?.dataset.want);
      if (!w) break;
      openCardEditor({ setId: w.setId, number: w.number, price: w.maxPrice }, true);
      store.removeWant(w.id);
      break;
    }
    case 'reset-local':
      if (confirm('Discard every change made in this browser and reload the published collection?')) {
        store.resetLocal();
        location.reload();
      }
      break;
    case 'toggle-fav': ui.favorite = !ui.favorite; ui.page = 1; render(); break;
    case 'clear-filters':
      Object.assign(ui, { query: '', year: '', brand: '', team: '', player: '', cardType: '',
                          setId: '', graded: '', numbered: '', favorite: false, tag: '', page: 1 });
      render();
      break;
    case 'base-only': ui.baseOnly = !ui.baseOnly; render(); break;
    case 'theme':
      ui.theme = ui.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      render();
      break;
    case 'export': {
      await store.saveNow();
      const blob = new Blob([store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `card-vault-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Exported');
      break;
    }
    case 'import':
      if (ui.view !== 'settings') { go('settings'); }
      $('#import-file')?.click();
      break;
    default:
      break;
  }
}

/* --------------------------------------------------------------- keyboard */

document.addEventListener('keydown', (e) => {
  if (dialog.open) {
    if (e.key === 'Escape') editing = null;
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;

  if (e.key === '/') { e.preventDefault(); $('#global-search').focus(); }
  if (e.key === 'n') { e.preventDefault(); openCardEditor({ setId: ui.openSet || ui.setId }, true); }
  if (e.key === 'Escape' && (ui.view === 'detail' || ui.view === 'setDetail')) {
    go(ui.view === 'detail' ? 'collection' : 'sets');
  }
});

// Don't lose the last keystrokes to a debounce timer on the way out.
window.addEventListener('pagehide', () => { if (S.status === 'dirty') store.saveNow(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ui.theme === 'system') render(); });

store.load().then(render);
