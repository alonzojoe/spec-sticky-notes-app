# P8 · Find things — Plan

A groundwork step and seven task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `docs`, `feat`, `refactor`, `test`.

**Ordering note.** Group 1 is the amendment, so a rejection kills the phase before code exists.
Groups 2–3 are the two pure modules, under test before anything renders them. **Group 4 is the
refactor** — `openId` moves out of `board.tsx` with the existing suites as its only gate, so a
regression there is attributable to the move and to nothing else. Group 5 extracts the toolbar and
adds the trigger, which is visible but inert. Group 6 builds the palette the trigger already opens.
Nothing between groups 1 and 6 leaves the app broken.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **The dialog overlay is already `bg-ink/20 supports-backdrop-filter:backdrop-blur-xs`** in
  `components/ui/dialog.tsx`. Reusing `Dialog` gives the palette the create dialog's backdrop for
  free — nothing is styled, nothing is copied.
- **`app_shell.tsx` already suppresses a global key inside inputs, textareas and contentEditable.**
  The `⌘K` handler reuses that shape rather than inventing a second one.
- **A dialog can dispatch and the board re-renders** — the note view has done exactly that since P6.

*To verify in group 0:*

- **`navigator.userAgentData` exists in the jsdom test environment**, or the platform tests have to
  stub `userAgent` instead. Assume it does not until proven.
- **Radix `Dialog` does not steal `↑`/`↓`** from an input inside it. If it does, the handler goes on
  the input rather than on the content, and the reason is recorded here.
- **`aria-activedescendant` survives Radix's focus management.** The input must keep DOM focus while
  the selection moves; if Radix moves focus on open, the `autoFocus` needs to be explicit.
- **`kbd` has no shadcn component in this repo.** Confirm before writing one — a plain `<kbd>` with
  tokens is the intent.

---

## 0. Groundwork

0.1 Branch `feat/p8-find-things` off `main`. P7 merged as PR #9.

0.2 Full gate on the clean branch: **21 suites, 517 assertions**. Every group adds to it and none
    may subtract.

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The amendment

1.1 `roadmap.md` — rewrite P8 as the palette, per **D1**. Both replaced bullets are named in the
    requirements rather than silently dropped; the roadmap states the new behaviour only.

1.2 `roadmap.md` — insert **P9 · Tags** carrying what P8 shed: `lib/tags.ts`, chips on the card,
    click-to-filter. Renumber Markdown to P10, Dark mode to P11, Polish to P12.

1.3 Correct every forward reference the renumber invalidates across `specs/`, `tech-stack.md` and
    `README.md`. **Only the numbers move** — no earlier spec's reasoning is rewritten. Highest first
    so nothing shifts twice.

1.4 `mission.md` § Core scope — split the *Search + tags* bullet in two, per **D1**.

1.5 **Leave principles 1, 2 and 3 alone.** Principle 1 is the one this phase might have been
    expected to touch, and **D5** means it does not have to: the board is not filtered at all.

1.6 `README.md` — status to P8.

1.7 Commit: `docs: amend the constitution for the search palette and the renumber`

---

## 2. The platform, as one question

Test-first: `src/__tests__/platform.test.ts`, T56.

2.1 `src/lib/platform.ts`:

```ts
export const isMac = (): boolean => …          // userAgentData?.platform, then /mac/i on the UA
export const modifierLabel = (): string => …   // '⌘' | 'Ctrl'
export const SHORTCUT_KEY = 'k'
```

2.2 **Read at call time, never at module load.** A value captured at import cannot be changed by a
    test without resetting modules, and this is the one module whose whole job is to vary.

2.3 `navigator.platform` is deprecated and must not be used. `userAgentData?.platform` first,
    `/mac/i` on the user agent as the fallback, `false` when neither is available.

2.4 T56. Commit: `feat(state): add the platform helpers`

---

## 3. The matcher, as pure functions

Test-first: `src/__tests__/search.test.ts`, T57.

3.1 `src/lib/search.ts` — `search(notes, query): Hit[]`, with `Hit = { note, field, excerpt }`.

3.2 **Lowercase both sides once; build no regex from the query.** A `RegExp` assembled from user
    input turns `(` into a thrown error, and this input is typed one character at a time.

3.3 **Title band first, then body band, board order within each.** The list and the grid agree on
    what "first" means, which is what stops the palette from feeling like a different app.

3.4 The excerpt is a window around the hit, ~80 characters, cut on a word boundary when one is
    close, prefixed `…` when it does not start at the beginning. Matching 400 characters in and
    showing the opening sentence explains nothing.

