import { useDebounceCallback } from 'usehooks-ts'

import { DateField } from '@/components/layout/date_field'
import { PaperRadiogroup } from '@/components/layout/paper_radiogroup'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotesDispatch } from '@/context/use_notes'
import type { Note, NoteColor } from '@/types/note'

const AUTOSAVE_MS = 300

/**
 * A note, opened. P6 moved reading and editing off the card and into here, which is the third
 * amendment to mission.md principle 2 and the one that left nothing of the original standing.
 *
 * What did NOT get amended is principle 3: "There is no Save button. State is written as it
 * changes." So this dialog has no Save and no Cancel — it saves exactly as the card used to,
 * and Done, Escape and the close control all take the same path. A Save button would create
 * the state where what is on screen is not what is stored, which is the state the persistence
 * contract exists to prevent, and there would be nothing to cancel anyway.
 */
export function NoteViewDialog({
  note,
  onOpenChange,
}: {
  note: Note | null
  onOpenChange: (open: boolean) => void
}) {
  const dispatch = useNotesDispatch()

  const save = useDebounceCallback(
    (id: string, body: string) => dispatch({ type: 'edit_body', id, body, at: Date.now() }),
    AUTOSAVE_MS,
  )

  if (note === null) return null

  const close = (body: string) => {
    // Cancel the pending debounce and write now, so the last keystroke before closing is never
    // the one that is lost.
    save.cancel()
    dispatch({ type: 'edit_body', id: note.id, body, at: Date.now() })
    onOpenChange(false)
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (next) return
        // Escape and the close control land here rather than on the Done button, so every
        // dismissal saves through the same path.
        const textarea = document.querySelector<HTMLTextAreaElement>('[data-slot="note-body"]')
        close(textarea?.value ?? note.body)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Note</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <DateField
            value={note.date}
            // Not debounced: a date is picked, not typed, so there is no keystroke storm to
            // absorb and no reason to leave the store behind the screen.
            onChange={(date) => dispatch({ type: 'set_date', id: note.id, date, at: Date.now() })}
          />

          <PaperRadiogroup
            value={note.color}
            onChange={(color: NoteColor) =>
              dispatch({ type: 'set_color', id: note.id, color, at: Date.now() })
            }
          />

          <textarea
            // Keyed on the note id. The dialog does not unmount between notes the way the card
            // did, so without this an uncontrolled textarea would keep showing the previous
            // note's text.
            key={note.id}
            autoFocus
            data-slot="note-body"
            defaultValue={note.body}
            aria-label="Note text"
            rows={10}
            placeholder="Write the note…"
            className="field-sizing-content max-h-96 min-h-40 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => save(note.id, event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={(event) => {
              const dialog = event.currentTarget.closest('[data-slot="dialog-content"]')
              const textarea = dialog?.querySelector<HTMLTextAreaElement>('[data-slot="note-body"]')
              close(textarea?.value ?? note.body)
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
