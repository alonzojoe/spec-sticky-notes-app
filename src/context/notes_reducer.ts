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
      // Appended, never unshifted. Array order is DOM order and therefore tab order; stacking
      // is carried by `z`, so nothing here needs to reorder to put a note on top.
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
