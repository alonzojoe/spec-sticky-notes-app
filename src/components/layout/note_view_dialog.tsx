import { useState } from 'react'
import { useDebounceCallback } from 'usehooks-ts'

import { DateField } from '@/components/layout/date_field'
import { NoteControls } from '@/components/layout/note_controls'
import { FieldLabel, LinkField, TitleField } from '@/components/layout/note_fields'
import { PaperRadiogroup } from '@/components/layout/paper_radiogroup'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotesDispatch } from '@/context/use_notes'
import { normalizeLink } from '@/lib/links'
import { hasContent } from '@/lib/notes'
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
 *
 * P7 added the title and the link. The title is typed, so it debounces like the body; the link
 * commits on blur, because normalising per keystroke turns `h` into `https://h`. Both flush
 * through the same `close()` as the body, so the last keystroke before Escape is never the one
 * that is lost.
 */
export function NoteViewDialog({
  note,
  onOpenChange,
}: {
  note: Note | null
  onOpenChange: (open: boolean) => void
}) {
  if (note === null) return null

  // Keyed on the id so every draft in there resets when a different note is opened. The dialog
  // itself does not unmount between notes, so without the key the previous note's title would
  // still be in the field.
  return <NoteView key={note.id} note={note} onOpenChange={onOpenChange} />
}

function NoteView({
  note,
  onOpenChange,
}: {
  note: Note
  onOpenChange: (open: boolean) => void
}) {
  const dispatch = useNotesDispatch()

  // The link's raw draft lives here rather than in the field, so closing the dialog can still
  // reach it — a dismissal does not reliably blur the input first.
  const [link, setLink] = useState(note.link)
  const [confirming, setConfirming] = useState(false)

  const saveBody = useDebounceCallback(
    (body: string) => dispatch({ type: 'edit_body', id: note.id, body, at: Date.now() }),
    AUTOSAVE_MS,
  )
  const saveTitle = useDebounceCallback(
    (title: string) => dispatch({ type: 'edit_title', id: note.id, title, at: Date.now() }),
    AUTOSAVE_MS,
  )

  const commitLink = (value: string) =>
    dispatch({ type: 'set_link', id: note.id, link: value, at: Date.now() })

  /**
   * Deleting closes the view, because the note it was showing no longer exists. Pinning does not —
   * that is a property of the note like its colour, and P6 established those change with the view
   * open.
   *
   * The pending autosaves are cancelled rather than flushed: writing a body to a note that is
   * about to be removed is work whose only possible effect is a wasted render.
   */
  const remove = () => {
    saveBody.cancel()
    saveTitle.cancel()
    dispatch({ type: 'delete', id: note.id })
    onOpenChange(false)
  }

  const requestDelete = () => {
    // An empty note has nothing to lose, and a confirmation for it is a click that protects
    // nothing. See `hasContent` above.
    if (hasContent(note)) setConfirming(true)
    else remove()
  }

  const close = (body: string, title: string) => {
    // Cancel the pending debounces and write now, so the last keystroke before closing is never
    // the one that is lost.
    saveBody.cancel()
    saveTitle.cancel()
    dispatch({ type: 'edit_body', id: note.id, body, at: Date.now() })
    dispatch({ type: 'edit_title', id: note.id, title, at: Date.now() })
    commitLink(normalizeLink(link))
    onOpenChange(false)
  }

  // Both are read from the DOM at dismissal rather than mirrored into state on every keystroke,
  // which is what keeps typing in a note from re-rendering the board behind it.
  const closeFromDOM = (root: Element | Document) => {
    const body = root.querySelector<HTMLTextAreaElement>('[data-slot="note-body"]')
    const title = root.querySelector<HTMLInputElement>('#note-view-title')
    close(body?.value ?? note.body, title?.value ?? note.title)
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (next) return
        // Escape and the close control land here rather than on the Done button, so every
        // dismissal saves through the same path.
        closeFromDOM(document)
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

          <LocalTitle
            defaultValue={note.title}
            onChange={saveTitle}
            id="note-view-title"
          />

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="note-view-body">Note</FieldLabel>
            <textarea
              id="note-view-body"
              autoFocus
              data-slot="note-body"
              defaultValue={note.body}
              aria-label="Note text"
              rows={10}
              placeholder="Write the note…"
              className="field-sizing-content max-h-96 min-h-40 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => saveBody(event.target.value)}
            />
          </div>

          <LinkField
            value={link}
            onChange={setLink}
            onCommit={commitLink}
            id="note-view-link"
          />
        </div>

        {/* Pin and delete on the left, Done pushed right by the layout rather than sitting
            beside them. P2 made that point about the card's controls — a destructive control
            should not sit flush against its neighbour — and it matters more here, where the
            neighbour is the button you press to leave. */}
        <DialogFooter className="sm:justify-between">
          <NoteControls note={note} onDelete={requestDelete} />
          <Button
            type="button"
            onClick={(event) => {
              const dialog = event.currentTarget.closest('[data-slot="dialog-content"]')
              closeFromDOM(dialog ?? document)
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* An alert-dialog rather than the ordinary one: it is `role="alertdialog"`, it puts focus
          on the cancel, and Escape cancels — three things a confirmation built out of `Dialog`
          would only be by accident.

          It is not a Save button. Principle 3 forbids a control standing between you and
          PERSISTING what you wrote; this stands between you and destroying it, and mission.md
          puts delete confirmation in scope by name. */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {note.title === '' ? 'this note' : `“${note.title}”`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The note is removed from the board and the notes after it
              close the gap.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Cancel holds the default focus, so Enter on a dialog you did not read cancels
                rather than deletes. That is the difference between a guard and a speed bump. */}
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            {/* "Delete", never "OK". A destructive confirmation that says OK is one nobody
                reads. */}
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

/**
 * The title's keystrokes are held here rather than in the dialog above, so typing a title
 * re-renders one input instead of the whole view. The store still gets the value through the
 * debounced dispatch, and `close()` reads the DOM node for the final flush.
 */
function LocalTitle({
  defaultValue,
  onChange,
  id,
}: {
  defaultValue: string
  onChange: (title: string) => void
  id: string
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <TitleField
      id={id}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}
