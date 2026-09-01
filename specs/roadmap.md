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

## P2 · Real notes, remembered

**Goal:** the app becomes genuinely usable — capture a thought, and find it there tomorrow.

- `src/types/note.ts` with the committed `Note` and `BoardState` types, whole.
  `mock_notes.ts` is deleted.
- `notes_reducer.ts` — pure, handling `add`, `edit_body`, `toggle_pin`, and `delete`. Ids,
  tilt, spawn position and timestamps are generated in `lib/note_factory.ts` and arrive in
  the action, so the reducer never calls `Date.now()` or `Math.random()`.
- `notes_context.tsx` with split state/dispatch providers; the reducer is the source of truth
  and `localStorage` is a debounced mirror.
- The board persisted under `sticky-notes:board:v1`, the sidebar collapse under
  `sticky-notes:sidebar`, both through `useLocalStorage`. Bad JSON or a wrong `version` loads
  an empty board rather than white-screening.
- A six-swatch paper palette in the sidebar: one click puts a note on the board in that
  color, at a randomized position, with a stored tilt, focused and ready for typing —
  replaced by the new-note dialog in P3.
- Click a note — or focus it and press Enter — to edit in place in a plain `<textarea>`.
  Autosave debounced on change, immediate on blur. No Save button.
- Per-note pin and delete controls, revealed on hover or focus of that note only. Pinned
  notes render above unpinned ones without their position, array order, or `z` changing.

**Done when:** a thought can be captured in one click and typing, notes survive a hard
refresh and a browser restart with identical colors, tilts and stacking, pinned notes are
still on top afterwards, and corrupting the localStorage value by hand loads an empty board
instead of white-screening.

P2 also absorbed the original **P3 · It remembers** and **P4 · Write on them**: persistence
and inline editing both shipped here, so a P3 or P4 reference written into P0's or P1's specs
resolves to this section.

---

## P3 · A deliberate new note

**Goal:** creating a note becomes an explicit act, and the sidebar stops being a toolbar.

- Amend `mission.md` principle 2: the modal ban is scoped to editing a note that already
  exists, and creation gets a carve-out conditional on the keyboard path. Principle 4 is
  widened to name the toolbar.
- A shadcn `Button` at the right of the shell's header opens a shadcn `dialog`.
- The dialog carries a six-swatch radiogroup and a textarea; colour and text are both chosen
  before the note exists.
- `NoteSeed` gains `body`, so creation stays one dispatch and one storage write, and
  `createdAt === updatedAt` still holds for a note born with text.
- `n` opens the dialog from anywhere outside a text field.
- `note_palette.tsx` is deleted; the sidebar keeps its nav group and rail.

**Done when:** a note with text and a chosen colour reaches the board in one submit,
`Tab, Tab, type, Cmd+Enter` creates one without a mouse, `n` is inert while typing on a note,
and no sidebar control creates notes any more.

---

## P4 · Write on them — *absorbed into P2*

Inline editing with debounced autosave shipped with P2. Markdown rendering was never P4's —
it is still **P8**. Nothing is scheduled here.

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

## P6 · Change a note's color

**Goal:** a note can be recolored after it exists.

- shadcn `dropdown-menu` (or `popover`) as a per-note color picker across the six papers.

**Done when:** a note's color can be changed without recreating it, and the change persists.

P2 shipped the rest of the original P6: pinning works, and per-note controls already appear
on hover or focus of that note alone. Colour is chosen at creation in the new-note dialog
(P3); this phase is about changing it afterwards.

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
