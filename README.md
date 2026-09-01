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

P6 (*a note with a date*) is complete: every note carries a date, shown top-left on the card as
`MM/DD/YYYY` and defaulted to today when the note is created. Cards are all the same height with
their bodies truncated by an ellipsis, and clicking one opens the note — the full text, its
colour and its date, editable, saving itself with no Save button. Notes still sit in a grid,
newest first, and dragging one onto another swaps them permanently. The board persists to
`localStorage` through the contract; a corrupt value loads an empty board rather than
white-screening, and a board saved before the grid or before the date is repaired on read.
