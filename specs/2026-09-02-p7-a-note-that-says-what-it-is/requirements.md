# P7 · A note that says what it is — Requirements

**Phase:** P7 (seventh phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-02
**Branch:** `feat/p7-a-note-that-says-what-it-is` off `main`
**Status:** specified

---

## Context

P6 turned the card into a summary. It gave every note a date, fixed the card at `h-44`, clamped the
body to four lines with an ellipsis, and moved reading and editing into the note's own view. Nineteen
Vitest suites and 447 assertions pass.

The summary is still thin. A card shows a date and the first four lines of prose, which means
scanning a board is reading the openings of twenty paragraphs. A note about a meeting looks exactly
like a note about groceries until you have read both.

This phase gives a note the two things that make a card scannable at a glance: a **title**, and a
**link**. The title is the note's name, one line, bold, under the date. The link is a URL the note
points at — a Google Meet room, a Figma file, a pull request — rendered as a chip on the card that
opens in a new tab, and an editable field in the note's view.

Both of them cost vertical space on a card whose height is fixed, so the third deliverable is the
card's geometry. `h-44` was never validated: P6's `validation.md` § Gate 3 check 2 asked a human
whether `line-clamp-4` at `h-44` shows the right amount of note before you click, and P6 merged
without that check being run. **This phase discharges it** rather than deferring it a third time.

Two things this phase changes about the constitution, both named as decisions rather than done
quietly:

- The roadmap's P7 is *Find things* — search and tags. That work is not cancelled; it is renumbered
  to P8 and everything after it moves down one (**D1**).
- `mission.md` § Core scope lists what ships. A title and a link are not on it. **D2** adds them.

## Scope

Seven deliverables.

1. **The constitution amendment.** `roadmap.md` gains this phase as P7 and renumbers *Find things*
   through *Polish*; `mission.md` § Core scope gains the title and the link (**D1**, **D2**).
2. **The model.** `Note` and `NoteSeed` gain `title: string` and `link: string`. Both are `''` when
   absent — there is no `null`, no `undefined`, and no optional property (**D3**).
3. **The link module.** `src/lib/links.ts` — pure normalisation, validation and display. It is the
   only place a URL string is judged, and it is where `javascript:` and `data:` are refused
   (**D4**).
4. **The card.** `h-52`, date top-left, title clamped to one line, body clamped to the lines that
   are left, link chip on the bottom edge. The body reclaims a line for each of the title and the
   link that the note does not have (**D5**).
5. **The fields.** A title input and a link input in both dialogs, sharing one component. The create
   dialog still opens focused on the body (**D6**).
6. **Migration.** The defensive read gives a stored note without a `title` or a `link` an empty
   string for each, and drops a stored `link` that does not survive **D4**'s validation. `version`
   stays `1` (**D7**).
7. **P6's Gate 3 check 2, run.** The card geometry is judged on a real board with real notes, and
   the answer is written down (**D8**).

## Out of scope

- **Search, tags, and filtering.** That is P8 after **D1**. Nothing here filters the board, and the
  title is not made searchable — a title with no search box is still worth having, and a search box
  that arrives one phase later will search a corpus that already has titles in it.
- **More than one link per note.** One `link` field. A note that needs two links can put the second
  in its body, and P9's markdown will render it.
- **Link previews, favicons, page titles, oEmbed.** Every one of those is a network request, and
  `mission.md` puts the whole category out of scope: *"no backend, database, or network request —
  the app must work fully offline."* The chip shows the URL's own host and path and nothing it had
  to fetch.
- **Anything Google-specific.** No Meet API, no calendar lookup, no join-state, no "starts in 5
  minutes". A Meet URL is a URL. `mission.md` bans calendar integration and this phase does not go
  near it (**D4**).
- **Auto-linking URLs found in the body.** That is markdown's job in P9. The `link` field is a
  separate, deliberate thing.
- **Sorting or grouping by title.** The board is ordered by the `order` stamp and dragging is what
  changes it. P5's guarantee is not weakened by a new field.
- **A title on the card when the note has none.** No `Untitled` placeholder on the board — an
  untitled note gives the space back to its body (**D5**).

## Decisions

### D1 · This is P7; *Find things* becomes P8

`roadmap.md` currently reads P7 *Find things*, P8 *Markdown and checkboxes*, P9 *Dark mode*,
P10 *Polish*. After this phase:

| Phase | Was | Is |
| --- | --- | --- |
| P7 | Find things | **A note that says what it is** |
| P8 | Markdown and checkboxes | Find things |
| P9 | Dark mode | Markdown and checkboxes |
| P10 | Polish | Dark mode |
| P11 | *(the Later list's leftovers)* | Polish |

The alternative — shipping the title and the link *inside* P7 alongside search and tags — was
rejected. That is two unrelated concerns in one diff: the card's geometry and the note's shape on
one side, a filter and a parser on the other. Each roadmap phase so far has been one idea, and the
merged phase would have been the largest by a wide margin.

Renumbering rather than inserting a `P6.5` keeps the phase numbers as a sequence rather than a
history of when things were decided. The cross-references inside earlier specs that name a future
phase by number (P6's requirements point markdown at "**P8**", P5's and P6's risks point deletion
confirmation at "**P10**") are corrected in the same commit, because a spec pointing at the wrong
phase number is worse than one pointing at nothing.

### D2 · Core scope gains the title and the link

`mission.md` § Core scope is the list of things that ship. It currently reads: ordered board, open
and edit, colors + pin, search + tags, markdown + checklists, dark mode. A title and a link are on
none of those bullets, so this is an addition rather than a clarification, and it is stated as one:

> - **Title and link** — a note can carry a one-line title and one URL. The card shows both so the
>   board can be scanned rather than read; the link opens in a new tab.

Nothing is removed. Principle 3, *"There is no Save button"*, is **not** amended and constrains this
phase exactly as it constrained P6: the title and the link autosave, and neither dialog grows a Save
or a Cancel for them (see **D6**).

Principle 2 is **not** amended either. P6's § Risks warned that a fourth amendment to it means the
principle should be rewritten from scratch rather than patched again. This phase does not touch it —
it adds fields to a view that already exists, and a card that is already a summary. The warning
stands for whoever needs it next.

### D3 · `title` and `link` are strings, never absent

```ts
title: string   // one line, '' when the note has no title
link: string    // an http(s) URL, '' when the note has no link
```

Empty string rather than `string | undefined` or an optional property, for the same reason `body`
has always been `''` and not `null`: every reader would otherwise need a fallback, and one of them
would eventually forget. `''` is falsy, renders as nothing, and needs no guard beyond `=== ''`.

`NoteSeed` gains both so creation stays one dispatch and one storage write, exactly as P3's `body`
and P6's `date` did. `createdAt === updatedAt` still holds for a note born with a title and a link.

The title is **not** length-limited in the model. It is clamped to one line by CSS on the card and
shown whole in the view — a limit enforced by the input would be a rule the user has to discover by
hitting it, and a title that overflows the card is already visibly a title that is too long.

### D4 · `lib/links.ts` owns every judgement about a URL

Three pure functions, no component logic, no `window`:

```ts
export const normalizeLink = (raw: string): string => …   // trims, adds https://, returns '' if unsafe
export const isSafeLink = (value: string): boolean => …   // http: or https: only
export const linkLabel = (url: string): string => …       // 'https://meet.google.com/abc' -> 'meet.google.com/abc'
```

**`normalizeLink` prefixes a bare host with `https://`.** Typing `meet.google.com/abc-defg-hij` and
getting a working link is the behaviour a person expects; an `<a href="meet.google.com/abc">` is a
relative path that navigates the app to a page that does not exist.

**Only `http:` and `https:` survive.** This is the security decision and it is not decorative: a
stored string reaches the DOM as an `href`, and `javascript:alert(1)` in an `href` executes on
click. The board is a single-user local app, but the stored value passes through `localStorage`,
which is exactly the kind of thing a future export/import feature reads back without thinking. The
scheme check happens at the boundary — on the way *in*, in `normalizeLink`, and again on the way
*out* of storage in the defensive read (**D7**) — so a value written by an older build or by hand in
devtools cannot reach an `href` either.

`mailto:`, `tel:` and `vscode:` are refused along with the dangerous ones. Allowing them means
deciding what an arbitrary custom scheme may do, and the phase does not need them.

**`linkLabel` strips the scheme and a leading `www.`** and returns the rest. `https://meet.google.com/abc-defg-hij`
shows as `meet.google.com/abc-defg-hij`, which is both what identifies the link and what fits.
Truncation is CSS, not string slicing, so the label adapts to the column width the grid gave the
card rather than to a hardcoded character count.

`URL` is used to parse, inside a `try`. An unparseable string is not a link.

### D5 · The card: `h-52`, and the body takes back what it is not given

The card grows from `h-44` (176px) to `h-52` (208px). Two new rows arrive — a title line and a link
chip — and keeping the height would have left the body two clamped lines, which is not a summary,
it is a teaser.

Layout, top to bottom, inside `p-4`:

```
┌──────────────────────────┐
│ 09/02/2026               │  date · text-xs · text-ink-soft · tabular-nums
│                          │
│ Standup with the team    │  title · text-sm · font-semibold · line-clamp-1
│                          │
│ Went through the P6      │  body · text-sm · text-ink-soft · leading-relaxed
│ merge and agreed the     │       · line-clamp-3
│ card height needs…       │       · ellipsis on the last visible line
│                          │
│ 🔗 meet.google.com/abc   │  chip · text-xs · bottom edge · truncate
└──────────────────────────┘
```

**The body's clamp is not fixed at three.** It is three lines, plus one for each of the title and
the link that this note does not have:

| Title | Link | Body clamp |
| --- | --- | --- |
| yes | yes | 3 |
| yes | no | 4 |
| no | yes | 4 |
| no | no | 5 |

This is the answer to P6's Gate 3 check 2 rather than a dodge of it. The complaint the check
anticipated — a fixed height truncates more than expected — is real, and it is worst for the note
that has nothing but body. A note with no title and no link now shows **five** lines where P6 showed
four, and the card it sits beside is still exactly the same height. Uniform height was always the
requirement; a uniform *clamp* never was.

The clamp classes are a static `Record`, not an interpolated string. Tailwind scans source text, and
`line-clamp-${n}` emits nothing — the same trap `lib/paper.ts` documents for `bg-paper-${color}`.

**The chip is a sibling of the open button, not a child of it.** The card's opener is a real
`<button>` wrapping the date, title and body; an `<a>` nested inside a `<button>` is invalid HTML,
and browsers disagree about which one a click belongs to. The chip sits after it, and stops
propagation on `click` and `pointerdown` the way `note_controls.tsx` already does — otherwise
following a link would also open the note behind it, and pressing the chip would start dragging the
card.

`target="_blank"` with `rel="noopener noreferrer"`. `noopener` because a new tab with a handle on
`window.opener` can navigate the board out from under itself.

**The chip does not animate on hover.** `mission.md` asks for spring motion on pick-up, drop and
settle, and this is none of those; a hover effect on something you pass over dozens of times a day
is the category that should be reduced rather than added to. The chip changes colour and gains an
underline over `--duration-hover`, gated behind `@media (hover: hover)` so a tap on a touch device
does not leave it stuck in its hover state.

### D6 · One field component, in both dialogs, and the body still gets the focus

`src/components/layout/note_fields.tsx` holds the title input and the link input, exactly as
`paper_radiogroup.tsx` and `date_field.tsx` are shared by both dialogs. The create dialog and the
view dialog present the same four things in the same order — date, colour, title, body, link — so
that a note looks the same when you make it as when you open it.

**The create dialog still opens focused on the body textarea, not on the title.** The title input is
above it in the DOM and one `Shift+Tab` away. This is deliberate and it is the mission's call, not a
preference: *"Can I capture a thought in under two seconds?"* is the one-sentence test, and a
required stop at a field that is optional fails it. P3 made the same call about colour — *"the
colour is a default that is usually fine; the text is the thought"* — and a title is the same kind
of thing.

The alternative, focusing the title, was rejected on that basis. It is a one-line change if the
board disagrees in practice.

**Saving follows what each field is.** The title and the link are typed, so both debounce on change
at the same 300ms the body uses, and both flush on close through the existing `close()` path. Date
and colour still dispatch immediately, because they are picked rather than typed. No Save button
appears anywhere, and principle 3 is not amended.

**The link normalises on blur, not on keystroke.** `normalizeLink` would otherwise rewrite `h` to
`https://h` between the first and second character of `https`. What is stored is normalised; what is
in the input while you type is what you typed.

An invalid link is not an error state with a red border and a message. The field keeps the text, and
the chip does not render — the card showing no chip is the feedback, and it is honest: the note has
no usable link. A dialog that blocks on a malformed URL is a Save button wearing a different hat.

### D7 · The read fills in `title` and `link`, and re-checks the scheme

Same shape as P5's `order` repair and P6's `date` repair, and for the same reason: `version` stays
`1` and a stored note that is missing a field is repaired rather than rejected.

- `title` absent or not a string → `''`.
- `link` absent or not a string → `''`.
- `link` present but failing `isSafeLink` → `''`. **This is the second half of D4's boundary.** The
  input path already refuses `javascript:`; this refuses it again for a value that never went
  through the input path.

A malformed title or link is recoverable and losing the board is not, so neither rejects the whole
value. The rest of `isNote` is unchanged: a board malformed in any other way is still rejected
whole.

### D8 · P6's Gate 3 check 2 is answered here

P6's `validation.md` asked: *is `line-clamp-4` at `h-44` the right amount of note to see before
clicking?* It merged unanswered. It is answered in this phase's `validation.md` § Gate 3 check 1,
against a board carrying a long note, a short note, a titled note, an untitled one, a note with a
link and a note without — because the question is about the ragged case, not the tidy one.

The reduced-motion pass and the 100+ note drag check, also outstanding from P5 and P6, are **not**
claimed here. They belong to P10's a11y and performance passes and this phase does not touch motion
or drag.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.** No new eslint override, no
  `// eslint-disable` in our own code.
- **No Save button, anywhere.** Principle 3, and **D6**.
- **No network request.** Rules out every form of link preview (§ Out of scope).
- **Every file we author is `snake_case`.** `links.ts` and `note_fields.tsx` comply; the `EXEMPT`
  pin in the naming test must not be edited.
- **Warm tokens only.** The chip uses `text-ink-soft` and `text-ink`; no achromatic literal, no
  stock blue link colour.
- **Keyboard-reachable.** The chip is an `<a>` with an `href`, so it is in the tab order for free.
  The card's `Enter`/`Space` still open the note; the chip's `Enter` follows the link.
- **`prefers-reduced-motion`.** Nothing added here animates position, so the existing global
  collapse covers it.

## Risks

**The card gets busy.** Four things now compete inside 208px — date, title, body, chip — plus the
pin and delete controls in the top-right corner. `mission.md` principle 4 says *the interface is the
notes*, and a card carrying five affordances is arguably no longer a piece of paper. The mitigation
is that three of the five are invisible until hover, and the chip is only present when the note has
a link. Gate 3 check 1 is where a human decides whether that held.

**A dynamic clamp is a rule a reader must learn.** "Three lines, plus one for each thing the note
does not have" is more to hold in your head than "four lines". It is a `Record` and a comment in one
file, and the alternative — a fixed three-line clamp — makes the plainest note the worst-served one.

**The chip is a fourth gesture on the card**, after open, drag, pin and delete. P6's § Risks already
called the card's click target the most likely place for a regression and that has not changed. The
plan writes the propagation test before the chip exists.

**`URL` parsing is the browser's, and it is permissive.** `https://...` with a nonsense host parses
fine and produces a link that goes nowhere. This phase validates the *scheme*, which is the part
that is a safety question, and does not validate reachability, which cannot be checked without a
network request.

**Renumbering five roadmap phases invalidates every cross-reference to them.** The greps in Gate 1
are how that is caught rather than remembered.
