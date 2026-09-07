import { useEffect, useReducer, type ReactNode } from 'react'
import { useDebounceCallback, useLocalStorage } from 'usehooks-ts'

import { notesReducer } from '@/context/notes_reducer'
import { NotesDispatchContext, NotesStateContext } from '@/context/use_notes'
import { BOARD_KEY, hydrate, parseStored } from '@/lib'
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

  /**
   * Cancelling the pending write on unmount, because the library does not.
   *
   * `useDebounceCallback` builds two debounced functions: the memoised one it actually calls, and
   * a second one it assigns to a ref inside an effect. Its unmount handler cancels the ref — the
   * copy that was never invoked — so the write in flight belongs to the instance nothing cancels
   * and lands up to 300ms after the provider is gone.
   *
   * In the app that is invisible: `NotesProvider` is mounted by the layout route and unmounts only
   * when the page does, and a page being torn down loses a pending write either way. In the suite
   * it is a real defect, and it is the kind that only ever fails *another* test — a board from one
   * test landing in `localStorage` while the next one is asserting against its own. P13 found it
   * that way, in T71 and T77.
   *
   * `persist` is stable — `setStored` comes from `useEventCallback` and the delay is a constant —
   * so this runs on unmount and at no other time.
   */
  useEffect(() => () => persist.cancel(), [persist])

  return (
    <NotesStateContext value={board}>
      <NotesDispatchContext value={dispatch}>{children}</NotesDispatchContext>
    </NotesStateContext>
  )
}
