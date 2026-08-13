import { Pin, PinOff, Trash2 } from 'lucide-react'

import { useNotesDispatch } from '@/context/use_notes'
import type { Note } from '@/types/note'

// mission.md principle 4: per-note controls appear on the note you're touching, not on all of
// them at once. opacity-0 leaves a button focusable but invisible, so group-focus-within and
// focus-visible bring it back for the keyboard — without them, tabbing lands on something
// nobody can see, which is a defect rather than a style choice.
const CONTROL =
  'rounded-sm p-1 text-ink-soft transition-opacity duration-(--duration-hover) ease-out group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring'

export function NoteControls({ note }: { note: Note }) {
  const dispatch = useNotesDispatch()

  return (
    <div className="absolute top-1 right-1 flex gap-1">
      <button
        type="button"
        data-testid="pin"
        aria-pressed={note.pinned}
        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
        onClick={() => dispatch({ type: 'toggle_pin', id: note.id, at: Date.now() })}
        // A pinned note stays visibly pinned with nothing hovering it — otherwise the only
        // way to find out what is pinned is to point at every note in turn.
        className={`${CONTROL} ${note.pinned ? 'text-ink opacity-100' : 'opacity-0 hover:text-ink'}`}
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
        onClick={() => dispatch({ type: 'delete', id: note.id })}
        className={`${CONTROL} opacity-0 hover:text-destructive`}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  )
}
