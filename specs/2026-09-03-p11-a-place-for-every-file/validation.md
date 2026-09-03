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

**No test is added and none is rewritten.** T1–T75 come from P0–P10 and all of them still pass:
**25 suites, 669 assertions**, the same numbers this phase started with. A count that *grew* would
mean this phase did something, which is the one thing it must not do.

Three files change, all of them naming a path rather than an assertion:

### T4 · the `snake_case` rule gains its third exemption

- `EXEMPT` becomes `['components/ui', 'hooks/use-mobile.ts', 'app/routeTree.gen.ts']`, and **the
  guard assertion that pins the list is updated with it** — that assertion exists to make growing
  the list a visible, argued edit, and **D3** is the argument.
- Every file this phase writes is still snake_case. `__root.tsx`, `route.tsx`, `index.tsx` and
  `_board` are the plugin's vocabulary, the way `__tests__` is the runner's.

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

*To be written when the check is run. Checks 3 and 5 must be written down whatever they say — the
production reload, and whether the layout group is a place or an ornament.*

---

## Gate 4 — Constitution compliance

| Requirement | Where it is satisfied |
| --- | --- |
| Every phase ends in a working app | The suite, unrewritten and passing |
| Every phase improves something real | **Named exception**, argued in `roadmap.md` and § Risks |
| `snake_case` for files we author | T4, with **D3**'s third exemption for a generated file |
| No behaviour change | Gate 2 — the assertion count does not move |
| Persistence contract | Untouched; `board_storage.ts` does not move |
| Principle 4 — quiet chrome | Unchanged: `AppShell` moved file, not markup |
| No new runtime dependency | `@tanstack/router-plugin` is a devDependency |

---

## Definition of done

- [ ] Gate 1 clean — build, lint, test, and all five checks.
- [ ] Gate 2 — 25 suites and 669 assertions, unchanged, with only path edits in three files.
- [ ] Gate 3 — six checks run, and **checks 3 and 5 written down**.
- [ ] Gate 4 — every row satisfied.
- [ ] `src/app.tsx`, `src/router.tsx`, `src/main.tsx` and `src/index.css` are gone.
- [ ] PR opened.
