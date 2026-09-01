# P6 · A note with a date — Validation

The phase's Done-when: *every note carries a date shown top-left as `MM/DD/YYYY`, the create dialog
defaults it to today, every card is the same height with its body truncated by an ellipsis, clicking
a card opens the note for reading and editing, and there is no Save button anywhere.*

All of that is assertable except the one thing that matters most — whether a fixed-height card shows
the right amount of note before you have to click. Gate 3 check 2 makes that judgement in front of a
real board.

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free. No new eslint override, no `// eslint-disable` in our own code.

Two greps, both of which must come back empty:

```
grep -rn "startEditing\|useDebounceCallback" src/components/board/
grep -rn "Save" src/components/layout/*.tsx
```

The first proves **D6** — the card is no longer an editor. The second proves **D5** — principle 3
was not quietly amended by adding a Save button to a dialog.

`npm ls react-day-picker` resolves to exactly one version.

---

## Gate 2 — Automated assertions (Vitest)

T1–T37 come from P0–P5. T38–T47 are new.

### T1–T10 · carried forward

T4's `EXEMPT` pin still reads exactly `['components/ui', 'hooks/use-mobile.ts']`. The generated
`calendar.tsx` and `popover.tsx` are covered by `components/ui`; **this phase adds nothing to that
list.**

T6 and T10 are the tripwires for group 4. The generated calendar is the largest block of shadcn
markup this project has taken, and it is the most likely place for an achromatic default or a stock
palette utility to arrive.

### T38 · The date helpers are correct, and timezone-proof — `dates.test.ts`

- `formatDate('2026-09-01')` is `'09/01/2026'`. September the 1st, 2026 — the example from the
  request, asserted literally.
- Single-digit months and days keep their leading zeros: `'2026-01-05'` → `'01/05/2026'`.
- **`formatDate` never constructs a `Date`.** Asserted by behaviour, not by inspection: with the
  process timezone set to `Pacific/Kiritimati` (UTC+14) and again to `Pacific/Midway` (UTC−11),
  `formatDate('2026-09-01')` is `'09/01/2026'` in both. A `new Date('2026-09-01')` implementation
  fails one of them. **This is the test that earns the decision in plan § 2.2.**
- `todayISO()` matches the local calendar date, not the UTC one — asserted at a fixed fake time
  chosen so the two differ.
- `isISODate` rejects `'09/01/2026'`, `'2026-9-1'`, `''`, `null`, and a `Date`.
- `isoFromEpoch` round-trips with `todayISO` for a known local timestamp.

### T39 · The reducer carries and edits the date

- `add` writes the seed's `date` unchanged.
- `set_date` changes exactly one note's `date` and stamps its `updatedAt`; every other note is
  untouched.
- `set_date` for an id not on the board returns the state unchanged rather than throwing.

### T40 · A board saved before this phase gets a date

- A stored note with no `date` renders one derived from its `createdAt`, matching
  `isoFromEpoch(createdAt)`.
- A stored note whose `date` is `'not a date'`, `12345`, or `null` is **repaired, not rejected** —
  the board still loads with every note present. A malformed date is recoverable; losing the board
  is not.
- `version` is still `1` after the repaired board is written back.

### T41 · The create dialog defaults to today

- Opening the dialog shows `formatDate(todayISO())`.
- **Computed on open, not at module load.** Assert with fake timers: open the dialog, advance the
  clock past midnight, close and reopen, and the field shows the new day. A module-level constant
  passes the first assertion and fails this one.
- A note created without touching the picker carries `todayISO()`.

### T42 · The view opens with the note's own content

- Clicking a card opens a dialog containing that note's full body — **including the part the card
  clamped away**.
- The colour swatches show that note's colour as checked; the date field shows its date.
- Opening note A, closing, then opening note B shows B's body. This is the stale-`defaultValue` bug
  plan § 5.3 keys the textarea against, and it is invisible without a second note.

### T43 · The view saves without a Save button

- `queryByRole('button', { name: /save/i })` is **null**. So is `/cancel/i`.
- Typing writes the body after the debounce.
- Closing writes immediately, without waiting for the debounce — assert with fake timers that the
  store has the text before the debounce would have fired.
- Changing the colour dispatches immediately; so does changing the date. Neither is debounced,
  because neither is typed.
- Escape, the close control and Done all take the same path: each saves and closes.

### T44 · The view is completable from the keyboard

Open a note, edit its body, change its colour with the arrow keys, dismiss with Escape. The note
carries both changes. Principle 2's surviving clause, asserted.

### T45 · The card is a summary

