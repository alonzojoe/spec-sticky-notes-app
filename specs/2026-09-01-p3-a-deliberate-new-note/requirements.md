# P3 · A deliberate new note — Requirements

**Phase:** P3 (fourth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-01
**Branch:** `feat/p3-a-deliberate-new-note` off `develop`
**Status:** specified, not started

---

## Context

P2 merged into `develop`. The app is genuinely usable: a six-swatch paper palette sits in the
sidebar under a **New note** group, one click puts a note on the board in that colour at a
non-overlapping position with a stored tilt, and the note opens focused and ready for typing.
`notes_reducer.ts` is pure and handles `add`, `edit_body`, `toggle_pin` and `delete`;
`lib/note_factory.ts` owns every impure part of creation; the board mirrors to
`sticky-notes:board:v1` through a debounced `useLocalStorage`. Sixteen Vitest suites and 355
assertions pass.

The shell is a collapsible sidebar plus a `SidebarInset` that renders `<main>`. Between them sits a
twelve-unit `<header>` in `app_shell.tsx` holding exactly one control — the `SidebarTrigger` — with
a comment explaining that it holds nothing else because below `md` the rail is hidden and the
trigger is the only pointer affordance for opening the sheet. That header is the only piece of
chrome outside the sidebar, and it has been empty on the right since P1.

This phase moves note creation out of the sidebar and into that header, behind a button that opens
a dialog where colour and text are both chosen before the note exists.

That is a change of intent, not only of layout, and it contradicts the constitution as written.
`mission.md` principle 2 says *"No modal dialog stands between me and a thought."*
`note_palette.tsx` cites that sentence directly in its own header comment to justify one-click
swatches. A phase cannot quietly do the thing the constitution forbids, so **D1** amends the
principle and says why. If the amendment is rejected, the phase does not ship — the sidebar palette
stays.

This phase also reclaims the P3 slot. `roadmap.md` currently carries **P3 · It remembers — absorbed
into P2** and **P4 · Write on them — absorbed into P2** as tombstones, kept so that phase numbers
written into P0's and P1's specs still resolve. **D8** rewrites the P3 heading for this phase and
moves its tombstone sentence into P2's own section, where it resolves just as well.

## Scope

Six deliverables.

1. **The constitution amendment.** `mission.md` principle 2 rewritten so the modal ban is scoped to
   *editing a note that already exists*, with an explicit carve-out for creation. The two-second
   capture test is left standing, and is paid for by deliverable 5 rather than by softening the
   wording (**D1**).
2. **The button.** A shadcn `Button` at the right edge of the existing `app_shell.tsx` header —
   `Plus` icon plus the label **New note**, label hidden below `sm`. No new layout component; the
   header becomes the toolbar that P9 and *Dark mode* already need (**D2**).
3. **The dialog.** `npx shadcn@latest add dialog`, and a new
   `src/components/layout/new_note_dialog.tsx`. Six paper swatches as a genuine radiogroup, a
   `<textarea>` for the body, and a Cancel / **Add note** footer. Swatches reuse `PAPER` and
   `paperLabel` from `lib/paper.ts` (**D3**).
4. **One action, one note.** `NoteSeed` gains a `body` field and the reducer's `add` case writes it
   instead of a hardcoded `''`. Creation stays a single dispatch, a single storage write, and a
   single `createdAt === updatedAt` note (**D4**).
5. **The keyboard path.** `n` opens the dialog from anywhere on the board, suppressed inside text
   fields and when any modifier is held. This is what keeps capture inside two seconds now that a
   dialog stands in the way, and principle 5 requires it regardless (**D6**).
6. **The palette is removed.** `note_palette.tsx` and `note_palette.test.tsx` are deleted, and
   `app_sidebar.tsx` drops the import and its now-stale P2 slot comment (**D5**).

Plus the documentation this phase invalidates: `roadmap.md`'s P3, P2 and P6 sections,
`tech-stack.md`'s file tree, shadcn component list and `NoteSeed` shape, and `README.md`'s status
line. All in this phase's commit (**D8**).

## Out of scope

Deferred deliberately.

- **Editing a note's colour after creation.** Still **P6**. The dialog picks a colour for a note
  that does not exist yet; recolouring one that does is a different control in a different place.
- **A command palette.** `n` is one shortcut, not a shortcut system. Anything `Cmd+K`-shaped is a
  later amendment.
- **Dragging.** Still **P5**. The dialog places a note through the existing `createNoteSeed`
  placement search and nothing here changes where notes land.
- **A note template or a title field.** The `Note` model gains `body` in its seed and nothing else.
- **Delete confirmation.** Still ***Polish***, and unrelated.
- **Extracting a `top_nav.tsx`.** Considered and rejected for now (**D2**). The header holds two
  controls after this phase. Extract it when P9 or *Dark mode* gives it a third.

## Decisions

### D1 · Amend principle 2 rather than violate it or route around it

`mission.md` principle 2 reads *"Direct manipulation. Drag the note itself. Edit text in place on
the note. No modal dialog stands between me and a thought."* A creation dialog is exactly the thing
that sentence forbids.

Three options were considered.

**Ship the dialog and leave `mission.md` alone.** Rejected. The constitution would say one thing
and the code do another from P3 onward, and `note_palette.tsx`'s deleted comment is proof the
project reads that sentence as binding.

**Keep the principle and use an anchored `Popover` instead.** Genuinely tempting: no overlay, no
focus trap, dismisses on outside click, and it satisfies the sentence literally. Rejected because
it satisfies the sentence and not its intent — a popover with a textarea and a confirm button is a
modal that has given up its focus management. If the interaction is going to be deliberate, it
should be honestly deliberate.

**Amend the principle.** Chosen. The new wording:

> **Direct manipulation.** Drag the note itself. Edit text in place on the note — no dialog stands
> between me and a thought I am already writing. Creating a note may ask for colour and text first,
> as long as the keyboard can open it, fill it, and dismiss it without touching the mouse.

The clause after the dash is the part that keeps its teeth. Editing is where the ban mattered — the
thought already exists and anything between the user and the paper is friction. Creation is the one
moment where a deliberate pause buys something: the colour is chosen with the text in front of you
rather than before you know what the note says.

The one-sentence test is **not** amended. Capture in under two seconds stays the bar, and **D6** is
how the phase pays for it.

### D2 · The existing header becomes the toolbar; no new component

`app_shell.tsx` already renders `<header className="flex h-12 shrink-0 items-center px-3">` with
`SidebarTrigger` inside it. The button goes in that header with `ml-auto`.

Extracting a `top_nav.tsx` with named slots for P9's search and *Dark mode*'s theme toggle was the
alternative. Rejected for now: after this phase the header holds two controls, and a layout
component wrapping two controls is indirection without a payer. P1's own rule — *"don't build
ahead; if a phase doesn't need it, don't install it yet"* — applies to structure as much as to
dependencies. When P9 adds the third control, extract it then, and the extraction will be
mechanical because everything is already in one header.

The header is chrome, and it is outside the board surface, so principle 4 is satisfied as written:
*"Global controls live in one collapsible sidebar and never on the board surface itself."* The
sidebar clause is amended by **D1**'s spirit but the board-surface clause — the one that actually
protects the notes — is untouched. **This is worth being precise about:** principle 4 says global
controls live in *one collapsible sidebar*. After this phase the primary global control does not.
**D8** therefore also amends principle 4's first sentence to *"Global controls live in the sidebar
and the toolbar above it, and never on the board surface itself."*

### D3 · The swatches are a radiogroup, not six buttons

In the sidebar the swatches were six independent buttons, and that was right: each one performed an
action immediately, and Tab reaching all six was correct because any of the six might be the one
you want.

Inside the dialog they are a single value being chosen, and six tab stops in a five-control dialog
is a worse form. The swatch row is `role="radiogroup"` with an accessible name, each swatch is
`role="radio"` with `aria-checked`, one tab stop enters the group at the selected swatch, and the
arrow keys move between them. This is the standard roving-tabindex radiogroup and it is what makes
`Tab, Tab, type, Enter` a complete interaction.

Default colour is `butter` — the first entry in `NOTE_COLORS`. Autofocus goes to the **textarea**,
not the swatches: the text is the thought, the colour is a default that is usually fine.

`PAPER` and `paperLabel` come from `lib/paper.ts` unchanged. Its header comment already explains
why the map is static rather than templated, and warns that it exists so two components cannot
drift; the dialog is now the second component and the warning is still exactly right.

### D4 · `NoteSeed` gains `body`; the reducer stops hardcoding `''`

The dialog produces a colour *and* text. The reducer's `add` case currently writes `body: ''`.

Dispatching `add` and then `edit_body` was the alternative and it is wrong in three ways: two
renders, two debounced storage writes, and — the one that actually breaks something — a note whose
`updatedAt` no longer equals its `createdAt`. `board.tsx` uses exactly that equality to decide which
note opens focused:

```ts
const openId =
  newest !== null && newest.body === '' && newest.createdAt === newest.updatedAt
    ? newest.id
    : null
```

So the change is to `NoteSeed`:

```ts
export interface NoteSeed {
  id: string
  color: NoteColor
  body: string
  x: number
  y: number
  tilt: number
  at: number
}
```

and `add` writes `body: action.seed.body`. `createNoteSeed(color, placement)` gains a `body`
parameter defaulting to `''`, so every existing call site and every existing test keeps its meaning.

The autofocus heuristic then gets *better* rather than merely surviving. A note created with text
in the dialog has `body !== ''` and does not steal focus — the thought is already written. A note
created empty has `body === ''` and opens focused on the board, which is the correct behaviour for
someone who opened the dialog, picked a colour, and pressed Enter without typing. Neither case
needed a new flag.

### D5 · The palette is deleted, not hidden behind a flag

`note_palette.tsx` and its 108-line suite go. `app_sidebar.tsx` loses the import, the
`<NotePalette />` element, and the line in its slot comment that reserves the P2 position.

Keeping both entry points was considered and rejected. Two ways to create a note is two things to
keep in sync — the placement call, the seed shape, the focus behaviour — for a feature that was
explicitly replaced rather than supplemented. The user asked for the sidebar route to go.

The sidebar after this phase is a header, a nav group, and a rail. That is thin, and it is honest:
P9 puts search and tags in it, *Dark mode* puts the theme toggle in it.

### D6 · `n` opens the dialog

The sidebar palette was one click. The dialog is a click, a decision, and a confirm. Without a
keyboard path that is a straightforward regression against the one-sentence test, which **D1**
deliberately declined to weaken.

`n` — a bare letter, no modifier — opens the dialog from anywhere. It is suppressed when:

- the event target is an `<input>`, `<textarea>`, or anything `isContentEditable`, so typing `n` on
  a note never opens a dialog;
- any of `ctrlKey`, `metaKey`, `altKey` is held, so browser and OS shortcuts are untouched;
- the dialog is already open.

`Shift` is deliberately *not* in that list — `Shift+n` produces `N` and should behave the same as
`n`. The listener goes on `document` inside `app_shell.tsx`, removed on unmount.

This is a keyboard-initiated action, so it must not feel animated. The dialog's entry animation is
already under 200ms (**D7**) and that is short enough to read as immediate; it is not suppressed
for the shortcut path, because a dialog appearing with no transition at all is the jarring case
that principle 2's replacement is trying to avoid.

### D7 · The dialog's motion is audited, not accepted

`shadcn add dialog` ships its own animation classes and this project has already replaced shadcn's
defaults twice — P1 deleted the sidebar's `ease-linear` and its cookie, and P2's **D11** noted that
installing nothing was itself the choice. The generated `dialog.tsx` gets the same treatment.

What the audit must enforce, against the tokens already in `index.css`:

- **No `zoom-in-0` or any `scale(0)` entry.** Nothing in the real world appears from nothing. Entry
  is `scale(0.96)` with `opacity: 0`, which is roughly shadcn's `zoom-in-95` and acceptable as
  generated if it is.
- **No `ease-in`.** `index.css` line 147 already carries the comment *"Never ease-in: it delays the
  first frame, which is the one being watched."* Entry uses `--ease-out`.
- **Under 200ms.** `--duration-drawer` is 200ms and is the ceiling for the panel; the overlay fade
  uses `--duration-hover` at 160ms.
- **`transform-origin` stays centred.** Popovers should scale from their trigger; a modal is not
  anchored to one and appears centred in the viewport. This is the one place the origin-aware rule
  does not apply, and the generated default is already correct.
- **Exit is faster than entry.** 160ms out against 200ms in.

The **New note** button gets `active:scale-[0.97]` with `transition-transform` at
`duration-(--duration-press)` and `--ease-out`, so it answers the press.

And the part that would otherwise ship a lie: `index.css`'s reduced-motion block currently reads

```css
@media (prefers-reduced-motion: reduce) {
  [data-slot^='sidebar'],
  [data-slot='note-card'] { … }
}
```

Those two selectors do not match a dialog. `[data-slot^='dialog']` is added to the list, so
`prefers-reduced-motion` collapses the dialog's transform and keeps its opacity — fewer and gentler,
not zero.

### D8 · Every document this phase invalidates is corrected in the same commit

- **`mission.md`** — principle 2 rewritten (**D1**); principle 4's first sentence widened to name
  the toolbar (**D2**).
- **`roadmap.md`** — the **P3 · It remembers** heading becomes this phase. Its tombstone sentence
  moves into P2's section, which already describes the persistence work, so any P3 reference in
  P0's or P1's specs still resolves to a true statement. P4's tombstone stays as it is. P2's bullet
  about the sidebar palette is corrected. **P6**'s closing paragraph currently reads *"colour is
  chosen at creation from the sidebar palette"* — it becomes *"from the new-note dialog"*.
- **`tech-stack.md`** — the file tree loses `note_palette.tsx` and gains `new_note_dialog.tsx` and
  `components/ui/dialog.tsx`; the shadcn component list gains `dialog`; the `NoteSeed` block in
  § Data model gains `body`.
- **`README.md`** — status line moves to P3.

### D9 · The note is handed over one macrotask after the dialog closes

Found while building, not while planning, and it changes a line of the implementation rather
than any of the decisions above.

Dispatching `add` inside the submit handler mounts the new note while the dialog is still
mounted. The note therefore lands inside Radix's focus scope, which pulls focus back out of
it; the textarea blurs, `note_card.tsx`'s blur handler closes edit mode, and the note that was
supposed to be *"focused and ready for typing"* is sitting there closed. The failure is silent
— the note exists, the colour is right, the text is right — which is exactly the kind of thing
that ships.

`setTimeout(…, 0)` after `close()` puts the note on a board with nothing competing for focus.
Two alternatives were tried and rejected: dispatching from `onCloseAutoFocus` works under
`user-event` but never fires under `fireEvent`, so it fails in the two suites that drive the
app with fake timers; and `preventDefault` on that same event stops Radix restoring focus to
the trigger but does not stop the focus scope's teardown from blurring the note first.

The cost is that any test creating a note through the dialog with fake timers must flush that
macrotask. `note_editing.test.tsx` and `persistence.test.tsx` do so in their `addNote` helper,
and say why.

### D10 · `@testing-library/user-event` is a new devDependency

`fireEvent` dispatches one event at a time and cannot express a roving-tabindex radiogroup or
a modifier chord. **D1**'s amendment made the keyboard path a *condition* of the carve-out, so
asserting it with synthesised single events would be asserting the wrong thing. `user-event`
is a devDependency and reaches no bundle; it is recorded in `tech-stack.md`'s stack table.

## Constraints inherited from the constitution

- **One phase, one commit.** Work in as many commits as the plan needs; the PR squashes.
- **`npm run build`, `npm run lint`, `npm test` all pass, warning-free,** before the phase is done.
  `eslint.config.js` gains no new override and no `// eslint-disable` appears in our own code.
- **The app is never left broken.** Group ordering in [plan.md](./plan.md) exists for this reason:
  the dialog works from the button before the palette is deleted.
- **Every file we author is `snake_case`.** `new_note_dialog.tsx` complies. `components/ui/dialog.tsx`
  is generated and is covered by the existing `EXEMPT` pin, which **must not be edited**.
- **Warm tokens only.** No `@theme` value changes this phase; the generated `dialog.tsx` must use
  existing tokens and add none.
- **Keyboard-reachable.** **D3** and **D6** are this constraint, not extras.

## Risks

**The amendment is the phase's real content.** If **D1**'s rewrite is not accepted, deliverables
2–6 are all wrong and no amount of good implementation rescues them. This is why the amendment is
deliverable 1 and why the plan writes it before the button.

**The generated animation classes were dead on arrival — confirmed, not a risk any more.**
`shadcn add dialog` shipped `animate-in`, `fade-in-0` and `zoom-in-95`, which come from
`tw-animate-css`. This project has never installed it, so those utilities compiled to nothing.
They also key off `data-open` / `data-closed`, while Radix emits `data-state="open"` /
`data-state="closed"`. The generated dialog — and the `sheet` P1 shipped — therefore had no
animation at all. **D7**'s audit is consequently a rewrite rather than a tidy-up: four
`@keyframes` in `index.css` on the existing duration and easing tokens, keyframes rather than
transitions because Radix waits on `animationend` before unmounting and an exit transition
never gets to run. The dead classes are stripped from `dialog.tsx`. The same latent problem
still exists in `sheet.tsx`; fixing it is not this phase's scope, and it is written down here
so the next phase to touch the mobile sidebar knows.

**`shadcn add dialog` may overwrite or regenerate neighbouring files.** P2 installed nothing, so
this is the first `add` since P1. The plan pins the pre-install state and diffs afterwards
(plan § 1.2). If it touches `button.tsx` or `sheet.tsx` — `sheet` is built on the same Radix
primitive as `dialog` — the diff is reviewed rather than accepted, because P1's sidebar amendments
live in that neighbourhood and T5 guards them.

**`n` may collide with typing in a place we did not think of.** The suppression list in **D6** covers
inputs, textareas and `contenteditable`. The note body is a `<textarea>`, so the main case is
covered, and T24 asserts it. The risk is a future phase adding a text control that is none of those
three; the listener is one function in `app_shell.tsx` and the fix would be local.

**Deleting the palette removes the only creation path with a visible colour.** If the dialog has a
bug that blocks submission, there is no fallback way to make a note. The plan's group ordering makes
this a short window — the dialog is complete and tested before group 5 deletes the palette — but the
window is real and is the reason for that ordering rather than the reverse.
