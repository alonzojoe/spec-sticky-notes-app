// The six papers. Declared as a const tuple so NoteColor cannot drift from the array the
// palette iterates — one edit changes both.
export const NOTE_COLORS = ['butter', 'apricot', 'rose', 'lilac', 'sky', 'mint'] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string // crypto.randomUUID()
  body: string // raw markdown; #tags live inline in this text
  color: NoteColor
  // Stored ISO `YYYY-MM-DD`, shown `MM/DD/YYYY`. lib/dates.ts owns both directions and never
  // builds a Date from a stored value — see the comment there for why that matters.
  date: string
  // Higher is EARLIER in the grid. The board sorts descending, so slot 0 holds the largest
  // stamp. Nothing renumbers: a dense grid falls out of ranking a sparse sequence, so a
  // delete closes its gap at render rather than by rewriting every note after it.
  order: number
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
  date: string
  order: number
  at: number
}

export const EMPTY_BOARD: BoardState = { version: 1, notes: [] }
