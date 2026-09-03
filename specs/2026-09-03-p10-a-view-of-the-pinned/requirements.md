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
4. **The section is a route.** `/notes` and `/pinned`, on TanStack Router, so the URL is what
   remembers which view you were in (**D5**).
5. **Creating a note returns you to `Notes`**, because a new note is never pinned and you must be
   able to see the thing you just made (**D6**).
6. **An empty pinned board says what to do about it** (**D7**), and search, the note view and the
   keyboard all keep working across the seam (**D8**, **D9**).
7. **Pinning returns to the card**, beside delete, now that there is a section collecting pinned
   notes (**D11**) — and the sidebar's selected row is made to look selected (**D12**).

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
- **Routing anything but the sections.** A note does not get a URL of its own; the palette and the
  card still open it into a dialog, and `openId` stays state. `/notes` and `/pinned` are the whole
  route table (plus `/`).
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

### D5 · The section is a route, not a stored preference

This decision was taken twice. The first version was one piece of context persisted under a
`sticky-notes:section` key, defended by principle 3: state is restored exactly on reload, and which
view you were in is part of the state of the board.

**It is a route instead**, on **TanStack Router**, with `/notes` and `/pinned` (and `/` for the
whole board). A URL already remembers the section across a reload, which is the whole of what the
key was for; it also survives the back button, can be bookmarked, and can be sent to yourself. And
holding the same fact in two places — a path and a key — would be worse than either alone, so the
storage contract is **unchanged by this phase**: `localStorage` still holds the board and the
sidebar and nothing else.

Two decisions inside it:

**Code-based routes, not the file-based plugin.** `@tanstack/router-plugin` generates
`routeTree.gen.ts`, which is camelCase, and P1's naming rule is enforced by a test whose `EXEMPT`
list P9 pinned shut. A hand-written route tree is three routes long and costs less than an amendment
to that list.

**`/` renders the whole board rather than redirecting to `/notes`.** A redirect resolves
asynchronously, and every test in the suite renders the app at `/` and expects a board on the first
commit. `/notes` is a real route to the same view, so the sidebar has something to link at and the
URL names the section once you have chosen one.

The one thing the router costs is that it matches its first location asynchronously: a
`RouterProvider` rendered before that resolves commits an empty frame. `main.tsx` awaits the first
match before mounting — `mission.md` asks for no layout shift on load — and the tests load a router
before rendering, which `router_setup.ts` explains.

### D6 · Creating a note returns you to the whole board

A new note is never pinned. Created while `Pinned notes` is selected it would be a note you made,
that opened itself, over a board that does not contain it — and the one-sentence test is about
capturing a thought, not about capturing it somewhere you cannot see.

So **creating navigates to `/notes`**, from both entry points, because they are the same one: the
toolbar button and the `n` shortcut both call `setCreating(true)` in `app_shell.tsx`, and the
navigation goes there with them.

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

The two sidebar items are `SidebarMenuButton`s rendered `asChild` around a router `Link` — real
anchors with real `href`s, in the tab order, operable by `Enter`, with tooltips on the collapsed
rail. Anchors rather than buttons with handlers, because a destination you can middle-click,
bookmark and return to with the back button is a place rather than a mode. That is the whole
keyboard surface this phase adds.

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
- **`tech-stack.md`** — the stack gains TanStack Router; the tree gains `router.tsx` and the second
  sidebar destination. **The persistence contract is unchanged** (**D5**).
- **`README.md`** — status to P10.
- **`app_sidebar.tsx`'s own comment**, which still says `P10 — the tag list`. P9 renamed the unbuilt
  phases and its Gate 1 grep covered `specs/` only, so this line survived — and it is now actively
  wrong, because P10 is this phase. It becomes *Tags*, and this phase's grep covers `src/` too.

### D11 · Pinning returns to the card, beside delete

P9 took pin off the card on the reasoning that *pinning is something you do to a note you are
already reading*. That held for exactly one phase, and this is the phase that breaks it: with a
section that collects pinned notes, pinning stops being a thing you do while reading and becomes a
thing you do while **sorting** — across many notes at a glance, which is the card's job and not the
note view's.

