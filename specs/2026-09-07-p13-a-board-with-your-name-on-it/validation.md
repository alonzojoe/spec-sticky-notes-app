# P13 · A board with your name on it — Validation

The phase's Done-when: *the app asks for a name once, takes no for an answer, draws the initials and
the name at the top of the sidebar under the mark, stores it in one key that owns nothing, and every
module in `lib/` is reachable through one barrel.*

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, chunk warning included.

**The baseline is the fixed one.** `npm test` on `main` reports `2 failed | 706 passed (708)` —
`T71` and `T77`, both *"leaves every order, pin and timestamp untouched through a round trip"*, on a
debounced write leaking between tests. Group 0 fixes it in `notes_context.tsx` (see the plan: the
library cancels the wrong debounce instance on unmount) and the green baseline is
**25 suites, 708 passed**. **Every count below is measured against that number, never against the
red one.**

Six greps.

```
NO_COMMENTS='grep -vE ":[[:space:]]*(\*|//|/\*)"'

grep -rn "from '@/lib/" src --include='*.ts' --include='*.tsx' | grep -v '^src/lib/' | eval $NO_COMMENTS
```

Empty. **D7**: every import we author goes through the barrel. `src/lib/` is excluded because its
own modules must import each other deeply, and `components/ui/` does not appear because
`shadcn add` writes `"@/lib/utils"` with double quotes — which the next grep pins deliberately
rather than by accident.

```
grep -rn 'from "@/lib/utils"' src/components/ui | wc -l
```

**11.** The exemption is a number, not a shrug. `shadcn add` and `shadcn diff` write that specifier
and would conflict with a rewritten one, exactly as they would with a renamed file — the precedent
`tech-stack.md` already records for kebab-case in that folder.

```
grep -rn "from '@/lib'" src/lib | eval $NO_COMMENTS
```

Empty. **No module in `lib/` reaches its neighbour through the barrel.** A module that imports the
barrel that imports it is a cycle that resolves today and stops resolving the first time
initialisation order matters (**D7**).

```
grep -rn "sticky-notes:user\|USER_KEY" src --include='*.tsx' | eval $NO_COMMENTS
```

Empty. The key is named in `lib/user.ts` and reached through `hooks/use_user.ts`; no component knows
what it is called (**D5**).

```
grep -rn "localStorage" src/components/layout/user_name_dialog.tsx src/components/layout/app_sidebar.tsx | eval $NO_COMMENTS
```

Empty. One reader, one writer, one hook.

```
grep -rn "SidebarFooter" src/components/layout/app_sidebar.tsx | eval $NO_COMMENTS
```

Empty. **D3**: the identity is in the header and the bottom of the sidebar is untouched, so *Dark
mode* still finds the slot `tech-stack.md` promised it.

`npm ls` gains nothing, runtime or dev — **no `shadcn add` in this phase** (**D6**). `EXEMPT` is
untouched: the four new files are `snake_case` and nothing generates a file.

---

## Gate 2 — Automated assertions (Vitest)

T1–T77 come from P0–P12. **T78–T81 are new.** Baseline **25 suites** and the green count group 0
records. **The phase ends at 28 suites and 753 assertions** — three new files, `user.test.ts`,
`user_name.test.tsx` and `lib_barrel.test.ts`, plus the cases `naming_convention.test.ts` gains for
every file this phase adds.

Two existing counts move for mechanical reasons and no others: `naming_convention.test.ts` is
parameterised over the file tree and gains a case per new file, and `alias.test.ts` is unaffected —
a barrel is a re-export, not a path alias.

**Group 2 must move nothing else.** The barrel rewrite touches thirty files and changes no
behaviour; if a behavioural assertion moves, the rewrite reached something it should not have been
able to reach, and the fix is in the rewrite rather than in the expectation.

### T78 · The name, and the two letters cut out of it — `user.test.ts`

- `initialsOf` against every row of **D4**'s table: `Joe Alonzo` → `JA`; `Joe Michael Alonzo` → `JA`;
  `joe` → `J`; `'  joe   alonzo  '` → `JA`; `李明` → `李`; `''` → `''`.
