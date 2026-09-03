# P10 · A view of the pinned — Validation

The phase's Done-when: *the sidebar has two destinations; `Pinned notes` shows the pinned notes and
nothing else; the selection survives a reload; no note's order or pinned flag is written by
navigating; and an empty pinned board says what to do about it.*

**Gate 3 is run before this phase merges.** P7, P8 and P9 all ran theirs and all three found defects
the suite could not; this phase keeps that going.

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free. No new eslint override, no `// eslint-disable` in our own code.

Four greps. The first two pipe through the comment filter P7 established, because each string
appears in a comment *explaining why the thing is absent*.

```
NO_COMMENTS='grep -vE ":[[:space:]]*(\*|//|/\*)"'

grep -rn "dispatch\|useNotesDispatch" src/components/layout/app_sidebar.tsx src/context/section_context.tsx | eval $NO_COMMENTS
```

Empty. Proves **D3** — the sidebar navigates and the section provider remembers; neither writes a
note. A section that dispatched would be a filter that edits the board, which is the one thing
**D1**'s amendment does not licence.

```
grep -rn "section" src/context/notes_reducer.ts src/lib/board_storage.ts | eval $NO_COMMENTS
```

`board_storage.ts` matches `SECTION_KEY` and `parseSection` and nothing else; **`notes_reducer.ts`
matches nothing at all.** The reducer does not know that sections exist, which is what makes "the
board cannot rearrange itself in the pinned view" a structural fact rather than a promise.

```
grep -rn "P1[1-9]" specs/ src/
```

Empty. P9 stopped numbering the unbuilt phases and its grep covered `specs/` only, which is how
`app_sidebar.tsx` kept a comment saying `P10 — the tag list` through a whole phase. This one covers
both trees, and P10 is now a phase that exists.

```
grep -rn "filter" src/components/layout/search_dialog.tsx src/lib/search.ts | eval $NO_COMMENTS
```

No match involving `pinned` or `section`. **D8**: the palette searches every note. A view is not a
permission.

`npm ls` gains no dependency; no new shadcn component. `sidebar.tsx` is byte-identical — T5.

---

## Gate 2 — Automated assertions (Vitest)

T1–T68 come from P0–P9. T69–T75 are new. Baseline **24 suites, 635 assertions**; the phase ends with
more of both.

### T1–T68 · carried forward

T4's `EXEMPT` pin still reads exactly `['components/ui', 'hooks/use-mobile.ts']`; this phase adds
nothing to it. T5 and T9 are untouched — no shadcn component is added or regenerated.

T67 still holds: a card carries exactly two buttons. Adding a section must not add an affordance to
the card, and the pinned view draws the same cards the full board does.

### T69 · The section is stored and read defensively — `section_storage.test.ts`

- `SECTION_KEY` is `'sticky-notes:section'`, distinct from `SIDEBAR_KEY` and `BOARD_KEY`.
- `parseSection('"pinned"')` is `'pinned'`; `parseSection('"notes"')` is `'notes'`.
- **Everything else is `'notes'`** — asserted for unparseable text, `null`, a number, an object, and
  a string that is not one of the two. A corrupt value opens the whole board, which is the failure
  that loses nothing.
- Selecting a section writes it; reloading the shell restores it. **Asserted end to end**, because
  the deserializer being right and the provider being wired are two different things.

### T70 · The sidebar has two destinations — `app_shell.test.tsx`

- Both `Notes` and `Pinned notes` render, as buttons, in the tab order.
- **Exactly one carries `aria-current="page"`**, and it follows the selection. Asserted by counting,
  not by checking the active one: two current pages is a bug a screen reader reports and a test
  otherwise would not.
- `Notes`' badge is every note; `Pinned notes`' badge is the pinned count, **and renders at `0`**.
- Clicking `Pinned notes` moves the current page and does not open, create, or modify a note.

### T71 · The pinned section shows only pinned notes — `board.test.tsx`

- With three pinned notes among eight, the pinned section renders three cards, and they are the
  three pinned ones.
- **Going back to `Notes` renders all eight, in the original order.** Asserted against the ids in
  order, because "the arrangement you left" is the whole of **D1**.
- **Nothing is written.** Stored `order` and `pinned` are byte-identical before and after a round
  trip through the pinned section — the assertion that makes **D3** a constraint rather than a
  description.
- Switching sections **does not open a note**. The board's `fresh` effect keys on unseen ids, and
  filtering changes what is drawn rather than what is in `notes`; if that ever inverts, switching to
  `Pinned notes` would pop open the first pinned note.
- Unpinning from the note view while the pinned section is selected removes the card from the board
  behind and **leaves the view open** (**D8**). P9 decided a property change does not close a note
  you are reading, and that does not stop being true because the board stopped drawing its card.

### T72 · Search ignores the section — `search_dialog.test.tsx`

