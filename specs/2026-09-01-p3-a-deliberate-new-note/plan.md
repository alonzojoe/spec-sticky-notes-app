# P3 · A deliberate new note — Plan

A groundwork step and six task groups. Execute in order: each leaves the tree building, linting and
testing clean, and in a state the next group can verify against. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Each group is test-first where a test is possible: write the assertion, watch it fail for the right
reason, then make it pass. Groups end with `npm run build && npm run lint && npm test`. Commit at
the end of each group while working — the phase is **squashed to one commit** when the PR merges
(roadmap rule: one phase, one commit).

**Ordering note.** Group 1 writes the amendment, because if it is rejected nothing else in this
phase is worth building. Groups 2–4 build the dialog and wire it to a button while the sidebar
palette is still there, so there is always a working way to make a note. Group 5 is the deletion.
Group 6 corrects every other document. The palette is never gone while the dialog is unfinished.

## Constraints to confirm before writing code

Two are proven by shipped code. The rest are assumptions this plan depends on — **check each in
group 0, and if any is false, fix the plan before writing the feature.**

*Proven in the repo today:*

- **`duration-(--duration-drawer)`, not `duration-drawer`.** Tailwind v4 has no `--duration-*`
  namespace. P1 verified it; every component uses the parenthesised form.
- **`--ease-out`, `--duration-press`, `--duration-hover` and `--duration-drawer` all exist** in
  `index.css`'s `@theme` block, at lines 148 and 155–157.

*To verify:*

- **`npx shadcn@latest add dialog` writes only `src/components/ui/dialog.tsx`.** `sheet.tsx` is
  built on the same Radix primitive and P1's sidebar amendments are guarded by T5. If the install
  touches anything else, review the diff rather than accepting it.
- **`@radix-ui/react-dialog` is already a dependency.** `sheet.tsx` imports it, so the install
  should add no new package. If it does, record it in `tech-stack.md` in group 6.
- **Radix `Dialog` autoFocuses the first focusable child unless told otherwise.** Group 3 wants
  focus on the textarea, not the first swatch. If `autoFocus` on the textarea is not enough, use
  `onOpenAutoFocus` to redirect it, and do not reorder the DOM to fake it.
- **Radix `Dialog` restores focus to the trigger on close.** **D6** opens the dialog from a keyboard
  shortcut with no trigger element; confirm focus returns somewhere sane rather than to `<body>`.
  If it does not, focus the **New note** button explicitly on close.
