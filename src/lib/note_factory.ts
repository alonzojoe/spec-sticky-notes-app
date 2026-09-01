import { todayISO } from '@/lib/dates'
import type { NoteColor, NoteSeed } from '@/types/note'

/**
 * The impure boundary. This is the only place in the app that calls crypto.randomUUID or
 * Date.now for a note — everything downstream of it, the reducer included, is
 * a function of its arguments.
 *
 * P5 emptied this file out. It used to hold a placement search that measured the board and
 * hunted for a spot clear of every existing note; the grid made that unnecessary, and the
 * search was deleted rather than left behind half-used, and the tilt went with mission.md's
 * amended tactility criterion. What is left is an id, a clock reading, and the stamp that
 * puts the note in the first slot.
 */
export function createNoteSeed(
  color: NoteColor,
  topOrder: number,
  body = '',
  date = todayISO(),
): NoteSeed {
  return {
    id: crypto.randomUUID(),
    color,
    body,
    date,
    // Above every existing note, so it takes slot 0. One note is written; the rest move
    // because the derived layout shifted, not because anything rewrote them.
    order: topOrder + 1,
    at: Date.now(),
  }
}

/** The stamp a new note has to beat. An empty board starts at 0. */
export const topOrder = (notes: { order: number }[]): number =>
  notes.reduce((top, note) => Math.max(top, note.order), 0)
