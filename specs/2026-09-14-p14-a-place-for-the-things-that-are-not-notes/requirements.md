# P14 · A place for the things that are not notes — Requirements

**Phase:** P14 (fourteenth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-14
**Branch:** `feat/p14-a-place-for-the-things-that-are-not-notes` off `main`
**Status:** specified

---

## Context

P13 gave the board a name and put it at the top of the sidebar. It also shipped the only way to
change that name: click the row, and the dialog that asked the question on the first visit opens
again, prefilled. P13 called that a judgment call in its own **D3** and said it was small enough to
cut.

It is not being cut. It is being moved, because the app has now accumulated a second thing of the
same kind and has nowhere to put it.

That second thing is **getting your board back to nothing.** Today it cannot be done from inside the
app at all. The route is DevTools, `localStorage`, and knowing that the key is called
`sticky-notes:board:v1` — which is a thing the author of this app knows and nobody else ever will.
A board built to hold the thoughts you want back tomorrow should be able to say *not these ones*.

And once a board can be emptied, it needs the other half: **a way to put something back on it.**
P1 built three mock notes to prove the visual language and P2 deleted them the moment the board
became real. They are the only notes this app has ever shipped with, they say what the app is
better than the intro's one sentence does, and an empty board is exactly the moment you want to see
them. So they come back, as a sample board you can load rather than a fixture the app renders
(**D7**).

Three controls, none of which is a note and none of which belongs on the board. That is a settings
page, and this is the phase that admits it.

**The thing to be careful about here is not the feature, it is the slot.** `tech-stack.md` promised
the `SidebarFooter` to *Dark mode*, and P13 went out of its way not to take it — it put the identity
in the header on the strength of that reservation, and wrote a Gate 1 grep to keep the bottom of the
sidebar empty. This phase takes the slot. **D2** is the argument that the reservation is satisfied
rather than broken, and it is deliverable 1 so that rejecting it kills the phase before the code
exists.

## Scope

Nine deliverables.

1. **The amendments** — the `SidebarFooter` reservation, and one clause in principle 4 (**D2**,
   **D6**).
2. **The route** — `/settings` under `_board`, a route file and a page (**D1**).
3. **The footer row** — one destination at the bottom of the sidebar (**D2**).
4. **The rename, inline on the page**, and the sidebar identity row pointing at it (**D3**).
5. **`intro_dialog.tsx`** — what is left of `user_name_dialog.tsx` once the rename leaves it
   (**D3**).
6. **`reset` in the reducer**, and **`hooks/use_reset.ts`** — one destructive action that goes
   through the hooks that own the keys (**D4**, **D5**).
7. **The confirmation** — P9's `alert-dialog`, a real note count, and no new component (**D4**).
8. **`lib/sample_notes.ts`** — P1's three notes, brought back as content rather than as a
   fixture, and the control that loads them (**D7**).
9. The documents this invalidates (**D8**).

## Out of scope

- **Anything on the settings page that is not these three controls.** No export, no import, no
  board size, no font, no density. *Dark mode* gets its row when *Dark mode* is built (**D2**), and
  a settings page that ships with slots for features that do not exist is a menu of promises.
- **Sample notes on a board that has notes on it.** The control is inert unless the board is empty
  (**D7**). Nothing this phase ships can bury something you wrote.
- **Per-key reset.** One button, everything, once — **D4**. Two buttons is the option that was
  considered and rejected there, with the reasoning.
- **Undo, a trash, or an export-before-you-reset.** `mission.md` has no undo anywhere and this is
  not the phase to introduce one. The guard is the confirmation and the word *permanently*.
- **A second user, a profile, an avatar image.** Unchanged from P13's **D1**: the name is a label
  and owns nothing. Resetting it deletes a string.
- **Settings in the `SECTIONS` registry.** **D1**.
- **A `settings` key.** Nothing new is persisted by this phase. It reads and writes the three keys
  that already exist.
- **Any change to what a note is.** `BOARD_KEY` keeps its shape and its `v1`; the only new thing the
  board can do is become empty in one action.

## Decisions

### D1 · Settings is a route, and it is not a section

`/settings`, under the `_board` pathless group, so the sidebar, the toolbar and all three providers
stay mounted and the board area renders the page where the cork usually is. Three files, which is
P11's convention and the floor rather than duplication:

```
src/app/routes/_board/settings/index.tsx
src/pages/settings_page/settings_page.tsx
src/pages/settings_page/index.ts
```

**A route rather than a dialog**, for two reasons that are not the same reason.

The first is that it is a *place*. The roadmap's *Tags* entry already drew this line for a different
feature and drew it well: a section is somewhere you go, bookmarkable and back-button-able; a lens
over the board is not. Settings is somewhere you go. It has a URL, the back button returns you to the
board you were on, and the sidebar row that reaches it is an anchor like every other destination
rather than a button with a handler.

The second is that this surface will grow. *Dark mode* is a row here (**D2**). `mission.md`
principle 2 had to be amended once already to let a modal stand between a person and their board,
and the carve-out was written for *creation* — a thing you do in two seconds and dismiss. A surface
that accumulates controls is the opposite of that, and putting it behind a modal now means arguing
about it again later.

**It is not a row in `lib/sections.ts`.** A registry row carries a `keep` predicate and gets a note
count drawn beside it; Settings has neither and never will. P12 built that list to answer *which
notes does this view draw*, and Settings draws none. The registry stays at three rows, `board.tsx`
still names no section, and the nav group under `Board` is untouched — which also means P12's
*four rows is where a sidebar becomes a menu* is not spent here. It is still available to the next
section that wants it.

### D2 · The footer, and the reservation it was holding

The row lives in **`SidebarFooter`**:

```
┌──────────────────┐
│ ▣ Sticky         │
│ (JA) Joe Alonzo  │
│                  │
│ BOARD            │
│ ▤ Notes       8  │
│ ⚲ Pinned notes 3 │
│ ⛓ Linked notes 2 │
│                  │
│                  │
│ ⚙ Settings       │
└──────────────────┘
```

**`tech-stack.md` reserved this slot for *Dark mode*'s toggle, and P13 respected the reservation by
name** — its **D3** moved the identity out of the footer and into the header rather than take a slot
another phase had been promised, and its Gate 1 greps `app_sidebar.tsx` for `SidebarFooter` to keep
it empty.

**The amendment is that the reservation is satisfied here rather than broken.** *Dark mode* was
promised a **home for the theme control**, not a specific div. This phase gives it a better one: a
labelled row on a settings page, beside the other things you set. What the footer holds instead is
the *way to that page* — which is the only thing at the bottom of a sidebar that never needs to move
again, because it is not a control, it is a door.

The concrete effect on *Dark mode* is that it ships a row in `settings_page.tsx` and a
`hooks/use_theme.ts`, and touches `app_sidebar.tsx` not at all. That is a smaller phase than the one
it was promised, not a displaced one. `tech-stack.md` is amended to say so, and P13's grep is
retired **by name** in this phase's validation so that the next reader of that file finds an argument
rather than a contradiction.

**One row, and it does not look like a destination that counts things.** No `SidebarMenuBadge` — a
badge on this row would be a number about settings, and there is no such number. The icon is
lucide's `Settings`, the label is *Settings*, and collapsed to the rail it is the glyph with the
label in the tooltip, exactly like the three destinations above it.

**Active state is shadcn's own**, driven from the router the way the destinations are: on
`/settings` the row carries `data-active` and the same 2px inset bar in the sidebar's primary. It is
the one visual thing that has to agree with the board rows, because a person on the settings page
needs to see that they are not on the board.

### D3 · The rename moves onto the page, and the dialog becomes what it always was

The settings page carries the rename **inline**: a `FieldLabel`, an `Input` prefilled with the
stored name, and a `Save` that is inert while the trimmed draft is empty or unchanged. The parts are
the ones the dialog used, so nothing new is drawn and nothing new is installed.

**A settings page whose only control opens a modal to do the one thing the page exists for is a
shrug.** That was the alternative and it is rejected here plainly.

Three things fall out of it.

**The sidebar identity row becomes a `Link` to `/settings`.** It stops being a button with an
`onEditName` handler. P13 built it as *the way back into the dialog*; the way back is now a place,
and the row is an anchor like every other row in the sidebar. It keeps its circle, its initials, its
tooltip and its hover — nothing about how it looks changes.

**`app_shell.tsx` loses a piece of state.** `asking` was a `useState` initialised from the name at
mount, and it existed because two things could open the dialog. One can now, and it is not a thing a
person does — it is a condition: *there is no name*. So the dialog's open state is derived,
`open={name === ''}`, and there is no second source of truth that can disagree with the key. The
`onEditName` prop goes with it.

This also fixes a bug the phase would otherwise have shipped. Reset (**D4**) clears the name, and a
`useState` initialised once at mount would have stayed `false` — the board would empty, the name
would vanish, and the intro would never open. Derived state cannot be wrong about this.

**`user_name_dialog.tsx` is renamed `intro_dialog.tsx`, and the `intro` branch is the whole
component.** Gone: the rename title and description, `Cancel`, the `showCloseButton` toggle, the
three `intro &&` guards on Escape and the backdrop, the `wasOpen` resync, and `onOpenChange`. What is
left is the thing P13's **D2** spent a page describing — the intro, which cannot be closed, and which
closes because a name now exists.

**The file is renamed rather than left named for the half that left.** `user_name_dialog.tsx` would
be a file called *the name dialog* containing a component that welcomes you to the app, and the next
person to grep for the rename would find it and be wrong.

### D4 · One reset, and it never touches `localStorage` directly

A second block on the page, under a separator, headed `Reset`. One `destructive` button, *Reset
everything*, behind P9's `alert-dialog`:

> **Reset everything?**
> Deletes all 8 notes and your name from this browser. This cannot be undone.
> `[Cancel]` `[Reset everything]`

**The count is real.** *Deletes all your notes* is a sentence about a feature; *deletes all 8 notes*
is a sentence about your board, and it is the difference between a confirmation someone reads and
one they click through. It is `notes.length`, straight from the store, and the singular is handled
because a board with one note on it is exactly the board where a wrong click costs least and reads
worst.

`Cancel` holds `autoFocus` and the action is `variant="destructive"` and says `Reset everything`
rather than `OK` — both directly from P9's delete confirmation, for the reasons written there.

**What it clears, and in what way.** All three keys, through the hooks that own them:

```ts
dispatch({ type: 'reset' })   // the board, through the reducer     — D5
setName('')                   // sticky-notes:user, through useUser
setSidebarOpen(true)          // sticky-notes:sidebar, a second useLocalStorage instance
navigate({ to: '/' })         // where a browser that has never seen this app lands
```

**No `localStorage.clear()`, no `removeItem`, and this is the load-bearing part of the decision.**

A raw removal notifies nothing inside the tab. `useLocalStorage` dispatches its own `local-storage`
event on *write* and every instance on the key listens for it — that is the behaviour P13's **D5**
leans on and verified in its groundwork — but a direct call to the Storage API bypasses it entirely.
So a raw clear would leave every React state in the app holding exactly what it held a moment ago,
the board still on screen with every note on it. And then it would get worse: `notes_context.tsx`
mirrors the reducer through a 300 ms debounce, so the next render would write the whole board
**back** to the key that had just been emptied. A reset that appears to do nothing and then silently
undoes itself is the worst possible shape for this feature.

So every key is cleared by the thing that owns it, and the in-memory state is the thing being reset
— the storage follows, the way it does for every other write in this app.

**The sidebar key is included, and it is the weakest of the three.** A collapsed sidebar is a view
preference rather than user data, and an argument for leaving it alone exists. It is reset anyway,
because *reset everything* is the promise the button makes, and a person who has just erased their
board and their name does not want to discover that one thing about the app remembers them. The
second `useLocalStorage` instance on `SIDEBAR_KEY` is what makes it possible without lifting
`AppShell`'s state anywhere.

**Afterwards, the intro opens by itself.** Nothing tells it to. `name === ''` is the only thing that
decides whether it is open (**D3**), and reset made that true. The navigation to `/` is so that the
board behind the blur is the board a first visit sees, rather than the settings page the reset was
pressed on.

**One button rather than two.** *Clear all notes* and *Forget my name* as separate actions was
considered: it is more control, two confirmations, and two states nobody asked for — a named empty
board, an unnamed full one. The thing a person wants when they want this is *start over*, and the
feature should be shaped like the want.

### D5 · The reducer learns one word

```ts
| { type: 'reset' }
```

returning `EMPTY_BOARD` — the same constant `hydrate` returns for a value it will not accept, so
there is one definition of *an empty board* and the reset produces byte-for-byte what a first visit
produces.

**In the reducer rather than by remounting the provider or reloading the page.** The reducer is the
source of truth and localStorage is its mirror; a reset that went around it would be the one write in
this app that works the other way round. It also stays pure — no clock, no ids, no arguments — which
is the one property `reducer_purity.test.ts` exists to defend.

**It carries no `at`.** Every other mutating action stamps `updatedAt`, because it changes a note.
This one changes the absence of notes, and there is nothing left to stamp.

### D6 · The page is not drawn on cork

`bg-background`, a column at `max-w-xl`, left-aligned, scrolling in its own `overflow-y-auto` because
the shell's outlet is `overflow-hidden`.

**Cork is the board.** It is the one surface in this app that is not paper, it carries a texture and
a warm dark colour chosen so that white ink reads on it, and every pixel of it means *notes go
here*. A form on cork would read as a note nailed to the board — which is exactly the thing
principle 4 forbids, arriving through the back door.

**Which is the clause principle 4 gains.** It currently says chrome lives in the sidebar and never on
the board surface. That was written when the board area could only ever be the board. It is now one
of several routes, and the amendment says the distinction plainly: **chrome never sits *on* the
board, and a route that *replaces* the board is not sitting on it.** The board is not behind the
settings page, dimmed or scrolled away — it is not rendered at all.

Headings are `text-sm font-medium` over `text-ink-soft` description lines — the dialogs' own
`DialogTitle`/`DialogDescription` relationship, in a page. Nothing new is added to `@theme`.

**Motion: almost none.** The footer row takes the destinations' treatment unchanged —
`hover:bg-sidebar-accent/50`, `transition-colors`, `--duration-hover`, `--ease-out`, colour only, no
scale, because it is on screen every second the app is open. `Save` and `Reset everything` take the
toolbar's `active:scale-[0.97]` at `--duration-press`: a button pressed occasionally may answer when
pressed. The page does not fade in, the fields do not stagger, and nothing animates when the name
changes.

### D7 · The mock notes come back, as a sample board

`src/lib/sample_notes.ts` holds P1's three notes — **the same words**, which is the point:

| Colour | Title | Body |
| --- | --- | --- |
| `butter` | Where it sits is what it means | *Where a note sits is part of what it means.* |
| `sky` | Pick it up, put it down | *Pick it up, move it, put it down. The board stays where you left it.* |
| `rose` | No save button | *No save button.* |

**Content only.** No id, no `order`, no `createdAt`, no `date`. P1's fixture carried `x`, `y` and a
literal `tilt`, and all three are fields the data model no longer has — P5 replaced the freeform
board with a grid and `board_storage.ts` drops them on read. What survives a phase is the writing,
so what comes back is the writing.

Each one becomes a real note through `createNoteSeed`, exactly as the create dialog makes one: an
id from `crypto.randomUUID`, a clock reading, today's date, and a stamp above every existing note.
**They are notes, not a demo mode** — editable, pinnable, draggable, deletable, and indistinguishable
from anything you write yourself the moment they land.

**Dispatched in reverse**, so `SAMPLE_NOTES[0]` takes the highest stamp and therefore the first
slot. The board sorts `order` descending; without the reverse, the list would land upside down.

**The control is inert unless the board is empty**, and the hint says why: *Available on an empty
board.* Two reasons, and the first is the one that matters. Nothing in this app can be undone, so a
control that appends three notes to a board of forty is a control that can bury what you wrote — and
the guard that costs nothing is the one that makes it impossible rather than the one that asks. The
second is that a sample board is a thing you want at the exact moment there is nothing else to look
at, which is the same moment the button is live.

**It needs no confirmation**, because it destroys nothing. Reset is the only irreversible act on this
page, and keeping the confirmation attached to exactly that is what stops it becoming furniture.

**It sits between the name and the reset**, so the destructive control stays at the bottom where a
person scrolling past it is scrolling past the end.

**`lib/`, not `components/`**, and therefore through the barrel like everything else (P13's **D7**).
It is data with no React in it, the way `sections.ts` is, and `lib_barrel.test.ts` will require the
export by construction the moment the file exists.

### D8 · Documents corrected in the same phase

- **`mission.md`** — principle 4 gains the clause in **D6**. Nothing else: settings is not core
  scope, it is where the things that are not the board ended up.
- **`tech-stack.md`** — the `SidebarFooter` reservation is rewritten (**D2**); the routing row names
  four routes; the tree gains `pages/settings_page/`, `routes/_board/settings/`, `hooks/use_reset.ts`
  and the renamed `intro_dialog.tsx`, and the `use_theme.ts` line says where the toggle lands. The
  persistence row is unchanged — **three keys, still**.
- **`roadmap.md`** — P14 is written down above the *Planned, in order* list, which the roadmap
  explicitly allows: *"Order is a plan, not a commitment; inserting work here is an edit to this
  list."* *Dark mode*'s entry gains a line saying its toggle has a home.
- **`README.md`** — status to P14.
- **`lib/index.ts`** — one line for `sample_notes.ts` (**D7**). `lib_barrel.test.ts` fails without
  it, which is the point of that test.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.** The suite is **green on `main`
  today** — P13 and #17 left it that way — so this phase's group 0 measures a baseline rather than
  repairing one.
- **No new dependency, runtime or dev, and no `shadcn add`.** `alert-dialog` (P9), `input`, `button`
  and `separator` are all already here, and `lucide-react` has the `Settings` glyph.
- **`snake_case` for every file we author.** Four new files and one rename, all conforming; `EXEMPT`
  is untouched.
- **Every colour, radius and duration from a token.** The page uses `--background`, `--ink-soft`,
  `--border` and `--destructive`; the row uses `--duration-hover` and `--ease-out`.
- **Keyboard-reachable** (principle 5). The footer row is in the tab order after the destinations,
  the name field submits on Enter, and the confirmation traps focus with `Cancel` holding it.
- **Persistent by default, no Save button** (principle 3) — and the rename keeps one, which is the
  carve-out P3 made for creation and P13 reused for the name. A name is a value you commit. The
  reset is not a Save either: it is a thing that stands between you and destroying what you wrote,
  which `mission.md` puts in scope by name for delete.
- **Every import we author goes through `@/lib`** (P13's barrel rule). One module lands in `lib/`
  this phase — `sample_notes.ts` — and the barrel gains one line for it (**D7**).

## Risks

**The slot.** This is the second phase in a row to touch the bottom of the sidebar in a way the
constitution did not anticipate, and the first to take something another phase was promised. The
amendment in **D2** is honest about that and the argument stands on its own — but if *Dark mode*
arrives and its toggle genuinely wants to be one click away rather than one page away, **D2** is the
decision that was wrong, and the fix is a toggle in the footer beside the Settings row rather than
an unpicking of this phase.

**A destructive control now exists, permanently, two clicks from the board.** Sidebar → Settings →
Reset everything → confirm. That is three, and the third is the guard. Nothing in this app can be
undone, so the confirmation is the entire safety story, and it is one sentence with a real number in
it. **If Gate 3 reads that dialog and does not feel the weight of it, the copy is what to fix.**

**Reset is the first action in this app that touches three stores at once**, and the three do not
fail the same way. The reducer is synchronous, `setName` is synchronous, and the board's mirror is
debounced 300 ms behind — so for a third of a second after a reset the reducer is empty and
`localStorage` still holds every note. A reload inside that window restores the board. It is a
narrow window, it requires a deliberate reload mid-animation, and the alternative is a synchronous
write that bypasses the persistence boundary this app has kept clean for fourteen phases. **Named
rather than fixed**, and the test that would catch it changing shape is T85.

**The intro now opens as a consequence rather than as a first visit**, which is a state P13 never
had to draw. A person who resets is a person who has used this app, and they will see *Make it
yours* and a sentence explaining what a corkboard is for. That is slightly wrong and it is the right
kind of wrong: the alternative is copy that branches on whether you have ever named this browser
before, which is a second intro to maintain for a moment nobody will see twice. Gate 3 looks at it
and writes down what it says.

**The sample board is three notes that will age.** They were written in P1 to describe an app that
did not exist yet, and they are about position — *where a note sits is part of what it means* — on a
board that has since become a grid with a swap. The words are still true and the second one is the
one to watch: *the board stays where you left it* is now a promise about order rather than about
coordinates. **If Gate 3 reads them as describing a different app, the fix is the copy in
`sample_notes.ts`**, and it is one file with no logic in it.

**The settings page is one route with three controls and it will attract more.** Every app's settings
page began as this one. The defence is in § Out of scope and in **D2**: a row lands here when the
feature behind it exists, and never before.
