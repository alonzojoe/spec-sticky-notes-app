# P3 · A deliberate new note — Validation

How to know P3 actually succeeded. The phase's Done-when is: *a note with text and a chosen colour
reaches the board in one submit, `Tab, Tab, type, Cmd+Enter` creates one without a mouse, `n` is
inert while typing on a note, and no sidebar control creates notes any more.*

Three of those four are assertable. The fourth — whether the dialog is a good enough trade for the
one-click palette it replaces — is a judgement, and Gate 4 makes it explicitly rather than hiding it
inside a passing suite. This is the first phase whose central claim is a constitution amendment, so
Gate 4 carries more weight here than in P2.

---

## Gate 1 — Command gates

All three exit zero from a clean checkout after `npm install`:

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, not merely passing. `eslint.config.js` gains **no new override** in this phase. P1's
single scoped exemption (`react-refresh/only-export-components` off for `src/components/ui/**`)
stays exactly as it is, and it already covers the generated `dialog.tsx`. No `// eslint-disable`
line appears in our own code.

`npm ls @radix-ui/react-dialog` resolves to the version `sheet.tsx` already uses. If `shadcn add
dialog` installed a second copy, that is a Gate 1 failure, not a footnote.

---

## Gate 2 — Automated assertions (Vitest)

Tests live in `src/__tests__/`. T1–T19 come from P0, P1 and P2. T20–T26 are new. One suite retires.

### T1–T6 · carried forward, unchanged

T4's `EXEMPT` pin must still read exactly `['components/ui', 'hooks/use-mobile.ts']`. The generated
`dialog.tsx` is already covered by the `components/ui` entry; **this phase adds nothing to that
list.** `new_note_dialog.tsx` is ours and is snake_case, so it passes on merit.

T5 is the tripwire for group 2. `sheet.tsx` and `dialog.tsx` are built on the same Radix primitive,
and if `shadcn add dialog` regenerates the sheet it will reintroduce the `ease-linear` and
`transition-all` that P1 deleted. T5 fails loudly in that case. **If T5 fails during group 2, the
install overwrote a file it should not have** — revert and re-add with the overwrite declined.

T6 still asserts every token is warm, and this phase changes no `@theme` value. Its job here is to
catch the generated dialog dragging an achromatic default in.

### T7 · The shell renders its chrome — *rewritten*

`app_shell.test.tsx`. The palette is gone from the sidebar, so the assertion moves rather than
disappearing:

- Exactly one `<main>` landmark. Unchanged, and still the constraint that stops a new wrapper
  nesting a second one.
- The header renders the sidebar trigger **and** a button with the accessible name `New note`.
- The button is not inside the `<main>`. Principle 4's board-surface clause is not amended and
  chrome must stay out of the board.
- No element with the accessible name `New butter note` — the palette's swatch label — exists
  anywhere in the shell. This is the assertion that would have quietly passed if the palette had
  merely been hidden.

### T8 and T10 · carried forward, unchanged

### T9 · The dormant components stay dormant — *list corrected*

P3 legitimately wakes `button`: the toolbar's New note control and the dialog's footer are both real
uses. It comes off `DORMANT`, which now reads
`['input', 'tooltip', 'sheet', 'skeleton', 'separator']`. `dialog` was never on the list — it
arrived in P3 already in use. **The list is corrected, not weakened:** the five remaining entries are
still asserted, and the test comment records why `button` left.

### T11 · The reducer is correct — *extended for decision D4*

`notes_reducer.test.ts` gains one case and one edit:

- `add` with a seed carrying `body: 'hello'` produces a note whose `body` is `'hello'`.
- `add` with a seed carrying `body: ''` still produces `body: ''`, `createdAt === updatedAt`, and
  `z === max + 1`. The existing assertions stay; the fixture seed gains the field.
- The note is still **appended**, not unshifted. P2's comment about array order being tab order is
  still the reason, and this phase must not quietly change it.

### T12–T14, T16–T19 · carried forward, unchanged

