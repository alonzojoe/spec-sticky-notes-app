# P1 · The shell and the board — Requirements

**Phase:** P1 (second phase of [roadmap.md](../roadmap.md))
**Date:** 2026-08-13
**Branch:** `feat/p1-the-shell-and-the-board` off `develop`
**Status:** specified, not started

---

## Context

P0 merged into `develop` at `a8e0576`. The app is a blank warm page: `src/App.tsx` renders a
single `<main className="min-h-dvh bg-stone-200" />`, Tailwind v4 is wired through
`@tailwindcss/vite`, the `@/*` alias resolves in both TypeScript and Vite, and `shadcn init` has
written `components.json`, `src/lib/utils.ts`, and a full `:root` token block into
`src/index.css`. No shadcn *component* is installed. Vitest runs three suites under
`src/__tests__/`.

Those tokens are shadcn's defaults, generated from `baseColor: neutral`. Every one of them is
achromatic — `--sidebar: oklch(0.985 0 0)`, `--background: oklch(1 0 0)`, `--border:
oklch(0.922 0 0)`. [mission.md](../mission.md) forbids exactly this: *"The palette is warm —
paper colors and a cork-toned backdrop. No cold grays, no pure `#fff` paper, no pure `#000`
text."* P0 was allowed to leave them because it shipped no UI. P1 ships UI, so P1 owns them.

This phase also changes the roadmap. The original P1 was *"The board exists"* — cork, paper, and
two or three hardcoded notes, with no chrome. The decision recorded in this document folds an
application shell into it: a collapsible sidebar that becomes the permanent home for every
control the later phases add. The reasoning is in **D1**; the constitutional consequences are in
**D2**.

## Scope

Seven deliverables. The first two are groundwork the rest depend on.

1. **snake_case file names.** Every source file and directory this project authors is
   `snake_case`. `src/App.tsx` becomes `src/app.tsx`; the two kebab-cased test files are
   renamed. `src/components/ui/**` and CLI-written hooks are exempt (**D6**). The rule is
   enforced by a test, not by review (**D7**).
2. **A DOM test harness.** `jsdom` and `@testing-library/react` as devDependencies, with
   `specs/tech-stack.md` amended in the same commit. From this phase on the repo contains real
   components, and "acceptance by eye" does not scale (**D5**).
3. **Design tokens.** The `@theme` block [tech-stack.md](../tech-stack.md) promises: six paper
   colors, a cork backdrop, warm ink, a layered shadow scale, easing curves, and durations.
   Plus warm replacements for shadcn's achromatic `:root` and `.dark` values (**D3**).
4. **The shadcn sidebar.** `npx shadcn@latest add sidebar`, then three edits to the file it
   writes: delete its cookie persistence (**D4**), replace its `ease-linear` transitions and its
   `transition-all` (**D8**), and let the warm tokens from deliverable 3 carry the color.
5. **The shell.** `app_shell.tsx` composing `SidebarProvider` + `AppSidebar` + a `<main>` board
   region, and `app_sidebar.tsx` containing a header, exactly one navigation item — **Notes**,
   active, badged with the note count — and the named slots later phases fill.
6. **The board.** A cork/felt surface with grain, and two or three **hardcoded** paper notes
   proving the visual language: layered shadow, tilt, grain, generous padding.
7. **Constitution amendments.** `mission.md` principle 4, the `roadmap.md` P1 section, and
   `tech-stack.md`'s naming rule, file tree, Primitives row, and Testing rows — all in this
   phase's commit.

## Out of scope

Deferred deliberately. Each belongs to a named later phase, and asking for it here is scope
creep rather than thoroughness:

- **Any `useState`, reducer, or context of our own.** The notes are a hardcoded array in a
  module. `SidebarProvider` holds React state internally — that is shadcn's code, not a board
  store, and it does not open the door to ours. **P2.**
- **`src/types/note.ts` and the `Note` type.** The mockup notes are typed by a local interface
  in the board module. Promoting it to the shared type is P2's job, together with the reducer
  that consumes it. **P2.**
- **Sidebar collapse persistence.** P1 ships no persistence of any kind (**D4**). **P3.**
- **`usehooks-ts` and `localStorage`.** **P3.**
- **The `New note`, `Search`, and `Theme` controls.** Their slots are named and documented in
  this phase; the controls arrive in **P2**, **P9**, and ***Dark mode***. Rendering them now as disabled
  placeholders is building ahead *and* bad interface design — a control that cannot be used
  should not be drawn.
- **Dark mode.** The `.dark` token values are made warm in this phase because they exist in the
  file already and would otherwise be a cold-gray landmine. No toggle, no `useTheme`, no
  `prefers-color-scheme` wiring. ***Dark mode*.**
- **Drag, editing, colors, pinning, search, markdown.** **P4–*Markdown and checkboxes*.**
- **Using `button`, `input`, `tooltip`, `sheet`, or `skeleton` outside the sidebar.** They
  arrive as transitive dependencies (**D9**) and are dormant until a phase needs them.

## Decisions

