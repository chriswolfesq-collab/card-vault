// Hand-rolled SVG charts. No dependencies.
//
// Colours come from --series-1..5, which are the validated categorical slots
// (blue, orange, aqua, yellow, magenta) with their own dark-mode steps in
// style.css. Series get slots in fixed order and never cycle: a sixth category
// folds into "Other" rather than inventing a hue.
//
// Text never wears a series colour -- values and labels stay in the ink tokens
// and a coloured swatch beside them carries the identity. Three of the light
// slots sit under 3:1 against a white panel, so every chart here ships visible
// labels or a table beside it rather than relying on the fill alone.

import { money, moneyShort } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** True when the dark palette is live -- set as a token in style.css. */
export const isDark = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--is-dark').trim() === '1';

export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];

/** Round an axis maximum up to something a person would choose. */
function niceMax(value) {
  if (value <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(value));
  const norm = value / mag;
  // A finer ladder than 1/2/5/10: rounding 52 up to 100 throws away half the
  // plot height, which makes a real trend look flat.
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => norm <= s) ?? 10;
  return step * mag;
}

function ticks(max, count = 4) {
  const top = niceMax(max);
  return Array.from({ length: count + 1 }, (_, i) => (top / count) * i);
}

/* ------------------------------------------------------------------ donut */

/**
 * Part-to-whole at a glance, capped at six segments (past that the adjacent
 * slices stop being distinguishable and this should be a bar chart).
 * Percentages are drawn on the ring and the legend carries the real amounts,
 * which is also what satisfies the contrast relief rule.
 */
export function donut(segments, { size = 168, thickness = 26, format = money } = {}) {
  const rows = segments.filter((s) => s.value > 0);
  const total = rows.reduce((n, s) => n + s.value, 0);
  if (!total) return `<p class="chart-empty">Nothing to show yet.</p>`;

  const r = size / 2 - thickness / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  // A 2px surface gap between neighbouring fills, in path-length units.
  const gap = rows.length > 1 ? 2 : 0;

  const arcs = [];
  const labels = [];
  let offset = 0;

  rows.forEach((s, i) => {
    const frac = s.value / total;
    const len = Math.max(0, circ * frac - gap);
    arcs.push(`<circle class="donut-arc" r="${r}" cx="${c}" cy="${c}" fill="none"
      stroke="${SERIES[i % SERIES.length]}" stroke-width="${thickness}"
      stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}"
      data-label="${esc(s.label)}" data-value="${esc(format(s.value))} · ${(frac * 100).toFixed(0)}%"></circle>`);

    // Direct label on any slice with room for one. Drawn outside the rotated
    // group so the text stays upright.
    if (frac >= 0.08) {
      const mid = ((offset + circ * frac / 2) / circ) * 2 * Math.PI - Math.PI / 2;
      labels.push(`<text class="donut-pct" x="${(c + Math.cos(mid) * r).toFixed(1)}" y="${(c + Math.sin(mid) * r).toFixed(1)}"
        text-anchor="middle" dominant-baseline="central">${(frac * 100).toFixed(0)}%</text>`);
    }
    offset += circ * frac;
  });

  const legend = rows.map((s, i) => `
    <li><span class="swatch" style="background:${SERIES[i % SERIES.length]}"></span>
      <span class="legend-label">${esc(s.label)}</span>
      <span class="legend-value">${esc(format(s.value))}</span></li>`).join('');

  return `
  <div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Share of spending by type">
      <g transform="rotate(-90 ${c} ${c})">${arcs.join('')}</g>
      ${labels.join('')}
    </svg>
    <ul class="legend">${legend}</ul>
  </div>`;
}

/* -------------------------------------------------------- horizontal bars */

/** One series, magnitude by length. Values are direct-labelled at the end. */
export function barsH(rows, { format = moneyShort, color = 'var(--series-1)', max: forced } = {}) {
  if (!rows.length) return `<p class="chart-empty">Nothing to show yet.</p>`;
  const max = niceMax(forced || Math.max(...rows.map((r) => r.value)));
  return `<ul class="barsh">${rows.map((r) => `
    <li data-label="${esc(r.label)}" data-value="${esc(format(r.value))}">
      <span class="barsh-label">${esc(r.label)}</span>
      <span class="barsh-track">
        <span class="barsh-fill" style="width:${Math.max(1.5, (r.value / max) * 100)}%;background:${r.color || color}"></span>
      </span>
      <span class="barsh-value">${esc(format(r.value))}</span>
    </li>`).join('')}</ul>`;
}

