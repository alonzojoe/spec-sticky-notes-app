# P7 · A note that says what it is — Plan

A groundwork step and seven task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `docs`, `feat`, `refactor`, `test`.

**Ordering note.** Group 1 is the amendment, so a rejection kills the phase before code exists.
Groups 2–3 build bottom-up: the pure link module before anything stores a URL, then the model and
the migration, so the scheme check is under test before an `href` ever sees a stored string. Group 4
is the shared field component, group 5 wires it into both dialogs, and **group 6 is the card** — the
geometry change lands last, once there is something real to put in it. Nothing between groups 1 and 6
leaves the app broken.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`line-clamp-*` is core in Tailwind v4** — P6 shipped `line-clamp-4` and T47 asserts it emits.
  `line-clamp-3` and `line-clamp-5` are the same utility with a different number, but T51 asserts
  all three emit anyway, because the failure is silent.
- **`stopPropagation` on a card child keeps the drag and the open from firing** — proven by
  `note_controls.tsx` and asserted by T35. The chip uses the same mechanism.
- **`shadcn` `Input` already exists** at `src/components/ui/input.tsx`. No `shadcn add` this phase,
  and therefore no `chore(deps)` or `build(shadcn)` commit.

*To verify in group 0:*

- **`URL` is available in the jsdom test environment** and throws `TypeError` on an unparseable
  string rather than returning `null`. `links.test.ts` depends on the throw.
- **`h-52` emits.** Same class of check as the clamp: an arbitrary height that does not emit leaves
  the card auto-height and the ragged rows come back silently.
- **A `line-clamp` inside a `flex-1` child of a fixed-height flex column clamps at the stated line
  count** rather than at the height the flexbox gave it. P6's card clamps inside `flex-1` already,
  so this is a confirmation, not a discovery — but the body's line count is now variable and the
  five-line case is taller than any P6 card carried.

---

## 0. Groundwork

0.1 Branch `feat/p7-a-note-that-says-what-it-is` off `main`. P6 merged as PR #8; `main` is current
    and `develop` is not — see the PR-target note in the phase workflow.

0.2 Full gate on the clean branch: **19 suites, 447 assertions**. Record the number; every group
    below adds to it and none of them may subtract.

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The amendment

1.1 `roadmap.md` — insert this phase as **P7 · A note that says what it is** with its goal, its
    bullets and its Done-when. Renumber *Find things* to **P9**, *Markdown and checkboxes* to
    **P10**, *Dark mode* to **P11**, *Polish* to **P12**, per **D1**'s table.

1.2 `roadmap.md` — the *Later (not scheduled)* list is unchanged in content. The recolour-from-card
    entry keeps pointing at the note view's swatches.

1.3 Correct the forward references the renumbering invalidates. P6's requirements point markdown at
    "**P9**" and it is now P10; P5's and P6's risks point deletion confirmation at "**P11**" and it
    is now P12. Grep for `P9`, `P10`, `P11` across `specs/` and fix what the renumber broke —
    **without** rewriting the history of what those specs decided. Only the numbers move.

1.4 `mission.md` § Core scope — add the **Title and link** bullet from **D2**, after *Colors + pin*.

1.5 **Leave principles 2 and 3 exactly as they are.** Principle 3 forbids the Save button this phase
    might otherwise reach for (**D6**); principle 2 was already amended three times and P6's § Risks
    says a fourth means rewriting it. This phase needs neither.

1.6 `README.md` — status to P7.

1.7 Commit: `docs: amend the constitution for the title, the link and the renumber`

---

## 2. Links, as pure functions

Test-first: `src/__tests__/links.test.ts`, T48.

2.1 `src/lib/links.ts`:

```ts
export const isSafeLink = (value: string): boolean => …    // http: | https: only, via URL
export const normalizeLink = (raw: string): string => …    // trim, add https://, '' if unsafe
export const linkLabel = (url: string): string => …        // strip scheme and leading www.
```

2.2 **`isSafeLink` parses with `URL` inside a `try` and allowlists two schemes.** Not a regex, and
    not a denylist of `javascript:` — a denylist loses to `java\nscript:`, to `JavaScript:`, and to
    the next scheme nobody thought of. An allowlist of `http:` and `https:` cannot.

2.3 **`normalizeLink('meet.google.com/abc')` is `'https://meet.google.com/abc'`.** A bare host is
    prefixed; a string that already carries a scheme is left alone and then checked. `''` in gives
    `''` out, and so does anything that fails the check — the caller stores the result either way,
    so an unsafe value can never be what is stored.

2.4 **`linkLabel` does string work on an already-parsed URL** and never re-parses raw input. Strips
    `https://`, `http://`, and a leading `www.`; keeps host, path, query and hash. Trailing `/` on a
    bare host is dropped, because `meet.google.com/` reads as a typo.

2.5 T48. Commit: `feat(state): add the pure link helpers`

---

## 3. The model and the migration

Test-first: extend `notes_reducer.test.ts` and `board_storage.test.ts`, T49–T50.

3.1 `src/types/note.ts` — `Note` gains `title: string` and `link: string`; `NoteSeed` gains both.
    Comment at the fields that `''` is the absent value and that `link` is post-normalisation, so a
    reader does not go looking for the validation in a component.

3.2 `notes_reducer.ts` — two new actions, each following `edit_body`'s shape exactly:

```ts
| { type: 'edit_title'; id: string; title: string; at: number }
| { type: 'set_link'; id: string; link: string; at: number }
```

    Both stamp `updatedAt`. **Neither reorders anything** — principle 1's surviving clause is that
    the board reorders on create, delete and pin and on nothing else, and P6 wrote that comment
    above `set_date` for the same reason.

3.3 `note_factory.ts` — `createNoteSeed(color, topOrder, body = '', date = todayISO(), title = '', link = '')`.
    The defaults keep every existing call site meaning what it meant.

3.4 `board_storage.ts` — **D7**. `title` absent or non-string → `''`. `link` absent, non-string, or
    failing `isSafeLink` → `''`. Rebuild the note object rather than spreading, exactly as the
    `order` and `date` repairs do.

3.5 T49–T50. Commit: `feat(state): give a note a title and a link`

---

## 4. The shared fields

4.1 `src/components/layout/note_fields.tsx` — a `TitleField` and a `LinkField`, or one component
    exporting both. Each is a labelled `Input` from `components/ui`; the label is visible, not a
    placeholder, because a placeholder disappears exactly when you need to know what the field was.

4.2 **`LinkField` normalises on blur, never on change** (**D6**). It holds what you typed and hands
    `normalizeLink`'s result to `onCommit`. Typing `https` must not become `https://https`.

4.3 `placeholder="meet.google.com/…"` on the link field — the example the phase was asked for, and
    it demonstrates that a bare host is accepted without a paragraph explaining it.

4.4 No new tokens, no new motion. `focus-visible:ring-2 focus-visible:ring-ring` matching the
    textareas already in both dialogs.

4.5 Commit: `feat(board): add the shared title and link fields`

---

## 5. Both dialogs

Test-first: extend `new_note_dialog.test.tsx` and `note_view.test.tsx`, T52–T53.

5.1 `new_note_dialog.tsx` — title above the textarea, link below it. Local state for both; both
    reset in `close()` alongside colour, body and date, because a cancelled draft is not a draft.
    `submit()` passes `title.trim()` and the normalised link into `createNoteSeed`.

5.2 **`autoFocus` stays on the body textarea** (**D6**). The title input is above it in the DOM;
    `Shift+Tab` reaches it. Ctrl/Cmd+Enter still submits from anywhere in the form, which is P3's
    keyboard carve-out and is not weakened by two more fields.

5.3 `note_view_dialog.tsx` — the same two fields, in the same order. The title debounces through the
    existing `useDebounceCallback` at 300ms and flushes in `close()`; the link commits on blur and
    is flushed by the same path. Extend `close()` to write all three of body, title and link, so the
    last keystroke before Escape is never the one that is lost.

5.4 **No Save button, no Cancel, in either dialog beyond the Cancel the create dialog already has.**
    Grep it in Gate 1.

5.5 T52–T53. Commit: `feat(board): carry the title and the link through both dialogs`

---

## 6. The card

Test-first: extend `board.test.tsx`, T51 and T54.

6.1 `note_card.tsx` — `h-44` becomes `h-52`. Title under the date: `text-sm font-semibold
    line-clamp-1`, rendered only when `title !== ''`.

6.2 The body's clamp comes from a static `Record`, per **D5**:

```ts
const BODY_LINES: Record<number, string> = {
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
}
// 3, plus one for each of the title and the link this note does not have.
```

    Interpolating `line-clamp-${n}` emits nothing — `lib/paper.ts` documents the same trap for
    `bg-paper-${color}`, and T51 asserts all three classes are in the built CSS.

6.3 The chip: an `<a>` **after** the opener button, not inside it (**D5**). `Link2` from `lucide-react`
    at `size-3.5`, then `linkLabel(note.link)` in a `truncate` span. `target="_blank"`,
    `rel="noopener noreferrer"`, `aria-label` naming the destination.

6.4 `onClick` and `onPointerDown` both `stopPropagation`, the way `note_controls.tsx` does. Without
    the first, following a link opens the note behind it; without the second, pressing the chip
    starts a drag.

6.5 Hover is a colour change and an underline over `--duration-hover`, inside
    `@media (hover: hover)`. No transform, no spring — **D5** says why.

6.6 T51, T54. Commit: `feat(board): show the title and the link on the card`

---

## 7. The tests and the documents

7.1 Whatever of T48–T55 is not already written by its group lands here, plus the assertion count
    check: **19 suites and 447 assertions before, and more of both after.**

7.2 Commit: `test: cover the link helpers, the fields and the card geometry`

7.3 `tech-stack.md` — the `Note` block gains `title` and `link`; the file tree gains `lib/links.ts`
    and `note_fields.tsx`. No new dependency this phase, so the stack table is unchanged.

7.4 Commit: `docs: record the title and the link across the constitution`

7.5 Open the PR against **`main`**.

---

## What could go wrong

**The renumber is a wide, boring diff and the code is a narrow, interesting one.** Group 1 commits
alone, first, so the interesting diff is never buried under it.

**The chip changes the card's tab order.** Every card gains a tab stop between its opener and the
next card's. On a 20-note board that is 20 more stops. It is the correct trade — a link that is not
reachable from the keyboard fails principle 5 — but it is a real cost and Gate 3 check 3 looks at it.

**The five-line clamp is the case nothing tests visually.** A note with no title, no link, and a long
body is the tallest text block the card has ever carried, and it is exactly the note that used to be
served worst. Seed one and look at it.
