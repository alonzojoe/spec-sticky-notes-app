# P8 · Find things — Validation

The phase's Done-when: *a trigger beside the sidebar toggle shows this platform's own shortcut, `⌘K`
or `Ctrl+K` opens a dialog over the same blurred backdrop the create dialog uses, typing lists the
notes whose title or body matches, `↑↓` and `Enter` open one — and the board is byte-identical
before, during and after.*

Almost all of it is assertable. What is not is whether the palette feels instant and whether the
roving selection actually works in a screen reader, which is Gate 3.

**Gate 3 is run before this phase merges.** P5 and P6 both merged with theirs unrun; P7 broke that
habit and this phase keeps it broken.

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free. No new eslint override, no `// eslint-disable` in our own code.

Four greps. The first three pipe through a comment filter, for the reason P7 recorded: each of these
strings appears in a comment *explaining why the thing is absent*, and a gate that fails on its own
rationale teaches the next phase to delete the rationale.

```
NO_COMMENTS='grep -vE ":[[:space:]]*(\*|//|/\*)"'

grep -rn "cmdk\|ui/command" src/ package.json | eval $NO_COMMENTS
```

Empty. **D5** names `cmdk` and rejects it. The roving list is ours, in this repo, where **D6** can
test it.

```
grep -rn "navigator.platform" src/ | eval $NO_COMMENTS
```

Empty. It is deprecated, and **D2** specifies `userAgentData` with a user-agent fallback.

```
grep -rn "new RegExp" src/lib/search.ts | eval $NO_COMMENTS
```

Empty. A `RegExp` built from the query throws on `(`, and this input is typed one character at a
time. **D3** lowercases both sides and calls `includes`.

```
grep -rln "P8 · Markdown\|P9 · Dark mode\|*Markdown and checkboxes* · Polish\|P8 · Find things (search + tags)" specs/ \
  --exclude-dir=2026-09-02-p8-find-things
```

Empty. Proves **D1**'s renumber landed everywhere rather than only in `roadmap.md`. This phase's own
directory is excluded because it quotes the old headings in order to search for them.

`npm ls` adds no dependency this phase.

---

## Gate 2 — Automated assertions (Vitest)

T1–T55 come from P0–P7 and all of them still pass. T56–T62 are new. The baseline is **21 suites,
517 assertions**; the phase must end with more of both and fewer of neither.

### T1–T55 · carried forward

T4's `EXEMPT` pin still reads exactly `['components/ui', 'hooks/use-mobile.ts']`. Every file this
phase authors is ours and is `snake_case`; **nothing is added to that list.**

**Group 4's gate is this whole set, unchanged at 517.** Moving `openId` out of `board.tsx` touches
the file that owns the drag, the grid and the fresh-note effect, and it ships as its own commit
against an untouched assertion count so a regression is attributable to the move.

T19's frozen-state check and T35's propagation checks are the tripwires there.

### T56 · The platform is detected, and the label follows it — `platform.test.ts`

- `modifierLabel()` is `'⌘'` when `userAgentData.platform` is `'macOS'`.
- It is `'Ctrl'` when it is `'Windows'`, `'Linux'`, or an empty string.
- With no `userAgentData` at all, a user agent containing `Macintosh` still yields `'⌘'`, and one
  containing `Windows NT` yields `'Ctrl'`. **The fallback is the path most browsers actually take.**
- `navigator.platform` is never read — asserted by defining it as a throwing getter and calling both
  functions. A deprecated API is easy to reach for by habit, and this fails loudly if anyone does.
- Both functions read the environment **at call time**: changing the stub between two calls changes
  the answer, with no module reset.

### T57 · The matcher matches, ranks and excerpts — `search.test.ts`

- A query matching a title returns that note with `field: 'title'`.
- A query matching only the body returns it with `field: 'body'`.
- **Case-insensitive both ways:** `STANDUP` finds `standup` and vice versa.
- **A title hit ranks above a body hit** even when the body-matching note is earlier on the board.
  This is the assertion that earns **D3**'s ranking rule.
- Within a band, board order is preserved — the same descending `order` the grid sorts by, so the
  list and the board agree on what "first" means.
- **No note appears twice**, even when the query matches both its title and its body.
- `''`, `'   '` and `'\n'` all return `[]` — not everything.
- **A query of `(` returns `[]` rather than throwing.** A regex built from user input is the failure
  this forbids, and it is one keystroke away in a live search field.
