# P7 · A note that says what it is — Validation

The phase's Done-when: *a note can carry a one-line title and one URL; the card shows the title under
the date and the link as a chip that opens in a new tab; every card is the same height with its body
clamped to the lines the title and the link left it; and a board saved before this phase opens with
every note intact.*

Almost all of that is assertable. The part that is not is the same part P6 could not assert and did
not run — whether the card shows the right amount of note. Gate 3 check 1 is that judgement, made in
front of a real board, and **it discharges P6's outstanding check rather than adding a third one to
the pile.**

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free. No new eslint override, no `// eslint-disable` in our own code.

Four greps.

```
grep -rn "Save" src/components/layout/*.tsx
```

Empty. Proves principle 3 survived a phase that added two more fields to autosave.

```
grep -rn "line-clamp-\${\|bg-paper-\${\|h-\${" src/
```

Empty. An interpolated Tailwind class emits nothing and fails silently; this is the third phase to
guard it.

```
grep -rn "javascript:" src/lib/links.ts
```

Empty. **D4** allowlists `http:` and `https:`. A denylist mentioning `javascript:` by name would mean
the allowlist was not the mechanism, and a denylist loses to `JavaScript:` and to the next scheme
nobody thought of.

```
grep -rln "P7 · Find things\|P8 · Markdown\|P9 · Dark mode\|P10 · Polish" specs/ \
  --exclude-dir=2026-09-02-p7-a-note-that-says-what-it-is
```

Empty. Proves **D1**'s renumber landed everywhere rather than only in `roadmap.md`. This file is
excluded because it quotes the old headings in order to search for them, and would otherwise
always match itself.

`npm ls` adds no dependency this phase.

---

## Gate 2 — Automated assertions (Vitest)

T1–T47 come from P0–P6 and all of them still pass. T48–T55 are new. The baseline this phase starts
from is **19 suites, 447 assertions**; it must end with more of both and fewer of neither.

### T1–T47 · carried forward

T4's `EXEMPT` pin still reads exactly `['components/ui', 'hooks/use-mobile.ts']`. `links.ts` and
`note_fields.tsx` are ours and are `snake_case`; **this phase adds nothing to that list.**

T19's frozen-state check is the tripwire for group 3. Two new reducer actions are two new chances to
mutate a note in place.

T35 — the pin and delete controls do not open the note — is the tripwire for group 6. The chip is a
fourth child of the card competing for the same click.

### T48 · The link helpers are correct, and refuse what they should — `links.test.ts`

- `normalizeLink('meet.google.com/abc-defg-hij')` is `'https://meet.google.com/abc-defg-hij'`. The
  example the phase was asked for, asserted literally.
- A string that already carries a scheme is not prefixed twice:
  `normalizeLink('https://example.com')` is `'https://example.com'`.
- Surrounding whitespace is trimmed before anything else looks at the string.
- **`normalizeLink('javascript:alert(1)')` is `''`.** So are `'JavaScript:alert(1)'`,
  `'  javascript:alert(1)'`, `'data:text/html,<script>'`, `'vbscript:msgbox'`, `'mailto:a@b.c'` and
  `'tel:555'`. **This is the assertion that earns D4** — every one of them reaches an `href` if the
  check is a regex or a denylist, and none of them survive an allowlist of two schemes.
- `normalizeLink('')` is `''`. `normalizeLink('   ')` is `''`. `normalizeLink('not a url')` is `''`.
- `isSafeLink` agrees with `normalizeLink` on every case above, so the storage boundary and the input
  boundary cannot drift apart.
- `linkLabel('https://meet.google.com/abc-defg-hij')` is `'meet.google.com/abc-defg-hij'`.
  `linkLabel('https://www.figma.com/file/x?node=1')` is `'figma.com/file/x?node=1'` — the leading
  `www.` goes, the query does not.
- `linkLabel('https://example.com/')` is `'example.com'`. A trailing slash on a bare host reads as a
  typo.

### T49 · The reducer carries, edits, and does not reorder

