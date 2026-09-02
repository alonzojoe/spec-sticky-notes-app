import { createContext, use, type Dispatch, type SetStateAction } from 'react'

/**
 * Which note is open for reading and editing, or `null`.
 *
 * The id, never the note. P6 chose that in `board.tsx` and the reason survives the move: an id
 * is always a live lookup, where a stored note object would be a stale copy of one that has
 * since been edited, recoloured or redated.
 *
 * P8 lifted this out of `board.tsx` because the search palette lives in the toolbar and has to
 * be able to open a note too. Drilling a prop from the shell was the alternative — it would have
 * left the shell holding state it never reads and `board.tsx` taking a prop it also sets.
 *
 * Split from its provider for the same reason `use_notes.ts` is: a module exporting both a
 * component and a hook trips react-refresh/only-export-components.
 */
export interface OpenNote {
  openId: string | null
  setOpenId: Dispatch<SetStateAction<string | null>>
}

export const OpenNoteContext = createContext<OpenNote | null>(null)

export function useOpenNote(): OpenNote {
  const value = use(OpenNoteContext)
  if (value === null) throw new Error('useOpenNote must be used inside <OpenNoteProvider>')
  return value
}
