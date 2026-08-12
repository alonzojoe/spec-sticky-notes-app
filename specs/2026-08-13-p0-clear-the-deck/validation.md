# P0 · Clear the deck — Validation

How to know P0 actually succeeded, and what "merged" requires. The roadmap's Done-when for this
phase is: *the page is blank with the intended background color, a Tailwind utility demonstrably
works, an `@/` import resolves, and the build is clean.* This document turns that into checks.

Primary gate is automated (Vitest, per decision D4). Two criteria are structurally not
unit-testable and stay manual (decision D5) — they are listed as such, not disguised as
automated coverage.

---

## Gate 1 — Command gates

All three must exit zero, from a clean checkout of the branch after `npm install`:

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

A warning-free lint run is required, not merely a passing one. The tech-stack quality bar says
"no new warnings".

---

## Gate 2 — Automated assertions (Vitest)

Tests live in `src/__tests__/`. Each maps to a specific roadmap criterion.

### T1 · The `@/` alias resolves — *criterion: "an `@/` import resolves"*

A test that imports a real module through the alias and asserts on its export.
`src/lib/utils.ts` exists after `shadcn init`, which makes it the natural target:

```ts
import { cn } from '@/lib/utils'

it('resolves the @/ alias', () => {
  expect(cn('a', 'b')).toBe('a b')
})
```

This is a genuine test of the resolver: if `paths` or `resolve.alias` is missing, the import
fails and the suite errors rather than silently passing. Assert on behaviour, not just on
`typeof cn === 'function'` — a truthiness check would pass against a stub.

### T2 · Tailwind emits utilities — *criterion: "a Tailwind utility demonstrably works"*

Build the CSS through Vite's own pipeline and assert the output contains a utility that was
used in source but is not in any handwritten CSS. Two acceptable shapes:

- Run `vite build` in the test and read the emitted CSS asset from `dist/assets/*.css`, or
- Use Vite's programmatic `build()` API with `write: false` and inspect the returned bundle.

Assert that a class used in `App.tsx` appears as a rule in the output, **and** that a class
never used in source does not. The negative assertion is what proves Tailwind's scanner is
running rather than that some CSS happened to be emitted.

This test builds the app, so keep it in its own file and expect it to be the slow one.

### T3 · The starter is gone — *criterion: "clear the deck"*

Assert the deleted paths do not exist: `src/App.css`, `src/assets/`, `public/icons.svg`. Assert
`src/App.tsx` contains no reference to `react.svg`, `vite.svg`, `hero.png`, or `icons.svg`.
Cheap, and it catches a half-finished strip that still builds.

### T4 · No `tailwind.config.js` — *criterion: decision D1*

Assert the file does not exist at the project root. Tailwind v4 configured through a config file
still works, which is exactly why this needs asserting: nothing else fails if someone adds one.

---

## Gate 3 — Manual checks (two items, permanently manual)

These cannot be asserted without a browser runner, and adding one is out of proportion to this
phase. Run `npm run dev` and confirm:

- [ ] **The page is blank in the intended background color.** Warm, not `#fff`, not a cold gray.
      No demo markup, no logos, no counter button.
- [ ] **The console is clean.** No errors, no warnings, no 404 for `/icons.svg` or any asset
      deleted in group 1.

Record both as checked in the PR description. An unchecked box blocks merge.

---

## Gate 4 — Constitution compliance

- [ ] `specs/tech-stack.md` has a **Testing · Vitest** row and a rationale paragraph, **in this
      same commit**. The constitution forbids a dependency arriving without it (decision D4);
      a PR that adds `vitest` to `package.json` and not to `tech-stack.md` is rejected on this
      point alone, however green the tests are.
- [ ] No runtime dependency beyond `tailwindcss`, `@tailwindcss/vite`, and whatever
      `shadcn init` pulled in (`clsx`, `tailwind-merge`, `class-variance-authority`).
      Specifically: no `usehooks-ts`, no `lucide-react`, no state library.
- [ ] No shadcn component under `src/components/ui/`. `init` only; the directory may be empty
      or absent.
- [ ] No `console.log` in committed code.
- [ ] No `any` in committed code.
- [ ] `README.md` links resolve to `specs/mission.md`, `specs/tech-stack.md`,
      `specs/roadmap.md` — click each one on the rendered PR page. The docs moved this change,
      so a stale `docs/` link is a live 404, not a nitpick.

---

## Merged means

P0 is merged when all of the following are true:

1. Gates 1–4 pass on branch `feat/p0-clear-the-deck`.
2. `develop` is pushed to the remote (it is local-only today; only `main` is tracked).
3. A PR is open **against `develop`** — not `main` — with the Gate 3 checkboxes ticked in the
   description.
4. The PR is approved and merged into `develop`, arriving as **one commit** for the phase
   (roadmap: one phase, one commit).
5. `develop` at the merge commit builds, lints, and tests clean — verified on `develop` after
   the merge, not only on the branch.
6. The roadmap's P0 section is understood as closed; P1 begins from the merge commit.

## Explicitly not required

Do not block the merge on these — they belong to later phases and asking for them here is scope
creep, not thoroughness:

- Any design token, paper color, cork texture, or grain (**P1**).
- Any note, board surface, or state (**P1–P2**).
- Visual regression or screenshot tests.
- Test coverage of `App.tsx`'s markup — it is a placeholder shell that P1 replaces wholesale.
