# P10 · A view of the pinned — Plan

A groundwork step and six task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `docs`, `feat`, `test`.

**Ordering note.** Group 1 is the amendment, so a rejection kills the phase before code exists.
Group 2 puts the board behind a router with both paths rendering the same thing — at that point the
app is unchanged and the routing is provably inert. Group 3 makes the sidebar navigate; group 4
makes the board obey. **The sidebar moves before the board filters**, so the destination that
changes what you see exists for exactly one commit before it does. Group 5 handles the two seams —
creating a note, and the empty view — and group 5b brings pin back to the card. Group 6 is the tests
and the documents.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`arrange` sorts every pinned note above every unpinned one**, so the pinned view is a prefix of
  the board and a swap inside it is a swap in the full ordering (**D4**, **D9**).
- **The open note is resolved against `notes`, not against the rendered list** — `board.tsx` line
  37 — so a search hit opens even when the section does not draw its card (**D8**).
- **`SidebarMenuBadge` and the `tooltip` prop already exist** in `sidebar.tsx`. No new shadcn
  component, and T5's amendments stay untouched.
- **The shell is where a global control lives** — it already owns the create dialog and both
  keyboard shortcuts, so the navigation that goes with creating a note has one home.

*To verify in group 0:*

- **A `RouterProvider` renders synchronously once its router has matched.** It does not before
  that, which is one empty frame in the app and an empty div in every test that renders `<App />`.
- **Switching sections while a note is open does not unmount the dialog.** The view is a sibling of
  the grid, not a child of a card, so it should be inert — verify before **D8** depends on it. It is
  rendered by the board, so the empty pinned branch has to mount it too.
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

## 2. The section, as a route

Test-first: `src/__tests__/sections.test.tsx`, T69.

2.1 `types/note.ts` — `export type BoardSection = 'notes' | 'pinned'`. It lives beside `NoteColor`
    for the same reason that does: one union, imported by everything that names a section.

2.2 `npm i @tanstack/react-router`. **Code-based routes** in `src/router.tsx`: `/` and `/notes`
    render the whole board, `/pinned` renders the pinned one, and the root route is the shell. The
    file-based plugin's generated `routeTree.gen.ts` is camelCase and P9 pinned the naming test's
    `EXEMPT` list shut (**D5**).

2.3 `app.tsx` becomes a `RouterProvider`; `app_shell.tsx` renders an `<Outlet />` where the board
    used to be, so the providers and the two shortcuts stay mounted across a section change.

2.4 **`main.tsx` awaits the first match before mounting.** A `RouterProvider` rendered before the
    router has matched commits an empty frame, and `mission.md` asks for no layout shift on load.

2.5 `router.tsx` exports `createAppRouter(history)` as well as the app's instance: a router matches
    its first location once and cannot be re-loaded, so tests that navigate build their own over a
    memory history rather than sharing one. `__tests__/router_setup.ts` carries the singleton's
    one-time load for the files that only ever render at `/`.

2.6 T69. Commit: `feat(board): put the board's sections behind a router`

## 3. The sidebar navigates

Test-first: extend `app_shell.test.tsx`, T70.

3.1 `app_sidebar.tsx` — a second `SidebarMenuItem`: `Pinned notes`, the `Pin` glyph, its badge the
    pinned count. The same icon the card carries, so the mark and the destination that collects
    marked notes are the same shape. Both are `SidebarMenuButton asChild` around a router `Link`,
    so a destination is an anchor with an `href` rather than a button with a handler.

3.2 `isActive` and `aria-current="page"` follow the path instead of being hardcoded onto `Notes` —
    honest with one destination, a lie with two.

3.3 **Fix the selection itself** (**D12**). `sidebar.tsx` renders `data-active={isActive}`, React
    writes `data-active="false"`, and Tailwind's `data-active:` variant matches the attribute rather
    than its value — so every inactive row was styled as the selected one. Amend it to
    `data-active={isActive || undefined}` and add the T5 assertion, because `shadcn add sidebar`
    would restore the original silently. Our own rows then say the rest: an inactive destination is
    plain, its hover is half strength, and the active one gains a 2px inset bar.

3.4 The `Pinned notes` badge renders at `0` (**D2**). A badge that vanishes makes the two rows
    different heights for no reason a reader can name.

3.5 Rewrite the file's slot comment: the tag list arrives in *Tags*, not in "P10" (**D10**). P9
    renamed the unbuilt phases and its grep covered `specs/` only.

3.6 T70. Commit: `feat(sidebar): add a pinned notes destination beside notes`

---

## 4. The board obeys

Test-first: extend `board.test.tsx`, T71–T72.

4.1 `board.tsx` takes a `section` prop and `ordered` becomes `arrange(notes).filter((note) =>
    section === 'notes' || note.pinned)`. **One `filter` on the existing sort.** Nothing dispatches;
    the reducer never learns that sections exist.

4.2 Reordering, `columnCount()` and `candidates()` all operate on the filtered list and the cards
    actually on screen. **D9**: the pinned view is a prefix of the board, so a swap here is the
    swap there.

4.3 The open note stays resolved against the full `notes` array. **Do not filter it** — a search hit
    must open a note the section does not draw (**D8**).

4.4 T71–T72. Commit: `feat(board): show only pinned notes in the pinned section`

---

## 5. The two seams

Test-first: extend `app_shell.test.tsx` and `board.test.tsx`, T73–T74.

5.1 `app_shell.tsx` — opening the create dialog navigates to `/notes`, from both entry points,
    because they are the same one. **At open, not at create** (**D6**): the board behind the dialog
    is then already the board the note will land on.

5.2 `board.tsx` — when the section is `pinned` and nothing is drawn, **return** **D7**'s copy
    instead of the grid: *No pinned notes* / *Open a note and pin it to keep it up here*, centred on
    its own cork surface (**D13**), with the note view still mounted underneath. A new
    `--color-cork-ink` token, because warm ink on cork is unreadable.

5.3 **An empty full board still renders bare cork.** `empty_state.tsx` belongs to *Polish* and this
    is not a down-payment on it.

5.4 T73–T74. Commit: `feat(board): return to notes when creating, and say when nothing is pinned`

---

## 5b. Pin comes back to the card

Test-first: T66–T67 in `board.test.tsx` are **re-pointed**, not added to.

5b.1 `note_card.tsx` — the P9 glyph becomes a real toggle beside delete (**D11**): `data-testid="pin"`,
     `aria-pressed`, `Pin note` / `Unpin note`, `stopPropagation` on click and pointerdown so pinning
     neither opens the note nor starts a drag.

5b.2 **Visible without a hover while the note is pinned**, hidden with delete when it is not — one
     `Pin` icon in both states, filled when pinned. The state and the control are the same mark.

5b.3 `mission.md` principle 4 gains the second control.

5b.4 T66–T67 assert three buttons on a card, and T68's tab stops go from three to four.

5b.5 Commit: `feat(board): put pin back on the card, as the pinned state`

---

## 6. The tests and the documents

6.1 Whatever of T69–T75 is not already written by its group, plus the count check: **more than 24
    suites and more than 635 assertions.**

6.2 Commit: `test: cover the pinned section and its persistence`

6.3 `tech-stack.md` — the stack gains TanStack Router and the reason it is code-based; the tree
    gains `router.tsx` and the second destination. The persistence contract is **unchanged**.

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

**The router's async first match is the thing that breaks quietly.** It renders an empty frame, and
an empty frame in a test looks exactly like a component that failed. `main.tsx` and
`router_setup.ts` are the two places that handle it, and both say so in a comment.
