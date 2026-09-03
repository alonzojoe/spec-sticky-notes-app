# P10 · A view of the pinned — Requirements

**Phase:** P10 (tenth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-03
**Branch:** `feat/p10-a-view-of-the-pinned` off `feat/p9-a-quieter-card`
**Status:** specified

---

## Context

Pinning has existed since P2 and has meant exactly one thing the whole time: a pinned note sorts
above an unpinned one. P9 moved the control into the note's own view and left a glyph on the card so
the ordering has a visible cause. Twenty-four suites and 635 assertions pass.

What pinning still cannot do is *show you the pinned notes*. On a twenty-note board the pinned ones
lead the grid and then the rest of the board runs on underneath them for two more rows. The mark is
enough to explain the order; it is not enough to read the shortlist as a shortlist.

The sidebar, meanwhile, has held one destination since P1. `AppSidebar` renders a `<nav>` with a
single `SidebarMenuItem` in it, which is not navigation — it is a label that happens to be
focusable. Every phase since has passed over it, because a second destination with nothing behind it
would have been chrome for its own sake.

This phase gives it the second destination and the thing behind it: **a `Pinned notes` section that
shows the pinned notes and nothing else.**

## Scope

Six deliverables.

1. **The constitution amendment.** `mission.md` gains the distinction between what the board
   *shows* and the order it *keeps*; the Colors + pin bullet says the pinned ones have a view of
   their own (**D1**).
2. **The sidebar becomes navigation.** Two destinations — `Notes` and `Pinned notes` — each with a
   count, with `aria-current` following the selection (**D2**).
3. **The section is a view, not an edit.** The board renders a subset; nothing is written, and
   coming back to `Notes` shows the arrangement you left (**D3**, **D4**).
4. **The selection persists.** `sticky-notes:section`, read defensively like every other stored
   value (**D5**).
5. **Creating a note returns you to `Notes`**, because a new note is never pinned and you must be
   able to see the thing you just made (**D6**).
6. **An empty pinned board says what to do about it** (**D7**), and search, the note view and the
   keyboard all keep working across the seam (**D8**, **D9**).

Plus the documents this invalidates (**D10**).

## Out of scope

- **Pinning from the sidebar, or any other write.** The sidebar navigates. Dragging a note onto the
  `Pinned notes` item to pin it is a real idea and it is not this phase.
- **A third section.** `Tags` is its own planned phase and owns the tag list; this phase adds one
  destination, not a section framework.
- **Filtering by anything else** — colour, date, has-a-link. None of them are in `mission.md`.
- **Changing what pinning means.** Pinned notes still sort above unpinned ones. `order` and `pinned`
  are untouched by anything in this phase.
- **Reordering the sections, or hiding one when it is empty.** A destination that disappears is
  worse than an empty one, because you cannot navigate to it to find out why.
- **A URL, a router, or deep-linkable sections.** One board, one user, no server; the section is
  state, like the sidebar's own open/closed.
- **Multi-select of sections** (both at once). `Notes` already contains the pinned ones.

## Decisions

### D1 · The amendment: a view is not a rearrangement

`mission.md`'s one-sentence test promises the board never rearranges itself, principle 1 says
*nothing else reorders the board*, and the Search bullet says in terms: **the board never filters,
dims, or reorders.**

That last sentence was written about search, and it is right about search: a palette that reordered
the board underneath the thing you were looking for would be unusable. It is not a general ban on
ever showing a subset — if it were, the planned *Tags* phase, which filters the board by a tag, would
already be unconstitutional.

What the promise is actually about is **the board changing under you without your asking, and not
changing back.** A section changes what is on screen because you clicked the section, and the
arrangement is unchanged underneath: no note's `order` moves, no note's `pinned` flips, and
returning to `Notes` shows exactly the board you left.

So the Search bullet keeps its sentence — search still does not filter — and the Colors + pin bullet
gains the view:

> - **Colors + pin** — a curated paper palette per note; pinned notes stay above the pile, and the
>   sidebar has a section that shows only them.

And principle 1 gains the distinction that makes both true at once:

> …and nothing else reorders the board. **A section may change which notes are on screen; it never
> changes their order, and leaving it shows the board exactly as it was.**

The wording is deliberately about *order*, not about *visibility*. Hiding a note temporarily is
recoverable by one click on `Notes`. Moving one is not recoverable at all, which is why the promise
was made about moving in the first place.

### D2 · The sidebar becomes navigation

`AppSidebar` gets a second `SidebarMenuItem`:

| Destination | Icon | Badge |
| --- | --- | --- |
| `Notes` | `StickyNote` | every note |
| `Pinned notes` | `Pin` | the pinned ones |

`isActive` and `aria-current="page"` move to whichever is selected — today they are hardcoded onto
`Notes`, which was honest when there was one destination and would be a lie with two.

The `Pin` glyph is the same `lucide-react` icon P9 put on the card, deliberately: the mark on the
card and the destination that collects the marked notes should be the same shape, or the connection
has to be learned rather than seen.

**The badge on `Pinned notes` is the pinned count, and it is shown even when it is `0`.** A zero is
information — it says the section exists and is empty — and a badge that vanishes makes the two
rows different heights for no reason a reader can name.

Collapsed to the rail, both items are icon-only with their tooltips, which is what
`SidebarMenuButton`'s `tooltip` prop already does. Nothing new is needed for the rail and nothing
new is added to `sidebar.tsx`; T5's amendments are untouched.

### D3 · A section is a view over the board, not a change to it

The section is one piece of UI state — `'notes' | 'pinned'` — and the board applies it at render:

```ts
const ordered = arrange(notes).filter((note) => section === 'notes' || note.pinned)
```

Nothing dispatches. The reducer never learns that sections exist, `board_storage.ts` still writes
the same notes it always did, and there is no state in which the store and the screen disagree about
what a note *is* — only about whether it is currently drawn.

This is what makes **D1**'s promise cheap to keep rather than a thing to be careful about: the board
cannot rearrange itself in the pinned view, because the pinned view is a `filter` over the same
`arrange` call the full board uses.

### D4 · Only the pinned ones, rather than dimming the rest

The planned *Tags* phase says non-matching notes **dim in place** and positions never change. This
phase does the opposite, and the difference is not inconsistency.

**A tag filter is triggered from the board.** You click a chip on a note, and if the board reflowed
on that click, the note you clicked would move out from under your pointer. Dimming is what stops the
click from moving its own target.

**A section is a destination.** It is triggered from the sidebar, several hundred pixels from any
note, and nothing on the board moves under a pointer that was never over the board.

The second reason is the decisive one. **Pinned notes already sort first**, so the top rows of the
full board are already exactly the pinned ones, in exactly this order. A pinned view that dimmed the
rest would show the same grid, in the same places, with the bottom two-thirds greyed — which is a
board you can already produce by scrolling to the top. Showing only the pinned notes is the only
version of this feature that shows you something you did not already have.

It also makes the section's one real promise legible: **the pinned view is a prefix of the board.**
Because `arrange` sorts every pinned note above every unpinned one, the pinned notes are contiguous
at the front of the full ordering, and the pinned view is that front slice with nothing removed from
the middle. **D9** leans on this.

### D5 · The selection persists

`SECTION_KEY = 'sticky-notes:section'`, beside `sticky-notes:sidebar`, written through
`useLocalStorage` and read through a guard in `board_storage.ts` shaped like the sidebar's:

```ts
export const parseSection = (raw: string): BoardSection =>
  parseStored(raw) === 'pinned' ? 'pinned' : 'notes'
```

Anything that is not exactly `'pinned'` is `'notes'` — a corrupt value opens the whole board, which
is the failure that loses nothing.

Principle 3 says state is restored exactly on reload, and which view you were in is part of the
state of the board. The counter-argument is real and is named in § Risks: **reopening onto a
filtered board can look like a board that lost notes.** Two things pay for it — the sidebar shows
which destination is active on every load, and **D7**'s empty state says in words that the board is
filtered rather than empty. If Gate 3 says that is not enough, the fallback is to drop the key and
always open on `Notes`; it is one line and it is recorded here so the choice is available rather
than re-argued.

`SidebarProvider`'s own persistence stays where P2 put it — in `app_shell.tsx` — and this key sits
in the section provider instead, because the section has a provider and the sidebar does not. Two
keys, one owner each.

### D6 · Creating a note returns you to `Notes`

A new note is never pinned. Created while `Pinned notes` is selected it would be a note you made,
that opened itself, over a board that does not contain it — and the one-sentence test is about
capturing a thought, not about capturing it somewhere you cannot see.

So **creating switches the section back to `Notes`**, from both entry points, because they are the
same one: the toolbar button and the `n` shortcut both call `setCreating(true)` in `app_shell.tsx`,
and the section reset goes there with them.

The switch happens **when the dialog opens**, not when the note is created. Opening the create
dialog is the moment you have decided to make a note; doing it then means the board behind the
dialog is already the board the new note will land on, rather than changing a beat later underneath
a note that is already open.

Cancelling the create dialog therefore leaves you on `Notes` rather than back on `Pinned notes`.
That is a real cost, and it is smaller than the alternative: a section that flickers back and forth
depending on whether you went through with it.

### D7 · An empty pinned board says what to do

Zero pinned notes is not a rare state — it is the state of the board before you have ever pinned
anything, and it is what a new reader will see if they click the section first.

The board renders, in place of the grid:

> **No pinned notes**
> Open a note and pin it to keep it up here.

Quiet: `text-ink-soft`, centred, no button. The way out is named in the sentence — pinning happens
in the note's view, which is where P9 put it — so the copy teaches the one thing that is not
otherwise discoverable from an empty screen.

**This is the pinned section's empty state and not the board's.** `tech-stack.md` has carried an
`empty_state.tsx` under *Polish* since P1 and that file is still that phase's: a general empty board
wants an illustration, an invitation to make the first note, and a decision about what the app looks
like on first run, none of which this phase is qualified to make. An empty *full* board still
renders bare cork here, exactly as it does today.

### D8 · Search, and the note that leaves the view you are in

Two seams, both decided the same way: **a section changes what the board draws and nothing else.**

**Search ignores the section.** The palette searches every note and opens any of them, including one
the current view does not draw. The palette finds notes; a view is not a permission. `board.tsx`
already resolves the open note against the full `notes` array rather than the rendered list, so this
falls out of the existing structure rather than needing a carve-out — but it is asserted, because it
would be easy to "fix" into filtering later.

**Unpinning from inside the pinned view leaves the view open.** P9 established that pinning is a
property like colour and does not close the note. Unpinning while `Pinned notes` is selected means
the card leaves the board behind the dialog; the dialog stays, showing the note you are reading, and
closing it returns you to a board that no longer lists it. The alternative — closing the view because
the board stopped drawing its card — would mean a property change kicking you out of a note you were
reading, which is exactly what P9 decided against.

Deleting still closes the view, from either section, because the note is gone rather than hidden.

### D9 · The keyboard loses nothing, and gains two tab stops

The two sidebar items are `SidebarMenuButton`s — real buttons, in the tab order, operable by `Enter`
and `Space`, with tooltips on the collapsed rail. That is the whole keyboard surface this phase adds.

**Arrow-key reordering inside the pinned view is the same operation it is anywhere else.** The board
already reorders against `ordered`, which becomes the filtered list, so `left` and `right` step
between adjacent *pinned* notes and `columnCount()` measures the cards actually on screen. Because
the pinned view is a prefix of the board (**D4**), two notes adjacent in it are adjacent in the full
ordering too, so a swap made here is the same swap made there — not an approximation of it.

`first` and `last` mean the first and last note *of the view*, which in the pinned view is the first
and last pinned note. On a board where every pinned note is already at the front, that is the only
reading that is not surprising.

`n`, `⌘K`, `Enter` to open, `Escape` to close and the delete confirmation are all untouched.

### D10 · Documents corrected in the same phase

- **`mission.md`** — principle 1 gains the section sentence; Colors + pin gains the view (**D1**).
- **`roadmap.md`** — P10 is this phase. **The Planned list keeps its names and gains no numbers**:
  P9's rule was that a number belongs to a phase that exists, and this one now does.
- **`tech-stack.md`** — the tree gains `section_context.tsx`, `use_section.ts` and the second
  sidebar destination; the persistence contract gains `sticky-notes:section`.
- **`README.md`** — status to P10.
- **`app_sidebar.tsx`'s own comment**, which still says `P10 — the tag list`. P9 renamed the unbuilt
  phases and its Gate 1 grep covered `specs/` only, so this line survived — and it is now actively
  wrong, because P10 is this phase. It becomes *Tags*, and this phase's grep covers `src/` too.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.**
- **No new shadcn component.** `sidebar.tsx` already exports `SidebarMenuBadge` and everything else
  this needs; T5's amendments and T9's dormancy list are untouched.
- **No Save button**, and no new dispatch: the sidebar navigates and never writes (Gate 1 grep).
- **Every file we author is `snake_case`** — `section_context.tsx`, `use_section.ts`.
- **Warm tokens only.** The empty-state copy uses `text-ink-soft`, not a grey literal.
- **Keyboard-reachable** — **D9**.
- **`prefers-reduced-motion`.** Switching sections must not animate the grid; see § Risks.
- **The defensive read.** A stored section is parsed through `board_storage.ts` like every other
  stored value, not read raw.

## Risks

**Persisting the section can look like a board that lost its notes.** You pin three notes, click
`Pinned notes`, close the tab, and come back tomorrow to seventeen missing notes and no memory of
having filtered anything. **D5** accepts this and pays for it with the active destination in the
sidebar and **D7**'s copy; Gate 3 check 2 is exactly this scenario, run cold, and the fallback is one
line.

**Switching sections is a grid reflow, and the grid animates nothing today.** Notes will appear and
disappear instantly. That is honest and it is not obviously right — a section switch is the largest
visual change in the app. Deliberately not animated here: motion on a list that adds and removes
items is a *Polish* problem with a `prefers-reduced-motion` half, and doing it badly now would be
worse than the cut. Gate 3 check 5 looks at whether the cut reads as fast or as broken.

**The empty pinned state and the empty board are two different screens with one cause.** A reader who
has no notes at all and clicks `Pinned notes` gets the pinned copy, which tells them to open a note
and pin it — advice they cannot take, because there is no note. Accepted: it is one sentence of
slightly wrong advice on a screen that *Polish* will replace with a real first-run state.

**Nothing stops a later phase filtering the search results by section.** It would be a natural-looking
change and it would be wrong (**D8**). Gate 2's T72 asserts a search hit opens a note the current
section does not draw, so the mistake fails a test rather than shipping.

**Two sections is not a section framework.** The next phase to want one — *Tags* — will find one
`BoardSection` union and a `filter` in `board.tsx`, and will have to generalise both. That is the
right amount of structure to have built today; naming it here means the generalisation is expected
rather than discovered.
