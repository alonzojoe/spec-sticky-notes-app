# P12 · The notes that point somewhere — Validation

The phase's Done-when: *the sidebar has three destinations; `/linked` shows the notes carrying a
link and nothing else; what a section **is** lives in one list; and navigating still writes nothing.*

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, chunk warning included.

Three greps. The first pipes through the comment filter P7 established, because the string appears
in comments explaining why the thing is absent.

```
NO_COMMENTS='grep -vE ":[[:space:]]*(\*|//|/\*)"'

grep -rn "'pinned'\|'linked'\|\.pinned\b" src/components/board/board.tsx src/components/layout/app_sidebar.tsx | eval $NO_COMMENTS
```

Empty. **D3**: the board and the sidebar name no section. They know there *is* one; `lib/sections.ts`
knows what it means. This is the grep that would fail if the third section had been added by
copying the second.

```
grep -rn "dispatch\|useNotesDispatch" src/lib/sections.ts | eval $NO_COMMENTS
```

Empty. A section is a question about a note, never a change to one.

```
grep -rn "link" src/lib/sections.ts | eval $NO_COMMENTS
```

One match: `note.link !== ''`. **D6** — no parse, no second definition of what a URL is. `links.ts`
remains the only judge, and the section therefore cannot disagree with the chip on the card.

`npm ls` gains nothing, runtime or dev. `EXEMPT` is untouched: this phase generates no file.

---

## Gate 2 — Automated assertions (Vitest)

T1–T75 come from P0–P11. T76–T77 are new. Baseline **25 suites, 688 assertions**; the phase ends
with more of both.

**Group 1's assertion count must not move.** The registry replaces two sections' worth of
expressions with a list, and if the suite notices, the refactor changed behaviour.

### T76 · The registry is what a section is — `sections.test.tsx`

- **Every predicate is asserted directly**, against a note that satisfies it and one that does not:
  `notes` keeps everything, `pinned` keeps `pinned`, `linked` keeps a note whose `link` is not `''`.
  § Risks — `keep` is one expression and nothing type-checks that it names the right field.
- `linked` keeps a note with a link **and no title and no body**, and rejects one with a title and a
  body and no link. The field, not the note's substance.
- The sidebar renders one row per registry entry, in order, with each label — so a row added to the
  list appears in the sidebar without the sidebar being edited.
- Each badge is that row's own count: an eight-note board with three pinned and two linked badges
  `8`, `3`, `2`.
- `sectionAt('/')` is `Notes` — two routes render one page, and marking nothing current at `/` is
  the state P10's T70 exists to catch.
- **`Notes` carries no empty copy**, and the other two do. An empty whole board is still bare cork;
  `empty_state.tsx` belongs to *Polish*.

### T77 · The linked section — `sections.test.tsx`

- `/linked` draws only the notes carrying a link, in the board's order.
- A **pinned note with a link is in both sections**, and in `Notes`. Sections are questions about a
  note, not folders it lives in.
- An empty linked section says *No linked notes* and names the way out; one with a note in it does
  not.
- Navigating to `/linked` and back **writes nothing** — every `order`, `pinned` and `updatedAt`
  identical, the assertion P10 wrote for the second section, extended to the third.
- Search from `/linked` still opens a note the section does not draw.
- Creating a note from `/linked` returns to the whole board: a new note has no link either.

**The swap assertion is written for what is true.** The pinned section is a *prefix* of the board
and the linked section is not — a linked note sorts nowhere in particular, so two cards adjacent in
`/linked` can have unlinked notes between them in `/notes`. An arrow-key swap there swaps **those
two notes and moves nothing else**, which is what dragging has always done. Asserting "the same
swap the whole board would have made" would be asserting something false.

---

## Gate 3 — Checks no test can make

Seed a board with at least twelve notes: some pinned, some linked, at least one both, at least one
neither.

1. **Is three rows still a sidebar?** Look at it collapsed to the rail and expanded. Four would be a
   menu; this check is whether three is already one. **Written down whatever it says** — the
   registry makes rows cheap, and this is the only thing standing between cheap and a menu.

2. **Does `Linked notes` mean what it says?** Click it cold. Are the notes on screen the ones you
   would have called "the notes with links", or is the answer surprising in either direction?

3. **Is a note in two sections confusing?** Pin a linked note. It is in three rows at once. Does
   that read as obvious, or does it read as a note that has been filed twice?

4. **Reorder inside `/linked`.** Swap two cards with the arrow keys, then go to `/notes` and find
   them. They swapped and nothing else moved — but they were not neighbours there. Does that feel
   like the drag you already know, or like the board moved behind your back? **Written down** —
   § Risks names this as the thing P10's reasoning does not cover.

5. **Empty both new sections.** Unlink everything, unpin everything, and visit all three rows. Two
   say something useful; the whole board says nothing at all. Is that inconsistency defensible on
   screen, or only on paper?

6. **The link chip still works from the section**, opens in a new tab, and does not open the note
   behind it.

### Answers — run 2026-09-03

*To be written when the check is run. Checks 1 and 4 must be written down whatever they say —
whether three rows is still a sidebar, and whether a swap inside a non-contiguous section reads
right.*

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| The one-sentence test — the board is as I left it | T77's write assertion |
| Principle 1 — nothing else reorders the board | Gate 1's `dispatch` grep; the registry holds predicates only |
| Principle 2 — a card is a summary | Unchanged; the section draws the same cards |
| Principle 3 — no Save button, state restored on reload | Unchanged; no new key, the URL is still the section |
| Principle 4 — quiet chrome | **Not amended.** Nothing is added to a card |
| Principle 5 — keyboard-reachable | The third destination is an anchor; arrow reorder asserted |
| Link handling has one judge | Gate 1's `link` grep — `links.ts`, via the field |
| `snake_case` for files we author | T4, `EXEMPT` untouched |

---

## Definition of done

- [ ] Gate 1 clean — build, lint, test, and all three greps.
- [ ] Gate 2 — T76–T77 pass; T1–T75 still pass, and group 1's commit moved no count.
- [ ] Gate 3 — six checks run, and **checks 1 and 4 written down**.
- [ ] Gate 4 — every row satisfied.
- [ ] Adding a fourth section costs one registry entry, one route file and one page — and nothing
      in `board.tsx` or `app_sidebar.tsx`.
- [ ] PR opened.
