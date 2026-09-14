# P15 · One way to build a form — Requirements

**Phase:** P15 (fifteenth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-14
**Branch:** `feat/p15-one-way-to-build-a-form` off `main`
**Status:** specified

---

## Context

Fifteen phases in, this app has four places where somebody fills something in, and **four different
ways of holding what they typed.**

- `intro_dialog.tsx` — one `useState`, and a `draft.trim() === ''` guard repeated on the button and
  in the submit handler.
- `settings_page.tsx` — one `useState`, plus a hand-rolled *has this actually changed* check.
- `new_note_dialog.tsx` — five `useState`s, a `wasOpen` resync that recomputes the date when the
  dialog opens, and a five-line reset that every exit path has to remember to call.
- `note_view_dialog.tsx` — one `useState` for the link, a locally-stateful title component, a body
  that is **uncontrolled and read back out of the DOM at dismissal**, and two `useDebounceCallback`s
  that must be `.cancel()`ed in three separate places.

None of that is wrong. Each was the right amount of machinery for the form in front of it, written
in the phase that needed it, and each is a little different because each was written alone. What it
adds up to is that **there is no answer to "how do I add a form to this app"** except *read the
nearest one and copy it* — and the nearest one is different depending on which one is nearest.

This phase gives that question one answer: **`@tanstack/react-form`**. Every form in the app moves
onto it, the hand-rolled machinery is deleted rather than reimplemented, and nothing a user can see
changes.

**This is a refactor, and the suite is the proof.** 790 assertions pass on `main` today and all 790
must pass untouched. An assertion that has to be edited is a behaviour that changed, and the fix
belongs in the refactor rather than in the expectation.

## Scope

Seven deliverables.

1. **The amendment** — a new runtime dependency, named in `tech-stack.md` before it is installed
   (**D1**).
2. **The install** — `@tanstack/react-form`, and nothing else (**D1**).
3. **`intro_dialog.tsx`** — one field, `canSubmit` (**D3**).
4. **`settings_page.tsx`** — one field, `canSubmit` and `isDirty` (**D3**).
5. **`new_note_dialog.tsx`** — five fields, `form.reset()` (**D4**).
6. **`note_view_dialog.tsx`** — three fields with listeners, and the DOM reads deleted (**D5**).
7. The tests and the documents this invalidates (**D7**, **D8**).

## Out of scope

- **`search_dialog.tsx`.** It has an input and it is not a form: no submit, no fields, no values to
  collect — a query that filters a list as you type, with a roving selection and an Escape that
  clears. Wrapping it would be a form of one field that never submits, and it would keep every
  keyboard handler it has. **D2.**
- **Field-level error UI.** No inline error text, no `aria-invalid`, no error-on-blur. This app has
  no error state anywhere today, and adding one is a design decision on four surfaces rather than a
  refactor (**D6**).
- **A schema library.** No zod, no valibot, no Standard Schema adapter. Validators are plain
  functions calling `lib/` (**D6**).
- **Making the shared field components form-aware.** `TitleField`, `LinkField`, `DateField` and
  `PaperRadiogroup` keep `value`/`onChange` and import nothing new (**D2**).
- **Any change to what a note is, or to any stored key.** No migration, no version bump. The
  reducer, `lib/` and `types/note.ts` are untouched.
- **Any visible change at all.** **D7** is the bar and it is absolute.

## Decisions

### D1 · The dependency is named before it is installed

`tech-stack.md` § Hard rules:

> **No new runtime dependency without updating this file first**, with a line explaining what it
> replaced and why nothing already here could do the job.

So the amendment is deliverable 1, it lands as its own commit before `npm install` runs, and
rejecting it kills the phase while the cost is one file. The row it adds:

| Concern | Choice | Notes |
| --- | --- | --- |
| Forms | **`@tanstack/react-form`** | Arrives in P15. One way to hold what somebody typed, replacing four. |

**What it replaced**, written out because the rule asks for it: four hand-rolled field containers,
two open-and-reset resyncs driven by `useState`, one hand-rolled dirty check, one dismissal path
that reads values back out of the DOM, and a `useDebounceCallback` pair whose cancel-on-unmount is
broken in the library that ships it (P13 found that; `notes_context.tsx` carries the workaround).

**Why nothing already here could do the job.** `usehooks-ts` has no form primitive. React has no
form state. The alternative to a library is a fifth hand-rolled container, written a fifth way, that
the sixth form copies.

**The honest counter-argument, kept rather than answered away.** Three of the four forms have **one
field**, and a form library for a single text input is overkill measured on its own. It earns its
place on the fourth — the note view, where it deletes a DOM query and a pair of manually cancelled
debounces — and on there being exactly one answer to how the fifth form gets written. If that is not
worth six packages, this phase is the one to reject.

**Six packages, one direct dependency — and this was written as three.** The spec said
`@tanstack/react-form` pulls `@tanstack/form-core` and `@tanstack/react-store`. Installing it pulls
those plus `@tanstack/store`, `@tanstack/pacer-lite` and `@tanstack/devtools-event-client`. Corrected
here rather than left to be discovered in review, because **the number is the counter-argument**: the
case against this phase is cost-for-benefit, and the cost is twice what the case was argued against.

`pacer-lite` is the one worth knowing about rather than merely counting: it is TanStack's
debouncing primitive, and it is what makes a field's `onChangeDebounceMs` work — so the note view's
autosave is not being hand-rolled a second time, it is being handed to a library whose job that is.
`devtools-event-client` is a devtools transport that nothing in this app talks to.

`@tanstack/react-router` is already here, so the family and its release cadence are ones this
project has already accepted.

**Nothing else is installed.** No schema library (**D6**), no `shadcn add`.

### D2 · What is a form, and what only looks like one

**Four surfaces move.** `intro_dialog.tsx`, `settings_page.tsx`, `new_note_dialog.tsx`,
`note_view_dialog.tsx`.

**`search_dialog.tsx` does not**, and the line is worth drawing because it is the same line the
roadmap's *Tags* entry draws between a section and a lens. A form **collects values and commits
them**. The palette collects nothing: it filters a list while you type, its selection is a roving
index rather than a value, Escape clears it, and there is no submit — pressing Enter *opens a note*,
which is a navigation rather than a commit. Wrapped in a form it would be a form of one field that
never submits, keeping every keyboard handler it already has, and the only thing gained would be
the ability to say every input in the app is in a form.

**The shared field components stay dumb.** `TitleField`, `LinkField`, `DateField` and
`PaperRadiogroup` keep taking `value` and `onChange` and know nothing about any form. Each call site
wraps them:

```tsx
<form.Field name="title">
  {(field) => (
    <TitleField value={field.state.value} onChange={field.handleChange} id="new-note-title" />
  )}
</form.Field>
```

Three reasons, in order of how much they matter. The library stays **replaceable** — a component
that only draws an input should not import a form library, and if this dependency is ever regretted
the damage is four files rather than eight. The components stay **renderable and testable outside a
form**, which `paper_radiogroup.tsx` in particular already relies on. And `note_fields.tsx` keeps
its one job: it draws a labelled input and it judges nothing.

The alternative considered and rejected was a `withField` adapter that would cut the call-site
boilerplate. It keeps the components dumb too, and it costs a layer of generics that nobody reading
the create dialog can skip past. Four call sites is not enough boilerplate to buy that.

### D3 · The one-field forms, and what a disabled button is allowed to know

**`intro_dialog.tsx`** — one field, `name`, with an `onChange` validator that rejects a
whitespace-only value. The submit button subscribes to `canSubmit`:

```tsx
<form.Subscribe selector={(state) => state.canSubmit}>
  {(canSubmit) => <Button type="submit" disabled={!canSubmit}>Get started</Button>}
</form.Subscribe>
```

The guard that was written twice — once on the button's `disabled`, once as an early return in
`submit()` — becomes one validator. **That duplication was the bug waiting to happen**: two
expressions that have to agree about what an empty name is, in a dialog that cannot be closed any
other way.

**`settings_page.tsx`** — the same field, plus `isDirty`, which is what the hand-rolled
`trimmed === name` check was approximating. The button is live when the form can submit *and*
something actually changed.

**Neither dialog gains a validator that rejects anything a user could not already fail to submit.**
The button is inert in exactly the cases it is inert today. **D6** is why there is no message under
the field saying so.

### D4 · The create dialog, and the reset that had to be remembered

Five fields — `color`, `title`, `body`, `link`, `date` — and the two pieces of hand-rolled state
management both go.

**The `wasOpen` resync.** Today:

```ts
const [wasOpen, setWasOpen] = useState(open)
if (open !== wasOpen) {
  setWasOpen(open)
  if (open) setDate(todayISO())
}
```

That is React's own documented pattern for state that follows a prop, and it is correct. It exists
because *a tab left open overnight must not offer yesterday*. It becomes `form.reset({ ...,
date: todayISO() })` in the same place, which says the thing it means: **when this opens, it is a
new note.**

**The five-line reset on close.** `close()` sets five values back to their defaults, and the comment
above it — *reset on close rather than on submit, so Cancel and Escape clear the draft too* — is a
note about a rule every exit path has to remember. `form.reset()` is one call, and the rule survives
by there being nothing to forget.

**What does not change.** The `setTimeout(…, 0)` before `dispatch` stays exactly as it is, with its
comment. It is not form machinery — it is about Radix's focus scope pulling focus out of a note that
mounts while the dialog is still up — and a phase that deleted it because it looked like a
workaround would ship the bug P3 wrote it for. Ctrl/Cmd+Enter stays a handler on the `<form>`
element, for the reason written there: the keyboard path arrows onto a swatch and has to submit from
*there* too.

**The link is still normalised at submit as well as on blur**, because Ctrl/Cmd+Enter never blurs
the field. That moves into the form's `onSubmit` and stays a call to `normalizeLink`.

### D5 · The note view, which is the reason this phase is worth doing

The other three forms are tidying. This one deletes a category of thing.

**Today** the body is an **uncontrolled textarea** whose value is read back out of the DOM at
dismissal:

```ts
const closeFromDOM = (root: Element | Document) => {
  const body = root.querySelector<HTMLTextAreaElement>('[data-slot="note-body"]')
  const title = root.querySelector<HTMLInputElement>('#note-view-title')
  close(body?.value ?? note.body, title?.value ?? note.title)
}
```

That is there for a good reason — *both are read from the DOM at dismissal rather than mirrored into
state on every keystroke, which is what keeps typing in a note from re-rendering the board behind
it* — and it is still a query by CSS selector for a value the program already had. It has two
fallbacks in it, and both of them are what happens when a selector stops matching.

**After**: three fields — `title`, `body`, `link` — each carrying its own autosave:

```tsx
<form.Field
  name="body"
  listeners={{
    onChange: ({ value }) => dispatch({ type: 'edit_body', id: note.id, body: value, at: Date.now() }),
    onChangeDebounceMs: AUTOSAVE_MS,
  }}
>
```

`closeFromDOM` is **deleted**. Closing reads `form.state.values`, which is current by construction,
so *the last keystroke before closing is never lost* stops depending on a selector finding a node.
The two `useDebounceCallback`s go with it, and so do the three `.cancel()` calls.

**Two costs, stated here rather than discovered in review.**

**A field's debounced listener cannot be cancelled.** `askToDelete()` currently cancels both
autosaves before opening the confirmation, so a body is not written to a note that is about to be
removed. It no longer can — and **it does not need to**: `edit_body` and `edit_title` map over
`state.notes` and touch only the matching id, so a write aimed at a note that no longer exists lands
nowhere and returns a new state with the same contents. That is the reducer's existing behaviour
rather than something this phase adds, which is exactly why **T91 pins it**: the property is now
load-bearing, and a future reducer change that made a stray write *create* something would be a bug
with no test between it and the board.

**Typing now re-renders one field's subtree, where today it re-renders nothing.** TanStack Form's
subscriptions are per-field, so the dialog does not re-render and the board is unaffected — the
board was already protected by the debounce, which is unchanged at `AUTOSAVE_MS`. Zero to one scoped
subtree per keystroke is the price of deleting the DOM reads, and it is the right trade at the size
of a note.

**The `key={note.id}` on `NoteView` stays.** The form's `defaultValues` come from the note, and
remounting on a different id is what makes them right. Without it, opening a second note would show
the first one's draft — which is the bug the key was added for, unchanged in shape by the form.

### D6 · No error UI, and no schema

**Validators are plain functions**, and they call `lib/`:

```tsx
validators={{ onChange: ({ value }) => (value.trim() === '' ? 'A name is required' : undefined) }}
```

**No zod.** TanStack Form speaks Standard Schema and zod would drop straight in, and the entire
validation surface of this app is *is this string empty* and *is this a URL* — and `lib/links.ts`
already answers the second one and is the only thing entitled to. A schema library would be a second
new runtime dependency in one phase and a second definition of what a valid link is. `normalizeLink`
stays the only judge.

**No error messages are rendered.** The validators return strings because that is the API, and
nothing reads them: they exist to drive `canSubmit`. **This app has no error state anywhere today** —
not on the link field, which deliberately treats an unparseable URL as *no link* rather than as a
mistake, and not on the name. Adding inline errors is new UI on four surfaces, it is a design
decision with real copy in it, and a phase called *one way to build a form* is not where it belongs.
The moment it is wanted, the validators are already there.

### D7 · Nothing a user can see changes, and 790 assertions say so

**The bar is absolute: every existing assertion passes untouched.** `npm test` on `main` reports
**29 suites, 790 passed**. Same 29, same 790, after each group.

**An assertion that has to be edited is a behaviour that changed**, and the fix belongs in the
refactor. There is one narrow exception, declared in advance so that it cannot be used as a loophole
for anything else: a test that asserts against the *DOM structure* the form wrapper introduces. The
render-prop children of `form.Field` add no element — `form.Field` renders its children and nothing
of its own — so no such change is expected, and if one appears it is written down in `validation.md`
with the element that moved and why.

**The four things that get deleted rather than reimplemented**, which is the phase's actual output:

| Deleted | Replaced by |
| --- | --- |
| `wasOpen`/`setWasOpen` resync (create) | `form.reset({ …, date: todayISO() })` |
| The five-line reset in `close()` | `form.reset()` |
| `trimmed === '' \|\| unchanged` (settings) | `canSubmit`, `isDirty` |
| `closeFromDOM` + two `useDebounceCallback`s + three `.cancel()`s | field `listeners`, `form.state.values` |

### D9 · The bundle warning the dependency caused, fixed the way P10 fixed it

**Adding the library pushed the build past rollup's 500 kB chunk warning**, which every phase's
Gate 1 has required to be silent — *warning-free, chunk warning included*. `vendor` went from 449 kB
to 512 kB. Discovered while running the gate, not predicted, and recorded here rather than fixed
quietly.

**P10 hit this exact wall and wrote down which fix is correct.** Its comment in `vite.config.ts`:

> Splitting the dependencies out is the fix rather than raising the limit: React, Radix and the
> router change on an npm install, and our own code changes every commit, so a returning visitor
> re-downloads the half that actually moved.

So the same argument applies one level deeper, and it is the same fix rather than a new one. The one
`vendor` group becomes four, ordered so the first match wins:

| Group | What is in it | When it changes |
| --- | --- | --- |
| `react` | `react`, `react-dom`, `scheduler` | almost never |
| `radix` | `radix-ui`, `@radix-ui/*` | when a component is added |
| `tanstack` | `@tanstack/*` — router, form, store, pacer | its own fast cadence |
| `vendor` | everything else in `node_modules` | rarely |

Largest chunk after the split: **190 kB**. The warning is gone because the bundle is split, not
because the threshold moved — **`chunkSizeWarningLimit` is not touched**, and that is the whole
point of doing it this way.

**This is scope this phase did not ask for**, and it is in rather than deferred for one reason: the
phase caused it. A refactor that leaves the build noisier than it found it has not finished, and the
next phase would inherit a warning with no note saying which commit produced it.

**It also makes the dependency's real cost visible**, which the package count in **D1** only
gestures at: `@tanstack/*` is now a 139 kB chunk of its own, most of which is the router that was
already here. A reader who wants to know what the form library costs can now read it off a build.

### D8 · Documents corrected in the same phase

- **`tech-stack.md`** — the Forms row (**D1**), the hard rule about what a form is built with, and
  the tree's notes on the four files. `note_fields.tsx`'s line says explicitly that it stays
  form-agnostic, because that is the decision most likely to be undone by accident.
- **`roadmap.md`** — P15 written down above the *Planned, in order* list, which the list's own
  preamble allows.
- **`README.md`** — status to P15.
- **`vite.config.ts`** — the four code-splitting groups and the comment saying why (**D9**). Not a
  document, but it carries the same argument and it is edited in the same phase.
- **`mission.md`** — **untouched.** No principle is affected: nothing about the interface changes,
  and principle 3's *no Save button* carve-out for committed values is exactly as P3 left it.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.** Green on `main` today.
- **One new runtime dependency, named in `tech-stack.md` first** (**D1**). No dev dependency, no
  `shadcn add`.
- **No `any` in committed code**, `strict` on. TanStack Form is heavily generic and the inference
  from `defaultValues` is what keeps this true — a field name that is not a key of the default
  values is a compile error, which is a property worth having rather than one to work around.
- **`snake_case` for every file we author.** This phase adds no file and renames none.
- **Every colour, radius and duration from a token.** No styling changes at all.
- **Keyboard-reachable** (principle 5). The create dialog's Ctrl/Cmd+Enter, the intro's Enter, the
  settings field's Enter and the roving-tabindex radiogroup all survive unchanged, and each has an
  existing assertion.
- **Persistent by default, no Save button** (principle 3). The note view still autosaves on the same
  debounce; the three committing forms keep the carve-out P3 made and P13 and P14 reused.

## Risks

**This is the largest diff-to-visible-change ratio of any phase so far.** Four files rewritten,
nothing on screen different. That is the definition of a refactor and it is also how a real
behaviour change rides along unnoticed — which is why the bar is *every existing assertion, passing,
untouched*, why the note view lands in its own commit with the suite green across it, and why the
four simple forms land smallest-first rather than together.

**The note view is genuinely subtle and the tests around it are the thinnest.** Its autosave is a
timing behaviour, its dismissal has three routes into it, and its current implementation reaches
into the DOM. T90 and T91 are new because the existing coverage would not catch a debounce that
fired twice or a flush that dropped the last keystroke.

**The dependency is visible in the bundle, and now it is visible in the build output too.** **D9**
split the vendor chunk rather than raise the warning threshold, which means the next dependency that
pushes a group past 500 kB gets the same conversation rather than a silent pass. That is the
intended consequence.

**A form library is a floor, not a ceiling.** Once it is here, the cost of adding a field is low
enough that fields get added — and `mission.md`'s one-sentence test is about capture being fast. The
create dialog has five fields and that is already the most this app should ask for. **Nothing in
this phase adds a field, and the next phase that wants to should have to argue for it on the
mission's terms rather than on how easy it now is.**

**Six packages for four forms, three of which have one field** — and the phase was specified
believing it was three. Stated as the counter-argument in **D1** rather than buried here, with the
correction kept visible. It is the reason this phase could reasonably be rejected, and the
reason the amendment is deliverable 1.