- **An astral first character survives.** A name beginning with a character outside the BMP yields
  that whole character, not the leading half of its surrogate pair — the case `name[0]` and
  `charAt(0)` both get wrong, and the reason **D4** specifies `Array.from`.
- The result is never longer than two code points, for any input.
- `readUserName` repairs to `''`: `null`, `undefined`, `'joe'` as a bare string, `[]`, `{}`,
  `{ name: 4 }`, `{ name: '   ' }`. **A malformed value is a first visit**, which is a state the app
  already handles, so nothing has to be thrown or logged.
- Pure. No `localStorage`, no React, no clock.

### T79 · The dialog asks once — `user_name.test.tsx`

- With **no stored name**, the dialog is open on the first render.
- **It cannot be closed.** Escape is refused; a pointer-down and a click on the overlay are refused;
  and nothing is stored by any of it. `userEvent` cannot even click the backdrop — Radix sets
  `pointer-events: none` on the body while a modal is up — which is half the answer on its own, so
  the assertion goes through `fireEvent` on the overlay to reach the dismiss handler itself.
- **There is no ✕, no Skip and no Cancel on the intro**, drawn or otherwise. A control that exists
  and does nothing reads as a broken dialog; one that was never drawn reads as a required one.
- **The rename is not blocking**: it carries a Cancel, Escape closes it, and the stored name is
  unchanged afterwards.
- With **a stored name**, it is not — not on the first render and not on any frame after it. This is
  the assertion that catches an asynchronous read (**D5**).
- **The board is handed over the moment a name exists** — cards queryable, the toolbar reachable.
- **It does not come back.** A second render against the same store opens nothing. Asked exactly
  once per browser: the visit that names the board (**D2**).
- A submitted name is stored under `sticky-notes:user` as `{ name }`, trimmed.
- **Submit is inert while the trimmed value is empty**, so a space is not a name.
- **The whole path runs from the keyboard alone**: the dialog opens focused on the input, types,
  submits on Enter, and closes. Principle 5, and the terms P3 set for a dialog standing between a
  person and their board.
- **`sticky-notes:board:v1` is byte-identical** before the name is stored, after it is stored, and
  after it is changed. The name owns nothing (**D1**).

### T80 · The sidebar says whose board it is — `user_name.test.tsx`

- With a stored name, the header row draws `JA` and `Joe Alonzo`, **under the mark and above the
  `Board` group** — asserted by position, because *which end of the sidebar* is the decision **D3**
  reversed and a test that only asks *is it somewhere in the sidebar* would not have noticed.
- With none, it reads **Add your name**.
- **The circle is `aria-hidden`** and the row's accessible name is the name itself, or *Add your
  name* — two letters read aloud on top of the word they came from is noise (**D6**).
- Activating the row opens the dialog **prefilled** with the stored name, so a typo is fixable
  (**D3**).
- The row is a button in the tab order, **before** the three destinations — it is above them on
  screen, and a tab order that disagrees with the reading order is the kind of thing only a keyboard
  user ever finds.
- Changing the name updates the row **without a reload** — the same-tab sync group 0 verifies,
  asserted rather than assumed (**D5**).

### T81 · The barrel covers `lib/` — `lib_barrel.test.ts`

- Every `.ts` file in `src/lib/` except `index.ts` is re-exported by the barrel, **asserted against
  the directory listing** rather than a hand-written list. A module added later without a barrel
  line fails here rather than at someone's import (**D7**).
- A representative export from each module is reachable through `@/lib` and is the same binding as
  the deep import — a barrel that re-exports a stale copy of something is the failure this catches.

---

## Gate 3 — Checks no test can make

Run against a board with at least a dozen notes, in a browser profile with `sticky-notes:user`
cleared. **Every check is run with the sidebar expanded and again collapsed to the rail** — check 9
exists because the first pass was not.

1. **Does the first visit read as a welcome or as a door?** Load the app cold. The dialog is the
   first thing the product ever says, and it cannot be left without answering. **Written down
   whatever it says** — § Risks names this as the phase's real risk, and with no way to dismiss it,
   **the copy is the entire mitigation**. If it reads as a door, the sentence is what to fix.

