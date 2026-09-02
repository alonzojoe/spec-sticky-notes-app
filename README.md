# sticky-notes-app

A personal digital corkboard. Notes are pieces of paper you throw onto a board and arrange with
your hands — not rows in a list. **Where** a note sits is part of what it means, so the board
never rearranges itself behind your back. Built for one user: no accounts, no sync, no
collaboration, no server. Everything lives in the browser.

## Running it

```sh
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm test         # vitest run
```

`npm run build` and `npm run lint` must pass, with no new warnings, before any phase is done.

## The constitution

Three documents govern this project. Read them before changing anything — a change that
contradicts them is a change to the constitution, not a detail.

- [specs/mission.md](specs/mission.md) — what we're building and what "modern UI" means here,
  as testable acceptance criteria rather than vibes.
- [specs/tech-stack.md](specs/tech-stack.md) — the committed stack, the hard rules, the data
  model, and the persistence contract.
- [specs/roadmap.md](specs/roadmap.md) — the phase order, and the Done-when for each phase.

Per-phase requirements, plans, and validation gates live alongside them in `specs/`.

## Status

P7 (*a note that says what it is*) is complete: a note carries a one-line title and a single
link alongside its date, and the card shows all three — the date top-left, the title under it,
and the link as a chip on the bottom edge that opens in a new tab. Cards are all exactly the
same height, and the body is clamped to the lines the title and the link left it, so a note
with neither shows more of itself rather than the same four lines. Clicking a card opens the
note — the full text, its colour, its date, its title and its link, editable, saving itself
with no Save button. Notes still sit in a grid,
newest first, and dragging one onto another swaps them permanently. The board persists to
`localStorage` through the contract; a corrupt value loads an empty board rather than
white-screening, and a board saved before the grid, the date, or the title and link is
repaired on read.
