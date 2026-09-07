# P13 · A board with your name on it — Plan

A groundwork step and six task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `fix`, `docs`, `refactor`, `feat`, `test`.

**Ordering note.** The amendment is group 1 and lands before any code, so rejecting it kills the
phase while the cost is one file. The barrel is group 2 — a mechanical rewrite of thirty files with
**no behavioural change and an unchanged suite**, landed before the feature so that the feature's
diff is the feature. Groups 3 and 4 are the feature, split at the seam between *the name exists* and
*the sidebar draws it*. Group 5 is coverage; group 6 is the documents.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **The shell already owns dialogs.** `app_shell.tsx` holds `creating` and `searching` and mounts
  `NewNoteDialog` and `SearchDialog` beside the sidebar. A third piece of state and a third dialog
  land in a shape that already exists.
- **`components/ui/dialog.tsx` is shared by three dialogs**, so the overlay, the blur, the motion
  tokens and the focus trap come for free and are the ones already on screen.
- **`useLocalStorage` is already the persistence boundary** — the board through `notes_context.tsx`,
  the sidebar's collapse through `app_shell.tsx` — and both pass a custom `deserializer` so a
  corrupt value never reaches the app or the console.
- **`components/ui/**` imports `@/lib/utils` with double quotes**, eleven times, written by
  `shadcn add`. The rewrite in group 2 must not touch them (**D7**).

*To verify in group 0:*

- **Two `useLocalStorage` callers on one key stay in step within a tab.** `usehooks-ts` dispatches
  its own `local-storage` event on write; the dialog writes and the sidebar reads, so if this does
  not hold the row shows a stale name until a reload. **Fallback:** lift the value into
  `context/user_context.tsx` beside the other two providers (**D5**).
- **`initializeWithValue` defaults to `true`**, so the first render already knows whether a name is
  stored and a returning user never sees the dialog flash (**D5**).
- **A barrel does not break the `@/` alias test or Vitest's resolver.** `alias.test.ts` asserts
  `@/` resolves; a re-export chain is a different question from a path alias.
- **`SidebarFooter` exists in the generated `sidebar.tsx`** and collapses to the rail with the
  content it is given, without an edit to that file.

---

## 0. Groundwork

