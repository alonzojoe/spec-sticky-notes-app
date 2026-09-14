# P15 · One way to build a form — Validation

The phase's Done-when: *every form in this app is built the same way, the four hand-rolled
containers are gone rather than rewritten, the note view no longer reads its own values out of the
DOM, and all 790 assertions that passed before the phase still pass without one of them being
edited.*

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, **chunk warning included — and this phase had to work for that.** Adding the library
pushed `vendor` from 449 kB to 512 kB and the 500 kB warning fired. **D9** split the one vendor
group into four (`react`, `radix`, `tanstack`, `vendor`), which is the fix P10's own comment in
`vite.config.ts` says to prefer. Largest chunk after: **190 kB**.

```
grep -n "chunkSizeWarningLimit" vite.config.ts
```

Empty. **The warning is gone because the bundle is split, not because the threshold moved.** This
grep is the whole of **D9** in one line, and it is the thing a future phase in a hurry would undo.

**The baseline is green.** `npm test` on `main` reports **29 suites, 790 passed**. Every count below
is measured against it.

Seven greps.

```
NO_COMMENTS='grep -vE ":[[:space:]]*(\*|//|/\*)"'

grep -rn "useState" src/components/layout/intro_dialog.tsx \
  src/components/layout/new_note_dialog.tsx \
  src/components/layout/note_view_dialog.tsx | eval $NO_COMMENTS
```

Empty. **The four hand-rolled containers are gone rather than rewritten** (**D7**). `settings_page.tsx`
is not in this list on purpose — it is checked separately below, because the file holds three
sections and only one of them is a form.

```
grep -n "useState" src/pages/settings_page/settings_page.tsx | eval $NO_COMMENTS
```

Empty. `NameSetting` was the only thing in that file holding a value; `SampleSetting` and
`ResetSetting` dispatch and hold nothing.

```
grep -rn "closeFromDOM\|data-slot=\"note-body\"\]\|querySelector.*note-view-title" src | eval $NO_COMMENTS
```

Empty. **D5**, and the single clearest statement of what this phase bought: the note view no longer
queries the DOM for values the program already has. The `data-slot="note-body"` attribute itself may
stay on the element — it is a styling and test hook like every other `data-slot` — but nothing reads
a value through it.

```
grep -rn "useDebounceCallback" src --include='*.tsx' | eval $NO_COMMENTS
```

**One hit: `src/context/notes_context.tsx`.** The board's 300 ms mirror stays exactly as it is —
this phase does not touch persistence. The note view's pair is gone, and with it the three
`.cancel()` calls that had to be remembered (**D5**). The count is pinned rather than asserted empty
so that deleting the wrong one fails here.

```
grep -rn "@tanstack/react-form" src/components/layout/note_fields.tsx \
  src/components/layout/date_field.tsx \
  src/components/layout/paper_radiogroup.tsx | eval $NO_COMMENTS
```

Empty. **D2**: the shared field components stay dumb. They take `value` and `onChange`, they are
renderable outside a form, and if this dependency is ever regretted the damage is four files rather
than eight. **This is the decision most likely to be undone by somebody being helpful**, which is
why it is a grep rather than a sentence in a docblock.

```
grep -rn "@tanstack/react-form" src/components/layout/search_dialog.tsx | eval $NO_COMMENTS
```

Empty. **D2**: a filter with no submit is not a form.

```
grep -rn "\bany\b" src/components/layout/intro_dialog.tsx \
  src/components/layout/new_note_dialog.tsx \
  src/components/layout/note_view_dialog.tsx \
  src/pages/settings_page/settings_page.tsx | eval $NO_COMMENTS
```

Empty. TanStack Form is heavily generic and `any` is the obvious way out of a type it infers.
`tech-stack.md` forbids it, and a form library is exactly where it would first appear.

**Dependencies.** `npm ls @tanstack/react-form` resolves; `package.json` gains **one** runtime
dependency and the lockfile gains **six** packages — `@tanstack/react-form`, `@tanstack/form-core`,
`@tanstack/store`, `@tanstack/react-store`, `@tanstack/pacer-lite` and
`@tanstack/devtools-event-client` — and no more.

