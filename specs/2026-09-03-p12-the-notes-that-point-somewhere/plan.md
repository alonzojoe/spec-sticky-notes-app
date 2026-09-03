# P12 · The notes that point somewhere — Plan

A groundwork step and four task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in
[validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `refactor`, `feat`, `test`, `docs`.

**Ordering note.** Group 1 is the refactor and **adds no section**: the registry replaces what the
sidebar and the board already say about `Notes` and `Pinned notes`, and the suite proves it changed
nothing. Group 2 adds `Linked notes` as one entry, one route file and one page — which is the whole
argument for group 1 having happened first. Group 3 is the section's own coverage, group 4 the
documents.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **A section is already a prop and a filter** — P10's `Board({ section })` — so the registry
  replaces the *expression* rather than the plumbing.
- **`/` and `/notes` are two routes to one page**, so the sidebar's active lookup has to treat a
  missing match as `Notes` rather than as nothing.
- **The card already renders a link chip** when `note.link !== ''`, so the section needs no new
  markup anywhere.

*To verify in group 0:*

- **`lib/` importing `lucide-react` upsets nothing** — no lint rule, no test asserting `lib/` is
  React-free, and no bundling consequence.
- **A pinned note carrying a link appears in both sections**, which is the shape of the whole
  registry: sections are questions, not folders.

---

## 0. Groundwork

0.1 Branch `feat/p12-the-notes-that-point-somewhere` off **`feat/p11-a-place-for-every-file`**,
    since P11's PR #14 is not merged and this phase edits the tree it moved. Rebase onto `main` once
    it lands.

0.2 Full gate on the clean branch: **25 suites, 688 assertions.**

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The registry, with nothing new in it

Test-first: extend `sections.test.tsx`.

1.1 `lib/sections.ts` — `SECTIONS`, one row per section: `section`, `path`, `label`, `icon`, `keep`,
    and `empty` (or `null` for `Notes`). Plus `sectionAt(pathname)`, which is where `/` falling back
    to `Notes` lives.

1.2 `types/note.ts` — `BoardSection` stays the union it is; the registry is typed against it, so a
    row for a section that does not exist fails to compile.

1.3 `app_sidebar.tsx` maps `SECTIONS`. Each badge is `notes.filter(keep).length`, which makes
    `Notes`' count the whole board **by construction** rather than by a second expression that
    happens to agree.

1.4 `board.tsx` applies its own row's `keep`, and renders its `empty` copy when the section is empty
    and has one. **The board then names no section at all.**

1.5 **Nothing is added.** The suite is the proof: 688 assertions, unchanged, over two sections.

1.6 Commit: `refactor(board): put the sections in one registry`

---

## 2. The third section

Test-first: extend `sections.test.tsx`, T76–T77.

2.1 `lib/sections.ts` — the `linked` row: `/linked`, `Linked notes`, `Link2`,
    `(note) => note.link !== ''`, and **D5**'s empty copy.

2.2 `types/note.ts` — `BoardSection` gains `'linked'`.

2.3 `src/app/routes/_board/linked/index.tsx` and `src/pages/linked_page/` — P11's convention, four
    lines each. **A route is a file**, not a registry entry (**D4**).

2.4 Nothing else changes. The sidebar grew a row and the board learned a predicate because the list
    grew, which is the phase's own proof that group 1 was the right shape.

2.5 T76–T77. Commit: `feat(board): add a linked notes section`

---

## 3. The section's coverage

3.1 **Each predicate is asserted directly** — a note that satisfies it and one that does not — for
    all three rows. § Risks: the predicate is the whole feature, and nothing type-checks that it
    names the right field.

3.2 A pinned note with a link is in **both** sections, and in `Notes`.

3.3 Navigating to `/linked` writes nothing — the same assertion P10 wrote, extended.

3.4 **The swap assertion is written for what is true.** The linked section is *not* a prefix of the
    board, so two cards adjacent in it can have unlinked notes between them elsewhere; an arrow-key
    swap swaps those two notes and moves nothing else.

3.5 Commit: `test: cover the third section and every predicate in the registry`

---

## 4. The documents

4.1 `mission.md` — the *Title and link* bullet gains the section, as *Colors + pin* did in P10.
    **Principle 4 is not touched**: nothing is added to a card.

4.2 `roadmap.md` — P12, recording that P10's generalisation debt is paid here rather than in *Tags*.

4.3 `tech-stack.md` — `lib/sections.ts`, `routes/_board/linked/`, `pages/linked_page/`.

4.4 `README.md` — status to P12.

4.5 Commit: `docs: record the linked section and the registry`

4.6 Open the PR against **`main`**, or against `feat/p11-a-place-for-every-file` if #14 has not
    landed.

---

## What could go wrong

**A refactor that also adds a feature is a refactor nobody can review.** Group 1 must land with two
sections and an unchanged assertion count; if adding the third is easier "while I am in there", that
is the exact instinct the ordering exists to refuse.

**The `Notes` row is the one most likely to break quietly.** Its predicate is `() => true` and its
`empty` is `null`, so it is the row that exercises both defaults — and a mistake in either shows up
as *the whole board is empty* or *the board grew an empty state*, neither of which the other two
sections would catch.

**`sectionAt('/')` is the only piece of routing knowledge in the registry.** Two routes render one
page, and the sidebar has to mark `Notes` current on both. Getting it wrong marks nothing current at
`/`, which is the state P10's own T70 was written to catch.
