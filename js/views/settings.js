// Settings: where the data lives, backup, and set management.

import { setLabel, setSize } from '../model.js';
import { icon } from '../icons.js';
import { h } from './common.js';

export function settingsView(S, ui) {
  return `
  <div class="page-head"><div><h1>Settings</h1><p class="sub">Where your collection lives and how to move it.</p></div></div>

  <div class="tiles">
    <div class="tile"><b style="font-size:14px;font-family:var(--mono)">data/collection.json</b>
      <span class="label">Collection file</span>
      <span class="delta" style="color:var(--ink-3)">${S.updated ? `written ${new Date(S.updated).toLocaleString()}` : 'not written yet'}</span></div>
    <div class="tile"><b>${S.sets.length}</b><span class="label">Sets on file</span>
      <span class="delta" style="color:var(--ink-3)">data/sets/*.json</span></div>
    <div class="tile"><b>${S.holdings.filter((x) => x.photoFront || x.photoBack).length}</b>
      <span class="label">Cards with photos</span><span class="delta" style="color:var(--ink-3)">images/cards/</span></div>
    <div class="tile"><b>${S.purchases.length}</b><span class="label">Purchases logged</span></div>
  </div>

  <div class="grid2">
    <section class="panel">
      <div class="panel-head"><h2>Appearance</h2></div>
      <div class="panel-body">
        <label class="field" style="max-width:220px"><span>Theme</span>
          <select data-filter="theme">
            <option value="system" ${ui.theme === 'system' ? 'selected' : ''}>Match system</option>
            <option value="light" ${ui.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${ui.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select></label>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Backup</h2></div>
      <div class="panel-body">
        <p style="margin:0 0 12px;color:var(--ink-3);font-size:13px">
          Your collection already lives in a plain JSON file you can commit to git.
          This is for moving it elsewhere, or pulling it back after a mistake.</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn" data-act="export">${icon('export')} Export JSON</button>
          <button class="btn" data-act="import">${icon('import')} Import JSON</button>
          <input type="file" id="import-file" accept="application/json,.json" hidden>
        </div>
      </div>
    </section>
  </div>

  <section class="panel" style="margin-top:16px">
    <div class="panel-head"><h2>Add a set</h2></div>
    <div class="panel-body">
      <p style="margin:0 0 14px;color:var(--ink-3);font-size:13px">
        Card numbers are all that's needed to start tracking completion — player names fill in as you enter cards.</p>
      <form id="new-set" class="row" style="align-items:end">
        <label class="field"><span>Year</span><input type="number" name="year" value="${new Date().getFullYear()}" required></label>
        <label class="field"><span>Brand</span><input type="text" name="brand" placeholder="Topps" required></label>
        <label class="field"><span>Set name</span><input type="text" name="name" placeholder="Series 1" required></label>
        <label class="field"><span>Prefix</span><input type="text" name="prefix" placeholder="US"></label>
        <label class="field"><span>First #</span><input type="number" name="from" value="1" required></label>
        <label class="field"><span>Last #</span><input type="number" name="to" value="350" required></label>
        <button class="btn btn-primary" type="submit">Create set</button>
      </form>
    </div>
  </section>

  <section class="panel" style="margin-top:16px">
    <div class="panel-head"><h2>Sets on file</h2></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Set</th><th class="num">Cards</th><th class="num">Parallels</th><th>Checklist names</th><th>Verified</th></tr></thead>
      <tbody>${S.sets.map((s) => {
        const named = Object.keys(s.cards || {}).length;
        return `<tr data-set="${h(s.id)}">
          <td><b>${h(setLabel(s))}</b><br><span class="mono" style="font-size:11px;color:var(--ink-3)">data/sets/${h(s.id)}.json</span></td>
          <td class="num mono">${setSize(s).toLocaleString()}</td>
          <td class="num mono">${(s.parallels || []).length}</td>
          <td class="mono">${named} / ${setSize(s)}</td>
          <td>${s.verified ? '<span class="pill pill-trade">Verified</span>' : '<span class="pill">Unverified</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </section>`;
}
