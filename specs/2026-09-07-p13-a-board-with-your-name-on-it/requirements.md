# P13 · A board with your name on it — Requirements

**Phase:** P13 (thirteenth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-07
**Branch:** `feat/p13-a-board-with-your-name-on-it` off `main`
**Status:** specified

---

## Context

Twelve phases built a board. Nothing on it says whose it is.

That is a small absence and it is felt in one specific place: the sidebar. It carries the app's own
mark, three destinations and their counts, and then a large empty space above the rail. Every
application shaped like this one puts an identity at the bottom of that space, and this one has
nothing to put there — not because it was decided against, but because the question never came up.

So this phase asks the question once, on the first visit, and draws the answer in the sidebar: a
circle carrying your initials, and your name beside it.

**This is the phase where the constitution has to be read carefully rather than quoted.**
`mission.md` says *"Built for one user (me). No accounts, no sync, no collaboration, no server"*,
and § Explicitly out of scope names *"Accounts, auth, multi-user, sharing, real-time
collaboration"*. A dialog that asks who you are looks exactly like the first half of a sign-up
form, and a phase that shipped one without saying so would be the phase that made every later
"but we already ask for a name" argument available.

It is not an account, and **D1** is the amendment that says where the line is.

This phase also lands a piece of housekeeping that has nothing to do with names: `src/lib/` gets a
**barrel** (**D7**). It is here rather than in its own phase because P11 already spent a phase on
structure that no user can see, and the roadmap named that an exception rather than a precedent.

## Scope

Seven deliverables.

1. **The amendment** — a display name is not an account, and the carve-out is one line wide
   (**D1**).
2. **`lib/user.ts`** — the storage key, the defensive read, and the initials (**D4**, **D5**).
3. **`hooks/use_user.ts`** — the one way to read and write the name (**D5**).
4. **The name dialog** — opens on a first visit, dismissible, and reopened from the sidebar
   (**D2**, **D3**).
5. **The sidebar footer identity row** — the initials, the name, and the way back to the dialog
   (**D3**, **D6**).
6. **`lib/index.ts`** — one barrel, and every import we author rewritten to use it (**D7**).
7. The documents this invalidates (**D8**).

## Out of scope

- **Accounts, auth, a password, a second user, sync, or anything that leaves this browser.** The
  amendment in **D1** exists to say that this stays out, permanently.
- **An avatar image, an upload, or a colour picker for the circle.** Attachments and image upload
  are already out of scope in `mission.md`; the circle draws two letters and nothing else (**D6**).
- **The name anywhere except the sidebar.** No greeting on the board, no "Joe's board" in the
  document title, no author on a note. A note has one author by construction and stamping it on
  each card would be noise the board has to carry forever.
- **Per-user boards.** One board, one browser, unchanged. Clearing the name does not clear the
  board and does not partition it; nothing in `BoardState` is keyed to a person (**D1**).
- **shadcn's `avatar` component.** **D6**.
- **A theme toggle in the new footer.** `tech-stack.md` reserves `SidebarFooter` for *Dark mode*.
  That phase lands **beside** this row, not on top of it — and this phase does not build the slot
  for it, because a control that cannot be used should not be drawn.
- **A migration for anything.** No stored board changes shape, and `BOARD_KEY` keeps its `v1`.

## Decisions

### D1 · A display name is not an account, and the amendment says so

`mission.md` § Explicitly out of scope gains the carve-out, written so that it is narrower than the
thing it carves out of:

> - Accounts, auth, multi-user, sharing, real-time collaboration. **A display name is not an
>   account:** one name, typed into this browser and drawn in the sidebar. No password, no server,
>   no second user, and nothing in the board is keyed to it.

Three clauses do the work. *No password* rules out auth. *No server* rules out sync and sharing.
**Nothing in the board is keyed to it** is the one that matters most: it means the name can be
changed or deleted at any moment without a single note moving, which is what makes it a label
rather than an owner. An identity that owns data is an account no matter what the dialog is
called.

§ What this is gains one sentence for the same reason — so a reader meeting *"built for one user
(me)"* learns immediately that the name is how the app says *me*, not how it finds out *which*
user.

**Why the amendment rather than a quiet ship.** P3, P5, P6, P9 and P10 each amended this document
in the phase that contradicted it, and each amendment was deliverable 1 so that rejecting it killed
the phase before the code existed. This one is the most load-bearing of the six: the others widened
what the app does, and this one draws a boundary around a feature that is famously the thin end of
a wedge.

### D2 · The dialog opens once, and can be dismissed

On a visit with no stored name, the dialog opens. **Escape closes it, the backdrop closes it, and
Cancel closes it** — and nothing is stored, so the board is immediately usable by someone who does
not want to answer.

**The one-sentence test is what decides this.** *Can I capture a thought in under two seconds* has
to hold on the first visit too, and a modal that must be answered before the board exists makes the
first thought the slowest one the app will ever take. A blocking dialog would also need an answer
for what an empty submit does, and every answer to that is worse than not asking.

**It does not reopen by itself.** Not on the next load, not after a reload. A modal that returns
until you comply is a modal that was not really dismissible, and being asked once is the difference
between a question and a nag. Once dismissed, the sidebar is the only thing that still asks
(**D3**) — quietly, in place, where it can be ignored forever.

The dialog is Radix's, through the same `components/ui/dialog.tsx` the create dialog, the note view
and the search palette all use, so its overlay, its blur, its motion and its focus trap are the
ones already on screen rather than a fourth copy. **No new shadcn component is installed** — the
roadmap's *don't build ahead* rule, and this phase needs a `Dialog`, an `Input` and a `Button`,
which are all here.

### D3 · The name lives in the sidebar footer, and the row is the way back

`SidebarFooter`, below the nav group and above the rail:

```
┌──────────────────┐
│ ▣ Sticky         │
│                  │
│ BOARD            │
│ ▤ Notes       8  │
│ ⚲ Pinned notes 3 │
│ ⛓ Linked notes 2 │
│                  │
├──────────────────┤
│ (JA) Joe Alonzo  │
└──────────────────┘
```

**With no name stored**, the same row reads *Add your name* beside an empty circle, and clicking it
opens the dialog. That is what **D2** means by *the sidebar keeps asking*: the question survives its
own dismissal, without a second modal and without a badge or a dot demanding attention.

**With a name stored**, the row still opens the dialog, prefilled — so a typo is fixable and the
phase does not ship a name you can only change by editing localStorage by hand. This is a judgment
call rather than an answered question, and it is small enough to cut: deleting the prefill and the
click handler leaves the row a static label, and nothing else in the phase changes.

**Not the header.** The header is the application's identity — the mark and the word *Sticky* — and
putting a second identity beside it makes the corner ask *which one of these is the app?* The
footer is where every sidebar-shaped application puts a person, which is a convention worth having
rather than an accident worth breaking.

**Collapsed to the rail** the row is the circle alone, with the name in the tooltip the sidebar
already provides for its rows. Initials survive the collapse; a name does not, which is most of the
reason to draw initials at all.

**No motion.** The row is on screen every second the app is open, and it is one of the things a
person looks at dozens of times a day without meaning to. The hover is a colour change on the
sidebar's own accent at half strength, over `--duration-hover`, `--ease-out` — the same treatment
an inactive destination gets, for the same reason. No scale on press, no fade-in on mount, and no
animation when the name changes.

### D4 · Initials are derived, never stored

`initialsOf(name)` in `lib/user.ts`, pure, and the only place two letters are cut out of a name:

| Name | Initials | Why |
| --- | --- | --- |
| `Joe Alonzo` | `JA` | first word, last word |
| `Joe Michael Alonzo` | `JA` | still first and last — a middle name is not more of you |
| `joe` | `J` | one word gives one letter, never `JO` |
| `  joe   alonzo  ` | `JA` | whitespace collapsed before anything is read |
| `李明` | `李` | one word, one character |
| `` | `` | no name, no initials — the empty circle |

Rules, in order: trim, collapse runs of whitespace, take the first and last word, take **one code
point** from each, uppercase, and cap at two.

**One code point, not one `charAt`.** `name[0]` splits a surrogate pair and renders half of an emoji
or an astral character as `�`. `Array.from(word)[0]` is one visible character in every script. The
uppercase is `toUpperCase()` rather than `toLocaleUpperCase()`: the locale-aware form makes the
rendered initials depend on the browser's locale, which would make this table wrong somewhere and
the test flaky everywhere.

**Derived on every render rather than stored.** It is a pure function of one short string, and a
stored copy is a second thing that can disagree with the name — the same reason tags are parsed from
`body` rather than persisted.

### D5 · Its own key, its own defensive read, one hook

**`sticky-notes:user`**, holding `{ "name": "Joe Alonzo" }`.

Unversioned, like `sticky-notes:sidebar` and unlike `sticky-notes:board:v1`. A version number is
worth carrying when a wrong guess costs you data you cannot retype; the entire recoverable content
of this key is a name, and the recovery is one dialog. **The defensive read repairs to *no name*:**
anything that is not an object with a non-empty string `name` becomes `''`, which is exactly the
state a first visit is in, and the app already knows what to do with it.

An object rather than a bare string because the key names *the user*, not *the name*, and a second
field one day should not need a `v2`. That is the whole argument, and it costs six characters.

`lib/user.ts` holds `USER_KEY`, `readUserName` and `initialsOf` together, the way `board_storage.ts`
holds `BOARD_KEY` beside `hydrate`. A key without its own defensive read beside it is how one gets
written without the other.

`hooks/use_user.ts` wraps `useLocalStorage` and is **the only thing that reads or writes the key**.
Two components use it — the dialog writes, the sidebar reads — and `usehooks-ts` keeps separate
callers of the same key in step within a tab by dispatching its own event on write. **That is the
one library behaviour this phase leans on**, so the plan verifies it in groundwork; if it does not
hold, the fallback is a `context/user_context.tsx` beside the other two providers, which is a
different file and no different design.

`initializeWithValue` is left at its default, so the first render already knows whether a name is
stored. Deferring that read to an effect would flash the dialog at a returning user for one frame,
which is the worst frame the app could possibly draw.

### D6 · A circle with two letters, and no `avatar` component

shadcn's `avatar` is an image with a fallback. There is no image here and there will not be one —
image upload is out of scope in `mission.md` — so installing it would add a Radix primitive to
render the fallback state of a picture that does not exist.

The circle is a `div`: `size-6`, `rounded-full`, `bg-sidebar-primary`, `text-sidebar-primary-foreground`,
the initials centred in `text-[0.625rem]`-class type with `font-medium` and tabular-ish spacing. Two
letters at that size need the strongest contrast pair the sidebar has, which is the primary the
active destination's bar is already drawn in — so the one saturated mark in the sidebar and the one
identity in the sidebar are the same colour rather than two competing accents.

Empty state: the same circle with `bg-sidebar-accent`, `text-ink-soft`, and a `Plus` glyph. It reads
as a slot for something rather than as a person with no name.

**The circle is `aria-hidden`.** The row's accessible name is the name itself, or *Add your name*;
initials read aloud are two letters of noise on top of the word they were cut from.

### D7 · One barrel, and every import we author goes through it

`src/lib/index.ts` re-exports all twelve modules. Every import **in the code we author** becomes
one line:

```ts
import { isISODate, normalizeLink, SECTIONS } from '@/lib'
```

There are 46 such imports across 32 files today. **Three of them stay deep**, and so does everything
in `components/ui/`:

- **Inside `src/lib/` itself, modules import each other deeply** — `board_storage.ts` imports
  `dates.ts` and `links.ts` directly, and `note_factory.ts` imports `grid.ts`. A module that reaches
  its neighbour through the barrel imports the barrel that imports it, which is a cycle: it resolves
  today and it stops resolving the first time initialisation order matters. The rule is one line and
  it is checked by a grep in validation, not by memory.
- **`components/ui/**` keeps `@/lib/utils`.** `npx shadcn add` writes that exact specifier into
  every component it generates, and a rewritten import is a conflict on every future `add` and
  `diff` — the same reason those files keep their kebab-case names. Eleven imports, exempt for a
  reason that already has a precedent.

**A test pins the barrel's coverage.** Every `.ts` file in `src/lib/` except `index.ts` must be
re-exported by it, asserted against the directory listing rather than a hand-written list, so a
module added later without a barrel line fails the suite instead of being discovered by someone's
import.

**The honest cost.** A barrel means an import of one function pulls the module graph of twelve into
the compilation unit. Vite tree-shakes the bundle, so this is not shipped bytes; it is a real cost
in test setup and a real risk of accidental cycles. What it buys is that a file's imports say
*`@/lib`* rather than reciting which module a function happens to live in today — and moving a
function between lib modules stops being a rename across thirty files.

### D8 · Documents corrected in the same phase

- **`mission.md`** — the § Explicitly out of scope carve-out and the § What this is sentence
  (**D1**). § Core scope gains no bullet: the name is not a feature of the board.
  **Principle 4 is amended in one word** — the sidebar holds global controls, and it now also holds
  an identity, which is neither a control nor a note.
- **`roadmap.md`** — P13 is added and the phase is written down. It is not on the *Planned, in
  order* list, which is a thing the roadmap explicitly allows: *"Order is a plan, not a
  commitment; inserting work here is an edit to this list."*
- **`tech-stack.md`** — the persistence row names the third key; the tree gains `lib/user.ts`,
  `lib/index.ts`, `hooks/use_user.ts` and `components/layout/user_name_dialog.tsx`; and the barrel
  rule (**D7**) is written into § Hard rules, where the `snake_case` rule already lives.
- **`README.md`** — status to P13.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.** See § Risks — the suite is
  **red on `main` today** and the plan's group 0 fixes it before anything else is counted.
- **No new dependency**, runtime or dev. `usehooks-ts` and `lucide-react` are already here, and no
  shadcn component is installed (**D6**).
- **`snake_case` for every file we author.** Four new files, all conforming; `EXEMPT` is untouched.
- **Every colour, radius and duration comes from a token.** The circle uses `--sidebar-primary` and
  its foreground; the hover uses `--duration-hover` and `--ease-out` (**D3**, **D6**).
- **Keyboard-reachable** (principle 5). The dialog opens from the sidebar row with Enter or Space,
  focuses the input, submits on Enter, and closes on Escape. The row is a `button` in the tab order,
  after the destinations.
- **Persistent by default, no Save button** (principle 3). The dialog has a submit because a name is
  a value you commit rather than a note you write — the same carve-out P3 made for creation, and the
  same reasoning: this is not editing something that already exists.
- **The board is untouched.** No note changes, `BOARD_KEY` keeps its shape and its version, and
  naming yourself writes exactly one key.

## Risks

**The first thing the app ever does is open a modal.** For a returning user that is invisible, and
for a new one it is the whole first impression. **D2** makes it dismissible, which contains the
damage but does not remove the fact that the board is behind a blur for as long as the dialog is
open. Gate 3 asks the only question that matters here — *does the first visit feel like being asked
a question, or like being stopped at a door* — and it is written down whatever the answer is.

**localStorage is not identity, and the app will act like it is.** Clearing site data, a private
window, or a different browser all produce a stranger, and the dialog will open again as if this
were a new person. That is correct behaviour for a browser-local label and it will still feel wrong
the first time it happens. It is the strongest argument for the name never owning anything
(**D1**).

**Initials are a Latin-alphabet idea.** Two letters from the ends of a name works for `Joe Alonzo`
and degrades quietly everywhere else — a mononym, a script that does not have case, a name whose
family part comes first. The table in **D4** picks the least-wrong rule rather than a correct one:
one code point per word, never more than two, no reordering. A name the rule handles badly is still
readable in the row beside it.

**The barrel rewrite touches thirty files and can hide a cycle.** It is a mechanical diff large
enough that a real change could ride along inside it unnoticed, which is why it lands as its own
commit, before the feature, with the suite unchanged across it. The lib-internal deep-import rule
(**D7**) is what keeps the cycle from existing; the grep in Gate 1 is what keeps the rule.

**The footer is claimed by two phases now.** *Dark mode* was promised `SidebarFooter` in
`tech-stack.md` long before this phase existed. Nothing breaks — a footer holds two rows — but the
next phase to reach for that slot will find it occupied, and it should find that written down here
rather than discovering it.

**The suite is red on `main`.** `T71` and `T77` — both *"leaves every order, pin and timestamp
untouched through a round trip"* — fail because a debounced board write from an earlier test in
`sections.test.tsx` lands during a later one, after `beforeEach` has cleared the key. It is a test
defect rather than a product one, it is nothing to do with this phase, and **P13 cannot measure a
single assertion until it is fixed**, so group 0 fixes it.
