# P10 · A view of the pinned — Plan

A groundwork step and six task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `docs`, `feat`, `test`.

**Ordering note.** Group 1 is the amendment, so a rejection kills the phase before code exists.
Group 2 builds the section state and its persistence with nothing reading it yet — at that point the
app is unchanged and the store is provably inert. Group 3 makes the sidebar navigate; group 4 makes
the board obey. **The sidebar moves before the board filters**, so the destination that changes what
you see exists for exactly one commit before it does. Group 5 handles the two seams — creating a
note, and the empty view. Group 6 is the tests and the documents.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`arrange` sorts every pinned note above every unpinned one**, so the pinned view is a prefix of
  the board and a swap inside it is a swap in the full ordering (**D4**, **D9**).
- **The open note is resolved against `notes`, not against the rendered list** — `board.tsx` line
  37 — so a search hit opens even when the section does not draw its card (**D8**).
- **`SidebarMenuBadge` and the `tooltip` prop already exist** in `sidebar.tsx`. No new shadcn
  component, and T5's amendments stay untouched.
- **The provider/hook split is the house pattern** for context — `open_note_context.tsx` +
  `use_open_note.ts` — because a module exporting both trips `react-refresh/only-export-components`.

*To verify in group 0:*

- **`useLocalStorage` with a string value round-trips through our own deserializer.** Every existing
  use stores an object or a boolean; `parseSection` is the first string.
- **Switching sections while a note is open does not unmount the dialog.** The view is a sibling of
  the grid, not a child of a card, so it should be inert — verify before **D8** depends on it.
- **The board's `fresh` effect does not fire on a section switch.** It keys on ids it has not seen,
  and filtering changes what is drawn rather than what is in `notes`, so a switch must not open a
  note. If it does, the effect is watching the wrong array.

---

## 0. Groundwork

0.1 Branch `feat/p10-a-view-of-the-pinned` off **`feat/p9-a-quieter-card`**, since P9's PR is not
    merged and this phase edits `app_sidebar.tsx` and `board.tsx` as P9 left them. Rebase onto
    `main` once it lands.

0.2 Full gate on the clean branch: **24 suites, 635 assertions.**

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The amendment

1.1 `mission.md` principle 1 — add **D1**'s sentence: a section may change which notes are on
    screen, never their order, and leaving it shows the board exactly as it was.

1.2 `mission.md` Core scope — the Colors + pin bullet gains the section. **The Search bullet keeps
    its sentence**: search still does not filter.

1.3 `roadmap.md` — insert **P10 · A view of the pinned** after P9, above the `Planned, in order`
    heading. The Planned list gains no numbers (**D10**): a number belongs to a phase that exists.

1.4 `README.md` — status to P10.

1.5 Commit: `docs: amend the constitution so a section can show a subset`

---

## 2. The section, and where it is remembered

Test-first: `src/__tests__/section_storage.test.ts`, T69.

2.1 `types/note.ts` — `export type BoardSection = 'notes' | 'pinned'`. It lives beside `NoteColor`
    for the same reason that does: one union, imported by everything that names a section.

2.2 `lib/board_storage.ts` — `SECTION_KEY = 'sticky-notes:section'` and `parseSection`, shaped like
    `parseSidebarOpen`. **Anything that is not exactly `'pinned'` is `'notes'`**, so a corrupt value
    opens the whole board rather than a filtered one.

2.3 `context/section_context.tsx` — the provider, owning `useLocalStorage(SECTION_KEY, 'notes', {
    deserializer: parseSection })`. `context/use_section.ts` — the hook, split for react-refresh.

2.4 Mount it in `app_shell.tsx` inside `NotesProvider`. **Nothing reads it yet**, which is the
    point: this commit is provably inert.

2.5 T69. Commit: `feat(board): remember which section of the board you are looking at`

---

## 3. The sidebar navigates

Test-first: extend `app_shell.test.tsx`, T70.

3.1 `app_sidebar.tsx` — a second `SidebarMenuItem`: `Pinned notes`, the `Pin` glyph, its badge the
    pinned count. The same icon P9 put on the card, so the mark and the destination that collects
    marked notes are the same shape.

3.2 `isActive` and `aria-current="page"` follow the section instead of being hardcoded onto
    `Notes` — honest with one destination, a lie with two.

3.3 The `Pinned notes` badge renders at `0` (**D2**). A badge that vanishes makes the two rows
    different heights for no reason a reader can name.

3.4 Rewrite the file's slot comment: the tag list arrives in *Tags*, not in "P10" (**D10**). P9
    renamed the unbuilt phases and its grep covered `specs/` only.

3.5 T70. Commit: `feat(sidebar): add a pinned notes destination beside notes`

---

## 4. The board obeys

Test-first: extend `board.test.tsx`, T71–T72.

4.1 `board.tsx` — `ordered` becomes `arrange(notes).filter((note) => section === 'notes' ||
    note.pinned)`. **One `filter` on the existing sort.** Nothing dispatches; the reducer never
    learns that sections exist.

4.2 Reordering, `columnCount()` and `candidates()` all operate on the filtered list and the cards
    actually on screen. **D9**: the pinned view is a prefix of the board, so a swap here is the
    swap there.

4.3 The open note stays resolved against the full `notes` array. **Do not filter it** — a search hit
    must open a note the section does not draw (**D8**).

4.4 T71–T72. Commit: `feat(board): show only pinned notes in the pinned section`

---

## 5. The two seams

Test-first: extend `app_shell.test.tsx` and `board.test.tsx`, T73–T74.

5.1 `app_shell.tsx` — opening the create dialog sets the section to `notes`, from both entry points,
    because they are the same one. **At open, not at create** (**D6**): the board behind the dialog
    is then already the board the note will land on.

5.2 `board.tsx` — when the section is `pinned` and nothing is drawn, render **D7**'s copy in place of
    the grid: *No pinned notes* / *Open a note and pin it to keep it up here*. `text-ink-soft`,
    centred, no button.

5.3 **An empty full board still renders bare cork.** `empty_state.tsx` belongs to *Polish* and this
    is not a down-payment on it.

5.4 T73–T74. Commit: `feat(board): return to notes when creating, and say when nothing is pinned`

---

## 6. The tests and the documents

6.1 Whatever of T69–T75 is not already written by its group, plus the count check: **more than 24
    suites and more than 635 assertions.**

6.2 Commit: `test: cover the pinned section and its persistence`

6.3 `tech-stack.md` — the tree gains `section_context.tsx`, `use_section.ts` and the second
    destination; the persistence contract gains `sticky-notes:section` and what an unreadable one
    falls back to.

6.4 Commit: `docs: record the pinned section across the constitution`

6.5 Open the PR against **`main`**.

---

## What could go wrong

**The section switch fights the `fresh` effect.** The board opens a note it has not seen before, and
filtering changes what is drawn rather than what is in `notes` — so it should be inert. If the effect
is ever re-pointed at the rendered list, switching to `Pinned notes` would pop open the first pinned
note. Group 0 verifies it and T71 asserts it.

**`aria-current` on two items at once.** Both `SidebarMenuButton`s take `isActive`, and a copy-paste
that leaves both hardcoded gives a screen reader two current pages and no error. T70 asserts exactly
one.

**Persisting the section is the decision most likely to be wrong.** § Risks says so, Gate 3 check 2
tests it cold, and the fallback — drop the key, always open on `Notes` — is one line. Do not defend
it past the check.
