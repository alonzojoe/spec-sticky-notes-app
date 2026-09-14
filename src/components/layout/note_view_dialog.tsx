import { useForm } from '@tanstack/react-form'

import { DateField } from '@/components/layout/date_field'
import { NoteControls } from '@/components/layout/note_controls'
import { FieldLabel, LinkField, TitleField } from '@/components/layout/note_fields'
import { PaperRadiogroup } from '@/components/layout/paper_radiogroup'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDeleteNote } from '@/context/use_delete_note'
import { useNotesDispatch } from '@/context/use_notes'
import { normalizeLink } from '@/lib'
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
  const { requestDelete } = useDeleteNote()

  /**
   * P15. Three fields, each carrying its own autosave, and **the DOM reads are gone.**
   *
   * What this replaced was a `useDebounceCallback` pair plus a `closeFromDOM` that queried
   * `[data-slot="note-body"]` and `#note-view-title` by CSS selector for values the program
   * already had — with a fallback on each, because a selector can stop matching. That existed for
   * a real reason: *read from the DOM at dismissal rather than mirrored into state on every
   * keystroke, which is what keeps typing in a note from re-rendering the board behind it.*
   *
   * The reason is answered rather than ignored. TanStack Form's subscriptions are **per field**, so
   * a keystroke re-renders that field's subtree and neither this dialog nor the board. The board
   * was already protected by the debounce, which is unchanged at `AUTOSAVE_MS`.
   *
   * Closing now reads `form.state.values`, which is current by construction — so *the last
   * keystroke before Escape is never the one that is lost* stops depending on a selector finding a
   * node.
   */
  const form = useForm({
    defaultValues: { title: note.title, body: note.body, link: note.link },
  })

  const commitLink = (value: string) =>
    dispatch({ type: 'set_link', id: note.id, link: value, at: Date.now() })

  /**
   * Deleting is asked for, not done here. `DeleteNoteProvider` owns the one confirmation the whole
   * board shares and it clears `openId` when the note it removes is the open one — so this view
   * closes because its note stopped existing, rather than because it closed itself.
   *
   * The pending autosaves are cancelled first. Writing a body to a note that is about to be
   * removed is work whose only possible effect is a wasted render, and if the delete is cancelled
   * the debounce simply restarts on the next keystroke.
   *
   * Pinning, by contrast, does not close anything: it is a property of the note like its colour,
   * and P6 established those change with the view open.
   */
  const askToDelete = () => {
    // **No autosave to cancel any more, and none needed.** The old pair was cancelled here so a
    // body was not written to a note about to be removed. A field's debounced listener has no
    // public cancel — so a pending write can land after the delete, and it lands nowhere:
    // `edit_body` and `edit_title` map over `state.notes` and touch only the matching id, so a
    // write aimed at a note that no longer exists returns a board with the same contents.
    //
    // That is the reducer's existing behaviour rather than something P15 added, which is exactly
    // why T91 pins it — the property is load-bearing now, and a future reducer change that made a
    // stray write *create* something would be a bug with nothing between it and the board.
    requestDelete(note)
  }

  const close = () => {
    // Write now, so the last keystroke before closing is never the one that is lost. A pending
    // debounced listener may still fire afterwards with the same value, which is harmless: it
    // dispatches an identical body to the same note.
    const { title, body, link } = form.state.values
    dispatch({ type: 'edit_body', id: note.id, body, at: Date.now() })
    dispatch({ type: 'edit_title', id: note.id, title, at: Date.now() })
    commitLink(normalizeLink(link))
    onOpenChange(false)
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(next) => {
        if (next) return
        // Escape and the close control land here rather than on the Done button, so every
        // dismissal saves through the same path.
        close()
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

          {/* The autosave is the field's own business now: a listener per field, debounced by the
              library rather than by a hand-rolled pair this file had to remember to cancel in
              three places. `AUTOSAVE_MS` is unchanged — the debounce is behaviour, and P15
              changes none. */}
          <form.Field
            name="title"
            listeners={{
              onChange: ({ value }) =>
                dispatch({ type: 'edit_title', id: note.id, title: value, at: Date.now() }),
              onChangeDebounceMs: AUTOSAVE_MS,
            }}
          >
            {(field) => (
              <TitleField
                id="note-view-title"
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          <form.Field
            name="body"
            listeners={{
              onChange: ({ value }) =>
                dispatch({ type: 'edit_body', id: note.id, body: value, at: Date.now() }),
              onChangeDebounceMs: AUTOSAVE_MS,
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="note-view-body">Note</FieldLabel>
                <textarea
                  id="note-view-body"
                  autoFocus
                  // Kept as a styling and test hook. **Nothing reads a value through it any more**
                  // — that was `closeFromDOM`, and it is gone.
                  data-slot="note-body"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-label="Note text"
                  rows={10}
                  placeholder="Write the note…"
                  className="field-sizing-content max-h-96 min-h-40 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </form.Field>

          {/* The link keeps its raw draft while you type and commits what `normalizeLink` makes of
              it on blur — `note_fields.tsx` owns that, unchanged. The field holds the draft now
              instead of a `useState` in this file, which is the same arrangement for the same
              reason: closing must be able to reach it, because a dismissal does not reliably blur
              the input first. */}
          <form.Field name="link">
            {(field) => (
              <LinkField
                value={field.state.value}
                onChange={field.handleChange}
                onCommit={commitLink}
                id="note-view-link"
              />
            )}
          </form.Field>
        </div>

        {/* Pin and delete on the left, Done pushed right by the layout rather than sitting
            beside them. P2 made that point about the card's controls — a destructive control
            should not sit flush against its neighbour — and it matters more here, where the
            neighbour is the button you press to leave. */}
        <DialogFooter className="sm:justify-between">
          <NoteControls note={note} onDelete={askToDelete} />
          <Button
            type="button"
            onClick={close}
          >
            Done
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
