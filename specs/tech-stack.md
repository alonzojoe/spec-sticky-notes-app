# Tech Stack

The committed stack for this project. Anything not listed here is a change to the
constitution, not a detail — add it deliberately or not at all.

## The stack

| Concern | Choice | Notes |
| --- | --- | --- |
| UI library | **React 19** | Already installed. Function components + hooks only. |
| Language | **TypeScript** | `strict` on. No `any` in committed code. |
| Build tool | **Vite** | Already installed. `npm run dev` / `build` / `lint`. |
| Styling | **Tailwind CSS v4** | Via `@tailwindcss/vite`. Tokens declared with `@theme` in CSS. |
| Components | **shadcn/ui** | Copied into `src/components/ui/`, owned and edited by us. |
| Dates | **`react-day-picker`** | Arrives with shadcn's `calendar` in P6. The first dependency that is not a shadcn primitive — a real component library with its own cadence. If its styling proves hard to keep warm, the fallback is a native `<input type="date">`. |
| Primitives | **`radix-ui`** | Arrives as shadcn's dependency — the unified package, not per-component `@radix-ui/react-*`. Source of a11y for menus, dialogs, popovers, tooltips. |
| State | **React Context + `useReducer`** | One board reducer. No external state library. |
| Persistence | **`usehooks-ts`** | `useLocalStorage` for the board and the theme. |
| Icons | **`lucide-react`** | shadcn's icon set; nothing else. |
| Drag | **Native pointer events** | Hand-rolled `useDraggable`. See "Decisions" below. |
| Testing | **Vitest** | devDependency. Shares Vite's config and resolver. See "Decisions" below. |
| DOM testing | **`jsdom` + `@testing-library/react`** | devDependencies. Opted into per file with a `// @vitest-environment jsdom` docblock, so the Vite build test stays in node. |
| Interaction testing | **`@testing-library/user-event`** | devDependency, added in P3. `fireEvent` cannot express a roving-tabindex radiogroup or a modifier chord; the dialog's keyboard path is a condition of the amended principle 2, so it is asserted with real key sequences. |

## Hard rules

- **No Zustand, Redux, Jotai, Recoil, MobX, or any other state library.** Board state is
  a `useReducer` behind Context. If that becomes painful, the fix is better reducer
  structure or context splitting — not a new dependency.
- **No backend, no `fetch`, no network calls.** The app must work with the network off.
- **No CSS-in-JS and no component library other than shadcn/ui.** Tailwind utilities plus
  the tokens in `src/index.css` are the styling system.
- **No new runtime dependency without updating this file first**, with a line explaining
  what it replaced and why nothing already here could do the job.
- **Every color, radius, shadow and duration comes from a token.** No arbitrary hex values
  or one-off `[13px]` utilities in components. Tailwind's stock palette utilities
  (`bg-stone-200`, `text-gray-500`) are as forbidden as a raw hex value — the tokens in
  `src/index.css` are the only source.
- **File and directory names are `snake_case`.** `app_sidebar.tsx`, `note_card.tsx`,
  `notes_context.tsx`, `use_draggable.ts`. This governs filenames only: React components stay
  PascalCase (`function AppSidebar`) and hooks stay camelCase (`useDraggable`). Two exemptions,
  both because the tool owns the file and rewrites it — **`src/components/ui/**`** and
  **`src/hooks/use-mobile.ts`**, written by `npx shadcn add`. Renaming those breaks `shadcn add`
  and `shadcn diff` permanently and forces an import rewrite on every future component, so they
  stay kebab-case. `__tests__` keeps its dunder name; `*.d.ts` files are exempt. The rule is
  enforced by `src/__tests__/naming_convention.test.ts` rather than by review, and that test
  pins its own exemption list with an assertion so that growing it is a visible, reviewed act.

## Setup notes

Tailwind v4 is configured through the Vite plugin (`@tailwindcss/vite`) and a single
`@import "tailwindcss";` in `src/index.css` — there is no `tailwind.config.js`. Design
tokens are declared in that same file inside an `@theme` block.

shadcn/ui requires a `@/*` path alias, so `tsconfig.json`, `tsconfig.app.json`, and
`vite.config.ts` all need it pointing at `src/`. Run `npx shadcn@latest init` after
Tailwind is in place, then add components one at a time as a phase actually needs them —
not up front.

Components land in `src/components/ui/` as our source code. Editing them is expected and
correct; treat them as ours, not as vendor files.

## Data model

The single source of truth. Changing it means bumping `version` and writing a migration.

