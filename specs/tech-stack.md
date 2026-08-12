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
| Primitives | **Radix UI** | Arrives as shadcn's dependency. Source of a11y for menus, dialogs, popovers, tooltips. |
| State | **React Context + `useReducer`** | One board reducer. No external state library. |
| Persistence | **`usehooks-ts`** | `useLocalStorage` for the board and the theme. |
| Icons | **`lucide-react`** | shadcn's icon set; nothing else. |
| Drag | **Native pointer events** | Hand-rolled `useDraggable`. See "Decisions" below. |
| Testing | **Vitest** | devDependency. Shares Vite's config and resolver. See "Decisions" below. |

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
  or one-off `[13px]` utilities in components.

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
export type NoteColor =
  | 'butter' | 'apricot' | 'rose' | 'lilac' | 'sky' | 'mint'

export interface Note {
  id: string          // crypto.randomUUID()
  body: string        // raw markdown; #tags live inline in this text
  color: NoteColor
  x: number           // px from board origin, top-left of the note
  y: number
  z: number           // stacking order; click sets it to max + 1
  tilt: number        // -3..3 degrees, assigned once at creation, never recomputed
  pinned: boolean
  createdAt: number   // epoch ms
  updatedAt: number   // epoch ms
}

export interface BoardState {
  version: 1
  notes: Note[]
}
```

`tilt` is stored, not derived. A tilt recomputed during render would make notes twitch on
every state change — that is a bug, and the mission calls it out by name.

Tags are never stored separately. They are parsed from `body` on read so that editing text
can never desynchronize from a tag list.

## State architecture

```
src/
  context/
    NotesContext.tsx     // provider + useReducer + persistence wiring
    notesReducer.ts      // pure reducer — unit-testable, no React imports
    useNotes.ts          // consumer hooks
  hooks/
    useDraggable.ts      // pointer-events drag
    useTheme.ts          // light/dark/system, persisted
  components/
    board/               // Board, Note, NoteToolbar, EmptyState
    ui/                  // shadcn components
  lib/
    tags.ts              // parse #tags out of body
    markdown.ts          // render markdown + checkboxes
  types/
    note.ts
```

Two contexts, not one: a **state** context and a **dispatch** context. Dispatch is stable,
so components that only mutate never re-render when the board changes. This is what makes
Context viable at 100+ notes and is why no state library is needed.

The reducer is pure and imports nothing from React. Every action stamps `updatedAt`.

## Persistence contract

- Board key: `sticky-notes:board:v1` · Theme key: `sticky-notes:theme`
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

**Markdown rendering.** Deferred to the phase that needs it (P8). Whatever is chosen must
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