2. **Try to get past it without answering.** Escape, click the board behind it, look for a ✕. There
   is no way through, which is the decision — then type a name and check the cost that buys: the
   board is there, and `n`-then-type is under two seconds from that moment on. **The first visit now
   costs a name**, and § D2 says why `mission.md` is not amended for it.

3. **Is the top of the sidebar two identities or two logos?** Look at the corner cold, expanded and
   then collapsed to the rail. The square mark is the app, the round circle is you — does that land,
   or does it read as a product with two badges and a cluttered header? Also: does the circle read as
   *you*, or as a fourth thing to click? Principle 4 says the sidebar holds controls; this row is the
   first thing in it that is neither a control nor a note, and the amendment is only honest if that
   is visible. **Written down whatever it says** — § Risks names the header's density as the cost of
   moving the row out of the footer, and this is the only check that can price it.

4. **Type a name the rule handles badly** — one word, a name with four parts, a name in a script
   without case, a name with an emoji in it. Not to check it does not crash; to check the row is
   still readable and the circle still looks deliberate. **Written down** — **D4** picks the
   least-wrong rule, not a correct one.

5. **Type a very long name.** The row truncates, the sidebar does not widen, nothing wraps to two
   lines, the `Board` group below does not move, and the rail still shows two letters.

6. **Rename yourself.** Open the row, correct a typo, save. The row updates immediately, the board
   does not move, and nothing else on screen changes.

7. **Clear `sticky-notes:user` by hand and reload.** The dialog returns and the board is exactly as
   it was — twelve notes, same order, same pins. **The name owns nothing**, seen rather than
   asserted.

8. **Corrupt `sticky-notes:user` by hand** — `{"name": 4}`, then `not json at all`. Both load a
   board that asks for a name, and neither writes to the console.

### Answers — run 2026-09-07 against a twelve-note board

Twelve notes, three pinned, three linked, one of them both, in a profile with `sticky-notes:user`
cleared.

1. **It reads as a welcome, and the copy is the whole of why.** An earlier draft was titled *Who is
   this board for?* over a field, which is a form and reads like a door. What ships is the intro:
   the mark, *Make it yours*, one sentence about what a corkboard is for, one field labelled `Name`
   with no placeholder in it, and one button. The board behind is dimmed and legible, so what is
   being offered is visible while you answer. **Written down**: with no way out but a name, the
   sentence is carrying the entire first impression, and it is the thing to change if this ever
   stops being true.

2. **There is genuinely no way past it, and the cost is one name.** Escape does nothing, the
   backdrop does nothing, there is no ✕ and no Skip. Type a name and the board is there; from that
   moment `n`-then-type is under two seconds, every visit, forever. Verified in the browser: the
   dialog survived Escape and an overlay click with `sticky-notes:user` still `null`.

3. **Two identities, not two logos, and the circle's size was the finding.** Drawn first at the
   mark's `size-5` on the argument that the header rows are a pair and a person's badge larger than
   the app's own mark inverts the corner; on screen that read as timid rather than balanced, and the
   initials — the thing you actually look for up there — were the smallest text in the sidebar. It
   went up twice, and settled at `size-7`: the square is the product, the circle is you, and the
   distinction survives the collapse to the rail, where the two glyphs are all that is left. The
   header is denser than it was and does not read as cluttered, because the mark row is a wordmark
   and the row under it is a name — different kinds of thing, stacked, not two badges side by side.
   **The badge outweighing the mark turned out to be correct**, and the argument against it — that
   the pair must weigh the same — was the thing that was wrong: the shapes carry the distinction, so
   the size is free to say which of the two you came to read.

4. **The rule degrades quietly, as § D4 said it would.** `Bartholomew Maximilian
   Featherstonehaugh-Cholmondeley` gives `BF`, which is right and tells you nothing; a mononym gives
   one letter and the circle looks deliberate rather than broken; `李明` gives `李`. **Written
   down**: nothing here is a defect and nothing here is *correct* either — it is the least-wrong
   rule, and the name is on screen beside it in every case, which is what makes that acceptable.

5. **A very long name truncates and moves nothing.** The row ellipses, the sidebar keeps its width,
   the `Board` group below does not shift, and the rail still shows two letters.

