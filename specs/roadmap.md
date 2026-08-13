# Roadmap

Vertical slices. Each phase is small, ends in a working app, and is one commit. **From P2
onward the app is genuinely usable** — every later phase improves something real rather
than building toward a distant payoff.

Rules for every phase:

- `npm run build` and `npm run lint` pass before the phase is called done.
- No phase leaves the app broken "until the next one."
- Don't build ahead. If a phase doesn't need a shadcn component, don't install it yet.
- Acceptance criteria are checked by actually using the app, not by reading the diff.

---

## P0 · Clear the deck

**Goal:** an empty, correctly-configured shell.

- Delete the Vite starter UI: `App.css`, `src/assets/*`, the demo markup in `App.tsx`,
  `public/icons.svg`.
- Install and wire Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`); `@import "tailwindcss";`
  in `src/index.css`.
- Add the `@/*` path alias to `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts`.
- `npx shadcn@latest init`. Install no components yet.
- Rewrite `README.md` for this project and link the three constitution docs.

**Done when:** the page is blank with the intended background color, a Tailwind utility
demonstrably works, an `@/` import resolves, and the build is clean.

---

## P1 · The shell and the board

**Goal:** the application shell, and paper and cork on screen, with no state behind them.

- Rename every source file we author to `snake_case`; `src/components/ui/**` and
  `src/hooks/use-mobile.ts` are exempt because `shadcn add` regenerates them. Enforce the
  rule with a test rather than by review.
- Define the design tokens in `@theme`: six paper colors, cork backdrop, warm ink, the
  layered shadow scale, easing curves, and durations. Replace shadcn's achromatic defaults
  rather than adding alongside them.
- `npx shadcn@latest add sidebar`. Delete its cookie persistence and its `ease-linear`
  motion; host `TooltipProvider` inside it so the collapsed rail works.
- Build the shell: a collapsible sidebar holding one nav item, **Notes**, plus named slots
  for the New-note (P2), search (P7), and theme (P9) controls. The board fills the rest.
- Build the board surface with its cork/felt texture and the paper grain utility.
- Render three **hardcoded** notes to prove the visual language: layered shadow, tilt,
  grain, padding.

**Done when:** the sidebar collapses cleanly and holds the only chrome on screen, the
mockup notes look like paper on a board, and the shadow/tilt/grain criteria in `mission.md`
are visibly satisfied. No `useState` of ours yet.

---

## P2 · Create and delete real notes

**Goal:** the app becomes usable.

- `src/types/note.ts` with the `Note` and `BoardState` types.
- `notesReducer.ts` — pure, handling `add` and `delete`.
- `NotesContext.tsx` with split state/dispatch providers; in-memory only.
- An "add note" button; notes spawn at a slightly randomized position with a random tilt.
- A delete control on each note.

**Done when:** notes can be added and removed, they keep their tilt across re-renders, and
the board renders from state rather than hardcoded markup. Refresh still wipes everything —
that's P3.

---

## P3 · It remembers

**Goal:** nothing is ever lost.

- `usehooks-ts` installed; board persisted under `sticky-notes:board:v1`.
- Debounce writes ~300ms.
- Defensive read: bad JSON or a wrong `version` falls back to an empty board.
- Sidebar collapse persisted under `sticky-notes:sidebar`, through the same `useLocalStorage`
  the board uses. P1 deleted shadcn's `sidebar_state` cookie and deliberately shipped no
  replacement, so that persistence arrives once through the contract rather than as two
  competing stores.

**Done when:** notes survive a hard refresh and a browser restart, and manually corrupting
the localStorage value loads an empty board instead of white-screening.

---

## P4 · Write on them

**Goal:** notes hold actual content.

- Click a note to edit in place; a plain `<textarea>` styled to look like the note itself.
- Autosave on change (debounced) and on blur. No Save button.
- New notes open focused and ready for typing.
- The note grows to fit its text within sane min/max bounds.

**Done when:** a thought can be captured in one click and typing, and it's still there
after a refresh.

---

## P5 · Move them around

**Goal:** the corkboard becomes spatial.

- `useDraggable` on pointer events: `pointerdown` / `pointermove` / `pointerup` with
  pointer capture.
- Position updates live during drag; **localStorage is written on drop only**.
- Clicking or dragging a note sets its `z` to max + 1.
- Lift shadow while dragging; spring settle on release.
- **Keyboard:** notes are focusable, arrow keys move by 8px, Shift+arrow by 32px.
- Notes are clamped so they can't be dragged fully off the board.

**Done when:** notes drag smoothly at 60fps, stacking follows the last note touched,
positions survive a refresh, and the whole board is arrangeable without a mouse.

---

## P6 · Colors and pinning

**Goal:** visual sorting.

- shadcn `dropdown-menu` (or `popover`) as a per-note color picker across the six papers.
- Pin toggle; pinned notes render above unpinned ones regardless of `z`.
- Note controls appear on hover/focus of that note only — never on all notes at once.

**Done when:** color and pin state persist, pinned notes stay on top after a refresh, and
an unhovered board still looks quiet.

---

## P7 · Find things

**Goal:** the board scales past a screenful.

- Search input in the toolbar; live filter on note body, case-insensitive.
- `lib/tags.ts` parses `#tags` out of `body` on read.
- Tags render as chips on the note and filter the board when clicked.
- Non-matching notes dim in place rather than disappearing — **positions never change**.
- Escape clears the filter.

**Done when:** filtering never moves a note, and clicking a tag shows exactly the notes
carrying it.

---

## P8 · Markdown and checkboxes

**Goal:** notes become lightly structured.

- Choose a small, HTML-escaping markdown renderer with task-list support; record the choice
  in `tech-stack.md`.
- Render bold, italic, links, and lists when a note is not being edited.
- `- [ ]` checkboxes are tickable directly on the note, writing back into `body`, without
  entering edit mode.
- Editing still shows raw markdown source.

**Done when:** a checkbox can be ticked in one click, the change persists, and pasted HTML
in a note body is escaped rather than rendered.

---

## P9 · Dark mode

**Goal:** usable at night, deliberate in both themes.

- `useTheme` with light / dark / system; persisted under `sticky-notes:theme`.
- Dark tokens for cork, paper, shadow, and text — the six papers get dark-mode variants,
  not filters or opacity hacks.
- shadcn `dropdown-menu` toggle in the toolbar.
- No flash of the wrong theme on load.

**Done when:** both themes look designed, paper colors stay distinguishable in dark mode,
and reloading in dark mode never flashes light.

---

## P10 · Polish

**Goal:** it feels finished.

- Spring motion on add, delete, pick-up, and settle; all of it collapses under
  `prefers-reduced-motion`.
- An empty state that invites the first note.
- Full a11y pass: focus rings everywhere, sensible tab order, live-region announcements for
  add/delete, keyboard drag verified.
- Responsive pass — usable on a narrow screen, not optimized for one.
- Performance check with 100+ notes: smooth drag, no jank while typing.
- Delete confirmation for a note with content (shadcn `alert-dialog`).

**Done when:** every "Done means" bullet in `mission.md` is true.

---

## Later (not scheduled)

Ideas that are allowed to exist but are not commitments. Anything here needs a mission
amendment before it gets built.

- Multi-select and group drag
- Session undo/redo
- Export the board to markdown or JSON
- Canvas pan and zoom for a board larger than the viewport
