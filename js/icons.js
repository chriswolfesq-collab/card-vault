// Inline SVG icons. Stroke-based, 24-grid, sized by CSS.

const s = (path, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}${extra}</svg>`;

export const icons = {
  vault: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2.5 4 5.6v6c0 4.6 3.2 8.6 8 9.9 4.8-1.3 8-5.3 8-9.9v-6L12 2.5Z" fill="currentColor" opacity=".22"/>
    <path d="M12 2.5 4 5.6v6c0 4.6 3.2 8.6 8 9.9 4.8-1.3 8-5.3 8-9.9v-6L12 2.5Z" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="12" cy="11.5" r="3.4" stroke="currentColor" stroke-width="1.6"/>
    <path d="M12 8.1v6.8M8.6 11.5h6.8" stroke="currentColor" stroke-width="1.6"/></svg>`,

  dashboard: s('<rect x="3" y="3" width="7.5" height="8.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.6"/><rect x="13.5" y="11" width="7.5" height="10" rx="1.6"/><rect x="3" y="14.5" width="7.5" height="6.5" rx="1.6"/>'),
  collection: s('<rect x="3" y="4" width="13" height="17" rx="2"/><path d="M19 7v12.5a1.5 1.5 0 0 1-1.5 1.5"/><path d="M7 9h5M7 13h5"/>'),
  sets: s('<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>'),
  players: s('<circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6"/><path d="M16.5 5.2a3.2 3.2 0 0 1 0 6.1M18 14.8c2 .7 3.5 2.6 3.5 5.2"/>'),
  heart: s('<path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6c0 5-7.5 9.4-7.5 9.4Z"/>'),
  heartFill: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6c0 5-7.5 9.4-7.5 9.4Z"/></svg>`,
  purchases: s('<path d="M3 5h2.2l1.9 10.4a1.8 1.8 0 0 0 1.8 1.5h8.3a1.8 1.8 0 0 0 1.8-1.4L21 8H6.3"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/>'),
  stats: s('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  add: s('<path d="M12 5v14M5 12h14"/>'),
  import: s('<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>'),
  export: s('<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>'),
  settings: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15.9H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 5.6V5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'),
  moon: s('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>'),
  sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  grid: s('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  table: s('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 9.5V20"/>'),
  cards: s('<rect x="7" y="3" width="13" height="17" rx="2"/><path d="M4 6v13a2 2 0 0 0 2 2h9"/>'),
  dollar: s('<path d="M12 2v20"/><path d="M17 6.5c0-2-2.2-3-5-3s-5 1-5 3.2S9 10 12 10.5s5 1.3 5 3.5-2.2 3.3-5 3.3-5-1.1-5-3"/>'),
  wallet: s('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16.5 15h2"/>'),
  pen: s('<path d="M4 20h4L20 8a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6Z"/>'),
  trash: s('<path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2"/><path d="M6.5 7 7.4 20a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7"/>'),
  chevronL: s('<path d="m14.5 5-7 7 7 7"/>'),
  chevronR: s('<path d="m9.5 5 7 7-7 7"/>'),
  back: s('<path d="M20 12H5M11 5l-7 7 7 7"/>'),
  menu: s('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  filter: s('<path d="M4 5h16l-6.2 7.4V20l-3.6-2v-5.6Z"/>'),
  star: s('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8Z"/>'),
  check: s('<path d="m5 13 4.5 4.5L19 7"/>'),
  box: s('<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5Z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>'),
};

export const icon = (name) => icons[name] || '';
