// Card detail: everything known about one holding, split into what the card IS
// (fixed by the checklist) and what YOUR copy is (yours to maintain).

import {
  ACQUIRED_VIA, CARD_TYPES, cardOf, conditionLabel, isGraded, money, moneyShort,
  paidOf, parallelName, pct, printRun, qtyOf, serialLabel, setLabel, shortDate,
  toNumber, valueOf, variantLabel,
} from '../model.js';
import { teamName } from '../teams.js';
import { icon } from '../icons.js';
import { artwork, h } from './common.js';

export function detailView(S, ui) {
  const holding = S.holdings.find((x) => x.id === ui.openCard);
  if (!holding) return `<div class="empty"><h3>Card not found</h3></div>`;

  const set = S.sets.find((s) => s.id === holding.setId);
  const card = cardOf(set, holding.number);
  const purchase = S.purchases.find((p) => p.id === holding.purchaseId);
  const value = valueOf(holding);
  const paid = paidOf(holding);
  const delta = value - paid;
  const run = printRun(holding, set);

  const fact = (label, value) => `<tr><td>${h(label)}</td><td>${value}</td></tr>`;

  return `
  <div class="crumbs"><button data-goto="collection">My Collection</button> &rsaquo; ${h(card?.player || `Card #${holding.number}`)}</div>

  <div class="page-head">
    <div><h1>Card Details</h1></div>
    <div class="actions">
      <button class="btn" data-act="edit-card" data-id="${h(holding.id)}">${icon('pen')} Edit Card</button>
      <button class="btn btn-danger" data-act="delete-card" data-id="${h(holding.id)}">${icon('trash')} Delete</button>
    </div>
  </div>

  <div class="panel" style="padding:22px">
    <div class="detail">
      <div>
        <div class="detail-photo" data-act="photo-front">${artwork(holding, set)}</div>
        <div class="thumbs">
          ${holding.photoFront ? `<span class="t" data-side="front"><img src="${h(holding.photoFront)}" alt="Front"></span>` : ''}
          ${holding.photoBack ? `<span class="t" data-side="back"><img src="${h(holding.photoBack)}" alt="Back"></span>` : ''}
          <button class="t add" data-act="edit-card" data-id="${h(holding.id)}">+ Add Photos</button>
        </div>
      </div>

      <div style="min-width:0">
        <h1>${h(card?.player || `Card #${holding.number}`)}</h1>
        <p class="variant">${h(setLabel(set))} · ${h(variantLabel(holding, set))}</p>

        <div class="badgerow">
          <span class="tagpill owned">Owned</span>
          ${holding.auto ? '<span class="tagpill auto">Auto</span>' : ''}
          ${holding.relic ? '<span class="tagpill">Relic</span>' : ''}
          ${holding.rookie ? '<span class="tagpill">Rookie</span>' : ''}
          ${run ? '<span class="tagpill numbered">Numbered</span>' : ''}
          ${isGraded(holding) ? `<span class="tagpill">${h(conditionLabel(holding))}</span>` : ''}
          ${holding.favorite ? '<span class="tagpill">Favourite</span>' : ''}
        </div>

        <div class="grid2">
          <div>
            <h3 style="margin-bottom:8px">The card</h3>
            <table class="facts">
              ${fact('Card #', h(holding.number))}
              ${fact('Set', h(setLabel(set)))}
              ${fact('Parallel', h(parallelName(set, holding.parallel)))}
              ${fact('Serial #', run ? h(serialLabel(holding, set)) : '—')}
              ${fact('Player', h(card?.player || '—'))}
              ${fact('Team', h(card?.team ? teamName(card.team) : '—'))}
              ${fact('Card Type', h(CARD_TYPES.find((t) => t.id === (holding.cardType || 'base'))?.name || '—'))}
              ${fact('Rookie Card', holding.rookie ? 'Yes' : 'No')}
              ${fact('Auto', holding.auto ? 'Yes' : 'No')}
              ${fact('Relic', holding.relic ? 'Yes' : 'No')}
            </table>
          </div>

          <div>
            <h3 style="margin-bottom:8px">Your copy</h3>
            <table class="facts">
              ${fact('Quantity', qtyOf(holding))}
              ${fact('Acquired via', h(ACQUIRED_VIA.find((a) => a.id === holding.acquiredVia)?.name || '—'))}
              ${fact('Purchase Price', paid ? h(money(toNumber(holding.price))) : '—')}
              ${fact('Purchase Date', h(shortDate(holding.acquired)))}
              ${fact('Purchase Source', h(holding.source || purchase?.source || '—'))}
              ${fact('Current Est. Value', value ? h(money(toNumber(holding.value))) : '<span style="color:var(--ink-4)">not valued</span>')}
              ${fact('Gain / Loss', paid && value
                ? `<span class="${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${h(money(delta))} (${delta >= 0 ? '+' : ''}${pct(paid ? delta / paid : 0, 1)})</span>`
                : '—')}
              ${fact('Valued on', h(holding.valueAsOf ? shortDate(holding.valueAsOf) : '—'))}
              ${fact('Based on', h(holding.valueSource || '—'))}
              ${fact('Graded', isGraded(holding) ? h(conditionLabel(holding)) : 'No')}
              ${holding.cert ? fact('Cert #', h(holding.cert)) : ''}
            </table>
          </div>
        </div>

        ${purchase ? `<div class="note" style="margin-top:16px">
          From purchase <button class="link" data-purchase="${h(purchase.id)}"
            style="background:none;border:0;color:var(--brand);cursor:pointer;padding:0">${h(purchase.item || 'untitled')}</button>
          · ${h(shortDate(purchase.date))} · ${h(money(toNumber(purchase.cost)))}</div>` : ''}

        ${holding.notes ? `<div style="margin-top:16px">
          <h3 style="margin-bottom:6px">Notes</h3>
          <p style="margin:0;color:var(--ink-2);font-size:13px">${h(holding.notes)}</p></div>` : ''}

        ${(holding.tags || []).length ? `<div class="badgerow" style="margin-top:14px">
          ${holding.tags.map((t) => `<span class="tagpill">${h(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  </div>`;
}
