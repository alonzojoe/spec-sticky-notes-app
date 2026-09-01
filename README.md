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

P3 (*a deliberate new note*) is complete: a **New note** button in the toolbar — or the `n`
key — opens a dialog where the paper colour and the text are chosen together, and the note
reaches the board already written. The sidebar palette it replaced is gone. Notes are still
written on in place with debounced autosave, pinned, and deleted; the board and the sidebar
collapse both persist to `localStorage` through the contract, and a corrupt stored value loads
an empty board rather than white-screening. Board state is a pure reducer behind split state
and dispatch contexts. Notes cannot be moved yet — P5 makes the board spatial.
