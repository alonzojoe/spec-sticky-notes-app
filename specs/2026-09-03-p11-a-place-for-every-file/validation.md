# P11 · A place for every file — Validation

The phase's Done-when: *the entry point, the route tree and the pages live where
`unicare-booking/src/app` puts them; routes are files whose paths are the URLs; and the app behaves
exactly as P10 left it, proven by P10's own assertions passing unrewritten.*

**This phase's gate is inverted.** Every other phase asks what new assertions prove the new
behaviour. This one asks what proves there is none.

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, including the 500kB chunk warning P10 brought the build back under.

```
git status --porcelain src/app/routeTree.gen.ts
```

Empty after a fresh `npm run build`. The plugin rewrites the tree on every dev start and build, so a
stale committed copy shows up as a dirty tree rather than as an error — **this is the check that
turns that into a failure.**

```
test ! -e src/app.tsx && test ! -e src/router.tsx && test ! -e src/main.tsx && test ! -e src/index.css
```

All four gone. A restructure that leaves the old files behind is a restructure that has not
happened; the imports would still resolve and nothing else would notice.

```
grep -rn "@/router\|from '@/app'" src/ | grep -v routeTree.gen
```

Empty. Nothing imports the deleted modules, including the tests.

```
ls src/app/routes/_board/
```

`route.tsx`, `index.tsx`, `notes/`, `pinned/`. **D4**: the shell is what the board's routes share,
not what wraps the document.

`npm ls` gains one **devDependency**, `@tanstack/router-plugin`, and no runtime dependency.

---

## Gate 2 — Automated assertions (Vitest)

**No behaviour is asserted that was not asserted before.** T1–T75 come from P0–P10 and all of them
still pass. Four files change, and every change is a *path* or the router's *vocabulary* — never a
claim about what the app does.

**The assertion count moves anyway, from 669 to 688, and that is not this phase doing something.**
T4 is parameterised over the file tree — one case per file and per directory — so moving files into
`app/`, `routes/` and `pages/` mints cases by existing. The invariant that matters is the one below
it: every *behavioural* suite is untouched, and the two suites that changed are the two that read
the tree rather than the app.

### T4 · the `snake_case` rule gains its third exemption

- `EXEMPT` becomes `['components/ui', 'hooks/use-mobile.ts', 'app/routeTree.gen.ts']`, and **the
  guard assertion that pins the list is updated with it** — that assertion exists to make growing
  the list a visible, argued edit, and **D3** is the argument.
- Every file this phase writes is still snake_case. `__root.tsx`, `route.tsx`, `index.tsx` and
  `_board` are the plugin's vocabulary, the way `__tests__` is the runner's.

### T4 · the rule also learns the router's vocabulary

- A directory may start with `_` when the rest of it is snake_case — `_board` is a **pathless layout
  group**, and the underscore is what tells the plugin it adds no URL segment. `__root.tsx` is
  allowed by name.
- Written as two narrow patterns rather than as a loosened rule: `_board` passes, `_Board` does not,
  and nothing else about the rule moves. The same carve-out `__tests__` has had since P1.

### T3 · the starter check reads the entry point

- It read `src/app.tsx` for references to the starter's assets. That file is **gone** (**D6**), so it
  reads `src/app/main.tsx` — the same assertion about the same place in the tree — and gains one
  more: `src/app.tsx` does not exist at all.

### The nine files that render `<App />`

- One import line each, from `@/app` to `@/__tests__/test_app`. **No call site and no assertion
  changes**, which is what makes them evidence that behaviour is unchanged rather than participants
  in the change.

### `design_tokens.test.ts` and `sections.test.tsx`

- One reads the stylesheet by path — `index.css` becomes `app/main.css`. The other imports
  `createAppRouter` from `app/config/router_config`. Paths, not assertions.

---

## Gate 3 — Checks no test can make

The suite proves the app still works. These ask whether the structure is worth having.

1. **Does a URL find its file?** Pick `/pinned` and find the file that serves it without searching —
   `routes/_board/pinned/index.tsx`. That is the whole benefit of the convention; if it does not
   hold, the layout is decoration.

2. **Does the app still run?** `npm run dev`, both sections, create a note, pin one from a card, open
   the palette, delete something. Nothing in this phase should be visible.

3. **Does a hard reload of `/pinned` still work?** The dev server has to serve `index.html` for a
   path with no file behind it, and so does `npm run preview`. **Check both** — this is the one way
   a routing restructure breaks in production and not in development.

4. **Is the route tree regenerated cleanly?** Delete `routeTree.gen.ts`, run the dev server, and
   confirm the file comes back identical to the committed one.

5. **Would a fourth route be obvious?** Say where a printable board or an onboarding screen would
   go, and whether it lands inside `_board` or beside it. **This is the check that decides whether
   D4's layout group earned its place or merely copied one.**

6. **Does `main.tsx` still read as the top of the app?** It has no `App` component under it now.
   Someone opening the repo for the first time should be able to follow it to the board in three
   files.

### Answers — run 2026-09-03

1. **A URL finds its file.** `/pinned` is `routes/_board/pinned/index.tsx`, reached by reading the
   path rather than by searching. That is the whole benefit and it holds.

2. **The app is unchanged**, in the dev server and in the production build: both sections, the pin
   control on a card, the palette, the create dialog, the delete confirmation.

3. **A hard reload of `/pinned` works in production**, verified against `npm run preview` on the
   built output — `200`, and the board renders the pinned section from a cold load. This is the
   failure mode a routing restructure has that development never shows, and it is the check most
   worth having run.

4. **The route tree regenerates identically.** Deleted, rebuilt, `diff` clean — so the committed
   copy is a build artefact anyone can reproduce rather than a file that has drifted.

5. **A fourth route is obvious, and it lands beside `_board`.** A printable board or a shared
   read-only view wants no sidebar and no `n` shortcut, and neither is available to it inside the
   group — which is exactly the question P10 could not answer and the reason **D4** is a group
   rather than a component every route remembers to render. It earned its place.

6. **`main.tsx` still reads as the top of the app**: it builds a router, awaits the first match, and
   mounts it. Three files from there to the board — `main.tsx`, `_board/route.tsx`, the page.

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| Every phase ends in a working app | The suite, unrewritten and passing |
| Every phase improves something real | **Named exception**, argued in `roadmap.md` and § Risks |
| `snake_case` for files we author | T4, with **D3**'s third exemption for a generated file |
| No behaviour change | Gate 2 — no behavioural suite is edited; the count moves only because T4 is parameterised per file |
| Persistence contract | Untouched; `board_storage.ts` does not move |
| Principle 4 — quiet chrome | Unchanged: `AppShell` moved file, not markup |
| No new runtime dependency | `@tanstack/router-plugin` is a devDependency |

---

## Definition of done

- [x] Gate 1 clean — build, lint, test, and all five checks.
- [x] Gate 2 — 25 suites, 688 assertions; four files edited, all for paths or the router's file
      vocabulary, and no behavioural suite touched.
- [x] Gate 3 — six checks run, with 3 and 5 written down.
- [x] Gate 4 — every row satisfied.
- [x] `src/app.tsx`, `src/router.tsx`, `src/main.tsx` and `src/index.css` are gone.
- [x] PR opened.