T14 is the persistence claim and is untouched by this phase — a note created from the dialog is the
same shape as one created from the palette, which is the point of **D4**.

T19 asserts the reducer is pure. `body` arrives on the seed, so the reducer still calls nothing
impure and T19 still passes for the same reason it did in P2.

### T15 · Colour is chosen at creation — *rewritten, moves to the dialog*

Was `note_palette.test.tsx` asserting a sidebar swatch click. The claim survives the phase; the
control does not. The assertion moves into `new_note_dialog.test.tsx` (T20) and T15's entry here
becomes a pointer, so that nobody reading the numbering assumes the criterion was dropped.

**`note_palette.test.tsx` is deleted, not skipped.** A skipped suite is a claim nobody is checking.

### T20 · Colour and text are chosen before the note exists — *criterion: deliverables 3 and 4*

`new_note_dialog.test.tsx`. Render the shell, open the dialog, choose a colour that is not the
default, type a body, submit. Then:

- Exactly one note is on the board.
- Its `color` is the chosen one, not `butter`.
- Its `body` is the typed text.
- `createdAt === updatedAt` — proof that **D4** was implemented as one dispatch and not as `add`
  followed by `edit_body`. This is the assertion that catches the shortcut.
- The dialog is closed.

### T21 · The swatches are a radiogroup — *criterion: decision D3*

- `getByRole('radiogroup')` exists and has an accessible name.
- Six `role="radio"` children, exactly one with `aria-checked="true"` at all times.
- The group holds **one** tab stop: five swatches have `tabIndex={-1}`.
- `ArrowRight` from the last swatch wraps to the first; `ArrowLeft` from the first wraps to the
  last. `Home` and `End` jump to the ends.
- Selection follows focus: after `ArrowRight`, the newly focused swatch is the checked one.

### T22 · The dialog opens focused on the textarea — *criterion: decision D3*

Open the dialog; `document.activeElement` is the textarea, not the first swatch and not the close
button. The text is the thought; the colour is a default that is usually fine.

### T23 · Enter in the textarea does not submit — *criterion: plan § 3.4*

Type two lines separated by `Enter` in the textarea and assert no note was created and the dialog is
still open, then assert the textarea's value contains a newline. `Cmd+Enter` (and `Ctrl+Enter`)
submits. A note body is multi-line; a form that submits on Enter would make the second line
unreachable from the keyboard, which is the exact failure **D1**'s amendment promised not to allow.

### T24 · `n` is inert while typing — *criterion: decision D6*

The suppression list, one assertion each:

- `n` with focus on the board opens the dialog.
- `n` with focus in a note's `<textarea>` does **not** open it, and the character reaches the
  textarea.
- `n` with focus in the dialog's own textarea does not re-trigger anything.
- `Ctrl+n`, `Meta+n` and `Alt+n` do not open it.
- `Shift+n` — that is, `N` — **does** open it. Deliberately not suppressed.

### T25 · The dialog is completable without a mouse — *criterion: mission.md principle 5 and the amended principle 2*

The end-to-end keyboard path, as one test: `n` to open, `Tab` to the radiogroup, `ArrowRight` to
choose, `Tab` to the textarea, type, `Ctrl+Enter`. A note exists with the chosen colour and the
typed body. This is the assertion the amendment in **D1** is answerable to — the amendment's own
wording makes the keyboard path a condition of the carve-out, so if T25 fails the amendment is not
satisfied and the phase has not shipped what it said it would.

### T26 · Escape closes without creating, and clears the draft — *criterion: plan § 3.6*

- Open, type a body, press `Escape`. No note is created.
- Reopen. The textarea is empty and the colour is back to `butter`. A cancelled draft is not a
  draft.
- Same for the Cancel button.

### Test setup

`dom_setup.ts` already stubs `matchMedia` and `crypto.randomUUID`. Radix's `Dialog` uses
`ResizeObserver` and pointer-capture APIs that jsdom does not implement; if the suite throws on
either, stub it in `dom_setup.ts` beside the existing stubs rather than mocking Radix. Mocking the
dialog primitive would make T21–T26 assert against a fake and prove nothing.

