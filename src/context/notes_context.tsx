import { useEffect, useReducer, type ReactNode } from 'react'
import { useDebounceCallback, useLocalStorage } from 'usehooks-ts'

import { notesReducer } from '@/context/notes_reducer'
import { NotesDispatchContext, NotesStateContext } from '@/context/use_notes'
import { BOARD_KEY, hydrate, parseStored } from '@/lib/board_storage'
import { EMPTY_BOARD } from '@/types/note'

// tech-stack.md: "Writes are debounced ~300ms so that typing and dragging don't hammer
// localStorage."
const PERSIST_MS = 300

export function NotesProvider({ children }: { children: ReactNode }) {
  // Typed `unknown` on purpose. Claiming this is a BoardState would be a lie about data that
  // came from outside the program; hydrate is the only thing entitled to make that claim.
  const [stored, setStored] = useLocalStorage<unknown>(BOARD_KEY, EMPTY_BOARD, {
    deserializer: parseStored,
  })

  // Read once, on the first render, so the board is never briefly empty on load.
  const [board, dispatch] = useReducer(notesReducer, stored, hydrate)

  const persist = useDebounceCallback(setStored, PERSIST_MS)

  // The reducer is the source of truth and localStorage is a mirror. The write lives in an
  // effect because the contract forbids writing during a render pass.
  useEffect(() => {
    persist(board)
  }, [board, persist])

  return (
    <NotesStateContext value={board}>
      <NotesDispatchContext value={dispatch}>{children}</NotesDispatchContext>
    </NotesStateContext>
  )
}