So the card carries **two** controls: pin and delete. Both are still in the note's own view too,
because either is a reasonable place to be standing when you decide.

**The pin control is also the pinned state.** Drawn filled and in full ink whenever the note is
pinned — no hover needed — and hidden with delete when it is not. That folds P9's `D4` glyph into
the control it looked like: P9's own Gate 3 recorded people clicking the glyph expecting to unpin,
and now the mark you see *is* the button you press. One icon in both states, deliberately: `PinOff`
at rest would draw the action rather than the fact, and a card should say what a note **is** before
it says what you could do to it. The label and `aria-pressed` carry the action instead.

`mission.md` principle 4 is amended a second time by this phase: **a card carries two per-note
controls — pin and delete** — revealed on the note you are touching, except that pin stays visible
while the note is pinned, because there it is state.

### D12 · The selected sidebar row has to look selected

Found by looking at it: with two destinations, both rows carried the selected background.

`SidebarMenuButton` renders `data-active={isActive}`, and React writes `data-active="false"` for a
falsy one. **Tailwind's `data-active:` variant matches the attribute, not its value**, so every
inactive item was styled exactly like the active one. Invisible while the nav held a single
destination — the bug had been there since P1 — and the whole point of the selection once it holds
two.

The fix is at the source, as P1's amendments to the same file were: `data-active={isActive ||
undefined}`, so the attribute is absent rather than false. T5 gains an assertion, because
`shadcn add sidebar` would restore the original silently.

On top of that, our own two rows say: an **inactive destination is plain** — the sidebar's own
background, nothing behind it — and hovers to a half-strength wash rather than to the full accent,
because a hover that produces the selected appearance is a hover that lies about where you are. The
**active** row keeps the accent it always had and gains a 2px inset bar in the sidebar's primary,
which is what answers "which section am I in" at a glance and survives the collapse to the icon rail
where the label is gone.

### D13 · The empty pinned board replaces the grid

**D7**'s copy cannot be a child of the grid. The board is `auto-rows-min` with `content-start`, so
its one row is content-height and an `h-full` child centres against itself — the copy lands at the
top of the cork rather than in the middle of it. The empty section returns its own centred surface
instead, with the same `bg-cork` and grain.

It mounts the note view underneath, because the palette can open a note the section does not draw
(**D8**) and searching from an empty pinned board must still open something.

The copy also needed a colour that does not exist yet: warm ink on cork is unreadable, and the board
is the only surface in the app with no paper under its words. `--color-cork-ink` is added to
`@theme` for it.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.**
- **No new shadcn component.** `sidebar.tsx` already exports `SidebarMenuBadge` and everything else
  this needs, and T9's dormancy list is untouched. `sidebar.tsx` itself gains **one** amendment,
  guarded by T5 like P1's (**D12**).
- **One new runtime dependency**, `@tanstack/react-router`, recorded in `tech-stack.md`. It pushes
  the bundle past rollup's 500kB warning, so the build splits `node_modules` into its own chunk
  rather than raising the limit.
- **No Save button**, and no new dispatch: the sidebar navigates and never writes (Gate 1 grep).
- **Every file we author is `snake_case`** — `section_context.tsx`, `use_section.ts`.
- **Warm tokens only.** The empty-state copy uses `text-ink-soft`, not a grey literal.
- **Keyboard-reachable** — **D9**.
- **`prefers-reduced-motion`.** Switching sections must not animate the grid; see § Risks.
- **The defensive read.** A stored section is parsed through `board_storage.ts` like every other
  stored value, not read raw.

## Risks

**A URL can put you on a filtered board with no memory of having filtered it.** Bookmark `/pinned`,
come back next week, and seventeen notes are missing until you notice which row is highlighted. The
sidebar's selected row and **D7**'s copy are what pay for it, and Gate 3 check 2 is exactly this
scenario run cold. It is a smaller risk than the storage key it replaced, because the address bar
says `/pinned` in words.

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
