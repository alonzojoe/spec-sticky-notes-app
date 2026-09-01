# P0 · Clear the deck — Requirements

**Phase:** P0 (first phase of [roadmap.md](../roadmap.md))
**Date:** 2026-08-13
**Branch:** `feat/p0-clear-the-deck` off `develop`
**Status:** specified, not started

---

## Context

The repository is the untouched Vite + React + TypeScript starter. `git log` holds a single
`init` commit. `src/` contains `App.tsx` (the Vite demo page), `App.css`, `index.css` (starter
variables, none of them ours), `main.tsx`, and three unused assets. There is no Tailwind, no
`@/*` alias, no shadcn, and `README.md` is still the template's React+Vite boilerplate.

Nothing in [mission.md](../mission.md) is expressible yet: the tokens P1 needs (`@theme`) have
nowhere to live, and shadcn cannot be initialised without the path alias. P0 exists to make the
next phase possible, and it is the only phase that ends with a blank screen on purpose.

The three constitution docs moved from `docs/` to `specs/` in this change. `README.md` must
link to their new location — this is the reason the README rewrite is part of P0 rather than
cosmetic.

## Scope

P0 exactly as the roadmap defines it. Five deliverables:

1. **Strip the starter UI.** Delete `src/App.css`, `src/assets/react.svg`,
   `src/assets/vite.svg`, `src/assets/hero.png`, `public/icons.svg`. Replace the demo markup in
   `src/App.tsx` with a minimal shell. Remove the starter variable block from `src/index.css`.
2. **Tailwind CSS v4.** Install `tailwindcss` and `@tailwindcss/vite`; register the plugin in
   `vite.config.ts`; `@import "tailwindcss";` as the content of `src/index.css`.
3. **Path alias.** `@/*` → `src/*` in `tsconfig.json`, `tsconfig.app.json`, and
   `vite.config.ts`. All three, because TypeScript and Vite resolve independently and shadcn
   reads the tsconfig.
4. **shadcn init.** `npx shadcn@latest init`. Zero components installed.
5. **README.** Rewritten for this project, linking `specs/mission.md`, `specs/tech-stack.md`,
   and `specs/roadmap.md`.

Plus, from the validation decision below: a Vitest harness and the `tech-stack.md` amendment
that authorises it.

## Out of scope

Deferred deliberately — each belongs to a named later phase:

- The `@theme` token block: six paper colors, cork backdrop, shadow scale, radii, spring
  durations. **P1.**
- Any board surface, cork texture, paper grain, or note markup — hardcoded or otherwise. **P1.**
- Any `useState`, reducer, context, or `src/types/note.ts`. **P2.**
- Any shadcn *component*. The first one (`dropdown-menu`) arrives in **P6**; `init` here only
  writes `components.json` and the utility file.
- `usehooks-ts`, `lucide-react`, and every other runtime dependency the stack table lists but
  no current phase needs.

P0 ends with a blank page. A blank page is the correct output, not an unfinished one.

## Decisions

**D1 — Tailwind v4 via the Vite plugin, no config file.**
`@tailwindcss/vite` plus a single `@import "tailwindcss";`. No `tailwind.config.js` is created
or wanted; v4 declares design tokens in CSS via `@theme`. Fixed by
[tech-stack.md](../tech-stack.md) § Setup notes.

**D2 — The alias goes in all three files, in the same task group.**
Splitting them across groups produces a half-state where `tsc` resolves `@/` but Vite does not
(or the reverse), and the failure surfaces at runtime rather than at build. `tsconfig.json` is
a solution-style file with `"files": []`, so `baseUrl`/`paths` must be added there *and*
mirrored in `tsconfig.app.json`, which is what actually compiles `src`.

**D3 — shadcn is initialised now, with no components.**
This is the one place P0 leans toward "build ahead", and it is deliberate: `init` is the step
that depends on Tailwind and the alias both being correct, so running it here validates tasks 2
and 3. Installing a *component* now would be building ahead; initialising is a config
acceptance test. `components.json` and `src/lib/utils.ts` are the expected artifacts.

**D4 — Vitest is added as the acceptance mechanism, and requires a tech-stack amendment.**
Validation is asserted by tests rather than by eye (see [validation.md](./validation.md)).
Vitest is a devDependency, not a runtime one, so the "no backend / no state library / no
CSS-in-JS" rules are untouched — but `tech-stack.md` says no dependency arrives without a line
in that file explaining what it replaced and why. **`tech-stack.md` must gain a Testing row in
this same commit.** Landing the dependency without the amendment violates the constitution and
is grounds to reject the PR.

**D5 — Two acceptance criteria stay manual, permanently.**
"The page is blank with the intended background color" and "no console errors" are not
assertable by a Vitest unit test without pulling in a browser runner, which is a much larger
dependency than this phase justifies. They remain a two-item manual checklist in
`validation.md`. Calling them automated when they are not would be the failure mode this
decision exists to avoid.

**D6 — `index.html` is left alone.**
Its `<title>` is already `sticky-notes-app` and it references `/favicon.svg`, which survives.
Only `/icons.svg` is deleted, and only `App.tsx` referenced it.

## Constraints inherited from the constitution

- `npm run build` (`tsc -b && vite build`) and `npm run lint` pass before the phase is done.
- TypeScript `strict`; no `any` in committed code.
- No `console.log` in committed code.
- Every color, radius, shadow and duration comes from a token — vacuously true this phase,
  since P0 ships no components; do not introduce arbitrary values to "prove" Tailwind works
  beyond the single temporary utility described in `validation.md`.
- No new runtime dependency without updating `tech-stack.md` first.

## Risks

| Risk | Handling |
| --- | --- |
| Vitest's supported Vite range may not include Vite 8 yet | Check `npm info vitest peerDependencies` before installing. If incompatible, stop and report — do not force-install or downgrade Vite. This blocks task group 5 only; groups 1–4 are unaffected. |
| `shadcn init` may rewrite `src/index.css` and add its own variable layer | Run it *after* Tailwind is wired and inspect the diff. Keep whatever it adds; do not hand-edit it back out. P1 owns the `@theme` block and will reconcile. |
| `noUnusedLocals` breaks the stripped `App.tsx` | The minimal shell must have no unused imports. Removing `useState` and the three asset imports is part of task group 1, not a follow-up. |
| The remote only tracks `main`; `develop` is local-only | Push `develop` before opening the PR, and target the PR at `develop`, not `main`. |
