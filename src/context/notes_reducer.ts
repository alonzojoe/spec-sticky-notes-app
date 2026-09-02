import type { BoardState, Note, NoteColor, NoteSeed } from '@/types/note'

export type NoteAction =
  | { type: 'add'; seed: NoteSeed }
  | { type: 'edit_body'; id: string; body: string; at: number }
  | { type: 'edit_title'; id: string; title: string; at: number }
  | { type: 'set_link'; id: string; link: string; at: number }
  | { type: 'set_date'; id: string; date: string; at: number }
  | { type: 'set_color'; id: string; color: NoteColor; at: number }
  | { type: 'toggle_pin'; id: string; at: number }
  | { type: 'swap_order'; a: string; b: string; at: number }
  | { type: 'delete'; id: string }

export function notesReducer(state: BoardState, action: NoteAction): BoardState {
  switch (action.type) {
    case 'add': {
      // Destructured rather than spread: `seed.at` is not a Note field and must not leak in.
      const { id, color, title, body, link, date, order, at } = action.seed
      const note: Note = {
        id,
        title,
        body,
        link,
        color,
        date,
        order,
        pinned: false,
        createdAt: at,
        updatedAt: at,
      }
      // Appended, never unshifted. Array order is DOM order and therefore tab order; the
      // grid position is carried by `order`, so nothing here needs to reorder the array to
      // put a note in the first slot.
      return { ...state, notes: [...state.notes, note] }
    }

    case 'edit_body':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, body: action.body, updatedAt: action.at } : note,
        ),
      }

    // None of these reorders anything. mission.md principle 1 survived P5 with one clause
    // intact — the board reorders on create, delete and pin and on nothing else — and a date, a
    // colour, a title or a link must not be the thing that finally breaks it.
    case 'edit_title':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, title: action.title, updatedAt: action.at } : note,
        ),
      }

    // The link arrives already through normalizeLink — see lib/links.ts. The reducer stores what
    // it is given, so there is exactly one place a URL is judged rather than two that drift.
    case 'set_link':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, link: action.link, updatedAt: action.at } : note,
        ),
      }

    case 'set_date':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, date: action.date, updatedAt: action.at } : note,
        ),
      }

    case 'set_color':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, color: action.color, updatedAt: action.at } : note,
        ),
      }

    case 'toggle_pin':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, pinned: !note.pinned, updatedAt: action.at } : note,
        ),
      }

    case 'swap_order': {
      // Two stamps trade places and nothing else is touched — this is how the order is
      // edited, so both notes' updatedAt move with it. A no-op swap and an id that is not on
      // the board both return the state unchanged rather than throwing: the drop handler hit
      // tests against rendered geometry, and a stale id is a miss, not a bug worth crashing
      // the board over.
      if (action.a === action.b) return state
      const a = state.notes.find((note) => note.id === action.a)
      const b = state.notes.find((note) => note.id === action.b)
      if (a === undefined || b === undefined) return state

      return {
        ...state,
        notes: state.notes.map((note) => {
          if (note.id === a.id) return { ...note, order: b.order, updatedAt: action.at }
          if (note.id === b.id) return { ...note, order: a.order, updatedAt: action.at }
          return note
        }),
      }
    }

    // Nothing renumbers. See the `order` comment in types/note.ts.
    case 'delete':
      return { ...state, notes: state.notes.filter((note) => note.id !== action.id) }
  }
}
