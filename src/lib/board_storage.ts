import { isISODate, isoFromEpoch } from '@/lib/dates'
import { EMPTY_BOARD, NOTE_COLORS, type BoardState, type Note } from '@/types/note'

export const BOARD_KEY = 'sticky-notes:board:v1'
export const SIDEBAR_KEY = 'sticky-notes:sidebar'

/**
 * A stored note before P5's `order` is guaranteed. Everything except the ordering is required
 * exactly as it always was — a board that is malformed in any other way is still rejected
 * whole.
 */
type StoredNote = Omit<Note, 'order' | 'date'> & { order?: unknown; date?: unknown }

const isNote = (value: unknown): value is StoredNote => {
  if (typeof value !== 'object' || value === null) return false
  const note = value as Record<string, unknown>
  return (
    typeof note.id === 'string' &&
    typeof note.body === 'string' &&
    typeof note.color === 'string' &&
    (NOTE_COLORS as readonly string[]).includes(note.color) &&
    typeof note.pinned === 'boolean' &&
    typeof note.createdAt === 'number' &&
    typeof note.updatedAt === 'number'
  )
}

/**
 * The first half of the defensive read, and the reason it is ours rather than the library's:
 * `useLocalStorage`'s default deserializer catches its own parse error and `console.error`s
 * it. That leaves a corrupt value writing to the console on every load, which fails the
 * clean-console bar — and hands the failure path to a dependency. Unparseable becomes `null`
 * here, and `hydrate` turns `null` into an empty board like any other wrong shape.
 */
export const parseStored = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Same guard for the sidebar's boolean: anything that is not a stored `false` is open. */
export const parseSidebarOpen = (raw: string): boolean => parseStored(raw) !== false

/**
 * P5's migration, and the reason `version` did not have to move to 2.
 *
 * A board written before P5 carries `x`, `y`, `z` and `tilt`, and no `order`. Rather than a second storage
 * key and a migration branch maintained forever for a fix that runs once, the read repairs
 * what it finds: notes lacking a numeric `order` are stamped newest-first by `createdAt`, so
 * the board a user comes back to obeys the same rule the grid enforces from then on. `x` and
 * `y`, `z` and `tilt` are dropped on the way through — the read reconstructs the note object, so
 * there is nowhere for them to survive.
 *
 * This is a schema change under an unchanged version number, and requirements.md § Risks says
 * so plainly: a board written by this build and read by a pre-P5 build would render every
 * note at `x: undefined`. Nothing ships older builds, so the exposure is a developer checking
 * out an old commit.
 */
/**
 * P6's repair. A note saved before this phase has no `date`; one saved by a build in between
 * might have a malformed one. Either way it is derived from `createdAt`, because a malformed
 * date is recoverable and losing the whole board over it is not.
 */
const dateOf = (note: StoredNote): string =>
  isISODate(note.date) ? note.date : isoFromEpoch(note.createdAt)

const withOrder = (notes: StoredNote[]): Note[] => {
  if (notes.every((note) => typeof note.order === 'number')) {
    return notes.map((note) => {
      const { id, body, color, pinned, createdAt, updatedAt } = note as Omit<StoredNote, 'date'> & {
        date?: unknown
      }
      return { id, body, color, pinned, createdAt, updatedAt, date: dateOf(note), order: note.order as number }
    })
  }

  // Newest first: the highest stamp goes to the most recently created note, which is slot 0.
  const rank = [...notes].sort((a, b) => a.createdAt - b.createdAt).map((note) => note.id)
  return notes.map((note) => {
    // Rebuilt rather than spread-and-overwritten, so `x` and `y` from a pre-P5 board have
    // nowhere to survive.
    const { id, body, color, pinned, createdAt, updatedAt } = note as Omit<StoredNote, 'date'> & {
        date?: unknown
      }
    return { id, body, color, pinned, createdAt, updatedAt, date: dateOf(note), order: rank.indexOf(id) + 1 }
  })
}

/**
 * The persistence contract's defensive read. Anything that is not exactly a version-1 board
 * of well-formed notes becomes an empty board. One malformed note rejects the whole value
 * rather than being dropped: a board silently missing a note is worse than a board that is
 * visibly empty, because the first looks like it worked.
 *
 * Pure — no writes, no logging. The one repair it does make is `order`, above.
 * useReducer's lazy initialiser runs it twice under StrictMode.
 */
export function hydrate(stored: unknown): BoardState {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return EMPTY_BOARD
  const board = stored as { version?: unknown; notes?: unknown }
  if (board.version !== 1) return EMPTY_BOARD
  if (!Array.isArray(board.notes) || !board.notes.every(isNote)) return EMPTY_BOARD
  return { version: 1, notes: withOrder(board.notes as StoredNote[]) }
}