- The excerpt is a window around the hit, not the head of the body: a match 400 characters in
  produces an excerpt containing the match, prefixed `…`.
- A note with an empty title never matches on title; one with an empty body never matches on body.

### T58 · The trigger says what this platform presses — `app_shell.test.tsx`

- The toolbar renders a **button**, not an input. Asserted by tag name, because **D4** turns on it:
  an input in a toolbar that does not accept typing is a lie the first time someone types into it.
- Its `<kbd>` reads `⌘K` on a stubbed Mac and `Ctrl+K` on a stubbed PC.
- It carries `aria-keyshortcuts` naming both `Meta+K` and `Control+K`.
- Clicking it opens the dialog.
- The sidebar toggle and the New note button are both still in the toolbar after the extraction, in
  that order.

### T59 · The shortcut opens it, on either modifier — `search_dialog.test.tsx`

- `Meta+K` opens the palette. `Control+K` opens the palette. **On the same stubbed platform, both.**
  **This is the assertion that makes D2's detection cosmetic:** a wrong badge must not cost the
  shortcut.
- The event is `preventDefault`ed, or Firefox takes it for its own search bar.
- `k` alone does nothing. `Alt+K` does nothing.
- Unlike `n`, the combination is **not** suppressed while a note's textarea has focus — a modified
  key cannot be mistaken for typing. Asserted directly, because it is the one place the two global
  shortcuts deliberately differ.
- `n` still opens the create dialog, and is still inert inside the palette's own input.

### T60 · Typing finds notes, and the list is the matcher's — `search_dialog.test.tsx`

- Typing a query renders one row per hit, in the matcher's order.
- Each row shows the note's title. **An untitled note leads with its excerpt instead** — it has no
  name, so its text is the closest thing it has to one, and `Untitled note` named nothing while
  demoting the only distinguishing text to the caption. `Empty note` is the fallback when there is
  no text either, matching the card's own language. Gate 3 check 3 is where this was found.
- The footer offers the movement hints only when there are rows to move through.
- An empty query shows the prompt and no rows.
- A query with no matches says so and names the query.
- The result count in the footer agrees with the number of rows.

### T61 · The keyboard drives the list without losing the caret

- `↓` moves the selection down, `↑` up, and both wrap at the ends.
- **`aria-activedescendant` on the input always names the selected row's id.** This is the
  correctness assertion for the roving pattern, not decoration.
- **DOM focus stays on the input through every arrow press.** Asserted after arrowing, because this
  is the half of the pattern that is easy to get wrong and invisible until someone types after
  pressing `↓`.
- `Enter` opens the selected note's view and closes the palette.
- `Escape` closes it and opens nothing.
- Typing after arrowing resets the selection to the first row — the list changed underneath it.

### T62 · The board does not move, dim, or reorder

The phase's central claim, and the one **D5** trades the roadmap's original wording for.

- Every note's `order` is identical before opening the palette, while a query is typed, and after
  it closes. **Read from `localStorage`, not from the DOM**, so a re-render cannot mask a write.
- The same number of cards is rendered throughout — nothing is filtered out of the board.
- No card gains a dimming class while the palette is open.
- Opening a result and closing the note view leaves the stored board byte-identical apart from that
  note's `updatedAt` — the note view's own autosave, not the search's doing.

---

## Gate 3 — Checks no test can make

Seed a board with at least thirty notes, several sharing a common word, some untitled, some with
long bodies where the match is far from the start.

1. **Does it feel instant?** Type a word and watch. The matcher runs on every keystroke over the
   whole array — at thirty notes that is nothing, but the point is whether it *reads* as instant,
   including the dialog's own open animation. If the animation makes the first keystroke feel
   swallowed, the animation is wrong, not the matcher.

2. **Does the roving selection work in a screen reader?** VoiceOver on macOS: open the palette, type,
   press `↓`. The selected row should be announced without focus leaving the field. This is the
   check the automated assertions can only approximate.

3. **Is the excerpt actually useful?** Find a note by a word that appears late in a long body. Does
   the excerpt show you enough to know it is the right note, or does it show a fragment that could
   be any note?

4. **Is a result row distinguishable from a card?** Requirements § Risks calls this out. Open the
   palette over the board. Do the rows read as an index into the board, or as a second, worse board?

5. **Does the backdrop match the create dialog exactly?** Open both in turn. Same blur, same tint,
   same timing — they use the same component, so any difference is a bug worth finding.

