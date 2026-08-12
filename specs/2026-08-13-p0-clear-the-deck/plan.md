# P0 · Clear the deck — Plan

Five task groups, one per roadmap bullet. Execute in order: each group leaves the tree in a
state the next group can verify against. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Group 5 also carries the Vitest harness and the `tech-stack.md` amendment (decision D4) rather
than opening a sixth group, because both are documentation-and-acceptance work.

---

## 1. Strip the starter UI

1.1 Delete `src/App.css`.
1.2 Delete `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`, and the now-empty
    `src/assets/` directory.
1.3 Delete `public/icons.svg`. Leave `public/favicon.svg` — `index.html` still references it.
1.4 Rewrite `src/App.tsx` as a minimal shell: a single element, no `useState`, no asset imports,
    no `./App.css` import. `noUnusedLocals` and `noUnusedParameters` are on, so a leftover
    import fails the build rather than lingering.
1.5 Empty `src/index.css` of the starter `:root` variable block, the element rules, and every
    demo selector. The file is not deleted — `main.tsx` imports it and group 2 fills it.
1.6 Confirm nothing else references the deleted files: `grep -rn "App.css\|icons.svg\|assets/" src index.html`
    returns nothing.

**Leaves:** an app that builds and renders an unstyled shell. Tailwind is not present yet, so
the page is browser-default white. That is expected here and fixed in group 2.

---

## 2. Wire Tailwind CSS v4

2.1 `npm install tailwindcss @tailwindcss/vite`.
2.2 In `vite.config.ts`, import `tailwindcss from '@tailwindcss/vite'` and add it to `plugins`
    alongside `react()`.
2.3 Make `@import "tailwindcss";` the first line of `src/index.css`.
2.4 Set the board's intended background: a warm, non-white body background on the `body` or the
    app root. Warm neutrals are a mission acceptance criterion — do not leave it `#fff`, and do
    not reach for a cold gray. A plain Tailwind warm utility (e.g. a stone/amber-family
    background) is correct here; the real cork token is P1's job, not this phase's.
2.5 Do **not** create `tailwind.config.js`. v4 does not use one (decision D1).
2.6 `npm run dev` and confirm the page is blank in that background color.

**Leaves:** a blank page in the intended color, with Tailwind utilities live.

---

## 3. Add the `@/*` path alias

3.1 `tsconfig.json` — add `compilerOptions` with `"baseUrl": "."` and
    `"paths": { "@/*": ["./src/*"] }`. The file has `"files": []` and only holds references, but
    shadcn reads it.
3.2 `tsconfig.app.json` — add the same `baseUrl` and `paths` inside its existing
    `compilerOptions`. This is the config that actually compiles `src`.
3.3 `vite.config.ts` — add `resolve.alias` mapping `@` to
    `path.resolve(__dirname, './src')`, using `node:path` and `node:url`
    (`fileURLToPath(new URL('./src', import.meta.url))` avoids `__dirname` under ESM).
    `@types/node` is already a devDependency.
3.4 Prove it end to end: import something through `@/` from `App.tsx` and confirm both `tsc -b`
    and `vite build` resolve it. Group 5 turns this into a permanent assertion.

**Leaves:** `@/foo` resolving identically in TypeScript and in Vite.

---

## 4. Initialise shadcn/ui

4.1 `npx shadcn@latest init`. Answer for this project's setup: TypeScript, Tailwind v4,
    `src/index.css` as the global stylesheet, `@/*` alias.
4.2 **Install zero components.** Not `button`, not `dropdown-menu`. P6 adds the first one.
4.3 Read the resulting diff before committing. Expect `components.json`, `src/lib/utils.ts`,
    a `clsx`/`tailwind-merge`/`class-variance-authority` dependency set, and additions to
    `src/index.css`. Keep what it writes — do not hand-revert its CSS layer (decision, risk
    table).
4.4 If init fails, the cause is almost always group 2 or 3 being incomplete. Fix the root cause
    there; do not work around it with manual config.
4.5 `npm run build` and `npm run lint` clean.

**Leaves:** shadcn configured and ready, with nothing added to the UI.

---

## 5. README, tech-stack amendment, and the acceptance harness

5.1 Rewrite `README.md` for this project: what it is (one paragraph from `mission.md`), how to
    run it (`npm run dev` / `build` / `lint` / `test`), and links to the three constitution docs
    at their new paths — `specs/mission.md`, `specs/tech-stack.md`, `specs/roadmap.md`. Delete
    every line of the React+Vite template text.
5.2 Check Vitest compatibility with the installed Vite 8 **before** installing:
    `npm info vitest peerDependencies`. If Vite 8 is outside the supported range, stop and
    report — do not downgrade Vite to satisfy a test runner (requirements, risk table).
5.3 `npm install -D vitest`. Add `"test": "vitest run"` to `package.json` scripts.
5.4 Amend `specs/tech-stack.md`: add a **Testing · Vitest** row to the stack table and a short
    paragraph under "Decisions and rationale" — it shares Vite's config and resolver, so alias
    and build assertions test the real pipeline rather than a parallel one. This amendment is
    required by the constitution and lands in the same commit (decision D4).
5.5 Write the tests specified in [validation.md](./validation.md) under `src/__tests__/`.
5.6 Add `vitest/globals` to `types` in `tsconfig.app.json` if the tests use global `describe`/
    `it`; otherwise import them explicitly from `vitest` and leave the config alone. Prefer the
    explicit import — it is one line per file and no config surface.
5.7 `npm run build`, `npm run lint`, and `npm test` all clean.

**Leaves:** the phase complete and self-verifying.

---

## Landing

- Branch: `feat/p0-clear-the-deck` off `develop`.
- One commit for the phase (roadmap rule: one phase, one commit).
- Push `develop` to the remote first — it is currently local-only and only `main` is tracked.
- Open a PR **targeting `develop`**, not `main`.
- Merge criteria are in [validation.md](./validation.md).