0.1 Branch `feat/p13-a-board-with-your-name-on-it` off **`main`** (P12's #15 is merged).

0.2 **Fix the red suite first.** `T71` and `T77` — both *"leaves every order, pin and timestamp
    untouched through a round trip"* — fail on `main`. `notes_context.tsx` mirrors the board through
    a 300 ms `useDebounceCallback`, and a test that creates a note leaves that write in flight; it
    lands during a later test, after `beforeEach` has cleared `BOARD_KEY`. The fix is in
    `sections.test.tsx`, not in the product: the pending write is settled or cancelled at teardown
    so a test cannot inherit one. **No product file changes in this step**, and no assertion is
    rewritten to accommodate the bug.

0.3 Full gate on the fixed branch. Record the true baseline — it is the number every count in
    [validation.md](./validation.md) is measured against, and the current `708 passed` includes two
    failures.

0.4 Walk the "To verify" list. Record each answer in the group-0 commit message.

0.5 Commit: `fix(test): settle the debounced board write between section tests`

---

## 1. The amendment

1.1 `mission.md` § Explicitly out of scope — the carve-out from **D1**, written narrower than the
    line it is carved out of: no password, no server, no second user, and nothing in the board keyed
    to the name.

1.2 `mission.md` § What this is — one sentence, so *"built for one user (me)"* says how the app
    says *me*.

1.3 `mission.md` principle 4 — the sidebar holds global controls **and one identity**, which is
    neither a control nor a note. One clause; the rest of the principle is untouched, and nothing
    is added to a card.

1.4 **Nothing else in this group.** No code. A rejected amendment ends the phase here.

1.5 Commit: `docs: amend the constitution so the board can carry a name`

---

## 2. The barrel

Test-first: `lib_barrel.test.ts`, T81, written before `index.ts` exists — it fails for the right
reason first.

2.1 `src/lib/index.ts` — `export * from './dates'` and so on, one line per module, alphabetical.

2.2 **T81 asserts coverage against the directory listing**, not against a hand-written list: every
    `.ts` in `src/lib/` except `index.ts` is re-exported. A module added later without a barrel line
    fails the suite (**D7**).

2.3 Rewrite the 43 imports in 30 files to `@/lib`. **Not** the three inside `src/lib/` itself, and
    **not** the eleven in `components/ui/`.

2.4 **The suite does not move**, apart from T81's own new file and the case the naming test gains
    for it. That is the proof the rewrite was a rewrite: a barrel that changes a behaviour has
    changed something it should not have been able to reach.

2.5 Commit: `refactor(lib): export every module from one barrel`

---

## 3. The name, and the dialog that asks for it

Test-first: `user.test.ts`, T78 — the table in **D4** and the defensive read, both pure and both
writable before a component exists.

3.1 `lib/user.ts` — `USER_KEY = 'sticky-notes:user'`, `readUserName(stored): string` repairing
    anything malformed to `''`, and `initialsOf(name): string` under **D4**'s rules: trim, collapse
    whitespace, first and last word, **one code point each** via `Array.from`, `toUpperCase()`, cap
    at two.

3.2 `lib/index.ts` gains its line. T81 would fail otherwise, which is the point of writing T81 in
    group 2.

3.3 `hooks/use_user.ts` — `useLocalStorage(USER_KEY, ...)` with `readUserName` as the deserializer's
    guard, returning `{ name, initials, setName }`. **The only reader and the only writer of the
    key** (**D5**). `setName` trims before it stores.

3.4 `components/layout/user_name_dialog.tsx` — the shared `Dialog`, one `Input` with a visible
    label (`note_fields.tsx`'s rule: a placeholder disappears exactly when you need it), Cancel and
    Save. Submit is disabled while the trimmed value is empty. Prefilled from the stored name, so
    the same component is creation and correction (**D3**).

3.5 `app_shell.tsx` — an `asking` state initialised from *no stored name*, and `<UserNameDialog />`
    mounted beside the other two. **It does not reopen on later loads** (**D2**).

3.6 **No motion of its own.** The dialog animates because every dialog does, with the tokens in
    `main.css`; a modal keeps `transform-origin: center` because it is not anchored to a trigger.

3.7 Commit: `feat(app): ask for a name on the first visit`

---

## 4. The sidebar draws it

Test-first: extend `sections.test.tsx`'s neighbours with T80 in `user_name.test.tsx`.

4.1 `app_sidebar.tsx` — a `SidebarFooter` holding one `SidebarMenuButton` row: the circle, then the
    name. Collapsed, the circle alone, with the name in the tooltip the sidebar already provides.

4.2 The circle is a `div` — `size-6 rounded-full bg-sidebar-primary text-sidebar-primary-foreground`
    — carrying the initials, `aria-hidden` (**D6**). With no name: `bg-sidebar-accent`,
    `text-ink-soft`, a `Plus` glyph.

4.3 The row's accessible name is the person's name, or **Add your name** when there is none. Its
    label truncates; a long name does not widen the sidebar or wrap to two lines.

4.4 Clicking or pressing Enter/Space opens the dialog, prefilled. **Colour-only hover**, at half the
    sidebar accent, `--duration-hover`, `--ease-out` — the treatment an inactive destination gets,
    for the reason in **D3**: this row is on screen every second the app is.

4.5 Commit: `feat(sidebar): draw the initials and the name in the footer`

---

## 5. The coverage

5.1 **T78** — `initialsOf` against every row of **D4**'s table, including the astral-character case
    that `charAt` would break, and `readUserName` against `null`, `'"joe"'`, `{}`, `{name: 4}`,
    `{name: '   '}` — all `''`.

5.2 **T79** — the dialog: it opens on a visit with no stored name; it does **not** open when one is
    stored; Escape closes it and stores nothing; a submitted name is in `localStorage` under
    `sticky-notes:user` and nowhere else; and the whole path runs from the keyboard alone — open,
    type, Enter, and the row updates.

5.3 **T80** — the row: initials and name drawn from the store; *Add your name* when empty; the row
    opens the dialog prefilled; the circle is `aria-hidden` and the accessible name is the name.

5.4 **The board is untouched by all of it.** `BOARD_KEY` is byte-identical before and after a name
    is stored, and after it is changed — the assertion P10 wrote for navigation, pointed at a
    different write.

5.5 Commit: `test: cover the name, the initials and the barrel`

---

## 6. The documents

6.1 `tech-stack.md` — the persistence row names all three keys; § Hard rules gains the barrel rule
    and its two exemptions (**D7**); the tree gains `lib/index.ts`, `lib/user.ts`,
    `hooks/use_user.ts` and `components/layout/user_name_dialog.tsx`.

6.2 `roadmap.md` — P13, and why it is not on the *Planned, in order* list.

6.3 `README.md` — status to P13.

6.4 Commit: `docs: record the board's name and the lib barrel`

6.5 Open the PR against **`main`**.

---

## What could go wrong

**Group 2 is the group most likely to break something invisibly.** Thirty files, one specifier
each, no behaviour intended. The safeguards are that it lands alone, that the assertion count moves
only by the two cases new files create, and that the lib-internal deep-import rule is a grep rather
than a habit. **If anything in the suite moves in group 2, the rewrite is wrong** — the answer is to
find what it reached, not to update the expectation.

**A dialog that opens on load is easy to get wrong in exactly one way.** If the stored name is read
asynchronously, a returning user sees the dialog for a frame before it closes itself, which is worse
than never having asked. Group 0 verifies `initializeWithValue`; group 5's *does not open when a
name is stored* is the assertion that would catch it.

**Two `useLocalStorage` callers on one key is a convenience the phase depends on.** If they do not
stay in step, naming yourself updates nothing until a reload, and the bug looks like a broken write
rather than a stale read. Group 0 answers it before group 3 is written, and the fallback is a
provider.

**`initialsOf` is four lines and a table of cases, which is the shape of a function that ships
wrong.** It is written test-first, from **D4**'s table, including the case a naive implementation
gets wrong — one code point, not one `charAt`.

**The footer now has an occupant, and *Dark mode* was promised the slot.** Nothing collides today.
It is written into `tech-stack.md` in group 6 so the next phase finds it rather than discovers it.
