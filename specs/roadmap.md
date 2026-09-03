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
  for the New-note (P2), search (P8) and theme (*Dark mode*) controls. The board fills the rest.
  (Search shipped in P8 as a ⌘K palette in the toolbar, not as a sidebar slot.)
- Build the board surface with its cork/felt texture and the paper grain utility.
- Render three **hardcoded** notes to prove the visual language: layered shadow, tilt,
  grain, padding. (P5 dropped the tilt when the board became a grid.)

**Done when:** the sidebar collapses cleanly and holds the only chrome on screen, the
mockup notes look like paper on a board, and the shadow/grain criteria in `mission.md`
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
it is still ***Markdown and checkboxes***. Nothing is scheduled here.

---

## P5 · A board that lines up

**Goal:** the board becomes a grid — formal, never overlapping, and still arranged by hand.

- Amend `mission.md` principle 1: *Spatial, not sorted* becomes *Ordered, not scattered*. The
  board reorders on create, delete and pin, and on nothing else.
- `Note` gains `order` and loses `x`/`y`. Position is derived from the stamp and the column
  count, so it survives a resize; a persisted pixel position would not.
- `lib/grid.ts` — pure geometry. A slot index cannot collide with another slot index, which
  is what makes "notes never overlap" provable rather than observable.
- `useDraggable` on pointer events with pointer capture. Dropping a note onto another swaps
  their stamps, permanently. **localStorage is written on drop only.**
- A 4px threshold before a press becomes a drag, so clicking a note to write on it still
  works.
- **Keyboard:** arrow keys move a focused note one slot, `Home`/`End` to the ends, no wrap.
- The defensive read stamps `order` onto boards saved before this phase, newest first.

**Done when:** notes fill a grid newest-first, a new note takes the first slot and pushes the
rest along, deleting one closes the gap, dragging one onto another swaps them permanently, the
same reordering is reachable from the keyboard, and a board saved under P3 opens ordered rather
than scattered.

## P6 · A note with a date

**Goal:** a card becomes a summary you can scan, and the note itself becomes the place you read
and write.

- Amend `mission.md` principle 2 a third time: a card is a summary, and clicking it opens the
  note. Principle 3 is **not** amended — "there is no Save button" constrains this phase.
- `Note` gains `date`, stored ISO `YYYY-MM-DD` and shown `MM/DD/YYYY`. Nothing constructs a
  `Date` from a stored value.
- shadcn `calendar` + `popover`; the create dialog defaults the date to today, recomputed each
  time it opens.
- Every card the same height, the date top-left in tabular figures, the body `line-clamp`ed.
- A note view carrying the full body, the colour swatches and the date. It autosaves; there is
  no Save and no Cancel.
- The card stops being an editor: no textarea, no debounce, no blur handler.
- The defensive read derives a missing `date` from `createdAt`.

**Done when:** every note shows its date top-left as `MM/DD/YYYY`, cards are uniform with their
bodies truncated by an ellipsis, clicking one opens it for reading and editing, and there is no
Save button anywhere.

---

## P7 · A note that says what it is

**Goal:** a card can be scanned instead of read.

- Amend `mission.md` § Core scope: a note carries a one-line **title** and one **link**.
  Principles 2 and 3 are **not** amended — the card is already a summary, and the new fields
  autosave like every other one.
- Renumber the phases below: the tags half of this phase becomes its own phase, and Markdown,
  Dark mode and Polish each move down one. (P9 stopped numbering them; see its last bullet.)
- `Note` gains `title` and `link`, both `''` when absent. Neither is optional and neither is
  `null`.
- `lib/links.ts` — the only place a URL is judged. `http:` and `https:` are allowlisted, a bare
  host is prefixed with `https://`, and everything else normalises to `''`.
- The card grows to `h-52`: date, title clamped to one line, body clamped to what is left, and
  the link as a chip on the bottom edge that opens in a new tab.
- **The body's clamp is three lines plus one for each of the title and the link the note does
  not have.** Uniform height was the requirement; a uniform clamp never was.
- The defensive read fills a missing `title` and `link` with `''`, and drops a stored link that
  is not `http(s)`.
- This phase runs P6's outstanding Gate 3 check on the card geometry rather than deferring it
  again.

**Done when:** a note can carry a title and a URL, the card shows the title under the date and
the link as a chip, every card is still exactly the same height, and a board saved before this
phase opens with every note intact.

---

## P8 · Find things

**Goal:** the board scales past a screenful.

- A trigger beside the sidebar toggle: a muted field-shaped **button**, never an input, carrying
  a magnifier, the word Search, and this platform's own shortcut badge — `⌘K` on macOS, `Ctrl+K`
  everywhere else. Icon only below `sm`.
- `lib/platform.ts` answers "is this a Mac" in one place. The badge is a hint: **both modifiers
  open the palette on every platform**, so a wrong guess is cosmetic rather than a lost shortcut.
- `lib/search.ts` — pure. Case-insensitive substring over **title and body**, a title hit ranked
  above a body hit, board order within each band, and an excerpt windowed around the match. No
  regex is ever built from the query.
- A palette on the same shadcn `Dialog` the create dialog uses, so the blurred backdrop is the
  same one rather than a copy. Query field, result rows, `↑↓` to move, `Enter` to open the note's
  own view, `Escape` to close.
- The roving selection is `aria-activedescendant`; **DOM focus never leaves the input**.
- `openId` moves out of `board.tsx` into its own context, so the palette can open a note.

