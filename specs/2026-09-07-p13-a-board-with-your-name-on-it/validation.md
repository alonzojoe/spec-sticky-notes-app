# P13 · A board with your name on it — Validation

The phase's Done-when: *the app asks for a name once, takes no for an answer, draws the initials and
the name in the sidebar footer, stores it in one key that owns nothing, and every module in `lib/` is
reachable through one barrel.*

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, chunk warning included.

**The baseline is the fixed one.** `npm test` on `main` today reports `2 failed | 706 passed (708)`
— `T71` and `T77`, both *"leaves every order, pin and timestamp untouched through a round trip"*, on
a debounced write leaking between tests. Group 0 fixes that and records the green baseline. **Every
count below is measured against the green number, never against the red one.**

Five greps.

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

`npm ls` gains nothing, runtime or dev — **no `shadcn add` in this phase** (**D6**). `EXEMPT` is
untouched: the four new files are `snake_case` and nothing generates a file.

---

## Gate 2 — Automated assertions (Vitest)

T1–T77 come from P0–P12. **T78–T81 are new.** Baseline **25 suites** and the green count group 0
records; the phase ends at **27 suites** — `user.test.ts` and `user_name.test.tsx` are new files,
and T81 lives in `lib_barrel.test.ts`, which makes three new files across two suites plus one.

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
- With **a stored name**, it is not — not on the first render and not on any frame after it. This is
  the assertion that catches an asynchronous read (**D5**).
- **Escape closes it and stores nothing.** `sticky-notes:user` is absent afterwards, and the board is
  interactive with the dialog gone.
- **It does not come back.** A second render with the same store, after a dismissal, opens nothing.
  Being asked once is the difference between a question and a nag (**D2**).
- A submitted name is stored under `sticky-notes:user` as `{ name }`, trimmed.
- **Submit is inert while the trimmed value is empty**, so a space is not a name.
- **The whole path runs from the keyboard alone**: the dialog opens focused on the input, types,
  submits on Enter, and closes. Principle 5, and the terms P3 set for a dialog standing between a
  person and their board.
- **`sticky-notes:board:v1` is byte-identical** before the name is stored, after it is stored, and
  after it is changed. The name owns nothing (**D1**).

### T80 · The sidebar says whose board it is — `user_name.test.tsx`

- With a stored name, the footer row draws `JA` and `Joe Alonzo`.
- With none, it reads **Add your name**.
- **The circle is `aria-hidden`** and the row's accessible name is the name itself, or *Add your
  name* — two letters read aloud on top of the word they came from is noise (**D6**).
- Activating the row opens the dialog **prefilled** with the stored name, so a typo is fixable
  (**D3**).
- The row is a button in the tab order, after the three destinations.
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
cleared.

1. **Does the first visit feel like a question or a door?** Load the app cold. The dialog is the
   first thing the product ever says. **Written down whatever it says** — § Risks names this as the
   phase's real risk, and *dismissible* contains the damage rather than removing it.

2. **Dismiss it and try to capture a thought.** Escape, then `n`, then type. Under two seconds, on
   the very first visit, with no name stored. That is the one-sentence test on the one path that has
   never been walked before.

3. **Is the footer row an identity or a control?** Look at the sidebar expanded, then collapsed to
   the rail. Does the circle read as *you*, or as a fourth thing to click? Principle 4 says the
   sidebar holds controls; this row is the first thing in it that is neither a control nor a note,
   and the amendment is only honest if that is visible.

4. **Type a name the rule handles badly** — one word, a name with four parts, a name in a script
   without case, a name with an emoji in it. Not to check it does not crash; to check the row is
   still readable and the circle still looks deliberate. **Written down** — **D4** picks the
   least-wrong rule, not a correct one.

5. **Type a very long name.** The row truncates, the sidebar does not widen, nothing wraps to two
   lines, and the rail still shows two letters.

6. **Rename yourself.** Open the row, correct a typo, save. The row updates immediately, the board
   does not move, and nothing else on screen changes.

7. **Clear `sticky-notes:user` by hand and reload.** The dialog returns and the board is exactly as
   it was — twelve notes, same order, same pins. **The name owns nothing**, seen rather than
   asserted.

8. **Corrupt `sticky-notes:user` by hand** — `{"name": 4}`, then `not json at all`. Both load a
   board that asks for a name, and neither writes to the console.

### Answers — run <date> against a twelve-note board

*(filled in when the phase runs; checks 1 and 4 are written down whatever they say)*

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| The one-sentence test — capture in under two seconds | Gate 3 check 2, on the first visit specifically |
| The one-sentence test — the board is as I left it | T79's `BOARD_KEY` assertion; Gate 3 check 7 |
| Principle 1 — nothing else reorders the board | No dispatch in this phase; nothing touches `notes_reducer.ts` |
| Principle 2 — a card is a summary | Unchanged; nothing on the board moves |
| Principle 3 — no Save button | The dialog commits a value, as P3's create dialog does; nothing that already exists is edited without autosave |
| Principle 4 — quiet chrome | **Amended in one clause**: the sidebar holds one identity, which is neither a control nor a note. Nothing is added to a card |
| Principle 5 — keyboard-reachable | T79's keyboard path; T80's row in the tab order |
| No accounts, auth, multi-user, sync | **D1**'s carve-out, and T79's proof that the board is byte-identical across a name |
| Every colour and duration from a token | `--sidebar-primary`, `--duration-hover`, `--ease-out`; Gate 1's build |
| No new dependency | `npm ls` unchanged; no `shadcn add` |
| `snake_case` for files we author | T4, `EXEMPT` untouched |

---

## Definition of done

- [ ] Gate 0 — the suite is **green before the phase begins**, and the baseline is recorded.
- [ ] Gate 1 clean — build, lint, test, and all five greps.
- [ ] Gate 2 — T78–T81 pass; T1–T77 still pass, and **group 2 moved no behavioural assertion**.
- [ ] Gate 3 — eight checks run, and **checks 1 and 4 written down**.
- [ ] Gate 4 — every row satisfied.
- [ ] The name can be given, refused, corrected, and deleted, and the board is identical through all
      four.
- [ ] Every module in `lib/` is reachable through `@/lib`, and a new one that is not fails the suite.
- [ ] PR opened against `main`.
