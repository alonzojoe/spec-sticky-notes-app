# P2 · Real notes, remembered — Plan

A groundwork step and eight task groups. Execute in order: each leaves the tree building, linting,
and testing clean, and in a state the next group can verify against. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Each group is test-first where a test is possible: write the assertion, watch it fail for the right
reason, then make it pass. Groups end with `npm run build && npm run lint && npm test`. Commit at
the end of each group while working — the phase is **squashed to one commit** when the PR merges
(roadmap rule: one phase, one commit).

**Ordering note.** Groups 1–3 build the store bottom-up in files that import no React component, so
the reducer, the storage guard, and the factory are all under test before anything renders. Group 4
is the swap: `mock_notes.ts` dies and the board reads state. Nothing before group 4 changes what is
on screen, and nothing after it touches the reducer.

## Constraints to confirm before writing code

Two of these are already proven by P1's shipped code. The rest are assumptions this plan depends on
— **check each one in group 0 below, and if any is false, fix the plan before writing the feature.**

*Proven in the repo today:*

- **`duration-(--duration-hover)`, not `duration-hover`.** Tailwind v4 has no `--duration-*` theme
  namespace. P1 verified this and every existing component uses the parenthesised form.
- **`SidebarInset` renders the `<main>` element.** Nothing this phase adds may nest another one;
  **T7** asserts exactly one.

*To verify:*

- **`SidebarProvider` accepts `open` and `onOpenChange`** and runs controlled when both are passed.
  Group 3 depends on it. Read `src/components/ui/sidebar.tsx` — the file is ours.
- **`useDebounceCallback` from `usehooks-ts` returns a function carrying `.cancel()`.** Groups 3 and
  6 call it. If the installed version does not, replace the blur path with a plain immediate
  dispatch and let the pending debounced call land harmlessly on the same value.
- **`field-sizing-content` compiles under the installed Tailwind.** Group 6 uses it for the
  grow-to-fit textarea. If it emits nothing, the `min-h`/`max-h` pair alone is the fallback and the
  textarea scrolls instead of growing — acceptable, but say so in the commit rather than shipping a
  class that does nothing.
- **`crypto.randomUUID()` exists in the installed jsdom.** If not, `dom_setup.ts` stubs it
  (group 0.4).
- **React 19's `<Context value={…}>` provider shorthand.** If the installed React or the ESLint
  config objects, use `<Context.Provider value={…}>`; nothing else changes.

---

## 0. Groundwork

0.1 Branch: `git switch develop && git pull && git switch -c feat/p2-real-notes-remembered`.

0.2 `npm run build && npm run lint && npm test` on a clean `develop`. All eight suites green before
    anything is added. A pre-existing failure discovered halfway through group 4 is indistinguishable
    from one this phase caused.

0.3 Walk the "To verify" list above. Record each answer in the group-0 commit message.

0.4 `npm install usehooks-ts`. It is **already** in
    [tech-stack.md](../tech-stack.md)'s stack table ("Persistence | **`usehooks-ts`** |
    `useLocalStorage` for the board and the theme") with its rationale paragraph, written there
    before it arrived — which is what the constitution asks for. **Verify the line is present; do
    not add a second one.** This is the only runtime dependency this phase installs.

0.5 If `crypto.randomUUID` is missing from jsdom, extend `src/__tests__/dom_setup.ts` beside
    `stubMatchMedia`:

```ts
// jsdom does not implement crypto.randomUUID in every build. note_factory.ts is the single
// call site, so a counter-backed stub is enough for tests and never reaches the app.
let uuid = 0
export const stubRandomUUID = () => {
  vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: () => `test-uuid-${++uuid}` })
}
```

0.6 Commit: `chore: install usehooks-ts and confirm the P2 toolchain assumptions`

---

## 1. The data model and the pure reducer

Nothing in this group imports React. Both files run in Vitest's default `node` environment.

1.1 Create `src/types/note.ts`. The `Note` and `BoardState` shapes come from
    [tech-stack.md](../tech-stack.md) § Data model **unchanged** (requirements **D3**). Two
    additions that are not part of the persisted model: the color list, and the seed the factory
    produces.