**The board never changes** — not while the palette is open, not after it closes. Nothing dims,
hides, moves, or reorders. This replaces the inline filter this phase originally promised: a
dialog blurs the board behind it, so a filter driven from one would be a filter you cannot see.
Not filtering at all keeps principle 1's promise more completely than dimming did.

**Done when:** `⌘K` finds a note by its title or its text, `Enter` opens it, and the stored board
is byte-identical before, during and after.

---

## P9 · A quieter card

**Goal:** the board is paper and nothing else; acting on a note happens in the note.

- Amend `mission.md` principle 4: **a card carries one per-note control — delete.** Everything
  else moves into the note. It may also show *state* that would otherwise be invisible.
- **Pin** moves into the note view's footer beside Done; **delete stays on the card** and gains a
  confirmation. Pinning is something you do to a note you are already reading; deleting is
  something you decide about a note you can see from across the board.
- One confirmation for the whole board, mounted in the shell rather than per card, reached from
  either entry point.
- A **pinned** card keeps a pin glyph: `aria-hidden`, no handler, no focus, not a control. Without
  it, principle 1's promise that pinned notes sort first has no visible cause.
- `npx shadcn@latest add alert-dialog`. Deleting a note that carries a **title, a body or a link**
  asks first; an empty one is deleted immediately. `date`, `color` and `pinned` are not content —
  every note has them whether you chose them or not.
- Pinning does not close the view. Deleting does, because the note it was showing is gone.
- **The phases below stop being numbered.** P7 renumbered four, P8 renumbered four more, and this
  would be the third in three phases. A number is a promise about ordering that has been broken
  three times running; a name survives being reordered. P0–P9 keep theirs — their spec directories
  are named after them.

**Done when:** a card shows delete and nothing else, a pinned note is still identifiable at a
glance without carrying a pin control, pinning happens in the note's own view, and deleting a note
with something in it asks first from either place.

---

## P10 · A view of the pinned

**Goal:** the sidebar becomes navigation, and pinning becomes something you can look at.

- A second destination — **Pinned notes**, with the same `Pin` glyph the card carries — beside
  `Notes`. `aria-current` follows the selection; both badges carry their count, and the pinned one
  renders at `0`.
- The section **shows only the pinned notes**. Not dimming: pinned notes already sort first, so a
  dimmed pinned view is the top of the board you already had.
- **A view is not an edit.** One `filter` over the existing sort. Nothing dispatches, the reducer
  never learns that sections exist, and returning to `Notes` shows the arrangement you left.
- The selection persists under `sticky-notes:section`, read defensively: anything that is not
  `'pinned'` is `'notes'`, so a corrupt value opens the whole board.
- **Creating a note returns you to `Notes`**, at the moment the dialog opens. A new note is never
  pinned, and capturing a thought somewhere you cannot see it fails the one-sentence test.
- An empty pinned board says *No pinned notes* and names the way out. The general empty state is
  still *Polish*'s.
- Search still ignores the section: the palette finds every note and opens it, drawn or not.

**Done when:** `Pinned notes` shows the pinned notes and nothing else, the selection survives a
reload, navigating writes nothing, and an empty pinned board explains itself.

---

# Planned, in order

No numbers — see P9's last bullet. Order is a plan, not a commitment; inserting work here is an edit
to this list rather than a rewrite of every cross-reference in `specs/`. **A number belongs to a
phase that exists**, which is why P10 above has one and nothing below does.

---

## Tags

**Goal:** notes group themselves by what is written in them.

- `lib/tags.ts` parses `#tags` out of `body` on read. Nothing is stored — a tag is a view of the
  text, so editing the text is the only way to change the tags.
- Tags render as chips on the note and filter the board when clicked.
- Non-matching notes **dim in place** rather than disappearing — positions never change.
- Escape clears the filter.

**Done when:** filtering never moves a note, and clicking a tag shows exactly the notes carrying
it.

---

## Markdown and checkboxes

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

## Dark mode

**Goal:** usable at night, deliberate in both themes.

- `useTheme` with light / dark / system; persisted under `sticky-notes:theme`.
- Dark tokens for cork, paper, shadow, and text — the six papers get dark-mode variants,
  not filters or opacity hacks.
- shadcn `dropdown-menu` toggle in the toolbar.
- No flash of the wrong theme on load.

**Done when:** both themes look designed, paper colors stay distinguishable in dark mode,
and reloading in dark mode never flashes light.

---

## Polish

**Goal:** it feels finished.

- Spring motion on add, delete, pick-up, and settle; all of it collapses under
  `prefers-reduced-motion`.
- An empty state that invites the first note.
- Full a11y pass: focus rings everywhere, sensible tab order, live-region announcements for
  add/delete, keyboard drag verified.
- Responsive pass — usable on a narrow screen, not optimized for one.
- Performance check with 100+ notes: smooth drag, no jank while typing, and the grid's
  hit test still O(1) per pointer event.

**Done when:** every "Done means" bullet in `mission.md` is true.

---

## Later (not scheduled)

Ideas that are allowed to exist but are not commitments. Anything here needs a mission
amendment before it gets built.

- Recolouring an existing note from the card itself. P6's note view carries the six swatches,
  which discharges most of what the original P6 was for; a per-card control is what is left.
- Multi-select and group drag
- Session undo/redo
- Export the board to markdown or JSON
- Canvas pan and zoom for a board larger than the viewport
