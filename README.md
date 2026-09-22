# Card Vault

A baseball card collection tracker that runs on this machine and writes your
collection to plain JSON files you can read, diff, and commit.

```bash
node tools/serve.mjs      # then open http://localhost:4188
```

Want to see it populated before entering anything of your own?

```bash
node tools/demo-data.mjs           # a sample collection, in its own demo-* sets
node tools/demo-data.mjs --clear   # removes every trace of it
```

## The idea

A collection app has to answer three questions that pull in different
directions: *what do I own*, *what is it worth*, and *what am I missing*. Most
trackers pick one and bolt the others on, which is why so many of them can't
tell you that the PSA 10 and the raw copy in your box are the same card number.

Three things, kept apart:

- a **card** is a slot in a checklist — `2025 Topps Series 1 #100`
- a **holding** is a piece of cardboard you actually own
- a **purchase** is a transaction that produced holdings

One slot holds many holdings: a raw base copy, a PSA 10 and a Gold /2025 are
three holdings pointing at one slot. One purchase yields many holdings: a $120
hobby box becomes 24 cards, and the only way to know whether the box was worth
opening is to sum what came out of it.

Keep the three apart and everything downstream falls out for free. Set
completion counts slots. Value totals sum holdings. Break profit/loss is derived
from the holdings pointing at a purchase — never stored — so re-valuing one card
immediately re-scores the box it came from. Collapse any pair, as a flat
spreadsheet does, and every one of those questions needs a special case.

The **want list** is deliberately its own list rather than a flag on a holding:
you cannot put a condition, a photo or a purchase price on a card you have never
had, and pretending otherwise pollutes every total.

## Checklists without fabricated data

The fastest way to enter cards is **Sets**: open a checklist, click the numbers
you own. That needs a checklist, and a checklist is 350 specific player names
that have to be *right* — a tracker that quietly tells you card #187 is the
wrong player is worse than one that says nothing.

So the set files ship with **structure only**: numbering ranges and the parallel
ladder with print runs. No player names are invented. Names arrive two ways:

1. **As you collect.** Type the player when you add a card and it's written back
   to the set file. The grid gets more informative the more you enter.
2. **All at once**, from a real checklist you supply:

   ```bash
   node tools/import-checklist.mjs 2025-topps-series-1 checklist.csv --dry
   ```

   Takes CSV, TSV, or pasted `100 Shohei Ohtani Dodgers` lines. `--dry` shows
   what it would do. Numbers outside the set's declared range are reported
   rather than written, which is how you find out you grabbed the Series 2 list.

Completion never waits on any of this: it counts numbers, and you know a set is
350 cards on day one.

Set structure ships with `"verified": false`. Print runs follow long-standing
Topps and Bowman conventions but were not scraped from a published checklist —
check them before you trust a valuation, edit the file, and flip the flag.

## Where your data lives

| | |
|---|---|
| `data/collection.json` | holdings, purchases and the want list — the file that matters |
| `data/sets/*.json` | set structure and the checklist names you've filled in |
| `images/cards/` | card photos, one file per side |

All three are tracked in git on purpose. A collection you've spent months
entering should survive a cleared browser cache, a bad edit and a bad day — so
it isn't in `localStorage`, it's in files with history. Commit after a big entry
session and you can always get back.

Writes are atomic (temp file, then rename), so an interrupted save leaves the
previous collection intact rather than a truncated one. Settings also does JSON
export/import for moving the collection somewhere else.

## Two modes

| | with `node tools/serve.mjs` | static hosting (GitHub Pages, or opening `index.html`) |
|---|---|---|
| Reads | the JSON files | the same JSON files, via `data/index.json` |
| Writes | real files on disk | this browser's `localStorage` only |
| Photos | yes | no |

The app tries the API first and falls back on its own, so the same build works
both ways. Static hosting has no directory listing, hence `data/index.json` —
the server rewrites it whenever a set changes, so it can't drift.

**Static mode says so, loudly.** The premise here is that your collection lives
in files you can trust; a page that quietly accepted edits it could never
persist would be the exact failure this was built to avoid. So the demo carries
a banner, photos are refused outright rather than stuffed into `localStorage` as
data URLs that would blow the quota and vanish together, and there's a button to
discard browser changes and go back to the published files.

A live read-only demo is at
**[chriswolfesq-collab.github.io/card-vault](https://chriswolfesq-collab.github.io/card-vault/)**.
Poke at it all you like — nothing you do there reaches anyone else's copy.

## Values

Values are whatever you type in. Nothing here fetches live comps — there is no
free, reliable price API for cards, and a number that's silently six months
stale is worse than one you know you entered yourself. Each value carries an
optional *as of* date and a *based on* note, so a year from now you can tell
whether `$400` was a real sale or a hopeful guess. Cards with no value are
counted and shown next to the total, so a big number is never mistaken for a
complete one.

## Charts

Four charts on the Stats page, all hand-rolled SVG, no chart library.

Their colours are a validated categorical palette (blue, orange, aqua, yellow,
magenta) with separately chosen dark-mode steps — not a light palette dimmed.
Series take slots in fixed order and never cycle.

**Collection Growth is two plots, not one.** Cards and dollars share no unit,
and putting a count and a dollar figure on one pair of axes is the trick that
makes every collection look like it's compounding. Spending vs. value *is* one
chart, because both sides are dollars.

Team colours get a luminance lift in dark mode: half of MLB wears navy, and navy
on a dark panel is a bar you can't see. Identity still comes from the label
beside every bar, so lifting the fill costs nothing.

## Getting around

- `/` — search · `n` — add a card · `Esc` — back out of a detail page
- **Save & add another** rolls the card number forward and keeps the set, which
  is what entering a run out of a box actually looks like
- Photos: click a slot, drop a file on it, or just paste — front first, then back
- Dark mode is in the sidebar; the choice is remembered

## Layout

```
index.html
css/style.css
js/    model.js      card / holding / purchase, completion, money
       store.js      state and persistence
       search.js     filtering, sorting, facets, pagination
       insights.js   derived aggregates (by player, team, set, month)
       charts.js     SVG charts
       teams.js      MLB teams and chart-safe colours
       icons.js      inline SVG icons
       app.js        routing, state, events
       views/        one file per page
tools/ serve.mjs             static files + the write API
       seed-sets.mjs         regenerate the starting set files
       import-checklist.mjs  load a real checklist
       demo-data.mjs         load/clear a sample collection
```

No build step, no dependencies — the server is Node's own `http` module.