```ts
// The six papers. Declared as a const tuple so NoteColor cannot drift from the array the
// palette iterates — one edit changes both.
export const NOTE_COLORS = ['butter', 'apricot', 'rose', 'lilac', 'sky', 'mint'] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string          // crypto.randomUUID()
  body: string        // raw markdown; #tags live inline in this text
  color: NoteColor
  x: number           // px from board origin, top-left of the note
  y: number
  z: number           // stacking order; click sets it to max + 1                        (P5)
  tilt: number        // -3..3 degrees, assigned once at creation, never recomputed
  pinned: boolean
  createdAt: number   // epoch ms
  updatedAt: number   // epoch ms
}

export interface BoardState {
  version: 1
  notes: Note[]
}

// Everything impure about creating a note, resolved before the reducer sees it (D8).
export interface NoteSeed {
  id: string
  color: NoteColor
  x: number
  y: number
  tilt: number
  at: number
}

export const EMPTY_BOARD: BoardState = { version: 1, notes: [] }
```

1.2 Write `src/__tests__/notes_reducer.test.ts` first, covering every assertion in
    [validation.md](./validation.md) § T11 — including the frozen-state case. Run it; watch it fail
    on a missing module, not on a syntax error.

1.3 Create `src/context/notes_reducer.ts`:

```ts
import type { BoardState, Note, NoteSeed } from '@/types/note'

export type NoteAction =
  | { type: 'add'; seed: NoteSeed }
  | { type: 'edit_body'; id: string; body: string; at: number }
  | { type: 'toggle_pin'; id: string; at: number }
  | { type: 'delete'; id: string }

const ceilingOf = (notes: Note[]) => notes.reduce((top, note) => Math.max(top, note.z), 0)

export function notesReducer(state: BoardState, action: NoteAction): BoardState {
  switch (action.type) {
    case 'add': {
      // Destructured rather than spread: `seed.at` is not a Note field and must not leak in.
      const { id, color, x, y, tilt, at } = action.seed
      const note: Note = {
        id,
        body: '',
        color,
        x,
        y,
        z: ceilingOf(state.notes) + 1,
        tilt,
        pinned: false,
        createdAt: at,
        updatedAt: at,
      }
      return { ...state, notes: [...state.notes, note] }
    }

    case 'edit_body':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, body: action.body, updatedAt: action.at } : note,
        ),
      }

    case 'toggle_pin':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, pinned: !note.pinned, updatedAt: action.at } : note,
        ),
      }

    case 'delete':
      return { ...state, notes: state.notes.filter((note) => note.id !== action.id) }
  }
}
```

    A new note is appended, never unshifted. Array order is the DOM order and therefore the tab
    order; **D5** depends on it staying stable, and stacking is carried by `z`, not by position in
    the array.

1.4 Write `src/__tests__/reducer_purity.test.ts` for § T19 — a source assertion that
    `notes_reducer.ts` contains no `Date.now`, `Math.random`, `crypto.randomUUID`, or import from
    `react`. A pure reducer that quietly grows a `Date.now()` in P10 is a test that starts needing
    fake timers, and nobody notices until it does.

1.5 `npm run build && npm run lint && npm test` — clean.

1.6 Commit: `feat(state): add the note data model and a pure board reducer`

**Leaves:** the committed data model in code, and every board transition unit-tested without a DOM.

---

## 2. Defensive storage and the note factory

Still no React. Both files are plain modules under `src/lib/`.

2.1 Write `src/__tests__/board_storage.test.ts` (§ T12) and `src/__tests__/note_factory.test.ts`
    (§ T13) first.

2.2 Create `src/lib/board_storage.ts`:

```ts
import { EMPTY_BOARD, NOTE_COLORS, type BoardState, type Note } from '@/types/note'

export const BOARD_KEY = 'sticky-notes:board:v1'
export const SIDEBAR_KEY = 'sticky-notes:sidebar'

const isNote = (value: unknown): value is Note => {
  if (typeof value !== 'object' || value === null) return false
  const note = value as Record<string, unknown>
  return (
    typeof note.id === 'string' &&
    typeof note.body === 'string' &&
    typeof note.color === 'string' &&
    (NOTE_COLORS as readonly string[]).includes(note.color) &&
    typeof note.x === 'number' &&
    typeof note.y === 'number' &&
    typeof note.z === 'number' &&
    typeof note.tilt === 'number' &&
    typeof note.pinned === 'boolean' &&
    typeof note.createdAt === 'number' &&
    typeof note.updatedAt === 'number'
  )
}

/**
 * The persistence contract's defensive read (D6). Anything that is not exactly a version-1
 * board of well-formed notes becomes an empty board. One malformed note rejects the whole
 * value rather than being dropped: a board silently missing a note is worse than a board
 * that is visibly empty, because the first looks like it worked.
 *
 * Pure — no writes, no logging, no migration. useReducer's lazy initialiser runs it twice
 * under StrictMode.
 */
export function hydrate(stored: unknown): BoardState {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return EMPTY_BOARD
  const board = stored as Partial<BoardState>
  if (board.version !== 1) return EMPTY_BOARD
  if (!Array.isArray(board.notes) || !board.notes.every(isNote)) return EMPTY_BOARD
  return { version: 1, notes: board.notes }
}
```

2.3 Create `src/lib/note_factory.ts` — the impure boundary, and the only place in the app that
    calls `crypto.randomUUID()` or `Math.random()`:

```ts
import type { NoteColor, NoteSeed } from '@/types/note'

// Where a new note lands. Near the top-left where the eye already is, spread widely enough
// that two notes made in a row do not sit exactly on top of each other. Drag is P5; until
// then this is the only thing that decides position.
const SPAWN = { x: 48, y: 40, spreadX: 280, spreadY: 200 } as const

// mission.md: "a random rotation between -3 and +3 degrees at creation, kept forever".
const TILT = 3

export function createNoteSeed(color: NoteColor): NoteSeed {
  return {
    id: crypto.randomUUID(),
    color,
    x: Math.round(SPAWN.x + Math.random() * SPAWN.spreadX),
    y: Math.round(SPAWN.y + Math.random() * SPAWN.spreadY),
    tilt: Number((Math.random() * TILT * 2 - TILT).toFixed(2)),
    at: Date.now(),
  }
}
```

2.4 Create `src/lib/paper.ts` — one map, imported by both the note and the palette:

```ts
import type { NoteColor } from '@/types/note'

// A static map, not a template string. Tailwind scans source text, and `bg-paper-${color}`
// would be invisible to the scanner and emit nothing at all. This is why it is written out
// once here rather than twice — note_card.tsx and note_palette.tsx both read it.
export const PAPER: Record<NoteColor, string> = {
  butter: 'bg-paper-butter',
  apricot: 'bg-paper-apricot',
  rose: 'bg-paper-rose',
  lilac: 'bg-paper-lilac',
  sky: 'bg-paper-sky',
  mint: 'bg-paper-mint',
}

export const paperLabel = (color: NoteColor) => color[0].toUpperCase() + color.slice(1)
```

2.5 `npm run build && npm run lint && npm test` — clean.

2.6 Commit: `feat(state): add the defensive board read and the note seed factory`

**Leaves:** a corrupt `localStorage` value provably cannot reach the reducer.

---

## 3. The provider, persistence, and the sidebar key

3.1 Create `src/context/use_notes.ts`. **The contexts live here, not in the provider file** — a
    module exporting both a component and a hook trips `react-refresh/only-export-components`, and
    the quality bar forbids new warnings. P1 scoped that rule off for `src/components/ui/**` only,
    and widening the exemption to our own code to dodge a file split would be the wrong fix.

```ts
import { createContext, use, type Dispatch } from 'react'

import type { NoteAction } from '@/context/notes_reducer'
import type { BoardState } from '@/types/note'

export const NotesStateContext = createContext<BoardState | null>(null)
export const NotesDispatchContext = createContext<Dispatch<NoteAction> | null>(null)

export function useNotes(): BoardState {
  const board = use(NotesStateContext)
  if (board === null) throw new Error('useNotes must be used inside <NotesProvider>')
  return board
}

export function useNotesDispatch(): Dispatch<NoteAction> {
  const dispatch = use(NotesDispatchContext)
  if (dispatch === null) throw new Error('useNotesDispatch must be used inside <NotesProvider>')
  return dispatch
}
```

    The `null` default plus the throw is deliberate: a default empty board would let a component
    render outside the provider and silently show nothing, which is a bug that presents as a design
    problem.