```ts
// src/types/note.ts
// A const tuple, so NoteColor cannot drift from the array the palette iterates.
export const NOTE_COLORS = ['butter', 'apricot', 'rose', 'lilac', 'sky', 'mint'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string          // crypto.randomUUID()
  title: string       // one line, '' when absent; clamped to one line on the card    (P7)
  body: string        // raw markdown; #tags live inline in this text
  link: string        // one http(s) URL, '' when absent; lib/links.ts judges it      (P7)
  color: NoteColor
  date: string // 'YYYY-MM-DD'; shown MM/DD/YYYY. lib/dates.ts owns both directions  (P6)
  order: number       // higher is earlier; the grid sorts descending. Nothing renumbers (P5)
  pinned: boolean
  createdAt: number   // epoch ms
  updatedAt: number   // epoch ms
}

export interface BoardState {
  version: 1
  notes: Note[]
}

// Not persisted. Everything impure about creating a note, resolved before the reducer
// sees it, so the reducer stays a function of its arguments.
export interface NoteSeed {
  id: string
  color: NoteColor
  title: string
  body: string
  link: string
  date: string
  order: number
  at: number
}
```

`body` joined `NoteSeed` in P3, when the new-note dialog began choosing colour and text
together. It keeps creation a single dispatch: `add` followed by `edit_body` would leave
`updatedAt !== createdAt`, and that equality is what `board.tsx` reads to decide which note
opens focused.

P2 shipped this shape whole, including `z` and `pinned`, on the first phase that persisted
anything — a narrower shape would have guaranteed a `v2` key and a migration in P5 for the
sake of three lines. `NOTE_COLORS` and `NoteSeed` are additions to the *module*, not to
`BoardState`, so nothing persisted changed and `version` is still `1`.

`tilt` is stored, not derived. A tilt recomputed during render would make notes twitch on
every state change — that is a bug, and the mission calls it out by name.

Tags are never stored separately. They are parsed from `body` on read so that editing text
can never desynchronize from a tag list.

## State architecture

Filenames follow the `snake_case` rule above; the phase each file arrives in is noted where it
is not already here.

```
src/
  app.tsx
  main.tsx
  index.css              // @theme tokens, @utility grain, base layer
  context/
    notes_context.tsx    // the provider component only — nothing else exported
    notes_reducer.ts     // pure reducer — unit-testable, no React imports
    use_notes.ts         // the two contexts and their consumer hooks
  hooks/
    use_draggable.ts     // pointer-events drag; owns the gesture, dispatches nothing
    use_theme.ts         // light/dark/system, persisted                  (P10)
    use-mobile.ts        // shadcn-generated — exempt from snake_case
  components/
    layout/
      app_shell.tsx      // NotesProvider + SidebarProvider + AppSidebar + SidebarInset;
                         //   owns the toolbar, the New note button and the `n` shortcut
      app_sidebar.tsx    // header, the Notes destination, slots for P8/P10
      new_note_dialog.tsx // date + colour + textarea; creates the note      (P3)
      note_view_dialog.tsx // a note opened: title, body, link, colour, date; autosaves (P6)
      date_field.tsx     // calendar in a popover; owns the ISO boundary      (P6)
      paper_radiogroup.tsx // the six swatches, shared by both dialogs        (P6)
      note_fields.tsx    // the title and link inputs, shared by both dialogs (P7)
    board/
      board.tsx          // the cork surface; measures its width and lays out the grid
      note_card.tsx      // one sheet of paper: a summary at a fixed height, with a
                         //   clamp that widens for each row the note does not use  (P7)
      note_controls.tsx  // per-note pin and delete
      empty_state.tsx    //                                               (P11)
    ui/                  // shadcn components — exempt from snake_case
  lib/
    grid.ts              // the one column-width the stylesheet cannot infer        (P5)
    dates.ts             // ISO in, MM/DD/YYYY out; never builds a Date from a store (P6)
    links.ts             // the only judge of a URL: http(s) allowlisted, bare host
                         //   prefixed, everything else normalised to ''            (P7)
    utils.ts
    board_storage.ts     // storage keys and the defensive read
    note_factory.ts      // ids, timestamps, and the stamp that takes the first slot
    paper.ts             // NoteColor -> bg-paper-*, written out for the scanner
    tags.ts              // parse #tags out of body                       (P8)
    markdown.ts          // render markdown + checkboxes                  (P9)
  types/
    note.ts
```

