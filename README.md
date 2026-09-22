# Shoebox

A baseball card collection tracker that runs on this machine and writes your
collection to a plain JSON file you can read, diff, and commit.

```bash
node tools/serve.mjs      # then open http://localhost:4188
```

## The idea

A collection app has to answer three questions that pull in different directions:
*what do I own*, *what is it worth*, and *what am I missing*. Most trackers pick
one and bolt the others on, which is why so many of them can't tell you that the
PSA 10 and the raw copy in your box are the same card number.

The fix is one distinction, made early:

- a **card** is a slot in a checklist — `2025 Topps Series 1 #100`
- a **holding** is a piece of cardboard you actually own

One slot, many holdings. A raw base copy, a PSA 10, and a Gold /2025 are three
holdings pointing at one slot. Keep them apart and everything downstream falls
out for free: set completion counts slots, value totals sum holdings, and owning
three copies of a card neither breaks your completion percentage nor hides two
cards from your net worth. Collapse them — as a flat spreadsheet does — and every
one of those questions needs a special case.

## Checklists without fabricated data

The fastest way to enter cards is the **Checklists** tab: pick a set, click the
numbers you own. That needs a checklist, and a checklist is 350 specific player
names that have to be *right* — a tracker that quietly tells you card #187 is the
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
   what it would do. Numbers outside the set's declared range are reported rather
   than written, which is how you find out you grabbed the Series 2 list.

Completion never waits on any of this: it counts numbers, and you know a set is
350 cards on day one.

Set structure ships with `"verified": false`. Print runs follow long-standing
Topps and Bowman conventions but were not scraped from a published checklist —
check them before you trust a valuation, edit the file, and flip the flag.

## Where your data lives

| | |
|---|---|
| `data/collection.json` | every holding — the file that matters |
| `data/sets/*.json` | set structure and the checklist names you've filled in |
| `images/cards/` | card photos, one file per side |

All three are tracked in git on purpose. A collection you've spent months
entering should survive a cleared browser cache, a bad edit, and a bad day — so
it isn't in `localStorage`, it's in files with history. Commit after a big entry
session and you can always get back.

Writes are atomic (temp file, then rename), so an interrupted save leaves the
previous collection intact rather than a truncated one. The Data tab also does
JSON export/import for moving the collection somewhere else.

## Values

Values are whatever you type in. Nothing here fetches live comps — there is no
free, reliable price API for cards, and a number that's silently six months stale
is worse than one you know you entered yourself. Each value carries an optional
*as of* date and a *based on* note, so a year from now you can tell whether
`$400` was a real sale or a hopeful guess. Cards with no value entered are
counted and shown next to the total, so a big number is never mistaken for a
complete one.

## Getting around

- `/` — search
- `n` — add a card
- **Save & add another** rolls the card number forward and keeps the set, which
  is what entering a run out of a box actually looks like
- Photos: click a slot, drop a file on it, or just paste — front first, then back

## Layout

```
index.html
css/style.css
js/    model.js    the card/holding split, completion, money
       store.js    state and persistence
       search.js   filtering, sorting, the search index
       render.js   views
       app.js      state, routing, events
tools/ serve.mjs             static files + the write API
       seed-sets.mjs         regenerate the starting set files
       import-checklist.mjs  load a real checklist
```

No build step, no dependencies — the server is Node's own `http` module.