- **`aria-checked` on `role="radio"` survives jsdom + Testing Library's `getByRole('radio', {
  checked: true })`.** T21 depends on it.

---

## 0. Groundwork

0.1 Branch: `git switch develop && git pull && git switch -c feat/p3-a-deliberate-new-note`.

0.2 `npm run build && npm run lint && npm test` on a clean `develop`. All sixteen suites and 355
    assertions green before anything is added. A pre-existing failure found in group 4 is
    indistinguishable from one this phase caused.

0.3 Walk the "To verify" list above. Record each answer in the group-0 commit message.

0.4 Commit: `chore: confirm the P3 dialog assumptions against develop`

---

## 1. The amendment

Nothing in this group touches code. It exists first because **D1** is the phase's premise.

1.1 `mission.md` principle 2. Replace:

> 2. **Direct manipulation.** Drag the note itself. Edit text in place on the note. No
>    modal dialog stands between me and a thought.

with:

> 2. **Direct manipulation.** Drag the note itself. Edit text in place on the note — no dialog
>    stands between me and a thought I am already writing. Creating a note may ask for colour and
>    text first, as long as the keyboard can open it, fill it, and dismiss it without touching the
>    mouse.

1.2 `mission.md` principle 4, first sentence only. `Global controls live in one collapsible sidebar
    and never on the board surface itself` becomes `Global controls live in the sidebar and the
    toolbar above it, and never on the board surface itself`. The rest of principle 4 — per-note
    controls, the rail, the board staying usable while collapsed — is unchanged and still true.

1.3 Leave **The one-sentence test** exactly as written. **D6** is what pays for it.

1.4 Commit: `docs: amend the constitution for a deliberate creation dialog`

---

## 2. Install the dialog and audit what it ships

2.1 `git status` clean. Record `git rev-parse HEAD`.

2.2 `npx shadcn@latest add dialog`.

2.3 `git status` again. **Expect exactly one new file, `src/components/ui/dialog.tsx`.** Anything
    else — a rewritten `button.tsx`, a touched `sheet.tsx`, a `components.json` edit — is reviewed
    line by line before it is kept. `npm test` immediately: T5 guards P1's sidebar amendments and
    will catch a regenerated `sheet.tsx` reintroducing `ease-linear`.

2.4 Audit the generated animation classes against **D7**. The checks, in order:

| Look for | Required | Why |
| --- | --- | --- |
| `zoom-in-0`, `scale-0` | Replace with `zoom-in-95` | Nothing appears from nothing |
| `ease-in`, `ease-in-out` on entry | `ease-(--ease-out)` | `index.css:147` — ease-in delays the watched frame |
| `duration-200`+ on the panel | `duration-(--duration-drawer)` | Token, and it is the 200ms ceiling |
| overlay duration | `duration-(--duration-hover)` | 160ms; the overlay is not the content |
| exit duration | `duration-(--duration-hover)` | Exit faster than entry |
| `transform-origin` | leave centred | A modal is not anchored to a trigger |
| any new colour literal | replace with an existing token | No `@theme` changes this phase |

2.5 `index.css`, the reduced-motion block at line 177. Add the dialog to the selector list:

```css
@media (prefers-reduced-motion: reduce) {
  [data-slot^='sidebar'],
  [data-slot^='dialog'],
  [data-slot='note-card'] {
    transition-property: opacity, background-color, color, box-shadow !important;
    transition-duration: var(--duration-press) !important;
  }
}
```

    Confirm the generated `dialog.tsx` actually emits `data-slot="dialog-content"` and
    `data-slot="dialog-overlay"`; the `^=` selector depends on the prefix. If shadcn's version emits
    no `data-slot` at all, add them — the same way `note_card.tsx` carries one.

2.6 Commit: `build(shadcn): add the dialog and amend its motion and reduced-motion defaults`

---

## 3. The dialog itself

Test-first. Write `src/__tests__/new_note_dialog.test.tsx` with T20–T24 from
[validation.md](./validation.md), watch them fail, then build.

3.1 `src/types/note.ts` — `NoteSeed` gains `body: string`, placed after `color` so the shape reads
    in the order the dialog fills it. This is **D4**.

3.2 `src/context/notes_reducer.ts` — the `add` case. `const { id, color, body, x, y, tilt, at } =
    action.seed`, and `body` replaces the hardcoded `''`. The existing comment above the
    destructure — *"`seed.at` is not a Note field and must not leak in"* — stays true and stays put.

3.3 `src/lib/note_factory.ts` — `createNoteSeed(color, placement?, body = '')` returns `body` in the
    seed. The default keeps every existing call site and every existing assertion meaning what it
    already meant. The function's header comment describes it as the app's only impure boundary;
    `body` is pure input threaded through it, so the comment stays accurate.

3.4 `src/components/layout/new_note_dialog.tsx`. Structure:

```
<Dialog open onOpenChange>
  <DialogContent>            aria-describedby wired to the hint, or explicitly undefined
    <DialogHeader>
      <DialogTitle>New note</DialogTitle>
    </DialogHeader>

    <div role="radiogroup" aria-label="Paper colour">   six swatches, roving tabindex
    <textarea autoFocus>                                the body
    <DialogFooter>
      Cancel                 variant="ghost"
      Add note               type="submit", disabled never