/* ------------------------------------------------------------- line chart */

/**
 * A single measure over time. Two measures of different scale get two of these
 * stacked (small multiples) -- never two y-scales on one plot, which is the
 * fastest way to make a chart say whatever you want it to.
 */
export function line(points, {
  height = 92, color = 'var(--series-1)', format = (v) => String(v), label = '', fill = true,
} = {}) {
  if (points.length < 2) return `<p class="chart-empty">Not enough history yet.</p>`;

  const W = 320, H = height, padT = 10, padB = 18, padL = 2, padR = 2;
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const x = (i) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)} ${(H - padB).toFixed(1)} L${x(0).toFixed(1)} ${(H - padB).toFixed(1)} Z`;

  const last = points[points.length - 1];
  const dots = points.map((p, i) => `<circle class="line-dot" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4"
     fill="${color}" data-label="${esc(p.label)}" data-value="${esc(format(p.value))}"></circle>`).join('');

  return `
  <figure class="linechart">
    ${label ? `<figcaption><span class="swatch" style="background:${color}"></span>${esc(label)}
      <b>${esc(format(last.value))}</b></figcaption>` : ''}
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(label)} over time">
      <line class="grid" x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}"></line>
      ${fill ? `<path d="${area}" fill="${color}" opacity=".10"></path>` : ''}
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
    </svg>
    <svg class="line-hit" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${dots}</svg>
    <div class="line-axis"><span>${esc(points[0].label)}</span><span>${esc(last.label)}</span></div>
  </figure>`;
}

/* ---------------------------------------------------------- grouped bars */

/**
 * Two measures in the same unit, side by side. Same unit is the condition --
 * dollars against dollars share a scale honestly; dollars against a card count
 * would not, and would need two charts.
 */
export function groupedBars(groups, { series, height = 150, format = moneyShort } = {}) {
  if (!groups.length) return `<p class="chart-empty">Nothing to show yet.</p>`;
  const max = niceMax(Math.max(...groups.flatMap((g) => g.values), 1));
  const scale = ticks(max);

  const bars = groups.map((g) => `
    <div class="gb-group" style="--n:${g.values.length}">
      <div class="gb-bars">
        ${g.values.map((v, i) => `<span class="gb-bar" style="height:${Math.max(1, (v / max) * 100)}%;background:${SERIES[i]}"
             data-label="${esc(g.label)} · ${esc(series[i])}" data-value="${esc(format(v))}"></span>`).join('')}
      </div>
      <span class="gb-label">${esc(g.label)}</span>
    </div>`).join('');

  return `
  <div class="gb">
    <ul class="legend legend-inline">${series.map((s, i) =>
      `<li><span class="swatch" style="background:${SERIES[i]}"></span><span class="legend-label">${esc(s)}</span></li>`).join('')}</ul>
    <div class="gb-plot" style="height:${height}px">
      <div class="gb-grid">${scale.slice().reverse().map((t) =>
        `<span class="gb-gridline"><i>${esc(format(t))}</i></span>`).join('')}</div>
      <div class="gb-groups">${bars}</div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- tooltip */

/**
 * One delegated tooltip for every chart on the page. Hit targets are the marks
 * themselves; anything carrying data-label gets a tooltip, so a new chart type
 * needs no extra wiring.
 */
export function attachTooltips(root) {
  let tip = root.querySelector('.chart-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    root.appendChild(tip);
  }

  const show = (target, e) => {
    tip.innerHTML = `<b>${esc(target.dataset.label)}</b><span>${esc(target.dataset.value)}</span>`;
    tip.hidden = false;
    const box = root.getBoundingClientRect();
    tip.style.left = `${e.clientX - box.left}px`;
    tip.style.top = `${e.clientY - box.top}px`;
  };

  root.addEventListener('mousemove', (e) => {
    const target = e.target.closest?.('[data-label][data-value]');
    if (target) show(target, e);
    else tip.hidden = true;
  });
  root.addEventListener('mouseleave', () => { tip.hidden = true; });
}
