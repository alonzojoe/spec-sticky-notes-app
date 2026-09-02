import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DeleteNoteContext } from '@/context/use_delete_note'
import { useNotesDispatch } from '@/context/use_notes'
import { useOpenNote } from '@/context/use_open_note'
import { hasContent } from '@/lib/notes'
import type { Note } from '@/types/note'

/**
 * One confirmation for the whole board.
 *
 * Deleting can be asked for from a card or from the note's own view, and both land here. Mounting
 * it once rather than per card is the point: a hundred notes would otherwise be a hundred Radix
 * layers, each waiting for a click it will almost certainly never get.
 *
 * **It is not a Save button.** Principle 3 forbids a control standing between you and *persisting*
 * what you wrote; this stands between you and destroying it, and `mission.md` puts delete
 * confirmation in scope by name.
 */
export function DeleteNoteProvider({ children }: { children: ReactNode }) {
  const dispatch = useNotesDispatch()
  const { openId, setOpenId } = useOpenNote()
  const [pending, setPending] = useState<Note | null>(null)

  const remove = useCallback(
    (note: Note) => {
      dispatch({ type: 'delete', id: note.id })
      // If the note being deleted is the one open for reading, the view has nothing left to show.
      // Clearing the id rather than letting it dangle keeps `openId` honest.
      if (openId === note.id) setOpenId(null)
    },
    [dispatch, openId, setOpenId],
  )

  const requestDelete = useCallback(
    (note: Note) => {
      // An empty note has nothing to lose, and a confirmation for it is a click that protects
      // nothing — see `hasContent`. It is also the note you get by pressing `n` and changing your
      // mind, which is the most common thing anyone deletes.
      if (hasContent(note)) setPending(note)
      else remove(note)
    },
    [remove],
  )

  const value = useMemo(() => ({ requestDelete }), [requestDelete])

  return (
    <DeleteNoteContext value={value}>
      {children}

      <AlertDialog open={pending !== null} onOpenChange={(next) => !next && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pending?.title === '' ? 'this note' : `“${pending?.title}”`}?
            </AlertDialogTitle>
            {/* Four words. The original — "the notes after it close the gap" — described the
                animation the user is about to watch happen, which is the one thing they do not
                need telling. Naming the absent trash was the next draft and was still more than
                the moment needs: the title already says which note, and this says the only other
                thing that matters. */}
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Cancel holds the default focus, so Enter on a dialog you did not read cancels
                rather than deletes. That is the difference between a guard and a speed bump. */}
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            {/* "Delete", never "OK". A destructive confirmation that says OK is one nobody
                reads. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pending !== null) remove(pending)
                setPending(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DeleteNoteContext>
  )
}