6. **What does it look like with one note, and with none?** A board with nothing on it should still
   give the palette something sensible to say.

7. **The trigger below `sm`.** Narrow the window until the label and badge drop. Is the remaining
   magnifier still an obvious target, and does the New note button still fit beside it?

### Answers — run 2026-09-02 against a thirty-note board

Seeded thirty notes across all six papers: a quarter untitled, a fifth carrying a long body where
the match sits ~230 characters in, a sixth carrying a Meet link, and ten words shared across them
so a common query returns several hits.

1. **Does it feel instant? Yes.** The 120ms debounce is below the threshold where a delay reads as
   lag — the list is there within the same glance as the keystroke. The debounce is not protecting
   the matcher, which is `includes` over thirty strings; it is protecting the list from building a
   wide intermediate result on the way to a narrow one.

2. **Roving selection, measured in the browser rather than in jsdom.** After `ArrowDown`:
   `document.activeElement` is still the input, `aria-activedescendant` reads `search-result-1`,
   and the second row carries `aria-selected="true"`. That is the pattern working, and it is the
   half that is invisible until someone types after arrowing.

3. **The excerpt is useful, and it exposed a real defect.** Windowing around the match works — a
   note matched 230 characters in shows `…we care about here is merge.` rather than its opening
   sentence. But three untitled hits rendered as **three identical rows reading `Untitled note`**,
   with the only distinguishing text demoted to the quiet caption underneath. Fixed: an untitled
   row now leads with its excerpt, because a note with no title has no name and the text is the
   closest thing it has to one. `Empty note` is the fallback when there is no text either, matching
   the card's own language.

4. **A row is not a card.** No paper, no shadow, no date, no grain — a colour dot, a line of title
   and a line of excerpt. It reads as an index entry into the board, which was the risk
   requirements § Risks named.

5. **The backdrop is identical**, and provably so rather than by eye: the overlay's computed
   `backdrop-filter` is `blur(4px)` and it is the same `dialog.tsx` node the create dialog renders.

6. **An empty board says something sensible** — the prompt, `0 notes`, and `No notes match "…"`
   naming the query. `Enter` with no results does nothing and opens no view. **This check found a
   second defect:** the footer offered `↑↓ to move · ↵ to open` to a board with nothing to move
   through. The movement hints are now rendered only when there are rows.

7. **The trigger below `sm`, measured at a 566px viewport:** it collapses to 32×32, the label and
   the badge compute to `display: none`, the magnifier remains, and `aria-label` still reads
   `Search notes (⌘K)` — so the name survives at every width. The New note button still fits beside
   it.

No console errors on load, on search, or on opening a result.

**One thing the seed could not answer:** two untitled notes whose bodies are identical around the
match still render as identical rows. That is a property of the seed rather than of the palette —
real notes differ — but it is the shape of the problem a future ranking change would have to solve.

Not claimed by this phase, and still outstanding from P5 and P6: the `prefers-reduced-motion` pass
and the 100+ note drag check. Both belong to ***Polish*** after **D1** and neither is touched here.

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| Principle 1 — nothing reorders but create, delete, pin | T62, from storage rather than from the DOM |
| Principle 2 — a card is a summary; the note opens to be read | Unchanged. A result row opens the same note view a card does |
| Principle 3 — there is no Save button | Untouched; the palette stores nothing |
| Principle 4 — quiet chrome, the interface is the notes | The trigger is in the toolbar, never on the board. Gate 3 check 4 |
| Principle 5 — keyboard-reachable | T59, T61, and Gate 3 check 2 |
| Warm neutrals, no achromatic literals | T6, T10 carried forward; the `<kbd>` uses ink and border tokens |
| No network request | The search is over an array already in memory |
| No backend, no index | § Out of scope |
| `snake_case` for files we author | T4, unchanged `EXEMPT` pin |
| Core scope names what ships | **D1**'s two bullets, added in group 1 |

---

## Definition of done

- [ ] Gate 1 clean — build, lint, test, and all four greps.
- [ ] Gate 2 — T56–T62 pass; T1–T55 still pass; more than 21 suites and more than 517 assertions.
- [ ] Group 4 landed as its own commit against an unchanged 517.
- [ ] Gate 3 — all seven checks run, and **checks 2 and 3 written down**.
- [ ] Gate 4 — every row satisfied.
- [ ] `roadmap.md`, `mission.md`, `tech-stack.md` and `README.md` all describe the app that exists.
- [ ] PR opened against `main`.
