# P6 · A note with a date — Requirements

**Phase:** P6 (sixth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-01
**Branch:** `feat/p6-a-note-with-a-date` off `feat/p5-a-board-that-lines-up`
**Status:** specified

---

## Context

P5 turned the board into a CSS grid ordered newest-first, deleted free positioning, and reduced a
stored note to `id`, `body`, `color`, `order`, `pinned`, `createdAt`, `updatedAt`. Notes are created
from a toolbar dialog, edited in place on the card in a plain `<textarea>`, and dragged onto one
another to swap places. Seventeen Vitest suites and 387 assertions pass.

Two things about that board are unsatisfying and this phase fixes both.

Cards are as tall as their content, so a grid of a one-line note beside a ten-line note has ragged
rows. And a note is only as readable as it is short: a long note either makes its card enormous or
gets cut off with no way to read the rest, because the card *is* the reader.

This phase gives every note a **date**, makes every card the **same height** with its body
**truncated**, and moves reading and editing into the note's **own view**. Clicking a card opens it;
the full text is there, editable, with the colour and the date.

That last part is the third amendment to `mission.md` principle 2, and unlike the first two it
leaves nothing of the original standing. P2's contract was *"Click a note, type on it, it saves
itself"* and principle 2 said *"Edit text in place on the note."* P3 amended that principle to
scope its modal ban to editing — *"no dialog stands between me and a thought I am already
writing"* — and kept the in-place clause as the part with teeth. **D1** removes it.

What is **not** amended is principle 3: *"There is no Save button. State is written as it changes."*
That constrains this phase rather than yielding to it, and **D5** is where it bites.

## Scope

Seven deliverables.

1. **The constitution amendment.** `mission.md` principle 2 rewritten so reading and editing happen
   in the note's own view; the Core scope bullet promising inline editing corrected (**D1**).
2. **The date.** `Note` gains `date: string`, an ISO `YYYY-MM-DD` calendar date — stored ISO,
   displayed `MM/DD/YYYY` (**D2**).
3. **The picker.** `npx shadcn@latest add calendar popover`, and a `date_field.tsx` shared by both
   dialogs. The create dialog defaults it to today (**D3**).
4. **The card.** Fixed height, the date top-left in tabular figures, a gap, then the body clamped to
   a fixed number of lines with an ellipsis. The whole card opens the note (**D4**).
5. **The note view.** `note_view_dialog.tsx` — the full body in a textarea, the colour swatches, the
   date field. **No Save button**; it autosaves exactly as the card used to (**D5**).
6. **The card stops being an editor.** `note_card.tsx` loses its `<textarea>`, its debounce, its
   blur handler and its `startEditing` prop. One way to edit (**D6**).
7. **Migration.** The defensive read gives a stored note without a `date` one derived from its
   `createdAt`. `version` stays `1` (**D7**).

Plus the documents this invalidates (**D8**).

## Out of scope

- **Time of day.** A calendar date, not a timestamp. No hours, no timezone conversion.
- **Sorting or filtering by date.** The grid is still ordered by the `order` stamp and dragging is
  still what changes it. A date that silently reordered the board would undo P5.
- **Due dates, reminders, overdue styling.** `mission.md` puts reminders and notifications out of
  scope, and a date field is not a licence to add them.
- **Date ranges, recurring dates, or more than one date per note.**
- **Locale-aware formatting.** `MM/DD/YYYY` is specified literally (**D2**).
- **Markdown rendering in the view.** Still **P10**. The view shows raw text.
- **Recolouring from the card.** The view dialog carries the swatches, which discharges what the old
  P6 was for; a per-card colour control is not added.

## Decisions

### D1 · Principle 2 loses its last original clause

Currently, after P3's amendment:

> 2. **Direct manipulation.** Drag the note itself. Edit text in place on the note — no dialog
>    stands between me and a thought I am already writing. Creating a note may ask for colour and
>    text first, as long as the keyboard can open it, fill it, and dismiss it without touching the
>    mouse.

The replacement:

> 2. **Direct manipulation.** Drag the note itself to reorder it. A card is a summary — click it and
>    the note opens for reading and editing, with its colour and its date. Whatever opens a note
>    must open, fill and dismiss from the keyboard alone.

This is worth being honest about: **the principle is now the opposite of what it was written to
protect.** P2's note card was a piece of paper you typed on directly; a card is now a summary you
click to open. The keyboard clause is what carries over, and it is the only thing keeping this from
being a licence to put everything behind a dialog.

The Core scope bullet *"**Inline editing with autosave** — click a note, type on it, it saves
itself"* becomes *"**Open and edit** — click a note to read it in full and edit it; it saves itself,
with no Save button."*

Keeping the card editable *as well* was considered and rejected: two editing paths means the
debounce, the save-on-blur and the focus behaviour all exist twice and drift.

### D2 · `date` is stored ISO and displayed `MM/DD/YYYY`

```ts
date: string   // 'YYYY-MM-DD', a calendar date with no time and no zone
```

Stored ISO because it sorts lexically, is unambiguous, and is what a date input reads and writes.
Displayed `MM/DD/YYYY` because that is what was asked for — `09/01/2026` meaning 1 September 2026.
The formatting is one pure function in `lib/dates.ts` and lives nowhere else.

**No `Date` object is constructed from a stored value**, and this is the decision that prevents the
classic bug: `new Date('2026-09-01')` parses as UTC midnight and renders as 31 August in any
timezone west of Greenwich. Formatting is string slicing. Today's date is computed from the local
components of `new Date()`, never from `toISOString()`, for the same reason.

Epoch milliseconds were the alternative and were rejected: a note's date has no time, and storing a
timestamp invites one to appear.

### D3 · shadcn `calendar` in a `popover`, shared by both dialogs

`npx shadcn@latest add calendar popover`, which brings `react-day-picker`. A native
`<input type="date">` was the alternative — no dependency, free keyboard support — and was rejected
because it renders as the browser rather than as this app, and differs across Chrome, Safari and
Firefox.

`date_field.tsx` wraps the popover and owns the ISO-string boundary, so neither dialog handles a
`Date`. `paper_radiogroup.tsx` is extracted from `new_note_dialog.tsx` unchanged, because the view
dialog needs the same six swatches with the same roving-tabindex behaviour and P3's **D3** rationale
applies to both.

The create dialog opens with the date defaulted to **today**, computed when the dialog opens rather
than when the module loads — a tab left open overnight must not offer yesterday.

### D4 · Every card the same height, body clamped

The card becomes a fixed height — `h-44` — rather than growing with its content. The date sits
top-left in `text-ink-soft` with `tabular-nums` so the column of dates does not jitter between a
`1` and a `0`. A gap, then the body, `line-clamp`ed to the lines that fit with an ellipsis.

`line-clamp` rather than `overflow: hidden`: it puts the ellipsis on the last visible line, which is
what signals "there is more" rather than looking like the text merely stopped.

The whole card is the affordance that opens the note. That collides with three things already on
it, and each needs a deliberate answer:

- **The pin and delete controls** must not open the note. Their handlers stop propagation.
- **The drag** must not open the note. `useDraggable` already distinguishes a click from a drag with
  its 4px threshold; the open fires only when the gesture did not become a drag.
- **The keyboard.** The card is focusable and already answers the arrow keys for reordering. `Enter`
  and `Space` open it, which is the standard contract for a control, and neither is bound to
  anything else on the card.

An empty note shows `Empty note` in `text-ink-soft`, as it does today.

### D5 · The view autosaves; principle 3 is not amended

`mission.md` principle 3 says *"There is no Save button. State is written as it changes and restored
exactly on reload."* A dialog with **Save** and **Cancel** is the obvious shape for this and it is
forbidden, so the view does what the card did: debounced write on change, immediate write on close.

This is the right constraint rather than an awkward one. A Save button introduces a state where what
is on screen is not what is stored, and the whole persistence contract exists to make that state
impossible.

The view therefore has one dismissal — **Done**, or Escape, or the close control — and all three
take the same path. There is no Cancel, because there is nothing to cancel: the note has been
saving the whole time.

Colour and date changes dispatch immediately; only the body is debounced, because only the body is
typed.

### D6 · The card stops being an editor

`note_card.tsx` loses its `<textarea>`, its `useDebounceCallback`, its blur handler, its local
`editing` state and its `startEditing` prop. `board.tsx` loses the `openId` heuristic that decided
which note opened focused.

That heuristic — `body === '' && createdAt === updatedAt` — has survived three phases and shaped
P3's **D4**. It goes here, and what replaces it is simpler: **a note created with an empty body
opens its view immediately.** The dialog is where writing happens now, so the "born ready to type"
behaviour becomes "born open".

### D7 · The read derives a missing `date` from `createdAt`

Same shape as P5's **D8**. A stored note without a `date` string gets one from the local calendar
date of its `createdAt`; `version` stays `1`. The risk recorded in P5's § Risks — a schema change
under an unchanged version number — is unchanged and not re-litigated here.

A note whose `date` is present but not a `YYYY-MM-DD` string is repaired the same way rather than
rejecting the whole board, because a malformed date is recoverable and losing the board is not.

### D8 · Documents corrected in the same phase

- **`mission.md`** — principle 2 and the Core scope bullet (**D1**).
- **`roadmap.md`** — P6 becomes this phase. The old P6, recolouring an existing note, is **largely
  discharged** by the view dialog's swatches; what remains of it moves to the **Later** list.
- **`tech-stack.md`** — the `Note` block gains `date`; the file tree gains `lib/dates.ts`,
  `date_field.tsx`, `paper_radiogroup.tsx`, `note_view_dialog.tsx` and the two shadcn components;
  the stack table gains `react-day-picker` as a transitive dependency.
- **`README.md`** — status to P6.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.** No new eslint override.
- **No Save button, anywhere.** Principle 3, and **D5**.
- **Every file we author is `snake_case`.** The generated `calendar.tsx` and `popover.tsx` are
  covered by the existing `components/ui` exemption; **the `EXEMPT` pin must not be edited.**
- **Warm tokens only.** The generated calendar must be audited for achromatic defaults the way P3
  audited the dialog, and for the dead `tw-animate-css` classes shadcn still ships.
- **Keyboard-reachable.** Opening, filling and dismissing the view; and the card's `Enter`/`Space`.

## Risks

**The amendment removes the last of principle 2's original intent.** After this, nothing in the
constitution resists putting a feature behind a dialog. The keyboard clause is the only brake left,
and it is a weak one. If a fourth phase wants to amend this principle again, that is the signal that
the principle has stopped meaning anything and should be rewritten from scratch rather than patched.

**The card's click target now competes with four gestures** — open, drag, pin, delete — plus two
keyboard contracts on the same element (arrows reorder, Enter opens). This is the most likely place
for a regression, and it is why the plan writes those tests first.

**`react-day-picker` is the first dependency that is not a shadcn primitive.** It is a real
component library with its own styling and its own release cadence. If its generated `calendar.tsx`
proves hard to make warm, the fallback is the native input from **D3**'s rejected alternative, and
that swap should be made rather than shipping a cold calendar.

**A fixed card height will truncate more than expected.** `h-44` fits roughly four lines at the
current type scale. Gate 3 check 2 is a human deciding whether that is the right amount of note to
see before clicking, because no test can answer it.
