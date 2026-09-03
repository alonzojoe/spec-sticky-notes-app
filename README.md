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

P10 (*a view of the pinned*) is complete: the sidebar has two destinations — `Notes` and
`Pinned notes` — and `/pinned` shows the pinned notes and nothing else. The sections are routes on
TanStack Router, so the URL is what remembers which view you were in and nothing new is stored. It
is a view rather than an edit: no note's order or pinned flag is written by navigating, and coming
back to `Notes` shows the arrangement you left. Creating a note returns you to the whole board,
because a new note is never pinned; an empty pinned board says so and names the way out; and search
still ignores the section — the palette finds every note and opens it, drawn or not. A card carries
two controls again, pin and delete, and a pinned note draws its pin without a hover: with a section
collecting pinned notes, the mark you see is the control you press.

Before it, P9 (*a quieter card*): a card carries one control — delete — hidden until you touch
that note, and everything else you can do to a note happens in the note. Deleting a note that has a
title, a body or a link asks first; an empty one goes immediately, and there is one confirmation for
the whole board rather than one per card. Pinning moved into the note's own view, and a pinned card
keeps a small pin glyph that is state rather than a control: no handler, no tab stop, and clicking
it opens the note like anywhere else on the card. Search is a palette on `⌘K` — `Ctrl+K` off macOS — that finds a
note by its title or its text and opens it; the board never filters, dims or reorders. A note
carries a title and a link alongside its date, and the card shows all three at a uniform height with
its body clamped to the lines the title and the link left it. Notes sit in a grid,
newest first, and dragging one onto another swaps them permanently. The board persists to
`localStorage` through the contract; a corrupt value loads an empty board rather than
white-screening, and a board saved before the grid, the date, or the title and link is
repaired on read.
