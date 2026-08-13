import { useState } from 'react'
import { useDebounceCallback } from 'usehooks-ts'

import { NoteControls } from '@/components/board/note_controls'
import { useNotesDispatch } from '@/context/use_notes'
import { PAPER } from '@/lib/paper'
import type { Note } from '@/types/note'

const AUTOSAVE_MS = 300

export function NoteCard({
  note,
  layer,
  startEditing,
}: {
  note: Note
  layer: number
  startEditing: boolean
}) {
  const dispatch = useNotesDispatch()

  // Ephemeral interaction state, so it stays local: what must survive a refresh belongs to
  // the reducer, and a note that was mid-edit when the tab closed should reopen closed.
  // `startEditing` is an initial value, not a binding — see the blur path below.
  const [editing, setEditing] = useState(startEditing)

  const save = useDebounceCallback(
    (body: string) => dispatch({ type: 'edit_body', id: note.id, body, at: Date.now() }),
    AUTOSAVE_MS,
  )

  return (
    <article
      data-slot="note-card"
      data-testid={`note-${note.id}`}
      className={`group absolute w-56 rounded-lg p-4 text-ink shadow-note texture-paper ${PAPER[note.color]} transition-[box-shadow] duration-(--duration-hover) ease-out hover:shadow-note-hover`}
      style={{
        // Position, stacking and tilt are per-note data, not design tokens. This is the one
        // place a style attribute is correct — and the tilt is read straight from the store,
        // never recomputed, so it cannot twitch between renders.
        left: `${note.x}px`,
        top: `${note.y}px`,
        zIndex: layer,
        transform: `rotate(${note.tilt}deg)`,
      }}
    >
      <NoteControls note={note} />

      {editing ? (
        <textarea
          autoFocus
          // Uncontrolled: a keystroke re-renders this note instead of the whole board, and
          // the caret cannot jump. Nothing else writes `body` in this phase; when P8 adds a
          // second writer this needs a key or needs to become controlled.
          defaultValue={note.body}
          aria-label="Note text"
          rows={4}
          className="field-sizing-content max-h-72 min-h-24 w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none"
          onChange={(event) => save(event.target.value)}
          onBlur={(event) => {
            // Cancel the pending debounce and write now, so the last keystroke before
            // leaving a note is never the one that is lost.
            save.cancel()
            dispatch({ type: 'edit_body', id: note.id, body: event.target.value, at: Date.now() })
            setEditing(false)
          }}
          onKeyDown={(event) => {
            // Escape blurs rather than closing directly: one exit path, so the save cannot
            // be skipped by choosing the wrong one.
            if (event.key === 'Escape') event.currentTarget.blur()
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full cursor-text text-left text-sm leading-relaxed whitespace-pre-wrap"
        >
          {/* Rendered, never stored. An empty note's body stays ''. */}
          {note.body === '' ? <span className="text-ink-soft">Empty note</span> : note.body}
        </button>
      )}
    </article>
  )
}