The contexts live in `use_notes.ts` rather than beside the provider because a module
exporting both a component and a hook trips `react-refresh/only-export-components`, and P1's
scoped exemption covers `src/components/ui/**` only. Splitting the file is the fix; widening
the exemption to our own code is not.

Two contexts, not one: a **state** context and a **dispatch** context. Dispatch is stable,
so components that only mutate never re-render when the board changes. This is what makes
Context viable at 100+ notes and is why no state library is needed.

The reducer is pure and imports nothing from React. Every mutating action **carries** the
timestamp it stamps: ids, tilt, spawn position and `Date.now()` are resolved in
`lib/note_factory.ts` at the dispatch site, so the reducer is a function of its arguments and
its tests need no fake timers. `src/__tests__/reducer_purity.test.ts` enforces this as a
source assertion, and every reducer test dispatches against a deeply frozen board so a
mutation throws rather than passing quietly.

## Persistence contract

- Board key: `sticky-notes:board:v1` · Sidebar key: `sticky-notes:sidebar` · Theme key:
  `sticky-notes:theme` (P10)
- Written through `useLocalStorage` from `usehooks-ts`.
- **Writes are debounced ~300ms** so that typing and dragging don't hammer localStorage.
  Dragging must never write on every pointer move — only on drop.
- Reads are defensive: unparseable or wrong-`version` data falls back to an empty board
  rather than throwing. A corrupt localStorage entry must never white-screen the app.
- Never write inside a render pass or a pointer-move handler.

## Decisions and rationale

**Context + `useReducer` over Zustand.** A single-user board is one small object with a
handful of transitions. Splitting state and dispatch contexts removes the re-render problem
that usually justifies a store, and it keeps the dependency count at essentially zero.

**Native pointer events over dnd-kit.** Corkboard dragging is free positioning — set `x`
and `y` from pointer deltas. There is no sortable list, no drop target, no collision
detection, which is most of what a drag library provides. The cost we take on is
accessibility: `useDraggable` **must** ship keyboard support (focus a note, arrow keys move
it, Shift+arrow moves in larger steps) since Radix isn't providing it here. Revisit dnd-kit
only if that hand-rolled a11y proves inadequate.

**shadcn/ui over a packaged component library.** The notes themselves are custom and always
will be. What's actually needed from a library is the fiddly a11y work in menus, popovers,
dialogs, and tooltips — which is Radix, delivered as code we own and can restyle to match
the paper aesthetic.

**`usehooks-ts` for localStorage.** It handles JSON serialization, SSR-safety, and
cross-tab `storage` events. Writing that by hand is a known-bugs exercise with no upside.

**Vitest for tests.** It replaces nothing — before P0 there was no test runner and acceptance
was by eye. It is the only runner that reads `vite.config.ts` directly, so a test resolves `@/`
and compiles Tailwind through the same plugin chain the app ships with. Jest would need a
parallel resolver and transform config, and the two could drift apart without either failing —
which is precisely the class of bug these tests exist to catch. It is a devDependency, so the
no-backend and no-state-library rules are untouched.

**`jsdom` + `@testing-library/react` for component tests.** They replace nothing — through P0,
acceptance was filesystem and build assertions, which is all a phase with no components can
honestly check. From P1 the repo renders UI whose criteria are structural: a `<nav>` landmark, an
`aria-current` marker, a real `<button>` rather than a clickable `div`, a tilt that survives a
re-render. A source-text grep cannot assert any of those, and "acceptance by eye" does not
survive ten phases. Both are devDependencies, so the no-backend and no-state-library rules are
untouched.

`@testing-library/jest-dom` is deliberately absent: its matchers are convenience over
`expect(el.getAttribute('aria-current')).toBe('page')`, at the cost of a third dependency and a
`types` entry in `tsconfig.app.json`. Vitest also runs without globals here, so every component
test calls `afterEach(cleanup)` explicitly — the automatic hook never registers.

**Markdown rendering.** Deferred to the phase that needs it (P9). Whatever is chosen must
be small, must escape HTML by default, and must support task-list checkboxes. Record the
choice here when it's made.

## Quality bar

- `npm run build` passes — `tsc -b` clean, zero TypeScript errors.
- `npm run lint` passes with no new warnings.
- No `console.log` in committed code.
- Interactive elements are real `<button>`s or Radix primitives; a `div` with `onClick` is
  a defect.
- Every interactive element has a visible focus ring.

See [mission.md](./mission.md) for what we're building and [roadmap.md](./roadmap.md) for
the order.