- The date renders top-left, formatted `MM/DD/YYYY`.
- The body is clamped — the card carries `line-clamp-4`, and a long note's card is the same height
  as a short one's. **Assert equal heights from the class list, not from `getBoundingClientRect`:**
  jsdom runs no layout and every rect is zero, so a rect-based assertion would pass vacuously.
- An empty note still reads `Empty note`.
- **The card has no textarea.** `queryByRole('textbox')` inside a card is null — the assertion that
  **D6** actually happened rather than the textarea being hidden.

### T46 · The card opens the note, and only when it should

The four gestures that share the card, one assertion each:

- A plain click opens the view.
- A **drag** does not. Pointer down, move past the 4px threshold, up over another card: the notes
  swap and **no dialog opens**.
- Clicking **pin** does not open the view, and the note is pinned.
- Clicking **delete** does not open the view, and the note is gone. Without the stopPropagation in
  plan § 6.4 this opens the note that was just deleted.

### T47 · The card's keyboard contract

- `Enter` and `Space` on a focused card open the view.
- The arrow keys still reorder and do **not** open it — both contracts live on the same element, so
  this is where they are proved not to collide.
- A note created with an empty body opens its view immediately (**D6**).

### Test setup

`react-day-picker` may need `ResizeObserver`; stub it in `dom_setup.ts` beside the existing stubs
rather than mocking the calendar. Mocking it would make T41 assert against a fake.

For T38's timezone assertions, set `process.env.TZ` per test and construct the fake clock inside it.
If Vitest's environment will not re-read `TZ` after the module loads, assert `formatDate` against a
frozen string table instead and **say so in the test**, rather than silently dropping the claim.

---

## Gate 3 — Manual checks

1. **The date reads correctly.** Create a note today; it shows today as `MM/DD/YYYY`. Backdate one
   to 1 September 2026 and confirm it reads `09/01/2026` — not `08/31/2026`, which is what a
   timezone bug produces and what T38 exists to prevent.
2. **Is four lines the right amount?** The judgement call. Too little and the board is a list of
   titles; too much and the grid is a wall of text. Adjust `h-44` and `line-clamp-4` together —
   they must agree, or the clamp cuts before the card ends and the ellipsis floats.
3. **The ellipsis is on the last visible line**, not a hard cut. If the text simply stops, the clamp
   is not applying and the card is just hiding overflow.
4. **A full board of mixed-length notes** has even rows and no ragged edges. This is the visual
   defect the phase exists to fix; look at it.
5. **Drag still works** and does not open a note on drop.
6. **Delete a note** from its card and confirm no dialog appears afterwards.
7. **The calendar looks like this app** — warm, not shadcn's achromatic default, and its popover
   scales from its trigger rather than from the viewport centre.
8. **The calendar inside the dialog** opens, is keyboard-navigable, and closes without taking the
   dialog with it. Two nested Radix focus scopes is the fragile combination.
9. **`prefers-reduced-motion`** — the popover and dialog both collapse their movement.
10. **Reload.** Dates, colours and edits all survive.

---

## Gate 4 — Constitution compliance

- **Principle 1.** Unchanged and still true: the grid reorders on create, delete and pin. **Setting
  a date must not reorder anything** — that is the new way this principle could break.
- **Principle 2, as amended.** A card opens its note; the view is completable from the keyboard
  (T44). **Read the new wording and ask whether anything is left of it.** § Risks says this is the
  last amendment the principle can absorb; if it reads as vacuous now, say so in review rather than
  after the next phase amends it again.
- **Principle 3, NOT amended.** No Save button anywhere (Gate 1's grep, T43). This is the principle
  that constrained the phase, and it is the one to check hardest.
- **Principle 4.** Nothing new on the board surface. The date is on the note, which is content.
- **Principle 5.** T44, T47.
- **The tactile criteria.** Grain and layered shadow unchanged. The tilt is still gone, per P5.

## Merged means

- Gate 1 clean, including both greps.
- T1–T47 pass. `note_editing.test.tsx` is rewritten against the view, not deleted.
- Gate 3's ten checks done in a browser, with check 2's judgement written into the PR.
- Gate 4 walked, including the honest read of principle 2.
- `mission.md`, `roadmap.md`, `tech-stack.md`, `README.md` corrected in the same phase.

## Explicitly not required

- Locale-aware date formatting. `MM/DD/YYYY` is specified literally.
- Sorting or filtering by date. Out of scope, and it would undo P5.
- Testing `react-day-picker` itself. T41 asserts our use of it.
- A visual regression suite for the calendar. Gate 3 check 7 is a human looking at it.
