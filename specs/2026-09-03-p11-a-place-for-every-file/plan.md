# P11 · A place for every file — Plan

A groundwork step and five task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in
[validation.md](./validation.md).

**No test is written in this phase and none is rewritten.** The suite P10 left is the specification:
if 669 assertions still pass, the move preserved behaviour. The only test edits allowed are the ones
that name a path — T4's `EXEMPT` list and the nine files that import `App`.

Groups end with `npm run build && npm run lint && npm test`. Commits are split by concern —
`build`, `refactor`, `docs`.

**Ordering note.** Group 1 installs the plugin and writes the route files **beside** the existing
router, so nothing is deleted while the new tree is proved. Group 2 moves the entry point onto it
and deletes the old one — the only commit in the phase where the app is briefly assembled twice.
Group 3 adds the pages layer, group 4 the tests' entry point, group 5 the documents.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`vite.config.ts` already carries build configuration** (P10's vendor split), so the plugin lands
  in an object that exists rather than one this phase invents.
- **The `@` alias is `src/`**, so every move is an import rewrite and never a path calculation.
- **`AppShell` renders an `<Outlet />` already** — P10 put it there — so becoming a layout group's
  component is a change of file, not of code.

*To verify in group 0:*

- **Vitest runs the router plugin.** It shares `vite.config.ts`, so it should; if it does not, the
  generated tree is stale in tests only, which is the worst of the three possible failures.
- **`autoCodeSplitting` and P10's vendor chunk coexist**, and the build stays under the 500kB
  warning it was brought back under.
- **The plugin does not rewrite `package.json` scripts** or expect a `routes` directory at the
  default path.

---

## 0. Groundwork

0.1 Branch `feat/p11-a-place-for-every-file` off **`feat/p10-a-view-of-the-pinned`**, since P10's
    PR #13 is not merged and this phase moves the files it added. Rebase onto `main` once it lands.

0.2 Full gate on the clean branch: **25 suites, 669 assertions.**

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The route tree

1.1 `npm i -D @tanstack/router-plugin`. It is a devDependency: the router itself arrived in P10 and
    this adds only the generator.

1.2 `vite.config.ts` — `tanstackRouter({ target, autoCodeSplitting, routesDirectory,
    generatedRouteTree })`, **before `react()`**, as its documentation requires and unicare does.

1.3 `src/app/routes/__root.tsx` — `createRootRoute` with an `<Outlet />` and nothing else. What is
    true of the document, not of the board.

1.4 `src/app/routes/_board/route.tsx` — the layout group, rendering `AppShell`. **`AppShell` moves
    here as a component, not as a copy**: it keeps its providers, its two shortcuts and its outlet.

1.5 `src/app/routes/_board/index.tsx`, `notes/index.tsx`, `pinned/index.tsx` — one `createFileRoute`
    each, naming a page (**D5**, wired in group 3; until then they render `Board` directly).

1.6 `src/app/config/router_config.ts` — `createAppRouter(history?)` over the **generated** tree,
    keeping P10's parameterised history so a test can build its own over a memory history.

1.7 Commit: `build(router): generate the route tree from files under src/app/routes`

---

## 2. The entry point moves

2.1 `src/index.css` → `src/app/main.css`; `src/main.tsx` → `src/app/main.tsx`, importing it.

2.2 `index.html` points at `/src/app/main.tsx`.

2.3 `main.tsx` creates the router, declares the `Register` interface, awaits the first match, and
    renders `<RouterProvider />` inside `<StrictMode>`. **`src/app.tsx` and `src/router.tsx` are
    deleted** in the same commit — this is the one commit where two route trees exist, and it ends
    with one.

2.4 `design_tokens.test.ts` reads `index.css` by path; re-point it at `app/main.css`. **A path, not
    an assertion** — nothing about what it checks changes.

2.5 Commit: `refactor(app): move the entry point into src/app`

---

## 3. The pages layer

3.1 `src/pages/notes_page/{notes_page.tsx,index.ts}` and `src/pages/pinned_page/` — each composing
    `Board` with its section.

3.2 The three route files render a page instead of a board. A route file then says what the URL is
    and nothing about what is on the screen (**D5**).

3.3 Commit: `refactor(pages): give each section a page of its own`

---

## 4. The tests' entry point

4.1 `src/__tests__/test_app.tsx` — a `RouterProvider` over the router `router_setup.ts` owns.
    Named for what it is: production has no `App` component any more (**D6**).

4.2 Nine test files change one import line each. **No call site changes**, and no assertion is
    touched.

4.3 `sections.test.tsx` imports `createAppRouter` from its new home.

4.4 `naming_convention.test.ts` — `EXEMPT` gains `app/routeTree.gen.ts`, and the guard assertion
    that pins the list names three paths instead of two (**D3**).

4.5 Commit: `test: point the suite at the new entry point`

---

## 5. The documents

5.1 `tech-stack.md` — the source tree, redrawn; the routing row gains the plugin and the file-based
    convention; the `snake_case` rule gains its third exemption.

5.2 `roadmap.md` — P11, with the structural carve-out written down (**§ Risks**).

5.3 `README.md` — status to P11.

5.4 **`mission.md` is not touched.** Nothing here is visible to a user.

5.5 Commit: `docs: record the app directory across the constitution`

5.6 Open the PR against **`main`**, or against `feat/p10-a-view-of-the-pinned` if #13 has not landed.

---

## What could go wrong

**A stale committed route tree is invisible.** The plugin rewrites it on dev start, so a wrong copy
shows up as a dirty working tree rather than as a failure. Gate 1 checks that a fresh build leaves
the file unchanged.

**Deleting `app.tsx` breaks nine test files at once**, which is a big red suite in the middle of the
phase rather than at the end of it. Group 4 is the fix and group 2 is where it starts; do not
reorder them to make the intermediate commit greener.

**The temptation is to tidy while moving.** Every file this phase touches has something in it worth
changing, and none of it is this phase's business: a restructure whose diff also contains behaviour
is a restructure nobody can review.