**Six, where the phase was specified at three.** Corrected in **D1** rather than quietly accepted:
the package count is the case against this phase, so it is the one number that has to be right.
`pacer-lite` is TanStack's debouncing primitive and is what makes a field's `onChangeDebounceMs`
work — which is the note view's autosave, handed to a library rather than hand-rolled a second
time. **No dev dependency, no schema
library, no `shadcn add`** (**D1**, **D6**). `EXEMPT` is untouched: this phase adds no file and
renames none.

---

## Gate 2 — Automated assertions (Vitest)

T1–T87 come from P0–P14. **T88–T91 are new.** Baseline **29 suites, 790 passed**.

### The bar, which is most of this gate

**Every one of the 790 existing assertions passes untouched.** Not "passes after adjustment" —
untouched. This is a refactor, and an assertion that has to be edited is a behaviour that changed
(**D7**). The fix belongs in the refactor.

**The suite count does not move.** T88–T91 land in the files that already own these surfaces —
`new_note_dialog.test.tsx`, `settings.test.tsx`, `note_view.test.tsx`, `notes_reducer.test.ts` —
because this phase adds no surface, and a `forms.test.tsx` would be a file named after an
implementation detail rather than after something a user can do.

**One exception is declared in advance, so it cannot be used as a loophole for anything else.** If a
test asserts against DOM structure that the form wrapper changes, the change is recorded *here*,
naming the element and why. `form.Field` renders its children and no element of its own, so none is
expected. **Nothing else may move.** In particular: no test may be edited because a value now
arrives a tick later, because a button's `disabled` is computed differently, or because a query got
harder to write.

### Which existing tests are the real gate

Named because these four are the ones that would catch a behaviour change, and a green run that did
not exercise them would not mean much:

- **`user_name.test.tsx`** — the intro is blocking, submits on Enter, is inert on whitespace, and
  stores a trimmed name. Group 3 must not move any of it.
- **`settings.test.tsx`** — *"is inert on whitespace and on a name that has not changed"*. This is
  the assertion that proves `isDirty` and the hand-rolled check it replaced agree (**D3**). If it
  needs editing, they do not agree and the library is not doing what the hand-rolled check did.
- **`new_note_dialog.test.tsx`** — the whole keyboard path, Ctrl/Cmd+Enter included, and the
  roving-tabindex radiogroup. P3's amendment to principle 2 is conditional on these, so this file is
  a constitutional gate rather than only a regression one.
- **`note_view.test.tsx` / `note_editing.test.tsx`** — autosave, the flush on close, and the three
  routes out of the dialog.

### T88 · The create dialog resets, and it resets on every way out — `new_note_dialog.test.tsx`

- A draft typed into title, body and link, then **Cancel**: reopening shows an empty dialog.
- The same draft, then **Escape**: reopening shows an empty dialog. Both exits funnel through
  `close()` today, and `form.reset()` is what keeps that true without every path remembering.
- The colour returns to `NOTE_COLORS[0]`, and the swatch's checked state says so — a reset that left
  the radiogroup on the last choice would be invisible in the fields and wrong on the board.
- **The date is recomputed when the dialog reopens, not when it mounted.** Asserted with a fake
  clock advanced across a day boundary between the two opens: the second dialog offers the later
  date. This is what `form.reset({ …, date: todayISO() })` replaced the `wasOpen` resync with
  (**D4**), and *a tab left open overnight must not offer yesterday* is the whole reason the resync
  existed.

### T89 · Save knows whether anything actually changed — `settings.test.tsx`

- Inert on arrival, with the stored name in the field.
- Inert on whitespace.
- Live the moment the value differs from the stored name.
- **Inert again once saved**, without the page being re-rendered or the field being re-mounted —
  which is `isDirty` resetting against the new baseline rather than a stale comparison against the
  old one. The hand-rolled check got this right by comparing against `name` on every render; this
  asserts the library does too.
- Typing a change and then typing it back leaves the button inert.

### T90 · The note view autosaves on its own debounce, and loses nothing on the way out — `note_view.test.tsx`

**Asserted through the store, never through a DOM query.** The DOM query is the thing this phase
deleted; a test that reached for it would be pinning the implementation that went away.

- A burst of typing produces **one** write, not one per keystroke. Fake timers, advanced past
  `AUTOSAVE_MS` once.
