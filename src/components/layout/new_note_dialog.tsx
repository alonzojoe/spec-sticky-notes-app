import { useState } from 'react'

import { DateField } from '@/components/layout/date_field'
import { FieldLabel, LinkField, TitleField } from '@/components/layout/note_fields'
import { PaperRadiogroup } from '@/components/layout/paper_radiogroup'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotes, useNotesDispatch } from '@/context/use_notes'
import { todayISO } from '@/lib/dates'
import { normalizeLink } from '@/lib/links'
import { createNoteSeed, topOrder } from '@/lib/note_factory'
import { NOTE_COLORS, type NoteColor } from '@/types/note'
/**
 * Creation became a deliberate act in P3, which is a change the constitution had to make
 * room for: mission.md principle 2 used to forbid any dialog between the user and a thought,
 * and now scopes that ban to editing a note that already exists. The carve-out is conditional
 * — the keyboard has to be able to open this, fill it, and dismiss it — so the roving-tabindex
 * radiogroup and the Ctrl/Cmd+Enter submit below are the terms of the amendment, not polish.
 *
 * The colour is a default that is usually fine; the text is the thought. So focus opens on the
 * textarea and the swatches are one tab stop away, rather than the six independent tab stops
 * the sidebar palette correctly had — there, each swatch performed an action, and here they
 * are one value being chosen.
 */
export function NewNoteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const dispatch = useNotesDispatch()
  const { notes } = useNotes()

  const [color, setColor] = useState<NoteColor>(NOTE_COLORS[0])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [date, setDate] = useState(todayISO)

  // Recomputed when the dialog opens, not once at mount: a tab left open overnight must not
  // offer yesterday. Adjusted during render rather than in an effect — React's own pattern for
  // "state that depends on a prop changing", and the one the lint rule is pointing at.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDate(todayISO())
  }

  const close = () => {
    onOpenChange(false)
    // Reset on close rather than on submit, so Cancel and Escape clear the draft too. A
    // cancelled draft is not a draft.
    setColor(NOTE_COLORS[0])
    setTitle('')
    setBody('')
    setLink('')
    setDate(todayISO())
  }

  const submit = () => {
    // Read in the handler, never during a render. The new note only needs to beat the
    // highest stamp on the board; where it lands is the grid's business, not this file's.
    // Normalised here as well as on the field's blur: Ctrl/Cmd+Enter submits without ever
    // blurring the link input, so the raw draft is what this reads.
    const seed = createNoteSeed(
      color,
      topOrder(notes),
      body.trim(),
      date,
      title.trim(),
      normalizeLink(link),
    )
    close()
    // Added after the dialog has gone, not with it still up, and the ordering is the whole
    // reason. A note created empty opens focused on the board — board.tsx picks it with
    // `openId` — but a note mounted while the dialog is still mounted lands inside Radix's
    // focus scope, which pulls focus back out of it; the textarea blurs, note_card.tsx's
    // blur handler closes edit mode, and by the time the user looks the note is there and
    // is not ready to type on. One macrotask is imperceptible and puts the note on a board
    // with nothing competing for focus.
    setTimeout(() => dispatch({ type: 'add', seed }), 0)
  }



  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
          <DialogDescription>
            Pick a colour and write the note. It lands on the board when you add it.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          // On the form rather than on the textarea: the keyboard path arrows onto a swatch
          // and has to be able to submit from there too.
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              submit()
            }
          }}
          className="flex flex-col gap-4"
        >
          <DateField value={date} onChange={setDate} />

          <PaperRadiogroup value={color} onChange={setColor} />

          <TitleField value={title} onChange={setTitle} id="new-note-title" />

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="new-note-body">Note</FieldLabel>
            <textarea
              id="new-note-body"
              // Focus stays here, not on the title above it, and that is the mission's call
              // rather than a preference: "can I capture a thought in under two seconds" is the
              // one-sentence test, and a required stop at an optional field fails it. The title
              // is one Shift+Tab away. Same reasoning P3 used for the colour.
              autoFocus
              value={body}
              onChange={(event) => setBody(event.target.value)}
              aria-label="Note text"
              rows={4}
              placeholder="Write the note…"
              // Enter is a newline here, never a submit: a note body is multi-line, and a form
              // that submitted on Enter would put the second line out of reach of the keyboard —
              // exactly what the amended principle 2 promised not to do. Ctrl/Cmd+Enter is
              // handled on the form above.
              className="field-sizing-content max-h-72 min-h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <LinkField value={link} onChange={setLink} onCommit={setLink} id="new-note-link" />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">Add note</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
