import type { NoteColor } from '@/types/note'

/**
 * The three notes this app was first drawn around.
 *
 * P1 wrote them to prove the visual language — layered shadow, grain, paper colour — and P2 deleted
 * them the moment the board became real state. They are the only notes this app has ever shipped
 * with, and P14 is the first phase that can produce an empty board on purpose, which is exactly the
 * moment you want to see them again.
 *
 * **Content, not notes.** No id, no `order`, no `createdAt`, no `date`. P1's fixture also carried
 * `x`, `y` and a literal `tilt`, and all three are fields the data model dropped when P5 replaced
 * the freeform board with a grid — `board_storage.ts` still drops them on read. What survives a
 * phase is the writing, so what comes back is the writing.
 *
 * Each becomes a real note through `createNoteSeed` at the call site, exactly the way the create
 * dialog makes one: a UUID, a clock reading, today's date, and a stamp above every existing note.
 * **They are notes, not a demo mode** — editable, pinnable, draggable, deletable, and
 * indistinguishable from anything you write yourself the moment they land.
 */
export interface SampleNote {
  color: NoteColor
  title: string
  body: string
}

/**
 * First in this list takes the first slot, which costs the caller a reverse: the board sorts
 * `order` descending, so the note dispatched last is the one that sorts first.
 */
export const SAMPLE_NOTES: readonly SampleNote[] = [
  {
    color: 'butter',
    title: 'Where it sits is what it means',
    body: 'Where a note sits is part of what it means.',
  },
  {
    color: 'sky',
    title: 'Pick it up, put it down',
    body: 'Pick it up, move it, put it down.\nThe board stays where you left it.',
  },
  {
    color: 'rose',
    title: 'No save button',
    body: 'No save button.',
  },
]
