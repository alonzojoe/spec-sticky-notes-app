# P8 · Find things — Requirements

**Phase:** P8 (eighth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-02
**Branch:** `feat/p8-find-things` off `main`
**Status:** specified

---

## Context

P7 gave every note a title and a link and made the card a summary you can scan. Twenty-one Vitest
suites and 517 assertions pass. The board is ordered, persistent, and readable at a glance.

It does not scale past a screenful. Finding a note means reading every card, and the only thing that
has ever moved a note is your own hand — which is correct, and is exactly why finding one is hard.

This phase adds **search**: a trigger beside the sidebar toggle showing the platform's own shortcut,
and a dialog that opens on `⌘K` — `Ctrl+K` off macOS — holding a query field and a list of matching
notes. Arrow to one, press Enter, and its note view opens.

**The board never changes.** Not while the dialog is open, not after it closes. That is the strongest
possible reading of principle 1, and it is a deliberate departure from what `roadmap.md` promised.

## Scope

Seven deliverables.

1. **The constitution amendment.** `roadmap.md`'s P8 rewritten as a palette rather than an inline
   filter; `#tags` split out into their own phase, with Markdown, Dark mode and Polish each moving
   down one; `mission.md` § Core scope's *Search + tags* bullet split in two (**D1**).
2. **The platform module.** `src/lib/platform.ts` — is this a Mac, and what is the modifier called
   here. One question, one answer, one place (**D2**).
3. **The matcher.** `src/lib/search.ts` — pure. Normalises a query, matches title and body
   case-insensitively, ranks a title hit above a body hit, and builds the excerpt the result row
   shows (**D3**).
4. **The trigger.** A muted field-shaped button in the toolbar between the sidebar toggle and the
   New note button, carrying a magnifier, the word Search, and a `⌘K` / `Ctrl+K` badge. Icon only
   below `sm` (**D4**).
5. **The palette.** `search_dialog.tsx` — the query input and the result list, on the same shadcn
   `Dialog` the create dialog uses, so the blurred backdrop is the same one (**D5**).
6. **The keyboard.** `⌘K` / `Ctrl+K` opens from anywhere outside a text field; `↑` `↓` move the
   selection, `Enter` opens, `Escape` closes. Nothing here breaks `n` (**D6**).
7. **Opening a result.** The selected note's own view opens, which means `openId` stops being
   `board.tsx`'s private state and becomes something the shell can reach (**D7**).

Plus the documents this invalidates (**D8**).

## Out of scope

- **`#tags`.** Parsing, chips on the card, and click-to-filter are **P9** after **D1**. Search is a
  whole phase on its own, and the card's geometry was settled eight commits ago in P7 — adding a
  chip row to it in the same breath as building a palette is two unrelated risks in one diff.
- **Filtering or dimming the board.** No note dims, hides, moves, or reorders. See **D5**.
- **Fuzzy matching, typo tolerance, stemming, or a relevance score.** Case-insensitive substring,
  ranked by where it hit. A board of one person's notes does not need an index.
- **Searching the link, the date, or the colour.** Title and body are the things you wrote in
  words (**D3**).
- **Search history, recent notes, or an empty-query list of everything.** An empty query shows the
  prompt, not the board in list form.
- **A command palette.** No actions, no "create a note called…", no navigation entries. This finds
  notes. Widening it to commands is a different feature and would need its own amendment.
- **Highlighting the matched substring inside the excerpt.** Considered; it needs the excerpt to
  become markup rather than text, and *Markdown and checkboxes*'s markdown renderer will change that surface anyway.

## Decisions

### D1 · A palette, not an inline filter — and the roadmap says so

`roadmap.md`'s P8 was written before the app had a toolbar worth putting anything in, and it
promised something specific:

> - Search input in the toolbar; live filter on note body, case-insensitive.
> - Non-matching notes dim in place rather than disappearing — **positions never change**.

The dialog replaces both bullets, and the second one deserves an honest account rather than a quiet
rewrite. **Dim-in-place was a promise that the board would not rearrange itself under a filter.**
This design keeps that promise more completely than dimming ever could: the board is not filtered at
all. Nothing dims, because nothing is excluded.

The rejected alternative was a dialog that leaves the board filtered behind it. It fails on its own
terms — the overlay is blurred, so you would be driving a filter you cannot see, and the state
afterwards is a board that looks broken until you remember you left a query in it.

The phase order changes with it:

| Phase | Was | Is |
| --- | --- | --- |
| P8 | Find things *(search + tags)* | **Find things** *(search only)* |
| P9 | Markdown and checkboxes | **Tags** |
| *Markdown and checkboxes* | Dark mode | Markdown and checkboxes |
| *Dark mode* | Polish | Dark mode |
| *Polish* | — | Polish |

This is the **second renumber in two phases**, and § Risks says what that costs.

`mission.md` § Core scope's single bullet becomes two, because they are now two phases:

> - **Search** — a palette on `⌘K` that finds a note by its title or its text. The board never
>   filters, dims, or reorders.
> - **Tags** — `#tags` parsed out of note text, shown on the note and clickable to filter.

### D2 · `lib/platform.ts` answers one question

```ts
export const isMac = (): boolean => …
export const modifierLabel = (): string => …   // '⌘' on a Mac, 'Ctrl' everywhere else
export const SHORTCUT_KEY = 'k'
```

**`navigator.platform` is deprecated and `navigator.userAgent` is a swamp**, so the detection reads
`navigator.userAgentData?.platform` first and falls back to a `/mac/i` test on the user agent. Both
are wrong for someone on a Mac with a Windows keyboard, and neither has a right answer — the badge
is a hint, and **both modifiers are accepted by the key handler regardless of what the badge says**
(**D6**). That is what makes a wrong guess cosmetic rather than a broken shortcut.

Read at render, not at module load, so a test can control it without resetting module state.

The label is `⌘` and not `Cmd`, because `⌘K` is what every Mac app shows. Off macOS it is the word
`Ctrl`, because `⌃` is not what Windows or Linux users read.

### D3 · `lib/search.ts` is pure, and ranks by where it hit

```ts
export interface Hit { note: Note; field: 'title' | 'body'; excerpt: string }
export const search = (notes: Note[], query: string): Hit[] => …
```

- **Case-insensitive substring.** Query and haystack both lowercased once; no regex built from user
  input, which is how a search box becomes a crash on `(`.
- **Title first.** A note whose *title* matches ranks above one whose *body* does. Searching
  `standup` should put the note named Standup above one that mentions standups in passing. Within a
  band, board order is preserved — the same `order` the grid uses, so the list and the board agree.
- **Whitespace-only or empty query returns `[]`**, not everything. The palette shows its prompt.
- **The excerpt is a window around the hit**, not the first line: matching a word 400 characters in
  and then showing the opening sentence tells you nothing about why the note matched. Roughly 80
  characters, cut on a word boundary where one is near, with a leading `…` when the window does not
  start at the beginning.
- **Nothing is highlighted.** § Out of scope says why.

A note with an empty title cannot match on title; a note with an empty body cannot match on body.
No note matches twice.

### D4 · The trigger looks like a field and behaves like a button

Between the sidebar toggle and the New note button:

```
┌──────────────────────────────────────┐
│ ▣  ┌──────────────────────┐   + New  │
│    │ 🔍 Search      ⌘K   │           │
│    └──────────────────────┘          │
└──────────────────────────────────────┘
```

A `<button>`, never an `<input>`. An input in the toolbar that does not accept typing is a lie the
first time someone types into it; the whole control opens the dialog, and the dialog is where typing
happens.

The badge is a `<kbd>` carrying `⌘K` or `Ctrl+K`, from **D2**. `aria-keyshortcuts="Meta+K Control+K"`
on the button, so the shortcut is announced rather than only drawn.

Below `sm` the label and the badge leave the layout and the magnifier remains, matching what P3 did
to the New note button's label. A phone has no `⌘K` to press and no room for a badge saying so.

The toolbar now holds three controls, which is the condition `app_shell.tsx`'s own comment set for
extracting a layout component: *"Extract a layout component when it holds a third control — two does
not pay for the indirection."* **The comment is honoured, not deleted**: the toolbar moves to
`toolbar.tsx` and `app_shell.tsx` keeps the providers and the state.

### D5 · The palette is the same `Dialog`, and the board is untouched

`search_dialog.tsx` renders on the same shadcn `Dialog` the create dialog uses, which is what makes
the backdrop identical — `bg-ink/20` with `backdrop-blur-xs`, already in `dialog.tsx`. Nothing new is
styled and nothing is copied.

It is **not** the shadcn `command` component. That would pull `cmdk`, a third dependency for a list
of at most a few dozen rows, and the roadmap's own rule is not to install a component a phase does
not need. What `cmdk` would give us — roving selection, `aria-activedescendant`, type-ahead — is
about sixty lines here, and writing them keeps the keyboard contract in this repo where **D6** can
test it. Recorded as a real trade: if a later phase wants a genuine command palette with actions and
groups, `cmdk` becomes the right call and this is the file that gets replaced.

Structure: a `role="combobox"` input, and a `role="listbox"` of `role="option"` rows carrying the
note's colour swatch, its title (or `Untitled note`), and the excerpt. A footer counts the results
and shows the `↑↓` and `↵` hints.

**The dialog does not render the board and the board does not know the dialog exists.** No note
dims, hides, moves or reorders — the query lives and dies inside the dialog, and closing it leaves
the board byte-identical to how it was before. Principle 1 is not merely respected here; there is
nothing for it to constrain.

The empty query shows a one-line prompt. A query with no matches says so, and names the query.

### D6 · The keyboard, and what it must not break

- **`⌘K` and `Ctrl+K` both open it, on every platform.** The badge is a hint; the handler accepts
  either, because **D2**'s detection can be wrong and a wrong badge must not cost you the shortcut.
- Suppressed inside an `<input>`, a `<textarea>` and anything `contentEditable`, exactly as `n` is —
  **except that `⌘K`/`Ctrl+K` is not a character**, so unlike `n` it stays live while a note is
  being written. A modified key cannot be mistaken for typing.
- `preventDefault` on the combination, or Firefox jumps to its own search bar.
- **`↑` and `↓`** move the selection and wrap; **`Enter`** opens the selected note; **`Escape`**
  closes without opening anything. The selection resets to the first row on every keystroke, because
  the list underneath it has changed.
- **The input keeps focus the whole time.** Selection is `aria-activedescendant`, not real focus, so
  typing never stops working — that is the whole reason the roving pattern exists.
- **`n` is unaffected.** It is already suppressed inside text fields, and the palette's input is one.
- Opening the palette while the create dialog or a note view is open is not a state this phase
  supports: the trigger is in the toolbar, which those dialogs cover, and the shortcut is ignored
  while another dialog owns the focus scope.

### D7 · `openId` moves out of `board.tsx`

Opening a result has to open a note view, and that state is currently private to `board.tsx`. It
moves to `src/context/open_note_context.tsx` — a provider holding `openId` and `setOpenId`, mounted
in `app_shell.tsx` inside `NotesProvider`.

Both consumers keep working unchanged in behaviour: `board.tsx` still opens a freshly created empty
note and still opens one on card click; the palette calls `setOpenId` and closes itself. The
`NoteViewDialog` stays where it is rendered today.

A prop drilled from the shell was the alternative and was rejected: the shell would then hold state
it never reads, and `board.tsx` would take a prop it also sets. The existing split state/dispatch
context pattern is right there and this is the same shape.

### D8 · Documents corrected in the same phase

- **`mission.md`** — § Core scope's *Search + tags* bullet becomes two (**D1**).
- **`roadmap.md`** — P8 rewritten, tags inserted as P9, the rest renumbered (**D1**).
- **`tech-stack.md`** — the tree gains `lib/platform.ts`, `lib/search.ts`, `search_dialog.tsx`,
  `toolbar.tsx` and `context/open_note_context.tsx`; `lib/tags.ts`'s phase marker moves to P9.
- **`README.md`** — status to P8.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.** No new eslint override.
- **No new dependency.** `cmdk` is named and rejected in **D5**.
- **No network request.** The search is over an array already in memory.
- **Every file we author is `snake_case`.** The `EXEMPT` pin must not be edited.
- **Warm tokens only.** The `<kbd>` badge and the result rows use `ink`, `ink-soft` and the existing
  border and popover tokens. No achromatic literal, no stock palette utility.
- **Keyboard-reachable.** **D6** is the deliverable, not a footnote.
- **`prefers-reduced-motion`.** The dialog's existing animation already collapses under the global
  rule; nothing new animates.

## Risks

**Two renumbers in two phases.** P7 moved four phases down one and this moves four more. The numbers
are now a poor way to refer to anything, and every spec that names a future phase by number has been
rewritten twice. If a third phase wants to renumber, the right answer is to stop numbering the
unbuilt phases at all and give them names — recorded here so the next person has the option rather
than a third mechanical rewrite.

**The palette duplicates what a card already shows.** A result row carries a colour, a title and an
excerpt, which is most of a card. If the two drift, the app has two visual languages for one note.
The mitigation is that the row is deliberately *not* a card — one line of title, one of excerpt, no
paper, no shadow, no date — so it reads as an index entry rather than a small card.

**Hand-rolled roving selection is a well-known place to get a11y wrong.** `aria-activedescendant`
with a focused input is the correct pattern and it is easy to half-implement. Gate 2 asserts the
attribute moves with the selection, and Gate 3 checks it against a screen reader.

**Search is unranked beyond title-over-body.** On a board of a few hundred notes a common word will
return a list too long to scan, with no better ordering than board order. That is acceptable for one
person's board and would not be for a shared one; naming it here so the first person who hits it
knows it was a choice.

**`openId` moving is a refactor inside a feature phase.** It touches `board.tsx`, which owns the
drag, the grid and the fresh-note effect — the file with the most behaviour in the app. The plan
does it as its own group with the existing suites as the gate, before anything new consumes it.
