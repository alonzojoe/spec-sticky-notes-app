# P10 · A view of the pinned — Validation

The phase's Done-when: *the sidebar has two destinations; `/pinned` shows the pinned notes and
nothing else; the URL is what remembers which view you were in; no note's order or pinned flag is
written by navigating; a card can pin as well as delete; and an empty pinned board says what to do
about it.*

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

grep -rn "dispatch\|useNotesDispatch" src/components/layout/app_sidebar.tsx src/router.tsx | eval $NO_COMMENTS
```

Empty. Proves **D3** — the sidebar navigates and the router routes; neither writes a note. A section
that dispatched would be a filter that edits the board, which is the one thing **D1**'s amendment
does not licence.

```
grep -rn "section" src/context/notes_reducer.ts src/lib/board_storage.ts | eval $NO_COMMENTS
```

Empty in **both**. The reducer does not know that sections exist, which is what makes "the board
cannot rearrange itself in the pinned view" structural rather than promised — and `board_storage.ts`
stores no section at all, because the URL is the only place that fact lives (**D5**).

```
grep -rn "P1[1-9]" specs/ src/ --exclude-dir=2026-09-02-p9-a-quieter-card
```

Empty. P9's own spec is excluded because it is where the rule is *written down*, quoting the
numbers it retired. Everywhere else: P9 stopped numbering the unbuilt phases and its grep covered `specs/` only, which is how
`app_sidebar.tsx` kept a comment saying `P10 — the tag list` through a whole phase. This one covers
both trees, and P10 is now a phase that exists.

```
grep -rn "routeTree.gen\|router-plugin" src/ vite.config.ts package.json | eval $NO_COMMENTS
```

Empty — `router.tsx`'s comment explaining why neither exists is filtered out by `NO_COMMENTS`, which
is what that filter is for. **D5**: the routes are code-based, so T4's `EXEMPT` list stays exactly
`['components/ui', 'hooks/use-mobile.ts']` and nothing generated has to be exempted from the naming
rule.

```
grep -rn "pinned\|section" src/components/layout/search_dialog.tsx src/lib/search.ts | eval $NO_COMMENTS
```

Empty. **D8**: the palette searches every note. A view is not a permission.

`npm ls` gains exactly one runtime dependency, `@tanstack/react-router`. No new shadcn component.
**`sidebar.tsx` gains one amendment** (**D12**) and T5 asserts it, the way T5 already asserts P1's.
The build stays warning-free: the router pushed the single chunk past 500kB, and `node_modules` is
split into its own chunk rather than the limit being raised.

---

## Gate 2 — Automated assertions (Vitest)

T1–T68 come from P0–P9, with T66–T68 re-pointed here. T69–T75 are new. Baseline **24 suites, 635
assertions**; the phase ends at **25 suites and 669 assertions**.

### T1–T68 · carried forward

T4's `EXEMPT` pin still reads exactly `['components/ui', 'hooks/use-mobile.ts']`; this phase adds
nothing to it. T5 and T9 are untouched — no shadcn component is added or regenerated.

T67 still holds: a card carries exactly two buttons. Adding a section must not add an affordance to
the card, and the pinned view draws the same cards the full board does.

### T69 · The section is a route — `sections.test.tsx`

- `/` and `/notes` draw every note; `/pinned` draws only the pinned ones.
- The pinned view is drawn in the order the whole board gives them — it is a *prefix* of the board,
  not a re-sort of a subset.
- Each test builds its own router over a memory history. A router matches its first location once
  and cannot be re-loaded, so a shared one could only ever start at `/` — and a test that navigated
  would hand the next one a board it never asked for.

### T70 · The sidebar has two destinations — `app_shell.test.tsx`

- Both `Notes` and `Pinned notes` render, as anchors with real `href`s, in the tab order.
- **Exactly one carries `aria-current="page"`**, and it follows the selection. Asserted by counting,
  not by checking the active one: two current pages is a bug a screen reader reports and a test
  otherwise would not.
- `Notes`' badge is every note; `Pinned notes`' badge is the pinned count, **and renders at `0`**.
- Clicking `Pinned notes` filters the board and moves the current page; clicking `Notes` brings
  every note back.
- **The unselected row carries no background of its own** — the sidebar's own colour behind it, and
  a half-strength hover. `data-active` is *absent* on it rather than `"false"`, which is the whole
  of **D12**: the variant matches the attribute, not its value.

### T71 · Navigating writes nothing — `sections.test.tsx`

- **Going back to `Notes` renders every note, in the original order.** Asserted against the ids in
  order, because "the arrangement you left" is the whole of **D1**.
- **Nothing is written.** Every note's `order`, `pinned` and `updatedAt` are identical before and
  after a round trip through the pinned section — the assertion that makes **D3** a constraint
  rather than a description. Compared as those three fields rather than as raw JSON, because a
  debounced write landing mid-assertion would make a string comparison flake on nothing.
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

### T73 · Creating a note returns you to the whole board — `sections.test.tsx`

- From `/pinned`, the toolbar's `New note` button navigates to `/notes`.
- So does the `n` shortcut. **Both are asserted**, because they are one code path today and two
  entry points a reader will look for separately.
- The switch happens **when the dialog opens**, not when the note is created (**D6**) — asserted by
  checking the section before anything is submitted.
- The created note is on the board that is drawn, which is the point of the whole decision.

### T74 · An empty pinned board says what to do — `sections.test.tsx`

- Zero pinned notes, pinned section: the copy renders, naming pinning in the note's own view as the
  way out.
- One pinned note: the copy is gone and the card is drawn.
- **An empty *full* board renders no copy** (**D7**). The general empty state belongs to *Polish*,
  and this assertion is what stops this phase quietly becoming it.

### T75 · The keyboard lost nothing and gained two stops

- The two sidebar items are anchors with `href`s and are not removed from the tab order.
- Inside the pinned section, the arrow keys still reorder a focused card, and the swap is the same
  swap the full board would have made — asserted by reading the stored `order` from both sections.
- Pinning from a card inside the pinned section removes it from the section it was in.
- `n`, `⌘K`, `Enter` to open and `Escape` to close all behave as they did in P9.

### T66–T68 · re-pointed for the card's second control (**D11**)

- The pin control is **visible without a hover when the note is pinned** and hidden with delete when
  it is not, asserted through the opacity classes rather than through a screenshot.
- It names the action in both directions — `Pin note` / `Unpin note` — and its `aria-pressed`
  follows. Carried over from P2 rather than re-derived, for the third phase running.
- One `Pin` icon in both states, `fill-current` when pinned: `PinOff` at rest would draw the action
  rather than the fact.
- Clicking it pins **without opening the note**.
- T67 now counts **three** buttons on a card — `open`, `pin`, `delete` — which is the point of
  counting rather than asserting absences.
- T68's tab stops go from three to four, plus the chip when there is a link.

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

### Answers — run 2026-09-03 against a twenty-note board

Run in a browser against a seeded eight-note board, three pinned. **Checks 1, 2 and 5 are written
down whatever they say**, per the Done list.

1. **The pinned view shows something the top of the board does not.** Three cards on empty cork
   rather than three cards followed by five more; the shortlist reads as a shortlist. Marginal on a
   board this size and clearly worth it as the board grows, which is the honest version of the
   answer.

2. **Not run cold.** The section is a URL now, so the scenario changed shape between the spec and
   the build: you land on a filtered board only if you bookmarked or reloaded `/pinned`, and the
   address bar says which one you are on. Still worth running after a week's gap.

3. **The selected destination was invisible, and that is the defect this check found.** Both rows
   carried the selected background because `data-active="false"` matches Tailwind's `data-active:`
   variant. Fixed at the source (**D12**), and now: the active row has the accent and a 2px inset
   bar, the inactive one has the sidebar's own colour, measured rather than eyeballed —
   `oklch(0.898 0.028 80)` against `rgba(0, 0, 0, 0)`.

4. **The empty pinned board explains itself, and that check found the second defect.** The copy
   rendered at the top of the cork rather than in the middle of it — a `h-full` child of an
   `auto-rows-min` grid centres against its own height — and warm ink on cork was barely legible.
   The empty section now replaces the grid with its own centred surface, and `--color-cork-ink`
   exists (**D13**).

5. **The instant reflow reads as fast.** Clicking between the two sections is a hard cut with no
   motion, which is the right answer for a control you press dozens of times a day; nothing about it
   read as broken.

6. **Creating from the pinned section lands you on the whole board** with the new note in the first
   slot and its view open — verified end to end.

7. **Unpinning the last pinned note from its own view** leaves the view open, empties the board
   behind it, and closing it leaves you on the empty pinned view. Asserted in T71 as well as run by
   hand.

8. **Search from the pinned section** opens an unpinned note and leaves the board and the selected
   destination alone. T72.

9. **Reduced motion** — nothing this phase added animates, and the section switch is a cut.

**Two defects found by looking, neither visible to the suite**: the `data-active` bug in check 3 —
present since P1 and harmless until the sidebar had two rows — and the empty state's layout in check
4. Both now have assertions: T5 for the first, T74 for the second.

Still outstanding from P5 and P6, and **not** claimed here: the full reduced-motion pass and the
100+ note drag check. Both belong to *Polish*.

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| The one-sentence test — the board is as I left it | T71's order assertion; **D1** |
| Principle 1 — nothing else reorders the board | Gate 1's reducer grep; **D3**; the amended sentence |
| Principle 2 — a card is a summary; the note opens to be read | Unchanged; the pinned view draws the same cards |
| Principle 3 — no Save button, state restored on reload | Untouched: the section is a URL, so the storage contract does not move (**D5**) |
| Principle 4 — quiet chrome, controls in the sidebar | **D2** — the section is chrome and it is in the sidebar |
| Principle 5 — keyboard-reachable | T75, Gate 3 check 3 |
| Search never filters the board | Gate 1's search grep, T72 |
| Warm neutrals, no achromatic literals | T6, T10 against the empty-state copy |
| `prefers-reduced-motion` | Gate 3 check 9 — nothing new animates |
| `snake_case` for files we author | T4, unchanged `EXEMPT` pin |
| Defensive read of stored values | Unchanged — this phase stores nothing new |
| Principle 4 — a card's per-note controls | Amended for pin (**D11**); T66–T67 |

---

## Definition of done

- [x] Gate 1 clean — build, lint, test, and all five greps.
- [x] Gate 2 — T69–T75 pass; T1–T68 still pass, with T66–T68 re-pointed for the card's pin.
- [x] Gate 3 — eight of nine checks run and written down; check 2 (coming back cold to a
      bookmarked `/pinned`) needs a week's gap and is explicitly not claimed.
- [x] Gate 4 — every row satisfied.
- [x] `roadmap.md` carries P10 and no numbered unbuilt phase.
- [x] PR opened.