**D1 — The sidebar is the chrome, and it folds into P1 rather than becoming its own phase.**
The roadmap's later phases each mention "the toolbar" without ever defining where it lives. This
decision defines it: one collapsible left sidebar owns every global control, and the board
surface stays clear. Folding it into P1 rather than inserting a new phase is deliberate — a
sidebar shipped against an empty rectangle cannot be judged, and `mission.md`'s visual criteria
are the acceptance test for this phase. Shell and board land together so the phase ends with a
screen worth looking at. No phase is renumbered.

**D2 — This amends the mission, and the amendment is written down.**
`mission.md` principle 4 says *"Quiet chrome. The interface is the notes."* A persistent sidebar
is chrome, so principle 4 gains a sentence permitting it under a constraint: chrome lives in one
collapsible sidebar and never on the board surface. What does **not** change is the out-of-scope
line *"Multiple boards / workspaces / folders"*. A single `Notes` destination is not a workspace
switcher, and adding a second nav item later requires its own amendment. Landing the sidebar
without this edit would leave the codebase quietly contradicting its own constitution, which is
the failure mode P0's decision D4 exists to prevent.

**D3 — The achromatic tokens are replaced, not supplemented.**
`shadcn init` wrote 30+ values of the form `oklch(L 0 0)` into `:root` and `.dark`. Adding warm
tokens alongside them would leave every shadcn component that lands in P6, *Dark mode*, and *Polish* defaulting
to cold gray, and the violation would arrive one component at a time with no single commit to
blame. They are edited in place, now, while there is exactly one component to check.

**D4 — shadcn's cookie persistence is deleted, and P1 ships no replacement.**
`sidebar.tsx` writes `document.cookie = "sidebar_state=..."` on every toggle. This contradicts
[tech-stack.md](../tech-stack.md)'s persistence contract, which names `localStorage`, the
`sticky-notes:` key namespace, and `useLocalStorage` from `usehooks-ts` as the only mechanism.
We own `src/components/ui/sidebar.tsx`, so the write is removed rather than worked around.

It is **not** replaced in this phase. Substituting `localStorage` here would pull `usehooks-ts`
forward out of P3 for one boolean, or hand-roll a second persistence path that P3 then has to
unify. P1's sidebar opens expanded on every load. **P3 adds `sticky-notes:sidebar` alongside
`sticky-notes:board:v1`, through the same `useLocalStorage` call the contract already
specifies** — this is a P3 deliverable, recorded here so it is not lost.

**D5 — `jsdom` and `@testing-library/react` are added, and require a tech-stack amendment.**
P0 could assert its acceptance criteria against the filesystem and the Vite build. P1 renders
components, and its criteria include a `<nav>` landmark, an `aria-current` marker, and a badge
count — none of which a source-text grep can honestly check. Both are devDependencies, so the
no-backend and no-state-library rules are untouched, but `tech-stack.md` forbids a dependency
arriving without a line explaining it. **The Testing row and its rationale paragraph land in this
same commit.**

`@testing-library/jest-dom` is deliberately *not* added. Its matchers are convenience over
`expect(el.getAttribute('aria-current')).toBe('page')`, and it would cost a third dependency plus
a `types` entry in `tsconfig.app.json`.

**D6 — snake_case applies to what we author; CLI-generated files are exempt.**
Files and directories this project writes are `snake_case`: `app_sidebar.tsx`, `note_card.tsx`,
`notes_context.tsx`, `use_draggable.ts`. Two exemptions, and they are rules with reasons rather
than oversights:

- **`src/components/ui/**`** — written and regenerated by `npx shadcn add`. Renaming them breaks
  `shadcn add` and `shadcn diff` permanently, and every future component would need renaming plus
  an import rewrite. They stay kebab-case: `sidebar.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`.
- **`src/hooks/use-mobile.ts`** — same origin, same reason. It arrives as a registry dependency
  of `sidebar`.

`__tests__` keeps its dunder name; it is a convention the test runner and every JavaScript
developer already reads. Declaration files (`*.d.ts`) are exempt for the same tool-ownership
reason.

**D7 — the naming rule is a test, not a convention.**
A naming convention that only lives in a document decays. By P4 the tree would be half
snake_case and half not, and the fix would be a large rename touching every import. A single
test that walks `src/` and matches each path against the rule costs twenty lines and fails the
build the first time someone drifts. The exemptions from D6 are an explicit allowlist inside that
test, so adding one is a visible, reviewable act.

**D8 — shadcn's motion defaults are amended before the component is used.**
The file `shadcn add sidebar` writes uses `duration-200 ease-linear` for the collapse and
`transition-all` on `SidebarRail`. Neither survives review: `linear` describes constant motion
like a marquee or a progress bar, not a panel sliding to rest, and `transition-all` animates
properties nobody chose. The specific replacements are in [plan.md](./plan.md) § 4 and are
asserted in [validation.md](./validation.md) § T5.

The collapse **keeps** its animation despite `⌘B` being a keyboard-initiated action. The rule
that keyboard actions must not animate exists for controls used hundreds of times a day, such as
a command palette; a sidebar toggle is occasional, and it sits in the "standard animation" band.
The 200ms duration is kept, the curve is not.

