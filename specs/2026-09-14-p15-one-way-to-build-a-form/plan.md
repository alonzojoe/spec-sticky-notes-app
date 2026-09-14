# P15 · One way to build a form — Plan

A groundwork step and seven task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Groups end with `npm run build && npm run lint && npm test`. Commits are split by concern — `docs`,
`chore`, `refactor`, `test`.

**Ordering note.** The amendment is group 1 and lands before `npm install` runs, because
`tech-stack.md`'s hard rule says the file is updated *first*. Group 2 is the install alone, as a
`chore`, so the lockfile diff is never mixed with a code diff. Groups 3 to 6 are the four forms,
**smallest first** — one field, then one field with a dirty check, then five fields, then the note
view — so that by the time the hard one is reached the pattern has been settled three times on forms
where a mistake is obvious. **The note view is its own commit** with the suite green across it,
because it is the only one where a subtle behaviour change is plausible.

Every group is a `refactor` and every group ends on **29 suites, 790 passed** until group 7 adds to
it.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`npm test` is green on `main`** — 29 suites, 790 passed, measured at the start of this phase.
- **The four forms are independent.** No shared state, no shared component that holds a value:
  `note_fields.tsx`, `date_field.tsx` and `paper_radiogroup.tsx` are all `value`/`onChange` and none
  of them stores anything. That is what makes four separate commits possible.
- **`@tanstack/react-router` is already a dependency**, so the TanStack family's cadence is one this
  project has accepted. It also already brings `@tanstack/store` transitively, which is part of why
  the install is smaller than six new *names* suggests.
- **`components/ui/**` is untouched by this phase.** No generated component holds form state.

*Verified against the published types of `@tanstack/form-core@1.33.5` before this plan was written
— recorded here rather than assumed, and re-checked against the installed package in group 0:*

- **`listeners: { onChange, onChangeDebounceMs }` exists on a field** (`FieldListeners` in
  `FieldApi.d.ts`). This is what replaces the note view's `useDebounceCallback` pair.
- **`form.reset(values?)` exists** (`FormApi.d.ts`), which is what replaces the create dialog's
  `wasOpen` resync and its five-line close.
- **`state.isDirty` and `state.canSubmit` exist** on both form and field state.
- **React 19 is a supported peer.**

*To verify in group 0, after the install:*

- **A field's debounced listener cannot be cancelled from outside.** The note view currently cancels
  before opening the delete confirmation. If a cancel *does* exist, **D5**'s argument about stray
  writes is unnecessary and the code should simply use it — the decision is worth being wrong about
  cheaply. **Fallback if it does not exist, which is expected:** rely on the reducer's id match, and
  pin it with T91.
- **`form.Field` renders no element of its own**, so no test asserting DOM structure moves (**D7**).
- **The generics infer from `defaultValues`** without an explicit type argument, and a misspelled
  field name is a compile error rather than an `any`.
- **Vitest resolves the package** without a config change, the way it did for the router.

---

## 0. Groundwork

