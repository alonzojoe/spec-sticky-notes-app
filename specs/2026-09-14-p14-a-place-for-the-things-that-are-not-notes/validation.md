# P14 · A place for the things that are not notes — Validation

The phase's Done-when: *the sidebar has a door at the bottom, `/settings` is a place you can
bookmark, the name is changed where it is read, and one button — behind one sentence with a real
number in it — returns the browser to the state it was in before it ever met this app.*

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, chunk warning included.

**The baseline is green.** `npm test` on `main` reports **28 suites, 753 passed** — P13 plus #17 and
#18. Every count below is measured against that number.

Six greps.

```
NO_COMMENTS='grep -vE ":[[:space:]]*(\*|//|/\*)"'

grep -rn "localStorage\.\(clear\|removeItem\)" src --include='*.ts' --include='*.tsx' | eval $NO_COMMENTS
```

Empty. **D4**, and the most important grep in this phase. A raw removal notifies nothing inside the
tab: every React state would keep the value it already had, and `notes_context.tsx`'s 300 ms
debounced mirror would write the whole board back to the key that had just been emptied. Every key
is cleared by the hook that owns it.

```
grep -rn "sticky-notes:" src --include='*.tsx' | eval $NO_COMMENTS
```

Empty, unchanged from P13. `use_reset.ts` reaches `SIDEBAR_KEY` through `@/lib` like every other
caller; no component knows what any key is called.

```
grep -rn "SidebarFooter" src/components/layout/app_sidebar.tsx | eval $NO_COMMENTS
```

**One hit.** This inverts P13's Gate 1, which required the same grep to be **empty**, and the
inversion is deliberate and argued in **D2** — *Dark mode* was promised a home for the theme
control, not a specific div, and it gets a labelled row on the settings page instead. **P13's grep
is retired by this line**, so the next person to run that phase's validation finds the argument
rather than a contradiction.

```
grep -rn "user_name_dialog\|UserNameDialog" src specs --include='*.ts' --include='*.tsx' | eval $NO_COMMENTS
```

Empty in `src/`. The file was renamed with `git mv` and nothing still reaches for the old name.
Hits in `specs/2026-09-07-p13-*` are correct and stay: that phase shipped that file, and a spec
rewritten to match a later phase is a history that lies.

```
grep -rn "SECTIONS\|sections" src/pages/settings_page src/app/routes/_board/settings | eval $NO_COMMENTS
```

Empty. **D1**: Settings is not a section, has no `keep` predicate and draws no notes. The registry
stays at three rows and learns nothing about this page.

```
grep -rn "onEditName\|asking" src --include='*.tsx' | eval $NO_COMMENTS
```

Empty. **D3**: the intro's open state is derived from the name, and there is no second source of
truth that can disagree with the key. This is also the grep that proves the reset-does-not-reopen
bug cannot come back.

```
grep -rn "id:\|order:\|createdAt\|tilt\|x:\|y:" src/lib/sample_notes.ts | eval $NO_COMMENTS
```

Empty. **D7**: the samples are content, not notes. An id in a fixture is a fixture that ships the
same note twice; `x`, `y` and `tilt` are P1 fields the data model dropped in P5 and they do not come
back with the writing.

`npm ls` gains nothing, runtime or dev — **no `shadcn add` in this phase**. `EXEMPT` is untouched:
five new files, all `snake_case`, and `routeTree.gen.ts` keeps the exemption P11 gave it.

---

## Gate 2 — Automated assertions (Vitest)

T1–T81 come from P0–P13. **T82–T87 are new.** Baseline **28 suites, 753 passed**. The phase ends at
**29 suites** and the count group 5 records — one new file, `settings.test.tsx`, plus the cases
`naming_convention.test.ts` gains for every file this phase adds and the one it renames, and the one
`lib_barrel.test.ts` gains for `sample_notes.ts`.

**Two existing files move, and only for stated reasons.** `naming_convention.test.ts` is
parameterised over the file tree, so it gains a case per new file. `user_name.test.tsx` loses its
rename assertions, which move to `settings.test.tsx` — the rename did not stop being tested, it
stopped being in that file.

**Nothing else may move.** `app_shell.test.tsx` and `sections.test.tsx` are the two that could, via
group 2's change to how a destination decides it is active. If a count in either moves, that change
reached further than it should have and the fix is there rather than in the expectation.

### T82 · The reducer empties the board — `notes_reducer.test.ts`

- A board of several notes, pinned and unpinned, against `{ type: 'reset' }` → `EMPTY_BOARD`,
  compared by value.
