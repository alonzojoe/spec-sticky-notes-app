// The six papers. Declared as a const tuple so NoteColor cannot drift from the array the
// palette iterates — one edit changes both.
export const NOTE_COLORS = ['butter', 'apricot', 'rose', 'lilac', 'sky', 'mint'] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

// The sections of the board, which are also its routes. `notes` draws every note; `pinned` and
// `linked` draw the ones that answer a question about themselves. What each of them *means* lives
// in `lib/sections.ts` — this union is only the set of names, so a registry row for a section that
// does not exist fails to compile.
//
// A section changes what is on screen and never what is stored: no note's `order`, `pinned` or
// `link` is written by navigating, which is what mission.md principle 1's section sentence
// promises.
export type BoardSection = 'notes' | 'pinned' | 'linked'

export interface Note {
  id: string // crypto.randomUUID()
  // One line, shown under the date on the card and clamped there. `''` when the note has no
  // title — not optional, not null. Every reader would otherwise need a fallback and one of them
  // would forget, which is the same reason `body` has always been `''`.
  title: string
  body: string // raw markdown; #tags live inline in this text
  // One URL, already normalised: `lib/links.ts` is the only thing that judges a link, and what
  // is stored here has been through it. `''` when the note has no link. Never trust it blindly
  // anyway — board_storage.ts re-checks the scheme on read, because a value can arrive from a
  // hand-edited localStorage rather than from the field.
  link: string
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
  title: string
  body: string
  link: string
  date: string
  order: number
  at: number
}

export const EMPTY_BOARD: BoardState = { version: 1, notes: [] }
