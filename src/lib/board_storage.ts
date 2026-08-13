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
 * The persistence contract's defensive read. Anything that is not exactly a version-1 board
 * of well-formed notes becomes an empty board. One malformed note rejects the whole value
 * rather than being dropped: a board silently missing a note is worse than a board that is
 * visibly empty, because the first looks like it worked.
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