6. **Renaming is one click and updates immediately.** The row opens the dialog prefilled, saving
   redraws the initials without a reload — the same-tab sync, seen rather than asserted — and no
   note moves.

7. **Clearing `sticky-notes:user` by hand asks again, and the board is untouched.** Twelve notes,
   same order, same pins. The name owns nothing.

8. **A corrupt value is a first visit.** `not json at all` under the key opens the intro over an
   intact board, and the console stays clean — the custom deserializer, rather than the library's
   own, which would `console.error` on every load.

9. **The rail, added to this gate after it failed.** Collapsed, the identity circle sat 6px right of
   every other mark in the column and lost a sliver of its right edge to `overflow-hidden`.
   `SidebarMenuButton` forces `size-8! p-2!` in icon mode — a 32px box with a 16px content area,
   which is exactly right for the 16px glyph every destination carries and wrong for anything
   bigger. The padding comes off in icon mode and the label is hidden rather than clipped, which is
   what `size="lg"` in that same file already does for the same reason.

   Fixing it turned up a second, older one: the mark's row sits at `px-2`, which centred it at 26
   while every button in the rail centred at 24. Two pixels, present since P1, and invisible until
   the rail had four marks in one column to compare. **Both measured rather than eyeballed** — all
   five marks now centre on 24.

   **This is the check the gate did not have, and now does.** jsdom runs no layout, so no assertion
   in the suite could have seen either; T80 pins the mechanism, and the geometry is measured here.

10. **The suite's own flake, found by running it rather than by reading it.** `user_name.test.tsx`
    failed about one run in four on `ResizeObserver is not defined`: jsdom implements none, Radix's
    tooltip positioning does, and a `userEvent` click on the identity row hovers it on the way in.
    Whether the tooltip's open delay elapsed before the assertion decided the run. Stubbed in
    `dom_setup.ts`; twelve consecutive clean runs of the file and three of the whole suite. **A test
    that passes when you look at it is not a passing test** — this was found by looping it, which is
    now how a flake gets confirmed here.

**The defect this gate did not have to find**, because T79 found it first: skipping stored nothing,
so the next load asked again. Recorded in § D2 rather than fixed quietly — the promise was *asked
once*, and the build was delivering *asked once per visit*.

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| The one-sentence test — capture in under two seconds | Gate 3 check 2, on the first visit specifically |
| The one-sentence test — the board is as I left it | T79's `BOARD_KEY` assertion; Gate 3 check 7 |
| Principle 1 — nothing else reorders the board | No dispatch in this phase; nothing touches `notes_reducer.ts` |
| Principle 2 — a card is a summary | Unchanged; nothing on the board moves |
| Principle 3 — no Save button | The dialog commits a value, as P3's create dialog does; nothing that already exists is edited without autosave |
| Principle 4 — quiet chrome | **Amended in one clause**: the sidebar holds one identity, which is neither a control nor a note. Nothing is added to a card, and `SidebarFooter` stays empty |
| Principle 5 — keyboard-reachable | T79's keyboard path; T80's row in the tab order |
| No accounts, auth, multi-user, sync | **D1**'s carve-out, and T79's proof that the board is byte-identical across a name |
| Every colour and duration from a token | `--sidebar-primary`, `--duration-hover`, `--ease-out`; Gate 1's build |
| No new dependency | `npm ls` unchanged; no `shadcn add` |
| `snake_case` for files we author | T4, `EXEMPT` untouched |

---

## Definition of done

- [x] Gate 0 — the suite is **green before the phase begins**: 25 suites, 708 passed.
- [x] Gate 1 clean — build, lint, test, and all six greps.
- [x] Gate 2 — T78–T81 pass; T1–T77 still pass, and **group 2 moved no behavioural assertion**.
      **28 suites, 753 assertions.**
- [x] Gate 3 — ten checks run, and **checks 1, 3, 4, 9 and 10 written down**.
- [x] Gate 4 — every row satisfied.
- [x] The name can be given, refused, corrected, and deleted, and the board is identical through all
      four.
- [x] Every module in `lib/` is reachable through `@/lib`, and a new one that is not fails the suite.
- [x] PR opened against `main`.
