import { createContext, use, type Dispatch } from 'react'

import type { NoteAction } from '@/context/notes_reducer'
import type { BoardState } from '@/types/note'

// The contexts live here rather than beside the provider component: a module exporting both a
// component and a hook trips react-refresh/only-export-components, and P1 scoped that rule off
// for src/components/ui/** only. Widening the exemption to our own code to avoid a file split
// would be the wrong fix.
export const NotesStateContext = createContext<BoardState | null>(null)
export const NotesDispatchContext = createContext<Dispatch<NoteAction> | null>(null)

// Split state and dispatch: components that only mutate never re-render when the board
// changes, which is what makes Context viable at 100+ notes.
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