- With `Pinned notes` selected, searching for an **unpinned** note finds it and opens it.
- The section does not change when it opens. The palette finds notes; it does not navigate.
- The board behind still draws only the pinned ones.

This is the assertion against a plausible future mistake: filtering the results by the current
section would look like a fix and would be wrong.

### T73 · Creating a note returns you to `Notes` — `app_shell.test.tsx`

- With `Pinned notes` selected, the toolbar's `New note` button switches the section to `Notes`.
- So does the `n` shortcut. **Both are asserted**, because they are one code path today and two
  entry points a reader will look for separately.
- The switch happens **when the dialog opens**, not when the note is created (**D6**) — asserted by
  checking the section before anything is submitted.
- The created note is on the board that is drawn, which is the point of the whole decision.

### T74 · An empty pinned board says what to do — `board.test.tsx`

- Zero pinned notes, pinned section: the copy renders, naming pinning in the note's own view as the
  way out.
- One pinned note: the copy is gone and the card is drawn.
- **An empty *full* board renders no copy** (**D7**). The general empty state belongs to *Polish*,
  and this assertion is what stops this phase quietly becoming it.

### T75 · The keyboard lost nothing and gained two stops

- The two sidebar items are reachable by `Tab` and operable by `Enter`.
- Inside the pinned section, the arrow keys still reorder a focused card, and the swap is the same
  swap the full board would have made — asserted by reading the stored `order` from both sections.
- `n`, `⌘K`, `Enter` to open and `Escape` to close all behave as they did in P9.

---

## Gate 3 — Checks no test can make

Seed a board with at least twenty notes, three or four pinned, several long titles, one with a link.

1. **Does the pinned view show you something you did not already have?** Compare it against the top
   of the full board, which is the same notes in the same order. **This is the check that decides
   whether D4 was necessary or merely a different way of looking at the same rows.**

2. **Come back cold.** Select `Pinned notes`, close the tab, and reopen it tomorrow — or with a hard
   reload and a mind deliberately elsewhere. Does the board read as *filtered*, or as *missing
   seventeen notes*? **If it reads as missing, D5 is wrong and the fallback is one line.**

3. **Is the active destination obvious?** With the sidebar expanded, and again collapsed to the
   rail, where only the icons and their tooltips are left.

4. **Click `Pinned notes` with nothing pinned.** Does the copy explain the section, or does it read
   as an error? Then pin something from a note's view and come back.

5. **Switch sections repeatedly.** The grid reflows instantly, with no motion. Does that read as
   fast, or as broken? § Risks says the animation is *Polish*'s; this check is whether that deferral
   holds.

6. **Create a note from the pinned section.** Press `n`. You should be on `Notes`, with the new note
   in the first slot and its view open. Then cancel one, and check that landing on `Notes` rather
   than back on `Pinned notes` is acceptable rather than merely explainable.

7. **Unpin the last pinned note from inside its own view, in the pinned section.** The card leaves
   the board behind, the note stays open, and closing it leaves you on the empty pinned view. Three
   things happening in the right order, none of them a surprise.

8. **Search for an unpinned note while the pinned section is selected.** It opens. Closing it leaves
   you where you were.

9. **Reduced motion.** Turn it on and switch sections and open a note. Nothing about this phase
   animates, so the only thing to confirm is that nothing new appeared that does.

### Answers — run 2026-09-03

*To be written when the check is run. Checks 1, 2 and 5 must be written down whatever they say —
whether the pinned view earns its place, whether the persisted section reads as filtered or as lost,
and whether the instant reflow reads as fast or as broken.*

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| The one-sentence test — the board is as I left it | T71's order assertion; **D1** |
| Principle 1 — nothing else reorders the board | Gate 1's reducer grep; **D3**; the amended sentence |
| Principle 2 — a card is a summary; the note opens to be read | Unchanged; the pinned view draws the same cards |
| Principle 3 — no Save button, state restored on reload | T69; the section is stored like every other value |
| Principle 4 — quiet chrome, controls in the sidebar | **D2** — the section is chrome and it is in the sidebar |
| Principle 5 — keyboard-reachable | T75, Gate 3 check 3 |
| Search never filters the board | Gate 1's search grep, T72 |
| Warm neutrals, no achromatic literals | T6, T10 against the empty-state copy |
| `prefers-reduced-motion` | Gate 3 check 9 — nothing new animates |
| `snake_case` for files we author | T4, unchanged `EXEMPT` pin |
| Defensive read of stored values | T69 — anything but `'pinned'` is `'notes'` |

---

## Definition of done

- [ ] Gate 1 clean — build, lint, test, and all four greps.
- [ ] Gate 2 — T69–T75 pass; T1–T68 still pass, T67 included.
- [ ] Gate 3 — all nine checks run, and **checks 1, 2 and 5 written down**.
- [ ] Gate 4 — every row satisfied.
- [ ] `roadmap.md` carries P10 and no numbered unbuilt phase.
- [ ] PR opened.
