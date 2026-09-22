// MLB teams: abbreviation, name, and primary colour.
//
// Used for the team chips, the focus-team panel and the value-by-team chart.
// Team colours are identity, not data encoding -- the charts that need a
// validated categorical palette get one from charts.js instead.

export const TEAMS = {
  ARI: { name: 'Arizona Diamondbacks', short: 'D-backs', color: '#a71930' },
  ATL: { name: 'Atlanta Braves', short: 'Braves', color: '#ce1141' },
  BAL: { name: 'Baltimore Orioles', short: 'Orioles', color: '#df4601' },
  BOS: { name: 'Boston Red Sox', short: 'Red Sox', color: '#bd3039' },
  CHC: { name: 'Chicago Cubs', short: 'Cubs', color: '#0e3386' },
  CWS: { name: 'Chicago White Sox', short: 'White Sox', color: '#27251f' },
  CIN: { name: 'Cincinnati Reds', short: 'Reds', color: '#c6011f' },
  CLE: { name: 'Cleveland Guardians', short: 'Guardians', color: '#00385d' },
  COL: { name: 'Colorado Rockies', short: 'Rockies', color: '#333366' },
  DET: { name: 'Detroit Tigers', short: 'Tigers', color: '#0c2340' },
  HOU: { name: 'Houston Astros', short: 'Astros', color: '#002d62' },
  KC:  { name: 'Kansas City Royals', short: 'Royals', color: '#004687' },
  LAA: { name: 'Los Angeles Angels', short: 'Angels', color: '#ba0021' },
  LAD: { name: 'Los Angeles Dodgers', short: 'Dodgers', color: '#005a9c' },
  MIA: { name: 'Miami Marlins', short: 'Marlins', color: '#00a3e0' },
  MIL: { name: 'Milwaukee Brewers', short: 'Brewers', color: '#12284b' },
  MIN: { name: 'Minnesota Twins', short: 'Twins', color: '#002b5c' },
  NYM: { name: 'New York Mets', short: 'Mets', color: '#002d72' },
  NYY: { name: 'New York Yankees', short: 'Yankees', color: '#0c2340' },
  OAK: { name: 'Athletics', short: 'Athletics', color: '#003831' },
  PHI: { name: 'Philadelphia Phillies', short: 'Phillies', color: '#e81828' },
  PIT: { name: 'Pittsburgh Pirates', short: 'Pirates', color: '#fdb827' },
  SD:  { name: 'San Diego Padres', short: 'Padres', color: '#2f241d' },
  SF:  { name: 'San Francisco Giants', short: 'Giants', color: '#fd5a1e' },
  SEA: { name: 'Seattle Mariners', short: 'Mariners', color: '#0c2c56' },
  STL: { name: 'St. Louis Cardinals', short: 'Cardinals', color: '#c41e3a' },
  TB:  { name: 'Tampa Bay Rays', short: 'Rays', color: '#092c5c' },
  TEX: { name: 'Texas Rangers', short: 'Rangers', color: '#003278' },
  TOR: { name: 'Toronto Blue Jays', short: 'Blue Jays', color: '#134a8e' },
  WSH: { name: 'Washington Nationals', short: 'Nationals', color: '#ab0003' },
};

// Common ways a checklist writes a team, mapped to the abbreviation above.
const ALIASES = {
  ANA: 'LAA', ATH: 'OAK', CHW: 'CWS', SDP: 'SD', SFG: 'SF', TBR: 'TB', KCR: 'KC', WAS: 'WSH',
};

export function teamKey(raw) {
  if (!raw) return '';
  const up = String(raw).trim().toUpperCase();
  if (TEAMS[up]) return up;
  if (ALIASES[up]) return ALIASES[up];
  const byName = Object.entries(TEAMS).find(
    ([, t]) => t.name.toUpperCase() === up || t.short.toUpperCase() === up
  );
  return byName ? byName[0] : '';
}

export const teamName = (key) => TEAMS[key]?.name || key || 'Unknown team';
export const teamShort = (key) => TEAMS[key]?.short || key || '—';
export const teamColor = (key) => TEAMS[key]?.color || '#6b7280';
export const TEAM_KEYS = Object.keys(TEAMS);

/* ---------------------------------------------------- chart-safe variants */

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const toward = (hex, target, t) => {
  const mixed = channels(hex).map((c, i) => c + (channels(target)[i] - c) * t);
  return '#' + mixed.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
};

/**
 * A team colour that stays visible against the chart surface.
 *
 * Half of MLB wears navy, and navy on a dark panel is a bar you cannot see.
 * Identity still comes from the direct label beside every bar, so lifting the
 * fill costs nothing and is the difference between a chart and a dark rectangle.
 */
export function teamChartColor(key, dark) {
  const hex = teamColor(key);
  const floor = dark ? 0.16 : 0.0;
  const ceiling = dark ? 1 : 0.62;
  let out = hex;
  for (let t = 0; luminance(out) < floor && t < 0.72; t += 0.06) out = toward(hex, '#ffffff', t);
  for (let t = 0; luminance(out) > ceiling && t < 0.5; t += 0.06) out = toward(hex, '#000000', t);
  return out;
}