`boardBounds()` returns `DEFAULT_BOUNDS` in jsdom because every rect is zero, which is the existing
P2 behaviour and is why placement assertions stay out of this suite — T13 already covers the factory.

---

## Gate 3 — Manual checks

What a test cannot see. Run in a real browser, on a board that already has four or five notes.

1. **The two-second test, honestly.** Press `n`, type a sentence, `Cmd+Enter`. Time it. If this is
   slower than the palette was for a note you did not need to name, **D1**'s amendment bought less
   than it cost and that belongs in the PR description rather than being quietly ignored.
2. **The entry animation, at quarter speed.** DevTools animation panel. The panel must not appear
   from nothing, must not delay its first frame, and must finish inside 200ms. The overlay fades
   faster than the panel scales.
3. **`prefers-reduced-motion: reduce`,** set in DevTools rendering options. The dialog appears and
   leaves without a transform. Opacity still transitions — fewer and gentler, not zero. If the
   panel still scales, `[data-slot^='dialog']` did not match and plan § 2.5 was not finished.
4. **The button answers the press.** Hold the mouse down on **New note**: it scales to 0.97 and
   returns. This is the whole of the button's motion and it should be barely noticeable.
5. **Focus after close.** Open with the button, press Escape — focus is back on the button. Open
   with `n`, press Escape — focus is somewhere sane and reachable, not on `<body>`.
6. **The narrow width.** Below `sm` the button is icon-only. It is still tappable, still has an
   accessible name in the a11y tree, and the header does not wrap.
7. **The sidebar, collapsed to the rail.** Creating notes still works, because creation no longer
   lives in the sidebar at all. Principle 4's promise that the board stays fully usable with the
   sidebar collapsed is now easier to keep than it was, and this check confirms it.
8. **A screen reader pass** over the dialog: the title is announced, the radiogroup is announced
   with its name and the selected colour, and the textarea is reachable and labelled.

---

## Gate 4 — Constitution compliance

Read `mission.md` **after** the group 1 amendment and check the shipped app against it.

- **Principle 1, spatial not sorted.** The dialog changes nothing about placement — it calls the
  same `createNoteSeed` with the same measured bounds. No note moves because another was created.
- **Principle 2, as amended.** Editing is still in place on the note; no dialog was added to that
  path. Creation asks first, and T25 proves the keyboard can do all of it. **If T25 does not pass,
  this gate fails regardless of how the app feels** — the amendment made the keyboard path a
  condition, not an aspiration.
- **Principle 3, persistent by default.** No Save button was added. The dialog's **Add note** is a
  create button, not a save button, and the note it makes is persisted by the same debounced mirror
  as every other note.
- **Principle 4, as amended.** Chrome is in the sidebar and the toolbar. Nothing was added to the
  board surface. Per-note controls are untouched.
- **Principle 5, keyboard-reachable.** T25 and T24.
- **The one-sentence test.** Not amended, and Gate 3 check 1 is where it is actually judged.

Also check the amendment did not overreach: principle 2's replacement must still forbid a dialog
around *editing*. If a future reader could use the new wording to justify an edit modal, it is too
loose and should be tightened before merge.

---

## Merged means

- Gate 1 clean.
- T1–T26 pass; `note_palette.test.tsx` is deleted and no suite is skipped.
- Gate 3's eight checks done in a real browser, with check 1's timing written into the PR.
- Gate 4 walked against the amended `mission.md`, including the overreach check.
- `roadmap.md`, `tech-stack.md` and `README.md` corrected in the same commit, per **D8**.
- `grep -rn "NotePalette" src/` returns nothing.

## Explicitly not required

- Recolouring an existing note. That is **P6**.
- Any shortcut other than `n`. A shortcut system is not this phase.
- A visual regression suite for the dialog. Gate 3 check 2 is a human looking at it, and that is
  the standard P1 set for motion.
- Testing Radix's focus trap. It is a dependency's guarantee; T22 and T25 assert our use of it, not
  its internals.