3.2 Create `src/context/notes_context.tsx` — the provider, and nothing else exported:

```tsx
import { useEffect, useReducer, type ReactNode } from 'react'
import { useDebounceCallback, useLocalStorage } from 'usehooks-ts'

import { notesReducer } from '@/context/notes_reducer'
import { NotesDispatchContext, NotesStateContext } from '@/context/use_notes'
import { BOARD_KEY, hydrate } from '@/lib/board_storage'
import { EMPTY_BOARD } from '@/types/note'

// tech-stack.md: "Writes are debounced ~300ms so that typing and dragging don't hammer
// localStorage."
const PERSIST_MS = 300

export function NotesProvider({ children }: { children: ReactNode }) {
  // Read once, on the first render, so the board is never briefly empty on load.
  const [stored, setStored] = useLocalStorage<unknown>(BOARD_KEY, EMPTY_BOARD)
  const [board, dispatch] = useReducer(notesReducer, stored, hydrate)
  const persist = useDebounceCallback(setStored, PERSIST_MS)

  // D2 — the reducer is the source of truth and localStorage is a mirror. The write lives in
  // an effect because the contract forbids writing during a render pass.
  useEffect(() => {
    persist(board)
  }, [board, persist])

  return (
    <NotesStateContext value={board}>
      <NotesDispatchContext value={dispatch}>{children}</NotesDispatchContext>
    </NotesStateContext>
  )
}
```

    `useLocalStorage` is typed `unknown` on purpose. Typing it `BoardState` would be a lie about
    data that came from outside the program, and `hydrate` is the only thing entitled to make that
    claim.

3.3 Amend `src/components/layout/app_shell.tsx`: wrap in the provider, and make `SidebarProvider`
    controlled by a persisted boolean. This discharges P1's **D4** (requirements **D7**).

```tsx
import { useLocalStorage } from 'usehooks-ts'

import { Board } from '@/components/board/board'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { NotesProvider } from '@/context/notes_context'
import { SIDEBAR_KEY } from '@/lib/board_storage'

export function AppShell() {
  // P1 deleted shadcn's `sidebar_state` cookie and deliberately shipped no replacement, so
  // that persistence would arrive once, through the contract. This is that arrival.
  const [sidebarOpen, setSidebarOpen] = useLocalStorage(SIDEBAR_KEY, true)

  return (
    <NotesProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        {/* …the existing tree, unchanged… */}
      </SidebarProvider>
    </NotesProvider>
  )
}
```

    Do not edit `src/components/ui/sidebar.tsx` again. **T5** still asserts the cookie is gone, and
    control lives outside the component.

3.4 Write `src/__tests__/persistence.test.tsx` (§ T14) with `// @vitest-environment jsdom` as its
    first line. It needs `vi.useFakeTimers()` for the debounce and `localStorage.clear()` in
    `beforeEach` — a leaked board between tests makes T14 pass for the wrong reason.

3.5 `npm run build && npm run lint && npm test` — clean. The board still renders `MOCK_NOTES`; the
    provider is mounted and unused. That is intentional: one group, one risk.

3.6 Commit: `feat(state): persist the board and the sidebar through the storage contract`

**Leaves:** a store that survives a reload, wrapped around a board that does not use it yet.

---

## 4. The board renders from state

The swap. P1's **D10** promised this would be a one-line change in `board.tsx`; hold it to that.

4.1 Rewrite `src/components/board/board.tsx`:

