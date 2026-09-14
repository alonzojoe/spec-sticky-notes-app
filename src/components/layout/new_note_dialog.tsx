import { useForm } from '@tanstack/react-form'

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
import { createNoteSeed, normalizeLink, todayISO, topOrder } from '@/lib'
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

  /**
   * P15. Five fields, and **one** reset.
   *
   * Two pieces of hand-rolled state management went here, and both were correct before they were
   * replaced — they are named in requirements § D4 so that neither reads as an accident.
   *
   * A `wasOpen`/`setWasOpen` pair recomputed the date during render whenever `open` flipped true,
   * which is React's own documented pattern for state that follows a prop. It existed because **a
   * tab left open overnight must not offer yesterday**. That rule is unchanged; `form.reset` in
   * `close()` is where it lives now, and it says the thing it means — when this closes, the next
   * one is a new note.
   *
   * And `close()` set five values back to their defaults, one line each. The comment above it was a
   * rule every exit path had to remember: *reset on close rather than on submit, so Cancel and
   * Escape clear the draft too.* The rule survives by there being nothing left to forget.
   */
  const form = useForm({
    defaultValues: {
      color: NOTE_COLORS[0] as NoteColor,
      title: '',
      body: '',
      link: '',
      date: todayISO(),
    },
  })

  /**
   * **Submitted synchronously, and deliberately not through `form.handleSubmit()`.**
   *
   * `handleSubmit` is async — it awaits the validation lifecycle before it calls anything — so the
   * note would be dispatched a microtask after the click rather than in it. That breaks the one
   * timing property this dialog documents and depends on: the note reaches the board **exactly one
   * macrotask** after the dialog closes, which is what puts it on a board with nothing competing
   * for focus. The suite caught it — three assertions in `persistence.test.tsx` and
   * `note_view.test.tsx` went red, and under requirements § D7 an assertion that has to be edited
   * is a behaviour that changed, so the refactor is what moved.
   *
   * Nothing is given up by reading the values directly. This form has **no validators** — every
   * field is optional, an empty note is a legitimate note that P6 opens for you, and the Add button
   * is never disabled — so the lifecycle `handleSubmit` runs would be an empty ceremony bought at
   * the cost of the ordering. The form is still the one container for the five values and the one
   * reset; it is just not the thing that sequences the submit.
   *
   * The intro and the settings forms **do** use `handleSubmit`, because they have a validator and
   * their timing is nobody's business. This is the one place where it matters.
   */
  const submit = () => {
    const value = form.state.values
    // Read in the handler, never during a render. The new note only needs to beat the
    // highest stamp on the board; where it lands is the grid's business, not this file's.
    // Normalised here as well as on the field's blur: Ctrl/Cmd+Enter submits without ever
    // blurring the link input, so the raw draft is what this reads.
    const seed = createNoteSeed(
      value.color,
      topOrder(notes),
      value.body.trim(),
      value.date,
      value.title.trim(),
      normalizeLink(value.link),
    )
    close()
    // Added after the dialog has gone, not with it still up, and the ordering is the whole
    // reason. A note created empty opens focused on the board — board.tsx picks it with
    // `openId` — but a note mounted while the dialog is still mounted lands inside Radix's
    // focus scope, which pulls focus back out of it; the textarea blurs, note_card.tsx's
    // blur handler closes edit mode, and by the time the user looks the note is there and
    // is not ready to type on. One macrotask is imperceptible and puts the note on a board
    // with nothing competing for focus.
    //
    // P15 did not touch this. It is not form machinery — it is about Radix's focus scope —
    // and a phase that deleted it because it looked like a workaround would ship the bug P3
    // wrote it for.
    setTimeout(() => dispatch({ type: 'add', seed }), 0)
  }

  const close = () => {
    onOpenChange(false)
    // Reset on close rather than on submit, so Cancel and Escape clear the draft too. A
    // cancelled draft is not a draft — and the date is recomputed here rather than held from
    // mount, so a tab left open overnight does not offer yesterday.
    form.reset({
      color: NOTE_COLORS[0],
      title: '',
      body: '',
      link: '',
      date: todayISO(),
    })
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
          {/* The shared field components stay dumb — they take `value` and `onChange` and import
              no form library, so they remain renderable outside a form and the dependency stays
              replaceable. The wiring is here, at the call site. tech-stack.md § Hard rules. */}
          <form.Field name="date">
            {(field) => <DateField value={field.state.value} onChange={field.handleChange} />}
          </form.Field>

          <form.Field name="color">
            {(field) => (
              <PaperRadiogroup value={field.state.value} onChange={field.handleChange} />
            )}
          </form.Field>

          <form.Field name="title">
            {(field) => (
              <TitleField
                value={field.state.value}
                onChange={field.handleChange}
                id="new-note-title"
              />
            )}
          </form.Field>

          <form.Field name="body">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="new-note-body">Note</FieldLabel>
                <textarea
                  id="new-note-body"
                  // Focus stays here, not on the title above it, and that is the mission's call
                  // rather than a preference: "can I capture a thought in under two seconds" is the
                  // one-sentence test, and a required stop at an optional field fails it. The title
                  // is one Shift+Tab away. Same reasoning P3 used for the colour.
                  autoFocus
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-label="Note text"
                  rows={4}
                  placeholder="Write the note…"
                  // Enter is a newline here, never a submit: a note body is multi-line, and a form
                  // that submitted on Enter would put the second line out of reach of the keyboard
                  // — exactly what the amended principle 2 promised not to do. Ctrl/Cmd+Enter is
                  // handled on the form above.
                  className="field-sizing-content max-h-72 min-h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="link">
            {(field) => (
              <LinkField
                value={field.state.value}
                onChange={field.handleChange}
                onCommit={field.handleChange}
                id="new-note-link"
              />
            )}
          </form.Field>

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