**D9 — the six transitive components are not "building ahead."**
`shadcn add sidebar` installs `button`, `separator`, `sheet`, `tooltip`, `input`, `skeleton`, and
the `use-mobile` hook, because `sidebar.tsx` imports all of them. They are not optional and there
is no supported way to install the sidebar without them. The roadmap's *"Don't build ahead"* rule
still binds, and it binds on **use**: importing `button` or `input` anywhere outside
`src/components/ui/sidebar.tsx` during P1 is building ahead and is rejected. The dormant set is
listed in [validation.md](./validation.md) § Gate 4.

**D10 — the mockup notes are data, not components.**
The two or three notes are a `const` array in the board module, rendered through one presentational
`note_card.tsx` that receives everything as props and holds no state. This is the shape P2's
reducer output plugs into: swapping the hardcoded array for `useNotes()` should be a one-line
change in `board.tsx` and touch `note_card.tsx` not at all. Hardcoding *markup* instead — three
literal `<div>`s — would make P1 look done while leaving P2 to rewrite it.

**D11 — tilt is a literal in the mockup data.**
`mission.md` requires that a note's tilt never changes on re-render, and names a recomputed tilt
as a bug. The mockup notes therefore carry written-out rotation values (`-2.1`, `1.4`, `-0.8`),
not `Math.random()` calls. P2 assigns tilt once at creation and stores it; P1 must not ship a
pattern that P2 has to unlearn.

## Constraints inherited from the constitution

- `npm run build` (`tsc -b && vite build`), `npm run lint`, and `npm test` pass before the phase
  is done. Lint must be warning-free, not merely error-free.
- TypeScript `strict`; no `any` in committed code. `erasableSyntaxOnly` is on — no enums, no
  parameter properties.
- No `console.log` in committed code.
- **Every color, radius, shadow and duration comes from a token.** This phase is where that rule
  starts biting: no `bg-stone-200`, no `shadow-lg`, no `rounded-lg`, no `duration-200` in our
  components. They reference the `@theme` tokens deliverable 3 defines. Tailwind's stock palette
  utilities are as forbidden as a raw hex value.
- Interactive elements are real `<button>`s or Radix primitives. A `div` with `onClick` is a
  defect.
- Every interactive element has a visible focus ring.
- `prefers-reduced-motion` is respected — the collapse becomes instant, and it still works.
- No new runtime dependency without updating `tech-stack.md` first.
- One phase, one commit.

## Risks

| Risk | Handling |
| --- | --- |
| `App.tsx` → `app.tsx` is a case-only rename on a case-insensitive filesystem. A plain `git mv` is a no-op or an error, and a plain `mv` leaves git blind to the change. | Two-step: `git mv src/App.tsx src/app_tmp.tsx && git mv src/app_tmp.tsx src/app.tsx`. Verify with `git status` before committing — the rename must appear in the index. |
| `starter-removed.test.ts` and `tailwind-build.test.ts` both read `src/App.tsx` by path. Renaming the component without updating them turns a passing suite into a confusing `ENOENT`. | The rename and the two test updates are one task group, not a follow-up. Run `npm test` inside the group. |
| `tailwind-build.test.ts` extracts the first `className="…"` from the app file and asserts each token appears as `.token` in the CSS. The shell's classes will include variants (`md:flex`) and arbitrary values, whose emitted selectors are escaped (`.md\:flex`). | Narrow the helper to plain utilities matching `/^[a-z][a-z0-9-]*$/` before asserting. Recorded in [plan.md](./plan.md) § 1. |
| `eslint-plugin-react-refresh` fires `only-export-components` on `sidebar.tsx`, which exports the `useSidebar` hook beside its components. The quality bar forbids new warnings. | Add an `eslint.config.js` override scoping `react-refresh/only-export-components` off for `src/components/ui/**`. These are vendor-shaped files we do not hot-reload-author. Do not disable the rule globally, and do not edit the hook out of `sidebar.tsx`. |
| `shadcn add sidebar` may rewrite parts of `src/index.css`, re-emitting achromatic token values over the warm ones. | **Install the sidebar before writing the tokens**, never the reverse. [plan.md](./plan.md) sequences it that way deliberately — the sidebar is group 3, the tokens are group 4. If a later phase's `shadcn add` re-flattens the palette anyway, T6 fails loudly rather than the app going quietly gray. |
| Without `globals: true`, `@testing-library/react` does not auto-register its cleanup, and state leaks between tests as stale DOM. | Every component test file calls `afterEach(cleanup)` explicitly. Do not switch Vitest to globals to avoid this — the repo's existing tests import `describe`/`it`/`expect` explicitly and that pattern stays. |
| Setting `environment: 'jsdom'` globally would run the slow Vite build test inside jsdom for no reason. | Do not add a `test` block to `vite.config.ts`. Opt in per file with a `// @vitest-environment jsdom` docblock on the first line of each component test. |
| The sidebar's mobile presentation is a `Sheet` (a Radix Dialog), which renders in a portal outside the sidebar tree. | P1 asserts the desktop tree only. The mobile sheet is a Gate 3 manual check at a narrow viewport, not an automated one. Full responsive work is *Polish*. |
