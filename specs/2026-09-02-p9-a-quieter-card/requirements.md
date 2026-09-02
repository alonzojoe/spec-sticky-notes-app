# P9 · A quieter card — Requirements

**Phase:** P9 (ninth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-02
**Branch:** `feat/p9-a-quieter-card` off `feat/p8-find-things`
**Status:** specified

---

## Context

P6 made the card a summary and moved reading and editing into the note's own view. P7 gave it a
title and a link. P8 added search. Twenty-three suites and 604 assertions pass.

The pin and delete controls never moved. They still sit in the card's top-right corner, revealed on
hover, from P2 — written when the card *was* the editor and acting on a note meant acting on the
card. That is no longer true of anything else on the board: the card is a summary, and every other
thing you can do to a note happens in its view.

This phase splits them by what kind of act they are. **Pinning moves into the note's own view** —
it is something you do to a note you are already reading. **Deleting stays on the card** and gains
a confirmation — it is a judgement you make about a note at a glance, and making you open a note
before you can throw it away is a worse trade than the one control costs.

The card therefore loses its pin button, keeps one hover-revealed delete, and gains a pin *glyph*
that is state rather than a control.

Deleting also stops being instant. A note with anything written in it now asks first — a line
`roadmap.md` has carried since P2 as a Polish-phase commitment, pulled forward because this is the
phase that moves the control and it would be strange to move it and leave it unguarded.

**This phase also stops numbering the phases that have not been built.** P7 renumbered four, P8
renumbered four more, and this would be the third in three phases. P8's § Risks named the remedy
in advance and this is it (**D1**).

## Scope

Six deliverables.

1. **The constitution amendment.** `mission.md` principle 4's per-note clause rewritten; the
   unbuilt phases in `roadmap.md` lose their numbers and keep their names (**D1**, **D2**).
2. **The card keeps delete and loses pin.** The pin button leaves; the delete control stays,
   hidden until you touch that note (**D3**).
3. **A pinned note still says so.** A pinned card carries a small, **non-interactive** pin glyph.
   Not a control — a state (**D4**).
4. **Pin moves into the note view**, in its footer beside Done, and delete appears there too — one
   shared confirmation, two entry points (**D5**).
5. **Delete asks first, when there is something to lose.** `npx shadcn@latest add alert-dialog`; a
   note carrying a title, a body or a link confirms, an empty one does not (**D6**).
6. **The keyboard keeps everything it had**, and gains nothing it should not (**D7**).

Plus the documents this invalidates (**D8**).

## Out of scope

- **Undo.** `mission.md` puts session undo on the unscheduled list, and a confirmation is not a
  down-payment on one. The dialog is the guard; there is still no way back after Yes.
- **Multi-select or bulk delete.** Unscheduled, and it would need its own selection model.
- **A trash or archive.** Explicitly out of scope in `mission.md`.
- **Confirming anything else.** Not recolour, not redate, not unpin, not edit. Delete is the only
  irreversible action on the board.
- **Deleting from the search palette.** The palette finds notes; it does not act on them.
- **Changing what pinning does.** Pinned notes still sort above unpinned ones and nothing else
  about `order` changes.

## Decisions

### D1 · The unbuilt phases stop having numbers

P7 renumbered four phases. P8 renumbered four more. This phase would renumber four again, and P8's
requirements § Risks wrote down what to do about it:

> If a third phase wants to renumber, the right answer is to stop numbering the unbuilt phases at
> all and give them names — recorded here so the next person has the option rather than a third
> mechanical rewrite.

So: **P0–P9 keep their numbers, because they were built and their spec directories are named after
them.** Everything after this phase becomes a **Planned, in order** list carrying names only —
*Tags*, *Markdown and checkboxes*, *Dark mode*, *Polish*. Inserting a phase becomes an edit to one
list rather than a rewrite of every cross-reference in `specs/`.

A number is a promise about ordering that three phases in a row have broken. A name survives being
reordered.

Existing references to `P10`, `P11`, `P12` in earlier specs are rewritten to the phase's **name**,
not to a new number. Where an earlier spec says "deferred to P12", it will say "deferred to
*Polish*", which is what it always meant.

### D2 · Principle 4's per-note clause is rewritten

Currently:

> 4. **Quiet chrome.** The interface is the notes. Global controls live in the sidebar and the
>    toolbar above it, and never on the board surface itself; **per-note controls appear on the
>    note you're touching, not on all of them at once.** The sidebar can be collapsed to a rail,
>    and the board stays fully usable with it collapsed.

The bolded clause was written in P2 to stop six controls appearing on twenty cards at once. It
solved that by hiding them until hover — and this phase solves it more completely by not putting
them on the card at all. The replacement:

> …and never on the board surface itself; **a card carries one per-note control — delete —
> revealed on the note you're touching, not on all of them at once. Everything else you can do to
> a note happens in the note, which is one click away.** A card may also show *state* it would
> otherwise be impossible to see, such as whether it is pinned. The sidebar can be collapsed to a
> rail, and the board stays fully usable with it collapsed.

**This clause was drafted twice.** The first draft said *no controls at all*, and the board it
produced was wrong in one specific way: throwing away a note you can see from across the room
required opening it first. Pinning and deleting are not the same kind of act — **pinning is
something you do to a note you are already reading, and deleting is a judgement you make about a
note at a glance** — so they do not belong in the same place. The revised clause is narrower than
"per-note controls appear on the note you're touching" was: it names the one control, rather than
leaving the category open.

The last sentence is what licences **D4**, and it is deliberately narrow: *state you could not
otherwise see*, not "anything useful".

`roadmap.md`'s *Polish* phase loses its delete-confirmation line, which lands here instead
(**D6**).

### D3 · The card keeps delete and loses pin

`note_card.tsx` keeps a delete control and loses everything else. The `group` class and the
hover-reveal stay, because one control still needs revealing; the pin **button** goes, replaced by
the pin **glyph** in **D4**.

The card is then: a date, an optional title, a clamped body, an optional link chip, a delete
control that is invisible until you touch the note, and — when the note is pinned — a glyph.

Delete keeps its two `stopPropagation` handlers. Without the one on `click`, removing a note opens
the note it just removed; without the one on `pointerdown`, pressing the control starts dragging
the card. Both were true in P2 and both are still true.

`note_controls.tsx` is **not deleted** — it moves to the note view (**D5**) and carries pin there,
rather than being rewritten at its destination, because its pin/unpin labelling and its
`aria-pressed` are already correct and already tested.

### D4 · A pinned card shows a pin, and it is not a button

Removing the controls removes the only way to see that a note is pinned. Principle 1 promises that
pinned notes stay above the pile; a board where notes sort in an order you cannot account for is
worse than one with a small glyph on it.

So a pinned note keeps a pin **glyph** in the top-right: `size-3.5`, `text-ink-soft`, `aria-hidden`,
inside a `<span>`, **with no click handler and no focus**. It is not in the tab order and it does
not respond to a pointer — clicking it opens the note, like clicking anywhere else on the card.

An unpinned note shows nothing at all. This is the difference between the old behaviour and the new
one: before, every card had two invisible controls waiting for a hover; now, only a pinned card has
a mark, and it is a fact rather than an affordance.

The note's accessible name gains the word `Pinned` when it is pinned, so the state is not
glyph-only.

### D5 · Pin lives in the note view's footer, and delete lives in both places

`note_view_dialog.tsx`'s footer becomes: pin on the left, delete beside it, `Done` pushed right.
Delete is in **both** places deliberately — you should not have to close a note to throw it away
once you have read it and decided.

**There is one confirmation for the whole board**, not one per card. `DeleteNoteProvider` mounts it
in the shell and both entry points call `requestDelete(note)`; a hundred notes would otherwise be a
hundred Radix layers each waiting for a click it will almost certainly never get. The provider also
clears `openId` when it removes the open note, so the view closes because its note stopped existing
rather than because it closed itself.

Both are `ghost` icon buttons with visible-on-focus rings and real accessible names — `Pin note` /
`Unpin note`, and `Delete note`. `NoteControls` moves here whole, so the `aria-pressed` toggle and
the pin/unpin labelling that P2 got right are not re-derived.

**Deleting closes the view**, because the note it was showing no longer exists. Pinning does not
close it: pinning is a property of the note, like its colour, and P6 established that changing a
note's properties happens with the view open.

The delete button is separated from `Done` by the layout, not adjacent to it. P2's own comment made
that point about the card's controls — *"a full gap-1 keeps the destructive control from sitting
flush against the one next to it"* — and it applies more here, where the neighbour is the button
you press to leave.

### D6 · A note with content confirms; an empty one does not

`npx shadcn@latest add alert-dialog`. The rule:

```ts
const hasContent = (note: Note) => note.title !== '' || note.body !== '' || note.link !== ''
```

A note failing that test is deleted immediately. **An empty note has nothing to lose, and a
confirmation for it is a click that protects nothing** — it is also the exact note you get by
pressing `n` and changing your mind, which is the most common thing anyone deletes.

`date`, `color` and `pinned` are **not** content. Every note has a date and a colour whether you
chose them or not, so counting them would make every note confirm and collapse the rule to "always".

The alert names the note — its title, or `this note` when untitled — so the dialog is about a
specific thing rather than a category. The confirm button is `destructive` and reads **Delete**,
not **OK**; the cancel reads **Cancel** and is the default focus, so `Enter` on a confirmation you
did not read cancels rather than deletes.

This is a `shadcn` `alert-dialog` and not the `dialog` already in the project, deliberately: it is
`role="alertdialog"`, it traps focus on the cancel, and Escape cancels. A confirmation built out of
the ordinary dialog would be all three of those things by accident rather than by contract.

**It is not a Save button.** Principle 3 forbids a control that stands between you and *persisting*
what you wrote. This stands between you and *destroying* it — the opposite direction, and the
mission puts delete-confirmation in scope by name.

### D7 · The keyboard loses nothing

Before, a card held three tab stops: the article, the opener, and two controls revealed on focus.
Now it holds two — the article and the opener — plus the link chip when there is one.

Everything removed is still reachable: `Enter` on a card opens the note, and pin and delete are two
tab stops inside the view. That is one more keypress to delete a note than before, on an action that
now also confirms, which is the intended direction.

The arrow keys still reorder a focused card. `Escape` in the alert cancels; `Escape` in the view
still closes and saves.

### D8 · Documents corrected in the same phase

- **`mission.md`** — principle 4's per-note clause (**D2**).
- **`roadmap.md`** — P9 becomes this phase; the unbuilt phases lose their numbers (**D1**);
  *Polish* loses its delete-confirmation line (**D6**).
- **`tech-stack.md`** — `note_controls.tsx` moves under `layout/`; the tree gains
  `alert-dialog.tsx`; phase markers become names.
- **`README.md`** — status to P9.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.**
- **No Save button.** Principle 3 is untouched, and **D6** explains why a delete confirmation is not
  one.
- **Every file we author is `snake_case`.** The generated `alert-dialog.tsx` is covered by the
  existing `components/ui` exemption; **the `EXEMPT` pin must not be edited.**
- **Warm tokens only.** The generated alert-dialog must be audited for achromatic defaults and for
  inert `tw-animate-css` classes, exactly as P3 audited the dialog and P6 the calendar.
- **Keyboard-reachable.** **D7**.
- **`prefers-reduced-motion`.** The alert-dialog's animation must collapse under the existing global
  rule; if the generated component brings its own keyframes, they are replaced rather than added to.

## Risks

**Deleting is now three interactions deep** — open the note, press delete, confirm. For a note you
created by accident and want gone, that is worse than the hover-and-click it replaces. The
mitigation is **D6**'s content rule: the accidental note is empty, so it skips the confirmation, and
it is usually still open in its own view when you decide.

**A pinned glyph is a control that is not a control.** Someone will click it expecting to unpin.
They will get the note view, which contains the unpin button — so the failure mode is one extra
click rather than confusion, but it is a real cost of **D4** and Gate 3 looks at it.

**The generated `alert-dialog.tsx` is shadcn markup this project has not audited.** P5 found the
dialog's `tw-animate-css` classes inert and P6 found the calendar's the same. Assume the same here
until the built CSS says otherwise.

**`note_controls.tsx` moving means its tests move.** T35 asserts the controls do not open the note —
an assertion about a collision that no longer exists once they are off the card. Deleting it would
lose the coverage that a *click on a card* opens the note; the plan re-points it rather than
removing it.

**Nothing enforces that a card has no controls.** The card could regrow one in a later phase and no
test would notice, because the tests assert what is present. Gate 2 adds an assertion that the card
contains **no `<button>` except its opener**, so the constraint is checked rather than remembered.