- The stored body matches the last thing typed.
- **Closing flushes.** Type, close before the debounce elapses, and the store holds the last
  keystroke. This is the property `closeFromDOM` existed to provide and `form.state.values` now
  provides — and it is the single most likely thing to break silently in group 6.
- All three routes out of the dialog flush the same way: the ✕, Escape, and the backdrop.
- The title behaves identically, on its own field and its own listener.
- The link commits through `normalizeLink` on close, so a bare host is stored with its scheme —
  unchanged behaviour, asserted here because the link is the one field whose raw draft and committed
  value differ.

### T91 · A write aimed at a note that is gone lands nowhere — `notes_reducer.test.ts`

- `edit_body` and `edit_title` with an id that is not on the board return a board with the same
  notes and the same values.
- Nothing is created: the note count does not change.

**This is a property the reducer already had**, tested here for the first time because **D5** now
*leans* on it. The note view can no longer cancel a pending autosave before a delete — a field's
debounced listener has no public cancel — so a stray write after a note is removed is a real event
rather than a hypothetical, and it is safe only for as long as this stays true. **Without this test,
a future reducer change that made a stray write create something would be a bug with nothing between
it and the board.**

---

## Gate 3 — Manual checks, in a browser

A refactor's manual gate is short and specific: jsdom cannot see focus behaviour or timing at human
speed, and those are the two things a form library changes first.

**1 · The create dialog, filled entirely from the keyboard.** Open with `n`, type a body, Shift+Tab
to the title, arrow onto a swatch, Ctrl/Cmd+Enter from there. P3's amendment to principle 2 is
conditional on exactly this path working, so it is a constitutional check rather than a regression
one. **Where focus lands after the dialog closes matters as much as the note being created** — the
new note should be on the board, open and ready to type on.

**2 · Typing in a note, watched for lag.** The body is now a controlled field where it was
uncontrolled. Type a long paragraph quickly. jsdom cannot tell you whether that feels different;
nothing else can either. **If it drags, the fix is the field's subscription scope, not a retreat to
the DOM reads.**

**3 · The note view's three exits, each after a keystroke that the debounce has not yet written.**
✕, Escape, backdrop. The last thing typed must be on the card. The suite asserts this with fake
timers; this is the version where the timers are real.

**4 · The intro and the settings field, watched for a disabled button that lags a keystroke.**
`canSubmit` is computed from a validator now. If the button stays disabled for a frame after the
first character, that is visible and it is new.

**5 · Delete a note with an autosave in flight.** Type, and press delete before the debounce
elapses. Nothing should be written, nothing should appear, and no error should reach the console.
This is **D5**'s argument, performed rather than reasoned about.

---

## Constitution compliance

| Rule | How this phase satisfies it |
| --- | --- |
| `mission.md` — **untouched** | No principle is affected. Nothing about the interface changes, and this is stated rather than omitted so the absence reads as a decision. |
| principle 2 — the dialog carve-out is conditional on the keyboard | The create dialog's full keyboard path is unchanged and is asserted by an existing file that must not be edited, plus Gate 3 check 1. |
| principle 3 — persistent by default, no Save button | The note view still autosaves, on the same `AUTOSAVE_MS`. The three committing forms keep P3's carve-out for a value you commit. |
| principle 5 — keyboard-reachable | Enter, Ctrl/Cmd+Enter and the roving-tabindex radiogroup all survive with their existing assertions. |
| `tech-stack.md` — no new runtime dependency without updating this file first | The amendment is deliverable 1 and lands as its own commit before `npm install` runs (**D1**). |
| `tech-stack.md` — no `any`, `strict` on | Gate 1's last grep, on exactly the four files where a generic type would tempt one. |
| `tech-stack.md` — one reducer, no state library | A form library holds what is being typed; the board is still a `useReducer` behind Context and the reducer gains nothing. |
| `tech-stack.md` — `snake_case` | No file added, none renamed. |
| `tech-stack.md` — every colour and duration from a token | No styling change at all. |
| `roadmap.md` — `npm run build` passes before a phase is called done | **D9**. The phase caused the chunk warning and the phase fixes it, by splitting rather than by raising the limit — a refactor that leaves the build noisier than it found it has not finished. |
| `roadmap.md` — no phase leaves the app broken | Seven groups, each ending on a full green gate at 29 / 790. |
