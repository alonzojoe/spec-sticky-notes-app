# P9 · A quieter card — Validation

The phase's Done-when: *a card carries no controls at all; a pinned card still shows that it is
pinned; pin and delete live in the note's own view; and deleting a note with a title, a body or a
link asks first, while deleting an empty one does not.*

**Gate 3 is run before this phase merges.** P7 and P8 both ran theirs and both found defects the
suite could not; this phase keeps that going.

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free. No new eslint override, no `// eslint-disable` in our own code.

Four greps. The first three pipe through the comment filter P7 established, because each of these
strings appears in a comment *explaining why the thing is absent*.

```
NO_COMMENTS='grep -vE ":[[:space:]]*(\*|//|/\*)"'

grep -rn "NoteControls\|note_controls" src/components/board/ | eval $NO_COMMENTS
```

Empty. Proves **D3** — the controls are off the card, not merely hidden on it.

```
grep -rn "group-hover\|absolute top-1 right-1" src/components/board/note_card.tsx | eval $NO_COMMENTS
```

Empty. The `group` class and the overlay container existed only to reveal the controls. Leaving
them behind would mean the next phase finds a hover-reveal harness with nothing in it and fills it.

```
grep -rn "Save" src/components/layout/*.tsx | eval $NO_COMMENTS
```

Empty. Principle 3 survives a phase that adds a confirmation dialog. **D6** explains why a delete
confirmation is not a Save button; this proves nobody added one while they were in there.

```
grep -rn "P1[0-9]" specs/ --include=*.md --exclude-dir=2026-09-02-p9-a-quieter-card
```

Empty. Proves **D1** — the unbuilt phases have names, not numbers, everywhere rather than only in
`roadmap.md`.

`npm ls` gains no runtime dependency; `alert-dialog` is Radix, already present.

---

## Gate 2 — Automated assertions (Vitest)

T1–T62 come from P0–P8. T63–T68 are new. Baseline **23 suites, 604 assertions**; the phase ends with
more of both.

### T1–T62 · carried forward

T4's `EXEMPT` pin still reads exactly `['components/ui', 'hooks/use-mobile.ts']`. The generated
`alert-dialog.tsx` is covered by `components/ui`; **this phase adds nothing to that list.**

T6 and T10 are the tripwires for group 2 — the generated alert-dialog is the first shadcn markup
this project has taken since the calendar, and the most likely place for an achromatic default.

**T35 is re-pointed, not deleted.** It asserted that the pin and delete controls do not open the
note — a collision that stops existing once they are off the card. What survives is the half worth
keeping: *clicking a card opens the note*. Deleting the test outright would quietly drop that.

### T63 · Pin and delete live in the note view — `note_view.test.tsx`

- Opening a note shows a pin control and a delete control in the dialog.
- Pinning from the view sets `pinned` in storage and **leaves the view open** — it is a property of
  the note like its colour, and P6 established that changing those happens with the view open.
- The control's accessible name is `Pin note` when unpinned and `Unpin note` when pinned, and its
  `aria-pressed` follows. Carried over from P2 rather than re-derived.
- Deleting from the view removes the note **and closes the view**, because the note it was showing
  no longer exists.
- The board behind reflects both immediately.

### T64 · A note with content asks first — `delete_confirmation.test.tsx`

- A note with a body opens an `alertdialog` rather than deleting.
- So does a note with only a title, and a note with only a link. **All three are asserted
  separately**, because `hasContent` is an `||` and a bug in any one arm is invisible from the
  others.
- The alert names the note by its title, and says `this note` when it is untitled.
- **Cancel leaves the note on the board**, and the note view is still open behind it.
- Confirm removes it from storage and closes both dialogs.
- The confirm button reads `Delete`, not `OK`. A destructive confirmation that says OK is a
  confirmation nobody reads.
- **Cancel holds the default focus**, so `Enter` on a dialog you did not read cancels. Asserted
  directly — it is the difference between a guard and a speed bump.
- `Escape` cancels the alert **without closing the note view**. If the key escapes to the outer
  dialog, one press cancels a delete and closes the note, which is two outcomes for one intent.

### T65 · An empty note does not ask

- A note with `title`, `body` and `link` all `''` is deleted immediately, with no alert.
- **A note with a date and a colour but no content still counts as empty.** Every note has both
  whether you chose them or not, so counting them would collapse the rule to "always confirm" —
  this is the assertion that pins **D6**'s rule to the three fields it names.
