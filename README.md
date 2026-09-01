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

P5 (*a board that lines up*) is complete: notes sit in a grid, newest first. A new note takes
the first slot and pushes the rest along, deleting one closes the gap, and dragging a note onto
another swaps the two of them permanently — the same reordering is on the arrow keys. Notes are
created from a toolbar dialog or the `n` key, written on in place with debounced autosave,
pinned, and deleted. The board and the sidebar collapse both persist to `localStorage` through
the contract, a corrupt stored value loads an empty board rather than white-screening, and a
board saved before the grid is stamped with an order on read.
