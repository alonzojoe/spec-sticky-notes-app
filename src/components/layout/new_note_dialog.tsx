import { useRef, useState } from 'react'

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
import { createNoteSeed, topOrder } from '@/lib/note_factory'
import { PAPER, paperLabel } from '@/lib/paper'
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
  const [body, setBody] = useState('')
  const swatches = useRef<(HTMLButtonElement | null)[]>([])

  const close = () => {
    onOpenChange(false)
    // Reset on close rather than on submit, so Cancel and Escape clear the draft too. A
    // cancelled draft is not a draft.
    setColor(NOTE_COLORS[0])
    setBody('')
  }

  const submit = () => {
    // Read in the handler, never during a render. The new note only needs to beat the
    // highest stamp on the board; where it lands is the grid's business, not this file's.
    const seed = createNoteSeed(color, topOrder(notes), body.trim())
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

  // Selection follows focus. Correct for a radiogroup of six equivalent options: choosing one
  // costs nothing, so making the user confirm a colour they have already arrowed onto would be
  // a second decision for no information.
  const moveTo = (index: number) => {
    const next = (index + NOTE_COLORS.length) % NOTE_COLORS.length
    setColor(NOTE_COLORS[next])
    swatches.current[next]?.focus()
  }

  const onSwatchKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (step !== undefined) {
      event.preventDefault()
      moveTo(index + step)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      moveTo(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      moveTo(NOTE_COLORS.length - 1)
    }
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
          <div
            role="radiogroup"
            aria-label="Paper colour"
            className="flex flex-wrap items-center gap-3"
          >
            {NOTE_COLORS.map((swatch, index) => (
              <button
                key={swatch}
                ref={(node) => {
                  swatches.current[index] = node
                }}
                type="button"
                role="radio"
                aria-checked={swatch === color}
                aria-label={paperLabel(swatch)}
                // One tab stop for the whole group; the arrow keys move inside it.
                tabIndex={swatch === color ? 0 : -1}
                onClick={() => setColor(swatch)}
                onKeyDown={(event) => onSwatchKeyDown(event, index)}
                className={`size-8 rounded-full border border-border texture-paper ${PAPER[swatch]} transition-[box-shadow] duration-(--duration-hover) ease-out outline-none ${
                  // A ring, not a tick. A checkmark drawn on paper is a different visual
                  // language from the rest of the board.
                  swatch === color ? 'ring-2 ring-ring ring-offset-2 ring-offset-popover' : ''
                } focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover`}
              />
            ))}
          </div>

          <textarea
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
            className="field-sizing-content max-h-72 min-h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft focus-visible:ring-2 focus-visible:ring-ring"
          />

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