- A pinned but otherwise empty note also deletes immediately. `pinned` is not content.

### T66 · A pinned card says so — `board.test.tsx`

- A pinned note renders a pin glyph; an unpinned one renders nothing in its place.
- **The glyph is not a control:** it has no `onClick`, is not a `button`, and is not in the tab
  order. Asserted structurally.
- Clicking it opens the note, exactly like clicking anywhere else on the card — it is not a dead
  zone.
- The opener's accessible name contains `Pinned` when the note is pinned, so the state is not
  glyph-only.

### T67 · The card carries no controls

The assertion that makes **D3** a constraint rather than a state of affairs.

- A card contains **no `<button>` except its opener** — asserted by counting, so a control regrown
  in a later phase fails here rather than passing unnoticed.
- No element inside a card carries `aria-label` matching `/pin|delete/i` except through the
  opener's own name.
- Requirements § Risks: tests assert what is present, so without this one nothing stops the card
  regrowing an affordance.

### T68 · The keyboard lost nothing

- A card holds two tab stops — the article and the opener — plus the link chip when there is one.
  Two fewer than before.
- `Enter` on a card still opens the note; the arrow keys still reorder it.
- Pin and delete are both reachable by keyboard inside the view, and both are operable by `Enter`.
- `Escape` in the view still closes and saves.

---

## Gate 3 — Checks no test can make

Seed a board with a mix: some pinned, some empty, some with long titles, at least twenty notes.

1. **Is the board quieter?** Hover across it. Nothing should appear, anywhere. Compare against the
   old behaviour: two controls fading in on every card you pass. Does the board read as paper now,
   or does it read as *missing something*?

2. **Can you tell what is pinned at a glance?** Pin three notes among twenty. Scanning the board,
   is the glyph enough to explain why those three sort first — or does the ordering still look
   arbitrary? **This is the check that decides whether D4 was necessary or merely cautious.**

3. **Does anyone try to click the pin glyph?** It looks like the control it replaced. Click it
   yourself without thinking. Getting the note view is a recoverable failure; check that it does not
   feel like a broken button.

4. **Is deleting still fast enough for a note you regret?** Create a note with `n`, type nothing,
   close it, then delete it. That path skips the confirmation by **D6**'s rule — count the actual
   interactions and decide whether the rule earns its complexity.

5. **Is deleting a real note appropriately slow?** Delete a note with a paragraph in it. Does the
   alert give you enough to identify the note, or would you have to close it and check?

6. **Does the alert look like this app?** Against the create dialog and the note view, in the same
   session. Same backdrop, same radius, same warmth — and a destructive button that reads as
   destructive without being the only saturated thing on screen.

7. **Escape, twice, deliberately.** Open a note, press delete, press Escape. You should be back in
   the note, not on the board. Then Escape again and you should be on the board. One key, two
   distinct outcomes in the right order.

8. **Reduced motion.** Turn it on and open the alert. It should appear without animating, like
   every other dialog in the app.

Still outstanding from P5 and P6, and **not** claimed here: the full reduced-motion pass and the
100+ note drag check. Check 8 above covers only the alert. Both belong to *Polish*.

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| Principle 1 — pinned notes stay above the pile | Unchanged; T66 covers the card showing it |
| Principle 2 — a card is a summary; the note opens to be read | Strengthened: the card now carries nothing but summary |
| Principle 3 — there is no Save button | Gate 1 grep; **D6** on why a delete confirmation is not one |
| Principle 4 — quiet chrome | **D2**'s amendment, and Gate 3 check 1 |
| Principle 5 — keyboard-reachable | T68, and Gate 3 check 7 |
| Warm neutrals, no achromatic literals | T6, T10 against the generated alert-dialog; Gate 3 check 6 |
| `prefers-reduced-motion` | Gate 3 check 8 |
| `snake_case` for files we author | T4, unchanged `EXEMPT` pin |
| Delete confirmation for a note with content | **D6**, T64, T65 — moved here from *Polish* |

---

## Definition of done

- [ ] Gate 1 clean — build, lint, test, and all four greps.
- [ ] Gate 2 — T63–T68 pass; T1–T62 still pass, with T35 re-pointed rather than deleted.
- [ ] Gate 3 — all eight checks run, and **checks 2 and 4 written down**: whether the pinned glyph
      earns its place, and whether the empty-note carve-out earns its complexity.
- [ ] Gate 4 — every row satisfied.
- [ ] `roadmap.md` carries no numbered unbuilt phase.
- [ ] PR opened.