```

    Wrap the controls in a `<form>` and submit on `onSubmit`, so Enter from the footer button and a
    click both take one path. **The textarea must not submit on Enter** — a note body is multi-line
    and Enter inside it is a newline. `Cmd/Ctrl+Enter` inside the textarea submits.

3.5 The radiogroup, per **D3**. One tab stop: the selected swatch has `tabIndex={0}`, the other five
    `tabIndex={-1}`. `ArrowRight`/`ArrowDown` move forward, `ArrowLeft`/`ArrowUp` back, both
    wrapping. `Home`/`End` jump to first and last. Selection follows focus, which is correct for a
    radiogroup of six equivalent options with no cost to choosing. Each swatch:

```tsx
role="radio"
aria-checked={color === selected}
aria-label={paperLabel(color)}
className={`size-8 rounded-full border texture-paper ${PAPER[color]} …`}
```

    The selected swatch is marked with a ring — `ring-2 ring-ring ring-offset-2` — not with a scale
    or a checkmark drawn inside it. A tick on top of paper is a different visual language from the
    rest of the app.

3.6 Submit handler. Measured in the handler, never during render — same rule as the palette's:

```ts
dispatch({
  type: 'add',
  seed: createNoteSeed(color, { bounds: boardBounds(), taken: notes }, body.trim()),
})
```

    Then close, and reset colour to `butter` and body to `''` so the next open is clean. The reset
    happens on close rather than on submit so that Cancel also clears — a cancelled draft is not a
    draft.

3.7 `npm run build && npm run lint && npm test`.

3.8 Commit: `feat(board): add the new-note dialog and carry the body on the seed`

---

## 4. The button and the shortcut

4.1 `src/components/layout/app_shell.tsx`. The header gains the button and the dialog's open state:

```tsx
const [creating, setCreating] = useState(false)

<header className="flex h-12 shrink-0 items-center px-3">
  <SidebarTrigger />
  <Button
    size="sm"
    className="ml-auto transition-transform duration-(--duration-press) ease-(--ease-out) active:scale-[0.97]"
    onClick={() => setCreating(true)}
  >
    <Plus aria-hidden />
    <span className="max-sm:sr-only">New note</span>
  </Button>
</header>
<NewNoteDialog open={creating} onOpenChange={setCreating} />
```

    `max-sm:sr-only`, not `max-sm:hidden`: the label leaves the layout but stays available to a
    screen reader, so the button keeps its accessible name at every width without a second
    `aria-label` to maintain.

    The header's existing comment says it holds nothing but the trigger, and gives the reason.
    Rewrite it rather than leaving it contradicting the code below it.

4.2 The `n` shortcut, **D6**. In `app_shell.tsx`, one effect:

```ts
useEffect(() => {
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'n' && event.key !== 'N') return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const target = event.target as HTMLElement | null
    if (
      target?.isContentEditable ||
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA'
    ) {
      return
    }
    event.preventDefault()
    setCreating(true)
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [])
```

    `setCreating(true)` while already open is a no-op on the same value, so no explicit
    already-open guard is needed. `Shift` is deliberately absent from the modifier list.

4.3 The button gets `title="New note (n)"` so the shortcut is discoverable without a legend. Not
    `aria-label` — that would override the accessible name the label already provides.

4.4 T25–T26 from [validation.md](./validation.md). `npm run build && npm run lint && npm test`.

4.5 Commit: `feat(layout): open the new-note dialog from the toolbar and from n`

---

## 5. Remove the palette

Only now. Groups 3 and 4 leave two working ways to create a note; this group removes the older one.

5.1 `git rm src/components/layout/note_palette.tsx src/__tests__/note_palette.test.tsx`.

5.2 `src/components/layout/app_sidebar.tsx` — drop the `NotePalette` import and the `<NotePalette />`
    element. The slot comment above the component lists P7 and P9 and previously listed P2; make
    sure no line still reserves a New-note position.

5.3 `npm test`. **T7 (`app_shell.test.tsx`) is expected to fail here** if it asserts the palette
    renders — update the assertion to the toolbar button rather than deleting it. Any *other*
    failure means something imported the palette that this plan did not account for.

5.4 `grep -rn "note_palette\|NotePalette" src/ specs/` returns nothing outside this phase's own spec
    directory and the P2 spec's historical record. **P2's spec files are not edited** — they
    describe what P2 shipped, which is still true of P2.

5.5 `npm run build && npm run lint && npm test`.

5.6 Commit: `refactor(layout): remove the sidebar note palette`

---

## 6. Constitution amendments and the README

`mission.md` was amended in group 1. This group is everything else, per **D8**.

6.1 `roadmap.md` — the `## P3 · It remembers — *absorbed into P2*` heading and its two-sentence body
    are replaced by this phase:

```
## P3 · A deliberate new note

**Goal:** creating a note becomes an explicit act, and the sidebar stops being a toolbar.

- Amend mission.md principle 2: the modal ban is scoped to editing a note that exists.
- A shadcn `Button` at the right of the shell's header opens a `dialog`.
- The dialog carries a six-swatch radiogroup and a textarea; colour and text are both
  chosen before the note exists.
- `NoteSeed` gains `body`, so creation stays one dispatch and one storage write.
- `n` opens the dialog from anywhere outside a text field.
- `note_palette.tsx` is deleted; the sidebar keeps its nav group and rail.

**Done when:** a note with text and a chosen colour reaches the board in one submit,
`Tab, Tab, type, Cmd+Enter` creates one without a mouse, `n` is inert while typing on a
note, and no sidebar control creates notes any more.
```

6.2 `roadmap.md`, P2's section. Add to the end of it, so P3 and P4 references from P0's and P1's
    specs still resolve:

> P2 also absorbed the original **P3 · It remembers** and **P4 · Write on them**: persistence and
> inline editing both shipped here.

    The `## P4 · Write on them — *absorbed into P2*` tombstone stays as it is.

6.3 `roadmap.md`, P2's bullet list. The palette bullet becomes past tense and points forward:
    *"A six-swatch paper palette in the sidebar … "* gains *"— replaced by the new-note dialog in
    P3."*

6.4 `roadmap.md`, P6's closing paragraph. *"colour is chosen at creation from the sidebar palette"*
    becomes *"colour is chosen at creation in the new-note dialog"*.

6.5 `tech-stack.md`:
    - File tree: `note_palette.tsx` out, `new_note_dialog.tsx` in, `components/ui/dialog.tsx` in.
    - shadcn component list gains `dialog`.
    - § Data model, the `NoteSeed` block, gains `body: string`.

6.6 `README.md` — status line to P3.

6.7 Full gate: `npm run build && npm run lint && npm test`.

6.8 Commit: `docs: record the new-note dialog across the constitution`

---

## Status

**Complete.** All six groups executed. `npm run build`, `npm run lint` and `npm test` are clean:
16 suites, 369 assertions.

Two things came out differently from the plan, both recorded as decisions in
[requirements.md](./requirements.md):

- **§ 2.4's audit became a rewrite (D7).** The generated animation utilities come from
  `tw-animate-css`, which this project has never installed, and they key off `data-open`
  rather than Radix's `data-state`. They compiled to nothing. `index.css` now owns the
  dialog's motion in four `@keyframes` on the existing tokens.
- **§ 3.6's submit handler defers the dispatch by one macrotask (D9).** A note added while the
  dialog is still mounted lands inside Radix's focus scope and gets its edit mode closed by
  the resulting blur.

One dependency was added that the plan did not anticipate: `@testing-library/user-event`, a
devDependency, for the keyboard assertions the amendment made load-bearing (**D10**).

T9's dormancy list also lost `button`, which P3 legitimately wakes. The list was corrected
rather than weakened, and the test comment says so.

## Landing

PR from `feat/p3-a-deliberate-new-note` into `develop`, squashed to one commit per the roadmap rule.
The squash message is the phase title; the body summarises **D1** first, because a reviewer who
disagrees with the amendment should not have to read the diff to find it.