0.1 Branch `feat/p15-one-way-to-build-a-form` off **`main`** (#19 is merged).

0.2 Full gate. Record suite and assertion counts in the group-0 commit message — **29 suites, 790
    passed**. Every count in [validation.md](./validation.md) is measured against it.

0.3 Walk the "To verify" list against the installed package once group 2 has run, and record each
    answer. If the first item comes back the other way, revise **D5** in place before group 6.

---

## 1. The amendment — `docs`

**No code. The phase does not proceed if this is rejected.**

1.1 `tech-stack.md` § The stack gains the **Forms** row (**D1**), naming what it replaced and why
    nothing already here could do the job — which is what the hard rule asks for in as many words.

1.2 § Hard rules gains one line: **forms are built with `@tanstack/react-form`**, and the shared
    field components stay form-agnostic (**D2**). The second half matters more than the first: it is
    the decision most likely to be undone by somebody being helpful.

1.3 Commit: `docs(specs): name the form library before installing it`. The body carries **D1**'s
    counter-argument in full — three packages, and three of the four forms have one field.

---

## 2. The install — `chore`

2.1 `npm install @tanstack/react-form`. Nothing else. No schema library (**D6**), no `shadcn add`.

2.2 Record what actually arrives. **Specified as three and it is six** — `@tanstack/react-form`,
    `@tanstack/form-core`, `@tanstack/store`, `@tanstack/react-store`, `@tanstack/pacer-lite` and
    `@tanstack/devtools-event-client`. The correction goes into **D1** in the same commit, because
    the package count *is* the argument against this phase and it may not be the one number nobody
    checked.

2.3 Gate. **Nothing imports it yet**, so the suite must be untouched at 29 / 790 — an install that
    moves a test number has done something a package manager should not do.

2.4 Commit: `chore(deps): add @tanstack/react-form`. Lockfile and `package.json` only, and never
    mixed with a code change.

---

## 3. The intro — `refactor`

**The smallest form in the app, and therefore where the pattern is settled.**

3.1 `intro_dialog.tsx`: `useForm({ defaultValues: { name: '' }, onSubmit })`, one `form.Field` with
    an `onChange` validator rejecting a whitespace-only value, and a `form.Subscribe` on `canSubmit`
    around the button.

3.2 **Delete the duplicated guard.** `draft.trim() === ''` appears twice today — on the button and
    as an early return in `submit()`. One validator replaces both (**D3**).

3.3 Keep: `autoFocus` on the input, `autoComplete="name"`, no placeholder, the refusals on Escape
    and the backdrop, `showCloseButton={false}`, and the derived `open` prop. **None of that is form
    machinery** and none of it moves.

3.4 Gate — 29 / 790, and `user_name.test.tsx` in particular untouched.

3.5 Commit: `refactor(intro): one field, one validator`.

---

## 4. Settings — `refactor`

4.1 `settings_page.tsx`'s `NameSetting`: the same shape as group 3, plus `isDirty` in the
    `form.Subscribe` selector — which is what the hand-rolled `trimmed === name` was approximating
    (**D3**).

4.2 The default value is the stored name, so `isDirty` means *different from what is saved*, which
    is the question the button was asking all along.

4.3 `SampleSetting` and `ResetSetting` are **not touched**. Neither holds a value; a button that
    dispatches is not a form.

4.4 Gate — `settings.test.tsx`'s "inert on whitespace and on a name that has not changed" must pass
    **unedited**. It is the assertion that proves `isDirty` and the hand-rolled check agree.

4.5 Commit: `refactor(settings): the dirty check is the library's now`.

---

## 5. The create dialog — `refactor`

5.1 Five fields — `color`, `title`, `body`, `link`, `date` — with `defaultValues` built from
    `NOTE_COLORS[0]` and `todayISO()`.

5.2 **`form.reset({ …, date: todayISO() })` replaces the `wasOpen` resync** (**D4**), in the same
    place and for the same reason: a tab left open overnight must not offer yesterday.

5.3 **`form.reset()` replaces the five-line reset in `close()`.** Cancel and Escape both funnel
    through `close()` today and still do.

5.4 **Do not touch:** the `setTimeout(…, 0)` before `dispatch` and its comment — it is about Radix's
    focus scope, not about forms, and deleting it reintroduces the bug P3 wrote it for. Ctrl/Cmd+Enter
    stays a handler on the `<form>` element, because the keyboard path arrows onto a swatch and must
    submit from there.

5.5 `normalizeLink` still runs at submit as well as on the field's blur, because Ctrl/Cmd+Enter never
    blurs the input. It moves into `onSubmit`.

5.6 Gate — `new_note_dialog.test.tsx` untouched, all of it.

5.7 Commit: `refactor(new-note): five fields and one reset`.

---

## 6. The note view — `refactor`, alone

**The only group where a subtle behaviour change is plausible. It lands by itself, with the suite
green across it.**

6.1 Three fields — `title`, `body`, `link` — with `defaultValues` from the note. `key={note.id}` on
    `NoteView` stays: it is what makes those defaults right when a second note is opened.

6.2 `listeners: { onChange: dispatch…, onChangeDebounceMs: AUTOSAVE_MS }` on `title` and `body`.
    `AUTOSAVE_MS` keeps its current value — the debounce is behaviour, and this phase changes none.

6.3 **Delete `closeFromDOM`.** Closing reads `form.state.values`. Delete both `useDebounceCallback`s
    and all three `.cancel()` calls, and delete the locally-stateful title component if the field
    subsumes it.

6.4 `askToDelete` no longer cancels anything (**D5**). Write the reducer-id-match argument into the
    file as a comment, next to where the cancels were, or the next reader will re-add them.

6.5 The link still commits through `normalizeLink` on close, and still keeps its raw draft while
    typing — that is `note_fields.tsx`'s `LinkField` behaviour and it is unchanged.

6.6 Gate, then **loop the note view's tests ten times** — `for i in $(seq 1 10); do npx vitest run
    src/__tests__/note_view.test.tsx src/__tests__/note_editing.test.tsx; done`. A debounce
    behaviour that passes once is not a debounce behaviour that passes.

6.7 Commit: `refactor(note-view): autosave through field listeners, not the DOM`.

---

## 7. Coverage — `test`

7.1 **T88–T91** in the files that already own these surfaces rather than in a new file: this phase
    adds no surface, so a `forms.test.tsx` would be a file named after an implementation detail.

    - **T88** — `new_note_dialog.test.tsx`: the draft resets on Cancel *and* on Escape, and the date
      is recomputed when the dialog reopens.
    - **T89** — `settings.test.tsx`: `Save` is inert on an unchanged name, live on a changed one,
      and inert again once saved.
    - **T90** — `note_view.test.tsx`: one debounced write per burst of typing, and a flush on close
      that keeps the last keystroke — asserted through the store, never through a DOM query.
    - **T91** — `notes_reducer.test.ts`: `edit_body` and `edit_title` aimed at an id that is not on
      the board are no-ops. The property **D5** now leans on, pinned so a future reducer change
      cannot quietly remove it.

7.2 Gate, then loop the three touched test files ten times.

7.3 Commit: `test(forms): pin the four behaviours the refactor now leans on`.

---

## 8. The documents — `docs`

8.1 `tech-stack.md` — the tree's notes on the four files, and `note_fields.tsx`'s line saying it
    stays form-agnostic.

8.2 `roadmap.md` — P15 above *Planned, in order*, with its Done-when.

8.3 `README.md` — status to P15.

8.4 `mission.md` — **untouched**, and `validation.md` says so explicitly so the absence reads as a
    decision rather than an oversight.

8.5 Commit: `docs(specs): write P15 down`.

---

## Done when

Every form in this app is built the same way, the four hand-rolled containers are gone rather than
rewritten, the note view no longer reads its own values out of the DOM, and all 790 assertions that
passed before the phase still pass without one of them being edited.