- `add` writes the seed's `title` and `link` unchanged.
- `edit_title` changes exactly one note's `title` and stamps its `updatedAt`; every other note is
  untouched.
- `set_link` does the same for `link`.
- Both, for an id not on the board, return the state unchanged rather than throwing.
- **Neither changes any note's `order`.** Asserted directly: the `order` of every note is identical
  before and after. Principle 1's surviving clause is that the board reorders on create, delete and
  pin and on nothing else, and a title edit must not be what finally breaks it.
- Setting a title to `''` is a valid edit, not a no-op — a title can be removed.

### T50 · A board saved before this phase loads whole

- A stored note with no `title` and no `link` loads with `''` for each, and every other field intact.
- A stored note whose `title` is `42`, `null` or an object loads with `title: ''` — **repaired, not
  rejected.** The board still has every note.
- A stored note whose `link` is `'javascript:alert(1)'` loads with `link: ''`. **This is D7's half of
  the boundary**, and the value it defends against is one that never went through the input path — a
  board hand-edited in devtools, or written by a build that predates `normalizeLink`.
- A stored note whose `link` is a valid `https:` URL keeps it byte for byte.
- `version` is still `1` after the repaired board is written back.
- A board malformed in any *other* way — a missing `id`, a `color` outside the palette — is still
  rejected whole. The repairs are three named fields, not a general leniency.

### T51 · The card's Tailwind classes exist — `tailwind_build.test.ts`

Against the built CSS, the way T6 and T47 already work:

- `line-clamp-3`, `line-clamp-4` and `line-clamp-5` all emit. Every one is reachable from **D5**'s
  table, and a missing utility fails silently by not clamping at all.
- `h-52` emits.
- The `BODY_LINES` table in `note_card.tsx` offers exactly those three clamps and no others — if
  it grew a case, **D5**'s table no longer describes the card.

  This one is asserted from the **source**, not from the stylesheet, and the reason is worth
  recording: Tailwind scans the whole project, `specs/` included, so this document naming
  `line-clamp-6` in order to forbid it is by itself enough to emit `line-clamp-6`. A stylesheet
  assertion would fail on the spec that describes it rather than on the code that broke it.

### T52 · The create dialog carries both fields — `new_note_dialog.test.tsx`

- Typing a title and a link, then submitting, puts a note on the board with both.
- The link is stored normalised: typing `meet.google.com/abc` stores `https://meet.google.com/abc`.
- Submitting with both fields empty stores `''` for each, and `createdAt === updatedAt` still holds.
- **Focus lands on the body textarea when the dialog opens**, not on the title input. **D6** made
  this the mission's call rather than a preference, so it is asserted rather than assumed.
- Cancel and Escape clear the title and the link along with the body, the colour and the date.
- Ctrl/Cmd+Enter still submits from the title input and from the link input.

### T53 · The note view edits both, and saves without a button — `note_view.test.tsx`

- Opening a note shows its title and its link in their fields.
- Typing a title writes it to storage after the debounce, and the card behind the dialog shows it.
- Closing with Escape immediately after a keystroke writes that keystroke — the flush covers the
  title and the link, not only the body.
- A link typed as a bare host is stored normalised **on blur**, and typing `https` does not become
  `https://https` mid-word.
- An unparseable link leaves the field's text alone and stores `''`. No error message, no blocked
  dismissal (**D6**).
- There is no button labelled `Save` in the rendered dialog.

### T54 · The card renders the summary, and the chip behaves — `board.test.tsx`

- A note with a title renders it; a note without one renders no title element and no placeholder
  text.
- A note with a link renders exactly one `<a>` whose `href` is the stored URL, whose text is
  `linkLabel` of it, with `target="_blank"` and `rel` containing both `noopener` and `noreferrer`.
- A note without a link renders no `<a>`.
- **Clicking the chip does not open the note.** Same assertion shape as T35's pin and delete.
- **A pointerdown on the chip does not begin a drag** — the note's `order` is unchanged after a
  press-and-move that starts on the chip.
