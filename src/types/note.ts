// The six papers. Declared as a const tuple so NoteColor cannot drift from the array the
// palette iterates — one edit changes both.
export const NOTE_COLORS = ['butter', 'apricot', 'rose', 'lilac', 'sky', 'mint'] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string // crypto.randomUUID()
  body: string // raw markdown; #tags live inline in this text
  color: NoteColor
  x: number // px from board origin, top-left of the note
  y: number
  z: number // stacking order; click sets it to max + 1                              (P5)
  tilt: number // -3..3 degrees, assigned once at creation, never recomputed
  pinned: boolean
  createdAt: number // epoch ms
  updatedAt: number // epoch ms
}

export interface BoardState {
  version: 1
  notes: Note[]
}

// Everything impure about creating a note, resolved before the reducer sees it. The reducer
// is a function of its arguments; ids, tilt, spawn position and the clock live in
// lib/note_factory.ts at the dispatch site.
export interface NoteSeed {
  id: string
  color: NoteColor
  body: string
  x: number
  y: number
  tilt: number
  at: number
}

export const EMPTY_BOARD: BoardState = { version: 1, notes: [] }