```tsx
import { NoteCard } from '@/components/board/note_card'
import { useNotes } from '@/context/use_notes'
import type { Note } from '@/types/note'

export function Board() {
  const { notes } = useNotes()

  // D5 — pinned notes render above every unpinned one. Computed here, at render, from the
  // largest z on the board: array order, x, y and z are all left exactly as they are.
  // Sorting the array would reshuffle tab order every time a pin is toggled, and writing a
  // large value into z would destroy the field P5 needs.
  const ceiling = notes.reduce((top, note) => Math.max(top, note.z), 0)

  // The one note that is new and untouched opens focused. At most one note can satisfy
  // this, so creating a note never steals focus from a note you are already writing on.
  const newest = notes.reduce<Note | null>(
    (top, note) => (top === null || note.z > top.z ? note : top),
    null,
  )
  const openId =
    newest !== null && newest.body === '' && newest.createdAt === newest.updatedAt
      ? newest.id
      : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-cork texture-cork">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          layer={note.pinned ? note.z + ceiling + 1 : note.z}
          startEditing={note.id === openId}
        />
      ))}
    </div>
  )
}
```

    Keep `className="relative h-full w-full overflow-hidden bg-cork texture-cork"` as the **first**
    `className` in the file — **T2** extracts exactly that string and asserts every utility in it
    reaches the stylesheet.

4.2 Amend `src/components/board/note_card.tsx` to take `Note` instead of `MockNote`, accept `layer`,
    apply it as `zIndex`, and import `PAPER` from `@/lib/paper`. Editing and controls arrive in
    groups 6 and 7 — this step is types and stacking only.

4.3 Amend `src/components/layout/app_sidebar.tsx`: drop the `MOCK_NOTES` import, read
    `const { notes } = useNotes()`, and badge `{notes.length}`.

4.4 `git rm src/components/board/mock_notes.ts`.

4.5 Fix the two suites that imported it, in this group and not as a follow-up:

- `src/__tests__/board.test.tsx` — **T8** now renders `<App />` inside a seeded `localStorage`
  rather than reading a fixture array. Seed two notes with known tilts, assert the rendered
  `transform` matches, force a re-render, assert it is unchanged.
- `src/__tests__/app_shell.test.tsx` — **T7**'s badge assertion no longer has a fixture length to
  compare against. Assert `0` on an empty board, then add a note through the palette in group 5 and
  assert `1`. Comparing against a number the test computed from the same source it is testing was
  always the weaker half of that assertion.

4.6 `npm run build && npm run lint && npm test` — clean. The app now renders an empty cork board,
    and nothing can put a note on it. That is the next group.

4.7 Commit: `feat(board): render the board from state and delete the mock fixtures`

**Leaves:** no hardcoded notes anywhere in the tree.

---

## 5. Creation, with the color chosen first

5.1 Write the § T15 assertions in `src/__tests__/note_palette.test.tsx` first.

5.2 Create `src/components/layout/note_palette.tsx`:

```tsx
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar'
import { useNotesDispatch } from '@/context/use_notes'
import { createNoteSeed } from '@/lib/note_factory'
import { PAPER, paperLabel } from '@/lib/paper'
import { NOTE_COLORS } from '@/types/note'

// D4 — the color is chosen before the note exists, and one click is the whole interaction.
// 3x2 while the sidebar is open, a single column at rail width: mission.md principle 4 says
// the board stays fully usable with the sidebar collapsed, and creating a note is the
// primary action. Hiding the palette on the rail would make the rail decorative.
export function NotePalette() {
  const dispatch = useNotesDispatch()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>New note</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="grid grid-cols-3 gap-1.5 group-data-[collapsible=icon]:grid-cols-1">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`New ${paperLabel(color)} note`}
              title={`New ${paperLabel(color)} note`}
              onClick={() => dispatch({ type: 'add', seed: createNoteSeed(color) })}
              className={`h-7 rounded-sm border border-sidebar-border texture-paper ${PAPER[color]} hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
            />
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
```

    **No transform or scale on hover.** The `prefers-reduced-motion` block in `src/index.css` scopes
    itself to `[data-slot^='sidebar']` and `[data-slot='note-card']` — the elements themselves, not
    their descendants — so a `hover:scale-105` here would survive reduced motion. A ring is the
    same affordance, costs no motion, and needs no new CSS.

5.3 Mount it in `app_sidebar.tsx`, **above** the nav group, replacing the `P2` line in the
    slot comment at the top of that file:

```tsx
<SidebarContent>
  <NotePalette />
  <nav aria-label="Board sections">{/* …unchanged… */}</nav>
