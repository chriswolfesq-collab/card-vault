// Want list: cards you do not own. Deliberately its own list rather than a flag
// on a holding -- you cannot put a condition, a photo or a purchase price on a
// card you have never had, and pretending otherwise pollutes every total.

import { money, setLabel, shortDate, toNumber } from '../model.js';
import { icon } from '../icons.js';
import { empty, h } from './common.js';

const PRIORITIES = [
  { id: 'high', name: 'High' },
  { id: 'normal', name: 'Normal' },
  { id: 'low', name: 'Low' },
];

export function wantsView(S, ui) {
  const budget = S.wants.reduce((n, w) => n + toNumber(w.maxPrice), 0);

  return `
  <div class="page-head">
    <div>
      <h1>Want List</h1>
      <p class="sub">${S.wants.length} card${S.wants.length === 1 ? '' : 's'} wanted${
        budget ? ` · ${h(money(budget))} budgeted` : ''}</p>
    </div>
    <div class="actions"><button class="btn btn-primary" data-act="add-want">${icon('add')} Add Want</button></div>
  </div>

  ${!S.wants.length
    ? empty('heart', 'Nothing on the want list',
        'Track the cards you are hunting, what you are willing to pay, and how badly you want them.',
        `<button class="btn btn-primary" data-act="add-want">${icon('add')} Add a want</button>`)
    : `<div class="panel"><div class="tablewrap"><table>
        <thead><tr><th>Card</th><th>Set</th><th>Variant</th><th>Priority</th><th class="num">Max Price</th><th>Notes</th><th></th></tr></thead>
        <tbody>${[...S.wants]
          .sort((a, b) => rank(a.priority) - rank(b.priority) || String(a.player).localeCompare(String(b.player)))
          .map((w) => {
            const set = S.sets.find((s) => s.id === w.setId);
            return `<tr data-want="${h(w.id)}">
              <td><b>${h(w.player || `Card #${w.number}`)}</b>${w.number ? `<br><span style="color:var(--ink-3);font-size:11.5px">#${h(w.number)}</span>` : ''}</td>
              <td>${h(set ? setLabel(set) : w.setId || '—')}</td>
              <td>${h(w.variant || 'Base')}</td>
              <td><span class="pill ${w.priority === 'high' ? 'pill-break' : w.priority === 'low' ? '' : 'pill-single'}">${h(label(w.priority))}</span></td>
              <td class="num mono">${w.maxPrice ? h(money(toNumber(w.maxPrice))) : '—'}</td>
              <td style="color:var(--ink-3)">${h(w.notes || '')}</td>
              <td class="num"><button class="btn btn-sm" data-act="got-want" data-want="${h(w.id)}">Got it</button></td>
            </tr>`;
          }).join('')}</tbody>
      </table></div></div>`}`;
}

const rank = (p) => (p === 'high' ? 0 : p === 'low' ? 2 : 1);
const label = (p) => PRIORITIES.find((x) => x.id === p)?.name || 'Normal';
export { PRIORITIES };