- The chip is an `<a>` that is a **sibling** of the opener `<button>`, not a descendant of it.
  Asserted structurally, because nested interactive elements are the failure **D5** is avoiding and
  it is invisible at runtime until a browser disagrees.

### T55 · The body's clamp follows the table

Four notes, one per row of **D5**'s table, rendered together:

- titled and linked → `line-clamp-3`
- titled, no link → `line-clamp-4`
- untitled, linked → `line-clamp-4`
- untitled, unlinked → `line-clamp-5`

And the assertion the phase exists for: **all four cards have the same height class.** The clamp
varies; `h-52` does not.

---

## Gate 3 — Checks no test can make

Seed a board by hand with, at minimum: a note with a long title and a long body and a link; a note
with nothing but three words of body; a note with a title and no body; and one with a Meet link.
Look at it.

**These are not optional this time.** P5 and P6 both merged with their Gate 3 unrun, which was a
deliberate call both times, and check 1 below is P6's own outstanding question. Running it here is
deliverable **D8**.

1. **Is the card showing the right amount of note?** This is P6's check, asked again with a title
   and a chip in the frame. Look at the four-card set from T55 side by side. Does the five-line
   untitled card read as the same object as the three-line titled one, or as a different component?
   Does the ellipsis land where "there is more" is the obvious reading, rather than "the text
   stopped"? If `h-52` is wrong, the height and the clamp table move **together** — that was P6's
   warning and it still applies.

2. **Is the card still a piece of paper?** Principle 4 says the interface is the notes. With a date,
   a title, a body, a chip, and pin and delete in the corner, the card carries five things. Hover
   one. Does it read as a note, or as a row in a list that happens to be square?

3. **What did the chip do to the keyboard?** Tab across a board of ten notes. Every card is now two
   stops instead of one. Is reaching the tenth note tedious? Principle 5 requires the link be
   reachable; it does not require it to be reachable *before* the next note.

4. **Does the chip's hover read as a link?** Colour and underline only — no lift, no scale. Against
   paper, does it look like something you can click, or like text that changed colour?

5. **Does a Meet link actually open?** Click it. New tab, right URL, board still there behind it.

6. **Is the title's type right?** `text-sm font-semibold` against a `text-sm text-ink-soft` body, on
   all six papers. On the lightest (butter) and the most saturated (lilac), is the title clearly the
   title, or does it just look like a bolder first line?

Not claimed by this phase, and still outstanding from P5 and P6: the `prefers-reduced-motion` pass
and the 100+ note drag check. Both belong to P10 and neither is touched here.

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| Principle 1 — nothing reorders but create, delete, pin | T49 asserts `order` is untouched by both new actions |
| Principle 2 — a card is a summary; the note opens to be read | Unchanged and unamended; the card gains a title, which is more summary, not less |
| Principle 3 — there is no Save button | Gate 1 grep; T53 |
| Principle 4 — quiet chrome, the interface is the notes | Gate 3 check 2 |
| Principle 5 — keyboard-reachable | The chip is an `<a href>`; T52 asserts focus and Ctrl/Cmd+Enter; Gate 3 check 3 |
| Warm neutrals, no achromatic literals | T6, T10 carried forward |
| No network request | § Out of scope; nothing in `links.ts` fetches |
| `snake_case` for files we author | T4, unchanged `EXEMPT` pin |
| Core scope names what ships | **D2**'s bullet, added in group 1 |

---

## Definition of done

- [ ] Gate 1 clean — build, lint, test, and all four greps.
- [ ] Gate 2 — T48–T55 pass; T1–T47 still pass; more than 19 suites and more than 447 assertions.
- [ ] Gate 3 — all six checks run, and **check 1's answer written down**, because P6's was not.
- [ ] Gate 4 — every row satisfied.
- [ ] `roadmap.md`, `mission.md`, `tech-stack.md` and `README.md` all describe the app that exists.
- [ ] PR opened against `main`.
