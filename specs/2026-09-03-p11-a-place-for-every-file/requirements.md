# P11 · A place for every file — Requirements

**Phase:** P11 (eleventh phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-03
**Branch:** `feat/p11-a-place-for-every-file` off `feat/p10-a-view-of-the-pinned`
**Status:** specified

---

## Context

P10 put the board behind a router in a hurry. It got three code-based routes in one `src/router.tsx`
beside `app.tsx`, and it works — twenty-five suites and 669 assertions pass — but the shape was
chosen to be small rather than to be right, and the phase said so: *"two sections is not a section
framework… the next phase to want one will find one `BoardSection` union and a `filter`, and will
have to generalise both."*

There is an existing answer to what routing should look like here, in a project this repo's author
also works on: **`unicare-booking`'s `src/app/`**. It is TanStack Router's own file-based
convention, and it is the shape the router was designed around — an `app/` directory holding the
entry point and the route tree, routes as files whose paths *are* the URLs, pathless layout groups
holding what a set of routes shares, and route files thin enough to be read at a glance because the
page they render lives somewhere else.

This phase adopts that structure. **Nothing about the app changes.**

## Scope

Five deliverables. **All of them are moves.**

1. **`src/app/`** — the entry point, the stylesheet, the router configuration, and the generated
   route tree (**D1**).
2. **File-based routing** — `@tanstack/router-plugin`, routes under `src/app/routes/`, and the
   naming rule amended for the one generated file (**D2**, **D3**).
3. **A `_board` layout group** — the shell becomes what a set of routes shares rather than what
   wraps an `<Outlet />` in the root (**D4**).
4. **A `pages/` layer** — a route file names a page; the page composes the board (**D5**).
5. **The test entry point moves with it**, since production no longer has an `App` component to
   render (**D6**).

Plus the documents this invalidates (**D7**).

## Out of scope

- **Any behaviour change.** No new route, no route for a note, no change to what a section shows.
  The proof of this phase is that the existing suite passes untouched except where it names a path.
- **The rest of unicare's layout** — `features/`, `entities/`, `widgets/`, `shared/`. That is
  Feature-Sliced Design, it is a good answer for an app with an API and thirty pages, and this app
  has one board and no server. `components/`, `context/`, `hooks/`, `lib/` and `types/` stay exactly
  where they are (**D5**).
- **A note's own URL.** P10 decided a note is a dialog, not a route, and the palette and the card
  both open it that way. File-based routing makes `notes/$noteId` easy, which is a reason to be
  explicit that it is not being done here.
- **Search params, loaders, or route context.** unicare validates search with zod and preloads
  through a query client; this app has no server and reads one `localStorage` key.
- **`scrollRestoration`.** unicare turns it on. The board scrolls inside its own element and the two
  sections are one grid, so there is nothing to restore.

## Decisions

### D1 · `src/app/` is the entry point, not `src/`

`main.tsx`, `index.css` and `router.tsx` sit at the root of `src/` today because Vite's template put
them there. They move:

| Now | After |
| --- | --- |
| `src/main.tsx` | `src/app/main.tsx` |
| `src/index.css` | `src/app/main.css` |
| `src/router.tsx` | `src/app/config/router_config.ts` + `src/app/routes/**` |
| `src/app.tsx` | *deleted* (**D6**) |

`index.html` points at `/src/app/main.tsx`. The rename of `index.css` to `main.css` is part of the
move rather than a separate opinion: it is the stylesheet the entry point imports, and it is named
after it in the structure being adopted.

`src/app/config/` holds `router_config.ts` and nothing else. unicare's holds five files because it
has Sentry, i18n, a query client and an accessibility script; ours has a router. **An empty
convention is still worth having** when the phase's whole purpose is that the next person recognises
the layout — but it is not worth *filling*, so nothing else is invented to put there.

### D2 · Routes become files, and the plugin generates the tree

`@tanstack/router-plugin/vite`, configured as unicare configures it:

```ts
tanstackRouter({
  target: 'react',
  autoCodeSplitting: true,
  routesDirectory: './src/app/routes',
  generatedRouteTree: './src/app/routeTree.gen.ts',
})
```

The plugin runs before `react()` in the plugin list, which is the order its documentation requires
and the order unicare uses.

`autoCodeSplitting` is on. It does nothing visible for three routes that all render the same board —
and it is the correct default the moment a route has anything of its own, which is the argument for
matching the reference rather than second-guessing it in a phase whose purpose is to match it.

**The generated tree is committed.** It is an input to `tsc` and to `vitest`, and a build that
depends on a file nobody has ever seen is worse than one that depends on a file nobody edits.

### D3 · The naming rule gains its third exemption

P1's `snake_case` rule is enforced by T4, and its `EXEMPT` list has held exactly two entries since
P1 wrote it:
`components/ui` and `hooks/use-mobile.ts`. P9's requirements said the pin **must not be edited** —
in the context of a phase that had no business editing it.

`routeTree.gen.ts` is camelCase and is written by the plugin on every dev server start. It is the
same kind of thing the two existing entries are: **a path a CLI owns, whose name is not ours to
choose.** So the list gains `app/routeTree.gen.ts`, T4's guard assertion is updated to name three
paths, and the amendment is argued here rather than appended quietly — which is what that guard
assertion exists to force.

**The rule also learns the router's vocabulary**, which is a second, smaller amendment: a directory
may start with `_` when the rest of it is snake_case, because that underscore is what makes `_board`
a pathless group, and `__root.tsx` is allowed by name. Two narrow patterns, not a loosened rule —
`_board` passes and `_Board` does not — and the same carve-out `__tests__` has had all along.

The alternative was to keep the routes code-based and mirror only the folder layout by hand. It was
rejected because it produces a directory that *looks* like the reference and behaves differently the
moment anyone adds a route: the whole value of adopting a convention is that a file at
`routes/_board/pinned/index.tsx` is the URL `/pinned` without anyone wiring it up.

### D4 · The shell is a layout group

unicare's routes hang off pathless groups — `_public` and `_private` — each with a `route.tsx`
holding what that set of routes shares.

Ours:

```
src/app/routes/
  __root.tsx              // the document: providers-free, an <Outlet /> and nothing else
  _board/
    route.tsx             // AppShell: the sidebar, the toolbar, the providers, an <Outlet />
    index.tsx             // /
    notes/index.tsx       // /notes
    pinned/index.tsx      // /pinned
```

**`AppShell` moves from being the root route's component to being the group's**, which is what it
always was: the thing every board route shares. The root keeps only what is true of the whole
document, which today is nothing but an outlet.

The pathless group earns its place rather than costing one: the routes under it are exactly the
routes that want a sidebar, and the next thing that does not — an onboarding screen, a shared
read-only board, a printable view — lands beside `_board` instead of inside the only layout there
is. P10 shipped a section framework that could not name a second layout; this is where a second one
would go.

### D5 · A route names a page; the page composes the board

unicare's route files are three to twenty lines: they declare the route and point at a component
from `@/pages/...`. Ours do the same.

```
src/pages/
  notes_page/{notes_page.tsx, index.ts}
  pinned_page/{pinned_page.tsx, index.ts}
```

Each page is a handful of lines — `<Board section="notes" />` — and that is the point of the layer
rather than an argument against it. **A route file should say what the URL is, not what the screen
contains**, and the two are only the same thing while the screen is one component. The first page to
grow a header, an empty state of its own, or a second widget grows in `pages/` where a route file
stays readable.

`index.ts` barrels, as unicare has them, so a page is imported by its directory.

**Nothing else moves.** `components/`, `context/`, `hooks/`, `lib/` and `types/` are untouched, and
`board.tsx` still takes its `section` prop — the page passes it, where a route file used to. The
rest of unicare's layers are out of scope and § Out of scope says why.

### D6 · `App` becomes a test fixture

unicare has no `App` component: `main.tsx` composes the providers around a `RouterProvider` and
that is the top of the tree. Ours does the same, so **`src/app.tsx` is deleted**.

Nine test files render `<App />`, in dozens of call sites. They keep doing so, against
`src/__tests__/test_app.tsx` — a fixture that renders a `RouterProvider` over the shared test router
that `router_setup.ts` already owns. One import line changes per file and no call site does.

That the app's own entry point is not a component **is why the fixture exists**, and naming it
`test_app.tsx` rather than `app.tsx` keeps the reason visible: it is a thing tests need, not a thing
the app has.

### D7 · Documents corrected in the same phase

- **`tech-stack.md`** — the whole source tree, which this phase rearranges; the routing row gains
  the plugin, and the `snake_case` rule gains its third exemption.
- **`roadmap.md`** — P11 is this phase, and it carries the structural carve-out (**§ Risks**).
- **`README.md`** — status to P11.
- **`mission.md`** — **unchanged.** Nothing this phase does is visible to a user, and a
  constitution that has to be amended to move a file is a constitution that has been made to mean
  the wrong thing.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.**
- **`snake_case` for every file we author.** Our route files, pages and config are all snake_case;
  the one camelCase name in the tree is generated (**D3**). `__root.tsx`, `route.tsx`, `index.tsx`
  and the `_board` group are the plugin's vocabulary, and T4 already exempts `__tests__` for the
  same reason.
- **No behaviour change**, which for once is the whole acceptance criterion.
- **No new runtime dependency.** `@tanstack/router-plugin` is a devDependency; the router itself
  arrived in P10.
- **The persistence contract is untouched.** `board_storage.ts` does not move and its keys do not
  change.

## Risks

**A restructure is the phase most likely to break something invisibly.** Every import in the repo is
a candidate, and `tsc` catches the ones that are wrong rather than the ones that are merely worse.
The mitigation is that the suite is 669 assertions deep and none of them are rewritten: if the app
still passes the tests P10 left, the move preserved behaviour.

**`roadmap.md` says every phase improves something real and ends in a working app.** This one
improves nothing a user can see. That rule is worth keeping and worth a named exception rather than
a quiet one: the phase ships a working app, it is one commit sequence, and it exists because the
*next* phase — *Tags*, which adds a filter, a parser and a chip — is the one that would otherwise
pay for P10's shortcut. The carve-out is recorded in `roadmap.md` so it is a decision rather than a
precedent.

**The plugin regenerates `routeTree.gen.ts` on dev start**, which means a stale committed copy shows
up as a dirty working tree rather than as an error. Gate 1 greps for it.

**`autoCodeSplitting` changes how route components are bundled**, and the build's vendor-chunk split
from P10 sits next to it in `vite.config.ts`. Both are build configuration touching the same object,
and the build's output is checked rather than assumed.

**The fixture is a fork of the entry point** (**D6**). If `main.tsx` grows a provider, the tests
will not see it, and nothing fails. That is a real cost of having no `App` component, it is the same
cost unicare pays, and the honest mitigation is that `main.tsx` is nine lines and the fixture is
three.