</SidebarContent>
```

5.4 Extend `app_shell.test.tsx` (§ T7) — clicking a swatch takes the badge from `0` to `1`.

5.5 `npm run build && npm run lint && npm test` — clean. Notes can now be created in any of the six
    papers, they survive a reload, and they cannot be written on or removed. Verify the reload by
    hand before moving on; it is the phase's central claim.

5.6 Commit: `feat(board): create notes from a six-colour paper palette`

---

## 6. Writing on them

6.1 Write the § T16 assertions in `src/__tests__/note_editing.test.tsx` first.

6.2 Amend `src/components/board/note_card.tsx` to hold the edit mode. The `editing` flag is local
    `useState` — requirements **D9**: state that must survive a refresh belongs to the reducer,
    ephemeral interaction state does not.

```tsx
const [editing, setEditing] = useState(startEditing)
const save = useDebounceCallback(
  (body: string) => dispatch({ type: 'edit_body', id: note.id, body, at: Date.now() }),
  AUTOSAVE_MS,
)
```

    Not editing — a real `<button>`, never a `div` with an `onClick`:

```tsx
<button
  type="button"
  onClick={() => setEditing(true)}
  className="w-full cursor-text text-left text-sm leading-relaxed whitespace-pre-wrap"
>
  {note.body === '' ? <span className="text-ink-soft">Empty note</span> : note.body}
</button>
```

    The placeholder is rendered, never stored. An empty note's `body` stays `''`.

    Editing — uncontrolled, so a keystroke re-renders one note instead of the board and the caret
    cannot jump:

```tsx
<textarea
  autoFocus
  defaultValue={note.body}
  aria-label="Note text"
  rows={4}
  className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none field-sizing-content min-h-24 max-h-72"
  onChange={(event) => save(event.target.value)}
  onBlur={(event) => {
    save.cancel()
    dispatch({ type: 'edit_body', id: note.id, body: event.target.value, at: Date.now() })
    setEditing(false)
  }}
  onKeyDown={(event) => {
    if (event.key === 'Escape') event.currentTarget.blur()
  }}
/>
```

    Blur cancels the pending debounce and dispatches immediately, so the last keystroke before
    leaving a note is never the one that is lost. Escape blurs rather than setting state directly —
    one exit path, so the save cannot be skipped by choosing the wrong one.

    **`startEditing` is an initial value, not a binding**, and the blur path is what keeps only one
    note open. Creating a second note while the first is still open mounts a textarea with
    `autoFocus`, which blurs the first — firing its `onBlur`, saving it, and closing it. That
    cascade is load-bearing: **T15** asserts exactly one textarea exists after a second note is
    created. If a future change makes the new textarea focus lazily (in an effect after paint, say),
    two notes will sit open at once and that test is what will say so.

6.3 `field-sizing-content` grows the textarea to its content; `min-h-24` and `max-h-72` are the sane
    bounds, and they are also the whole behaviour in a browser that does not support it. If step 0.3
    found the class emits nothing, delete it and say so in the commit message rather than leaving a
    dead class in the file.

6.4 `npm run build && npm run lint && npm test` — clean.

6.5 Manual check before committing: create a note, type, click the board, reload. The text is there.
    This is the mission's one-sentence test and this is the first commit at which it passes.

6.6 Commit: `feat(board): edit note text in place with debounced autosave`

---

## 7. Pin, delete, and the quiet control layer

7.1 Write the § T17 and § T18 assertions in `src/__tests__/note_controls.test.tsx` first. T17 is the
    mission-critical one: pinning must not move a note.

7.2 Create `src/components/board/note_controls.tsx`:

```tsx
import { Pin, PinOff, Trash2 } from 'lucide-react'

import { useNotesDispatch } from '@/context/use_notes'
import type { Note } from '@/types/note'

// mission.md principle 4: per-note controls appear on the note you're touching, not on all
// of them at once. D10 — opacity-0 leaves a button focusable but invisible, so
// group-focus-within and focus-visible bring it back for the keyboard. T18 asserts it.
const CONTROL =
  'rounded-sm p-1 text-ink-soft transition-opacity duration-(--duration-hover) ease-out hover:text-ink group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring'

