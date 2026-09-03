import { createContext, use } from 'react'

import type { Note } from '@/types/note'

/**
 * Asking to delete a note, from anywhere.
 *
 * There are two entry points — the card's own delete control and the note view's — and exactly
 * **one** confirmation dialog, mounted once in the shell. The alternative was an `AlertDialog` per
 * card, which on a hundred-note board is a hundred Radix layers waiting to be used once.
 *
 * `requestDelete` is the whole interface. Whether it asks first is `lib/notes.ts`'s
 * `hasContent`'s business, and neither caller needs to know.
 *
 * Split from its provider for the same reason `use_notes.ts` is: a module exporting both a
 * component and a hook trips react-refresh/only-export-components.
 */
export interface DeleteNote {
  requestDelete: (note: Note) => void
}

export const DeleteNoteContext = createContext<DeleteNote | null>(null)

export function useDeleteNote(): DeleteNote {
  const value = use(DeleteNoteContext)
  if (value === null) throw new Error('useDeleteNote must be used inside <DeleteNoteProvider>')
  return value
}
