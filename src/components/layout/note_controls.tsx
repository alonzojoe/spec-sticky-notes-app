import { Pin, PinOff, Trash2 } from 'lucide-react'

import { useNotesDispatch } from '@/context/use_notes'
import type { Note } from '@/types/note'

/**
 * Pin and delete, in the note's own view.
 *
 * P2 put these on the card, when the card was the editor and acting on a note meant acting on the
 * card. P9 moved them here and moved nothing else: the `aria-pressed` toggle and the pin/unpin
 * labelling were already right and already tested, so the component travelled whole rather than
 * being rewritten at its destination.
 *
 * What did NOT travel is the `stopPropagation` wrapper. On the card it existed because the thing
 * underneath was both a click target and a drag handle; a dialog footer is neither, and keeping it
 * would have been a defence against a collision that no longer exists.
 *
 * **Pinning does not close the view.** It is a property of the note like its colour, and P6
 * established that changing those happens with the view open. Deleting does close it, because the
 * note it was showing is gone — that lives in the dialog, not here, since this component does not
 * know it is in one.
 */
/**
 * No opacity choreography. On the card these hid until hover, which is what principle 4 used to
 * ask for; inside a dialog the user opened deliberately, a control that appears only on hover is
 * one they have to hunt for.
 */
const CONTROL =
  'rounded-md p-2 text-ink-soft transition-colors duration-(--duration-hover) ease-out focus-visible:outline-2 focus-visible:outline-ring'

export function NoteControls({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const dispatch = useNotesDispatch()

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        data-testid="pin"
        aria-pressed={note.pinned}
        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
        onClick={() => dispatch({ type: 'toggle_pin', id: note.id, at: Date.now() })}
        // Always visible here. On the card these hid until hover, which is what principle 4
        // used to ask for; in a dialog the user opened deliberately, a control that appears only
        // on hover is a control they have to hunt for.
        className={`${CONTROL} ${note.pinned ? 'text-ink' : 'hover:text-ink'}`}
      >
        {note.pinned ? (
          <PinOff className="size-4" aria-hidden />
        ) : (
          <Pin className="size-4" aria-hidden />
        )}
      </button>

      {/* Delete is immediate and there is no undo — accepted for this phase, guarded by an
          alert-dialog in P10. A full gap-1 keeps the destructive control from sitting flush
          against the one next to it. */}
      <button
        type="button"
        data-testid="delete"
        aria-label="Delete note"
        onClick={onDelete}
        className={`${CONTROL} hover:text-destructive`}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  )
}