3.5 Empty and whitespace-only queries return `[]`.

3.6 T57. Commit: `feat(state): add the pure search matcher`

---

## 4. `openId` moves out of the board

**No new behaviour in this group.** The gate is the existing suites, so anything that breaks is
attributable to the move.

4.1 `src/context/open_note_context.tsx` — a provider holding `openId` and `setOpenId`, and a
    `useOpenNote()` hook. Same shape as `notes_context.tsx`; a hook used outside its provider
    throws rather than returning `undefined`.

4.2 Mount it in `app_shell.tsx`, inside `NotesProvider`.

4.3 `board.tsx` consumes it instead of its own `useState`. The fresh-note effect and the card's
    `onOpen` are unchanged in behaviour — only where the setter comes from changes.

4.4 Gate: **517 assertions, unchanged**. Commit: `refactor(state): lift the open note out of the board`

---

## 5. The toolbar and the trigger

Test-first: extend `app_shell.test.tsx`, T58.

5.1 `src/components/layout/toolbar.tsx` — the header moves here whole. `app_shell.tsx`'s own comment
    made this conditional on a third control arriving; the third control is arriving, so the comment
    is **honoured and then deleted** rather than left describing a decision already taken.

5.2 `src/components/layout/search_trigger.tsx` — a `<button>`, never an `<input>` (**D4**). A
    magnifier, the word Search, and a `<kbd>` badge reading `⌘K` or `Ctrl+K` from `modifierLabel()`.

5.3 `aria-keyshortcuts="Meta+K Control+K"`. Below `sm`, the label and badge go `sr-only`/hidden and
    the magnifier remains, matching what the New note button already does.

5.4 Wired to open the dialog, which does not exist yet — group 6 fills it in. The trigger ships
    visible and working in this group only if the dialog lands with it; if the group is committed
    alone, the state exists and the dialog renders nothing.

5.5 T58. Commit: `feat(board): extract the toolbar and add the search trigger`

---

## 6. The palette

Test-first: `src/__tests__/search_dialog.test.tsx`, T59–T61.

6.1 `src/components/layout/search_dialog.tsx` on the shared `Dialog`. **No `cmdk`, no
    `shadcn add command`** — see **D5**.

6.2 A `role="combobox"` input owning `aria-activedescendant`, and a `role="listbox"` of
    `role="option"` rows: colour swatch, title or `Untitled note`, excerpt.

6.3 The selection is state, not focus. **The input keeps DOM focus the whole time**, or typing stops
    working the moment you press `↓`.

6.4 `↑`/`↓` wrap. `Enter` calls `setOpenId(hit.note.id)` and closes. `Escape` closes and opens
    nothing. The selection resets to row 0 on every keystroke, because the list changed underneath.

6.5 Empty query: the prompt. No matches: say so, and name the query.

6.6 `⌘K`/`Ctrl+K` in `app_shell.tsx` beside the existing `n` handler. **Both modifiers on every
    platform** (**D6**), `preventDefault` so Firefox does not take it, and suppressed while another
    dialog owns the focus scope.

6.7 T59–T61. Commit: `feat(board): find a note from the search palette`

---

## 7. The tests and the documents

7.1 Whatever of T56–T62 is not already written by its group lands here, plus the count check:
    **more than 21 suites and more than 517 assertions.**

7.2 Commit: `test: cover the platform, the matcher and the palette`

7.3 `tech-stack.md` — the tree gains `platform.ts`, `search.ts`, `search_dialog.tsx`,
    `search_trigger.tsx`, `toolbar.tsx` and `open_note_context.tsx`; `tags.ts`'s marker moves to P9.
    No new dependency, so the stack table is unchanged.

7.4 Commit: `docs: record the search palette across the constitution`

7.5 Open the PR against **`main`**.

---

## What could go wrong

**The refactor in group 4 is the risk, not the feature.** `board.tsx` owns the drag, the grid, the
reordering and the fresh-note effect. It is committed alone against an unchanged assertion count for
exactly that reason.

**`aria-activedescendant` is easy to half-build.** The attribute is trivial; keeping DOM focus on the
input while it moves is the part people get wrong, and it is invisible until someone presses `↓` and
then types.

**A wrong platform badge must not cost the shortcut.** The handler accepting both modifiers is what
makes **D2**'s detection cosmetic. It is asserted, not assumed.

**Two renumbers in two phases.** The mechanical part is a grep; the judgement is whether numbering
unbuilt phases is still worth it. Requirements § Risks records the alternative.