export function NoteControls({ note }: { note: Note }) {
  const dispatch = useNotesDispatch()

  return (
    <div className="absolute top-1 right-1 flex gap-1">
      <button
        type="button"
        aria-pressed={note.pinned}
        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
        onClick={() => dispatch({ type: 'toggle_pin', id: note.id, at: Date.now() })}
        // A pinned note stays visibly pinned with nothing hovering it — otherwise the only
        // way to find out what is pinned is to point at every note in turn.
        className={`${CONTROL} ${note.pinned ? 'text-ink opacity-100' : 'opacity-0'}`}
      >
        {note.pinned ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
      </button>
      <button
        type="button"
        aria-label="Delete note"
        onClick={() => dispatch({ type: 'delete', id: note.id })}
        className={`${CONTROL} opacity-0 hover:text-destructive`}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  )
}
```

    Delete is immediate and there is no undo — accepted for this phase, named in
    [requirements.md](./requirements.md) § Risks, guarded by an `alert-dialog` in P12. The two
    buttons sit a full `gap-1` apart so the destructive one is not adjacent by accident.

7.3 Add `group` and `relative` to the `<article>` in `note_card.tsx` — the control layer is
    positioned against it, and `group-hover` needs the class on the same element. Render
    `<NoteControls note={note} />` as the article's first child.

7.4 Confirm the reduced-motion block in `src/index.css` still covers everything this group animates.
    It permits `opacity` transitions on `[data-slot='note-card']`; the controls animate opacity only
    and inherit nothing else. **No edit to `index.css` should be needed in this phase.** If one is,
    something animated a transform, and that is the thing to reconsider.

7.5 `npm run build && npm run lint && npm test` — clean.

7.6 Commit: `feat(board): add per-note pin and delete controls`

---

## 8. Constitution amendments and the README

Documentation last, describing what shipped rather than what was intended. All of it lands in this
phase's commit; **Gate 4 rejects the PR without it.**

8.1 `specs/roadmap.md` — rewrite the P2 section:

```md
## P2 · Real notes, remembered

**Goal:** the app becomes genuinely usable — capture a thought, and find it there tomorrow.

- `src/types/note.ts` with the committed `Note` and `BoardState` types, whole. `mock_notes.ts`
  is deleted.
- `notes_reducer.ts` — pure, handling `add`, `edit_body`, `toggle_pin`, and `delete`. Ids,
  tilt, spawn position and timestamps are generated in `lib/note_factory.ts` and arrive in the
  action, so the reducer never calls `Date.now()` or `Math.random()`.
- `notes_context.tsx` with split state/dispatch providers; the reducer is the source of truth
  and `localStorage` is a debounced mirror.
- The board persisted under `sticky-notes:board:v1`, the sidebar collapse under
  `sticky-notes:sidebar`, both through `useLocalStorage`. Bad JSON or a wrong `version` loads
  an empty board rather than white-screening.
- A six-swatch paper palette in the sidebar: one click puts a note on the board in that
  colour, at a randomized position, with a stored tilt, focused and ready for typing.
- Click a note — or focus it and press Enter — to edit in place in a plain `<textarea>`.
  Autosave debounced on change, immediate on blur. No Save button.
- Per-note pin and delete controls, revealed on hover or focus of that note only. Pinned notes
  render above unpinned ones without their position, array order, or `z` changing.

**Done when:** a thought can be captured in one click and typing, notes survive a hard refresh
and a browser restart with identical colours, tilts and stacking, pinned notes are still on top
afterwards, and corrupting the localStorage value by hand loads an empty board instead of
white-screening.
```

8.2 `specs/roadmap.md` — replace the bodies of P3 and P4 with tombstones. **Do not delete the
    headings and do not renumber anything** (requirements **D1**): P0's and P1's specs reference
    later phases by number, and renumbering would silently repoint them.

```md
## P3 · It remembers — *absorbed into P2*

Persistence shipped with P2: `sticky-notes:board:v1`, `sticky-notes:sidebar`, the ~300ms write
debounce, and the defensive read. This heading is kept so that phase numbers written into P0's
and P1's specs still resolve. Nothing is scheduled here.

## P4 · Write on them — *absorbed into P2*

Inline editing with debounced autosave shipped with P2. Markdown rendering was never P4's — it
is still **P10**. Nothing is scheduled here.
```

8.3 `specs/roadmap.md` — reduce P6 to what is left of it:

```md
## P6 · Change a note's colour

**Goal:** a note can be recoloured after it exists.

- shadcn `dropdown-menu` (or `popover`) as a per-note colour picker across the six papers.

**Done when:** a note's colour can be changed without recreating it, and the change persists.

P2 shipped the rest of the original P6: colour is chosen at creation from the sidebar palette,
pinning works, and per-note controls already appear on hover or focus of that note alone.
```

8.4 `specs/tech-stack.md` — four edits.

- **Persistence contract**, first bullet. Add the sidebar key, which is now real:

```md
- Board key: `sticky-notes:board:v1` · Sidebar key: `sticky-notes:sidebar` · Theme key: `sticky-notes:theme` (P11)
```

- **State architecture**, the sentence *"Every action stamps `updatedAt`."* Replace with:

```md
The reducer is pure and imports nothing from React. Every mutating action **carries** the
timestamp it stamps: ids, tilt, spawn position and `Date.now()` are resolved in
`lib/note_factory.ts` at the dispatch site, so the reducer is a function of its arguments and
its tests need no fake timers.
```

- **State architecture**, the file tree. It already names `notes_context.tsx`,
  `notes_reducer.ts`, `use_notes.ts` and `types/note.ts` as P2 — correct as written. Three
  corrections and two additions:

```
  context/
    notes_context.tsx    // the provider component only — nothing else exported
    notes_reducer.ts     // pure reducer — unit-testable, no React imports
    use_notes.ts         // the two contexts and their consumer hooks
  components/
    board/
      note_controls.tsx  // per-note pin and delete                             (was P6)
  lib/
    board_storage.ts     // storage keys and the defensive read
    note_factory.ts      // ids, tilt, spawn position, timestamps
    paper.ts             // NoteColor -> bg-paper-* , written out for the scanner
```

  Delete the `mock_notes.ts` line and the `note_toolbar.tsx` line — the first no longer exists,
  and the second shipped as `note_controls.tsx`. The tree is the claim and the code is the fact;
  if they disagree after group 7, correct the tree.

- **Data model.** Verify `src/types/note.ts` matches this file byte-for-byte in substance. It
  should, because **D3** shipped the shape whole. `NOTE_COLORS` and `NoteSeed` are additions to the
  module, not to `BoardState`, and nothing persisted changed — so `version` stays `1` and there is
  no migration. Note that in the file if it is not already obvious.

8.5 `README.md` — replace the **Status** paragraph:

```md
## Status

P2 (*real notes, remembered*) is complete: notes are created from a six-colour paper palette in
the sidebar, written on in place with debounced autosave, pinned, and deleted. The board and the
sidebar collapse both persist to `localStorage` through the contract, and a corrupt stored value
loads an empty board rather than white-screening. Board state is a pure reducer behind split
state and dispatch contexts. Notes cannot be moved yet — P5 makes the board spatial.
```

8.6 Re-read [validation.md](./validation.md) § Gate 4 and tick every box against the actual diff.

8.7 `npm run build && npm run lint && npm test` — clean.

8.8 Commit: `docs: fold persistence and editing into P2 and correct the state architecture`

**Leaves:** the constitution describing the codebase that exists.

---

## Landing

- Branch: `feat/p2-real-notes-remembered` off `develop`.
- Run Gate 3 manually before opening the PR — `npm run dev`, walk the checklist, including the
  browser-restart pass, the hand-corrupted `localStorage` pass, and the reduced-motion pass.
- Open a PR **targeting `develop`**, not `main`, with the Gate 3 boxes ticked in the description.
- Squash to **one commit** on merge (roadmap rule: one phase, one commit).
- Merge criteria are in [validation.md](./validation.md) § Merged means.
