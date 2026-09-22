// Players: the collection re-sliced by who is on the card. Nothing new is
// stored -- this is byPlayer() over the same holdings.

import { money, moneyShort } from '../model.js';
import { byPlayer } from '../insights.js';
import { teamColor, teamName, teamShort } from '../teams.js';
import { icon } from '../icons.js';
import { empty, h, initials } from './common.js';

export function playersView(S, ui) {
  const getSet = (id) => S.sets.find((s) => s.id === id);
  let rows = byPlayer(S.holdings, getSet);

  if (!S.holdings.length) {
    return empty('players', 'No players yet',
      'Players appear here as soon as cards carry a name. Type the player when you add a card and the checklist learns it too.',
      `<button class="btn btn-primary" data-act="add-card">${icon('add')} Add a card</button>`);
  }
  if (!rows.length) {
    return empty('players', 'No names on file yet',
      `Your cards are entered by number but none carry a player name yet. Add a name when you edit a card,
       or import a checklist with <code>tools/import-checklist.mjs</code>.`);
  }

  if (ui.query) {
    const q = ui.query.toLowerCase();
    rows = rows.filter((r) => r.player.toLowerCase().includes(q));
  }
  if (ui.sortPlayers === 'cards') rows.sort((a, b) => b.cards - a.cards);
  else if (ui.sortPlayers === 'name') rows.sort((a, b) => a.player.localeCompare(b.player));

  return `
  <div class="page-head">
    <div><h1>Players</h1><p class="sub">${rows.length.toLocaleString()} player${rows.length === 1 ? '' : 's'} in the collection</p></div>
    <div class="actions">
      <label style="font-size:13px;color:var(--ink-3)">Sort by:
        <select data-filter="sortPlayers" style="margin-left:6px">
          <option value="value" ${ui.sortPlayers === 'value' ? 'selected' : ''}>Value</option>
          <option value="cards" ${ui.sortPlayers === 'cards' ? 'selected' : ''}>Card count</option>
          <option value="name" ${ui.sortPlayers === 'name' ? 'selected' : ''}>Name</option>
        </select>
      </label>
    </div>
  </div>

  <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(232px,1fr))">
    ${rows.map((r) => `
      <article class="panel" data-player="${h(r.player)}" tabindex="0" style="cursor:pointer;padding:15px;display:flex;gap:12px;align-items:center">
        <span class="teamdot" style="--team:${teamColor(r.team)}">${h(initials(r.player))}</span>
        <span style="min-width:0;flex:1">
          <b style="display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(r.player)}</b>
          <span style="font-size:12px;color:var(--ink-3)">${h(r.team ? teamShort(r.team) : 'Unknown team')} · ${r.cards} card${r.cards === 1 ? '' : 's'}</span>
          <span style="display:block;font-size:12px;color:var(--ink-3);margin-top:2px">
            ${r.autos ? `${r.autos} auto${r.autos === 1 ? '' : 's'}` : ''}${r.autos && r.relics ? ' · ' : ''}${r.relics ? `${r.relics} relic${r.relics === 1 ? '' : 's'}` : ''}
          </span>
        </span>
        <span style="font-weight:700;font-variant-numeric:tabular-nums">${r.value ? h(moneyShort(r.value)) : '—'}</span>
      </article>`).join('')}
  </div>`;
}