- **The result is what `hydrate` returns for a value it refuses**, which is the same constant — so a
  reset board and a first-visit board are the same object shape, not two things that happen to look
  alike.
- An already-empty board is unchanged.
- **The input is not mutated.** The state handed in still holds every note afterwards; the frozen-state
  case T19 exists to catch applies here like any other action.
- Pure: no clock, no ids, no `at`.

### T83 · The name is changed where it is read — `settings.test.tsx`

- `/settings` renders the stored name in the field, prefilled.
- Typing a new one and pressing `Save` writes `{ name }` to `sticky-notes:user`, **trimmed**.
- **The sidebar row updates without a reload** — the name and the initials both — which is the
  assertion that pins `useLocalStorage`'s in-tab event (**D4**, and P13's **D5** before it). If this
  fails, the fallback is a provider and not a different design.
- `Save` is inert while the trimmed draft is empty, and inert while it equals the stored name.
- **Enter in the field submits**, so the whole path runs from the keyboard (principle 5).
- **Not one note changes.** Every note, order, pin and timestamp identical, compared **parsed** —
  never as a string. `hydrate` rebuilds each note object rather than spreading it, so the key order
  moves while every value stays put; #17 fixed exactly this assertion in T79 and the mistake is
  cheap to repeat.

### T84 · The sidebar has a door, and exactly one row is lit — `settings.test.tsx`

- The footer renders one row, labelled `Settings`, and it is a link to `/settings` — not a button
  with a handler.
- Clicking it navigates; the settings page renders and the board does not.
- **On `/settings`, no board destination is active.** Notes, Pinned and Linked all carry no
  `data-active`, and the footer row carries it. This is the assertion group 2 exists to satisfy:
  `sectionAt` falls back to the first row for an unmatched path, so without the fix the sidebar
  would light `Notes` while the board is not on screen.
- **On `/pinned`, the footer row is not active** and Pinned is — the same question from the other
  side.
- The identity row at the top is a link to `/settings` too, and clicking it lands on the same page.
- **No badge on the footer row.** A count there would be a number about settings, and there is no
  such number.

### T85 · Reset everything — `settings.test.tsx`

- From a seeded board and a seeded name: `Reset everything` opens a confirmation and **changes
  nothing until it is confirmed**.
- The sentence carries the **real count** — a board of three says three — and a board of one says
  *note*, not *notes*.
- Confirmed: the board is empty, `sticky-notes:user` holds no name, `sticky-notes:sidebar` is back
  to open, and the location is `/`.
- **The intro is open afterwards**, by itself. Nothing in the reset opens it; `name === ''` is the
  only thing that decides (**D3**). This is the assertion that would have caught the bug a
  `useState`-held `asking` would have shipped.
- **The board is empty in the store as well as on screen**, after the debounce has been allowed to
  settle. The 300 ms window in which the reducer is empty and `localStorage` still holds every note
  is named in § Risks and is not fixed; this asserts that it *closes*.
- `localStorage.clear` and `removeItem` are never called — asserted by spying on `Storage.prototype`,
  because Gate 1's grep catches the source and this catches a library doing it on our behalf.

### T86 · Cancel is a guard, not a speed bump — `settings.test.tsx`

- `Cancel` closes the confirmation and leaves the board, the name and the sidebar exactly as they
  were.
- **`Cancel` holds focus when the dialog opens**, so Enter on a dialog you did not read cancels
  rather than erases — P9's rule, and the reason this is a separate assertion rather than a line in
  T85.
- Escape closes it, and changes nothing.
- The confirmation's action says **`Reset everything`**, never `OK`.

### T87 · The sample board — `settings.test.tsx`

- On an **empty** board, `Load sample notes` is live; pressing it puts **three** notes on the board.
- They are **real notes**: distinct `crypto.randomUUID` ids, a `createdAt`, today's `date`, and they
  survive a round trip through `hydrate` unchanged. Nothing about them says *sample* once they land.
- **The order is right way up.** `SAMPLE_NOTES[0]` — *Where it sits is what it means* — is the note
  in the first slot, which is the assertion that pins the reverse dispatch. Without it the board
  renders the list upside down and nothing else fails.
- On a board with **any** note on it, the button is `disabled`. This is the guard that makes the
  control unable to bury what you wrote (**D7**), and it is asserted from both sides: disabled with
  one note, live again after that note is deleted.
- **Pressing it twice is not possible**, because loading three notes disables it. Asserted rather
  than reasoned about — it is the whole of why there is no confirmation.
