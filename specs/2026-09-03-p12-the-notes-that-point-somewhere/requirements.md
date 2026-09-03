# P12 · The notes that point somewhere — Requirements

**Phase:** P12 (twelfth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-03
**Branch:** `feat/p12-the-notes-that-point-somewhere` off `feat/p11-a-place-for-every-file`
**Status:** specified

---

## Context

P7 gave a note one URL and put a chip on the card so a board could be scanned for the notes that
point somewhere. P10 gave the pinned notes a section of their own. Twenty-five suites and 688
assertions pass.

A link is the other thing a note carries that you go looking for. *"Where is that article I saved"*
is the same question as *"which notes did I pin"*, and the board answers it the same way it answered
that one before P10: by making you scan.

So this phase adds the third section, **`Linked notes`** at `/linked`.

It also pays a debt. P10's § Risks said, in terms:

> Two sections is not a section framework. The next phase to want one — *Tags* — will find one
> `BoardSection` union and a `filter` in `board.tsx`, and will have to generalise both. That is the
> right amount of structure to have built today; naming it here means the generalisation is expected
> rather than discovered.

This is that phase, one earlier than expected. **The third section is built by generalising, not by
copying the second** (**D2**).

## Scope

Five deliverables.

1. **A section registry** — one list that says what the board's sections *are*, and one predicate
   each (**D2**).
2. **The sidebar and the board read it** rather than naming sections one at a time (**D3**).
3. **`Linked notes` at `/linked`** — a route file, a page, and one registry entry (**D1**, **D4**).
4. **The empty state generalises with it**, because the third section needs one too (**D5**).
5. **A note has a link when its `link` field is not empty** — nothing is parsed (**D6**).

Plus the documents this invalidates (**D7**).

## Out of scope

- **A different layout for the section.** The linked board is the same cards, the same drag, the
  same keyboard, filtered. The card already carries a clickable chip; a link-first list would make
  the section a different screen rather than a view of the board, which is not what a section is.
- **A copy-link control.** Useful, and it is a *per-note control on the card*, which would be the
  third amendment to principle 4 in three phases. If it is wanted it deserves its own phase and its
  own argument.
- **Parsing URLs out of `body`.** **D6**.
- **Opening every link at once**, link previews, favicons, or fetching anything. The app makes no
  network request — `mission.md`, § Explicitly out of scope.
- **Sections for colour, or for date.** The registry makes them cheap, which is not the same as
  making them wanted. `mission.md` names pin, link and tags; nothing else gets a row.
- **Tags.** Still its own phase. This one leaves it a registry to land in.

## Decisions

### D1 · The tab is `Linked notes`, at `/linked`

`Notes`, `Pinned notes`, `Linked notes`. The pattern is *adjective + notes*, and the third row
should not be the one that breaks it.

**`Links` was the alternative and is wrong here.** A row called `Links` in a sidebar promises a list
of URLs — the things themselves, probably compact, probably openable in a row. What this section
shows is *notes*, in the same grid as everywhere else, that happen to carry one. The label should
describe what is on the screen rather than what you were looking for.

The path is `/linked` rather than `/links` for the same reason: it is the adjective, and it matches
the label a reader just clicked.

### D2 · One registry, one predicate each

`lib/sections.ts`:

```ts
export const SECTIONS = [
  { section: 'notes',  path: '/notes',  label: 'Notes',        icon: StickyNote, keep: () => true },
  { section: 'pinned', path: '/pinned', label: 'Pinned notes', icon: Pin,        keep: (n) => n.pinned,       empty: {...} },
  { section: 'linked', path: '/linked', label: 'Linked notes', icon: Link2,      keep: (n) => n.link !== '',  empty: {...} },
] as const
```

Everything that varies between sections is in one row of it: the path, the label, the icon, the
predicate, and the copy for an empty one. The sidebar maps over the list; the board looks up its own
row and applies `keep`.

**What a fourth section costs after this**: one registry entry, one route file, one page. The route
file and the page are the file-based router's convention from P11 — a route is a file — and that is
the floor rather than duplication. What it no longer costs is an arm in the board's filter, an item
in the sidebar, a branch in the empty state and a member of a union, which was the whole of P10's
warning.

**The icon lives in the registry**, so `lib/sections.ts` imports from `lucide-react`. That is a
component reference in `lib/`, which is new. The alternative is a second map from section to icon in
the sidebar, which reintroduces exactly the two-places-to-edit problem the registry exists to
remove. `lib/` holds no React and renders nothing either way; it holds a value that happens to be a
component.

### D3 · The sidebar and the board stop naming sections

`app_sidebar.tsx` maps `SECTIONS`, and the active row is the one whose `path` matches — with `/`
falling back to the first entry, because P10 made `/` the whole board rather than a redirect.

`board.tsx` replaces

```ts
arrange(notes).filter((note) => section === 'notes' || note.pinned)
```

with the row's own predicate. The board then contains no section name at all: it knows there is a
section, and the registry knows what that means.

The badge on each row is `notes.filter(keep).length`, which makes `Notes`' badge the whole board by
construction rather than by a separate expression that happens to agree.

### D4 · `/linked` is a file, like every other route

P11's convention, unchanged:

```
routes/_board/linked/index.tsx   →  pages/linked_page/
```

Four lines each. The registry does not generate routes and should not: a route that exists only in a
data structure is a route you cannot find by reading a path, which is the property P11 bought.

### D5 · The empty state comes from the registry

P10 gave the pinned section a centred empty board — *No pinned notes* / *Open a note and pin it to
keep it up here*. The linked section needs the same, and the copy is not the same:

> **No linked notes**
> Add a link to a note and it will show up here.

Both are rows in the registry, and **`Notes` deliberately has none.** An empty *whole* board still
renders bare cork: a first-run screen wants an illustration and an invitation to write the first
note, and `empty_state.tsx` still belongs to *Polish*. The registry makes that a `null` rather than
a special case in `board.tsx`.

Each copy names the way *out* of the empty state — pin a note, add a link — because the thing you
cannot see from an empty section is how to fill it.

### D6 · A note has a link when `note.link` is not empty

`(note) => note.link !== ''`. Not a parse of `body`.

`lib/links.ts` is the only judge of what a URL is in this app: `normalizeLink` guards what the field
writes and `board_storage.ts` re-checks the scheme on read. A note is in this section exactly when
that judgement produced something, which means **the section can never disagree with the chip on the
card.** A body-scanning rule would put notes in the section with no visible link on them, and it
would need a URL parser the repo does not have and does not want before *Markdown and checkboxes*.

`title`, `body`, `date`, `colour` and `pinned` play no part. A pinned note with a link appears in
both sections, which is correct: the sections are questions about a note, not folders it lives in.

### D7 · Documents corrected in the same phase

- **`mission.md`** — the *Title and link* bullet in § Core scope gains the section, exactly as
  *Colors + pin* did in P10. **Principle 4 is not touched**: nothing is added to a card.
- **`roadmap.md`** — P12 is this phase, and it records that P10's generalisation debt is paid.
- **`tech-stack.md`** — the tree gains `lib/sections.ts`, `routes/_board/linked/` and
  `pages/linked_page/`.
- **`README.md`** — status to P12.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.**
- **No new dependency**, runtime or dev. The icon is already in `lucide-react`.
- **`snake_case` for every file we author**; `EXEMPT` is untouched — this phase generates nothing.
- **A section is a view, not an edit.** Nothing dispatches, and `order`, `pinned` and `link` are
  unchanged by navigating. The assertion P10 wrote for this extends to the third section.
- **Keyboard-reachable** — the third destination is an anchor like the other two, and arrow-key
  reordering inside the section keeps working.
- **The persistence contract is untouched.** No new key; the URL is still the only place the current
  section lives.

## Risks

**The linked section is not a prefix of the board, and the pinned one was.** P10 leaned on that: a
pinned note sorts above every unpinned one, so the pinned view is the front slice of the full
ordering and a swap inside it is the swap the whole board would have made. **A linked note sorts
nowhere in particular**, so two cards adjacent in `/linked` can have unlinked notes between them in
`/notes` — and an arrow-key swap there swaps two notes that are not neighbours anywhere else.

That is not a bug and it is not new: dragging one note onto another has always swapped exactly those
two, wherever they sit. But P10's reasoning does not carry over, and a test asserting "the swap is
the same swap" would be asserting something false. Validation says what is actually true instead:
**the two notes swap, and nothing else moves.**

**A registry makes new sections cheap, and cheap is how a sidebar becomes a menu.** Four rows is
already the point at which the sidebar stops being scannable. § Out of scope names what is not
getting a row; the next one to want a row should have to argue for it in a phase of its own.

**The predicate is the whole feature, which makes it the whole failure.** `keep` is one expression
per section and nothing type-checks that it is the *right* one — a section pointing at the wrong
field would still compile, still render and still look plausible. Each predicate is asserted
directly against a note that satisfies it and one that does not.