- `sample_notes.ts` exports **content only**: no `id`, no `order`, no `createdAt`, no `x`, `y` or
  `tilt` on any entry. A unit assertion in the same file, because a fixture that grows an id is a
  fixture that ships duplicate notes.

---

## Gate 3 — Manual checks, in a browser

jsdom runs no layout and no animation, so three of these cannot be asserted and the fourth is a
judgment. P7, P8, P9 and P13 each found a real defect here that the suite could not, and P13's was
a size and a piece of copy — exactly the shape of what is below.

**1 · The bottom of the sidebar, cold.** Expanded and collapsed. The footer row is the first thing
this app has ever put down there. Does it read as a door out of the board, or as a fourth
destination that got separated from the other three? Collapsed to the rail it is a glyph under a gap
— does the gap read as structure or as a mistake? **Write down what it says either way.** If it
reads as a stray destination, the fix is the separator or the gap, not the placement.

**2 · The settings page against the board, by navigating between them.** `bg-background` where cork
usually is, at the same moment the sidebar stays put. Does replacing the board read as *a different
place*, or as the board having gone missing? This is the visible half of **D6** and it is the only
check here that could invalidate a decision rather than a value.

**3 · The reset confirmation, read as a person about to lose a board.** Not as its author. *Deletes
all 8 notes and your name from this browser. This cannot be undone.* Is the weight of it in the
sentence? **If it is not, the copy is what to fix** — there is nothing else in this feature that can
carry it, no undo, and no trash.

**4 · Reset, actually performed, on a board with real notes in it.** The whole sequence at full
speed: confirm, the board empties, the location changes, the intro arrives over an empty board. Two
things to watch for that no test can see — whether anything flashes between the board emptying and
the intro arriving, and whether the intro's *A corkboard for the thoughts you want back tomorrow*
reads as absurd to somebody who has just used the app for a week. § Risks predicts it is *slightly*
wrong and the right kind of wrong. Confirm that or contradict it.

**5 · The sample notes, loaded onto an empty board, and then read.** Not skimmed — read, as
somebody who does not already know what this app is. They were written in P1 to describe a freeform
board and this one is a grid: *the board stays where you left it* now promises an order rather than
a position. Does that still describe the app you are looking at? **If it does not, the fix is the
copy in `sample_notes.ts`** and nothing else in the phase moves.

**6 · The name, changed on the page, watched in the sidebar.** The row updates as the save lands —
no animation, by design (**D6**). Confirm that the absence of motion reads as instant rather than as
broken, which is the thing that is only ever decided by looking.

---

## Constitution compliance

| Rule | How this phase satisfies it |
| --- | --- |
| `mission.md` principle 1 — the board never rearranges itself | Reset is not a rearrangement; it is the absence of notes to arrange. Nothing else in the phase dispatches. |
| principle 2 — no modal between you and your board | The settings page is a route, deliberately (**D1**). The one modal is a destructive confirmation, which `mission.md` puts in scope by name for delete. |
| principle 3 — persistent by default, no Save button | The rename keeps a `Save` under P3's carve-out, reused by P13: a name is a value you commit. The reset is a guard, not a save. |
| principle 4 — chrome lives in the sidebar, never on the board surface | Amended in this phase (**D6**): a route that *replaces* the board is not sitting on it. The board is not rendered behind the settings page. |
| principle 5 — keyboard-reachable | The footer row is in the tab order after the destinations; the field submits on Enter; the confirmation traps focus with `Cancel` holding it. T83, T84, T86. |
| `mission.md` § out of scope — accounts, multi-user | Unchanged. The name is still a label that owns nothing (P13 **D1**), which is exactly why deleting it deletes a string and not a board. |
| `tech-stack.md` — no new dependency | None. No `shadcn add`; `alert-dialog`, `input`, `button` and `separator` are all here. |
| `tech-stack.md` — one reducer, no state library | The reset is one reducer action (**D5**). |
| `tech-stack.md` — everything in `lib/` through `@/lib` | `sample_notes.ts` lands in `lib/` and the barrel gains one line; `lib_barrel.test.ts` would fail otherwise. |
| `tech-stack.md` — `snake_case` for files we author | Four new files and one `git mv`, all conforming. `EXEMPT` untouched. |
| `tech-stack.md` — every colour and duration from a token | `--background`, `--ink-soft`, `--border`, `--destructive`, `--duration-hover`, `--duration-press`, `--ease-out`. Nothing added to `@theme`. |
| `roadmap.md` — no phase leaves the app broken | Group 2 lands a reachable empty page; every group after it ends on a full green gate. |
