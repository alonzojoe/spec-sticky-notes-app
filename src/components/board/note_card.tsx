import { useState } from 'react'
import { useDebounceCallback } from 'usehooks-ts'

import { NoteControls } from '@/components/board/note_controls'
import { useNotesDispatch } from '@/context/use_notes'
import { PAPER } from '@/lib/paper'
import type { Note } from '@/types/note'

const AUTOSAVE_MS = 300

export type ReorderDirection = 'left' | 'right' | 'up' | 'down' | 'first' | 'last'

const REORDER_KEYS: Record<string, ReorderDirection> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'first',
  End: 'last',
}

export function NoteCard({
  note,
  dragging,
  isDropTarget,
  startEditing,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onReorder,
}: {
  note: Note
  dragging: { dx: number; dy: number } | null
  isDropTarget: boolean
  startEditing: boolean
  onPointerDown: (event: React.PointerEvent) => void
  onPointerMove: (event: React.PointerEvent) => void
  onPointerUp: (event: React.PointerEvent) => void
  onReorder: (direction: ReorderDirection) => void
}) {
  const dispatch = useNotesDispatch()

  // Ephemeral interaction state, so it stays local: what must survive a refresh belongs to
  // the reducer, and a note that was mid-edit when the tab closed should reopen closed.
  const [editing, setEditing] = useState(startEditing)

  const save = useDebounceCallback(
    (body: string) => dispatch({ type: 'edit_body', id: note.id, body, at: Date.now() }),
    AUTOSAVE_MS,
  )

  return (
    <article
      data-slot="note-card"
      data-testid={`note-${note.id}`}
      data-note-id={note.id}
      data-dragging={dragging !== null ? '' : undefined}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(event) => {
        // Only when the article itself has focus. Inside the textarea the arrow keys move the
        // caret, and Home and End go to the ends of a line — reordering there would make the
        // note unwritable.
        if (event.target !== event.currentTarget) return
        const direction = REORDER_KEYS[event.key]
        if (direction === undefined) return
        event.preventDefault()
        onReorder(direction)
      }}
      className={`group flex min-h-32 flex-col rounded-lg p-4 text-ink texture-paper ${PAPER[note.color]} ${
        dragging !== null
          ? // Tracks the pointer exactly. A transition on the thing following your hand is
            // the classic mistake, and mission.md asks for a distinct lift while dragging.
            'relative z-50 cursor-grabbing shadow-note-drag'
          : 'cursor-grab shadow-note transition-[transform,box-shadow] duration-(--duration-note) ease-out hover:shadow-note-hover'
      } ${isDropTarget ? 'ring-2 ring-ring' : ''}`}
      style={
        // The card sits in its grid cell and is not positioned by us — the layout engine
        // places it. The only transform is the offset while it is being dragged, and the
        // rotation is gone: mission.md's tilt criterion was amended in P5 because a tilt
        // reads as deliberate only when nothing around it is aligned.
        dragging !== null ? { transform: `translate(${dragging.dx}px, ${dragging.dy}px)` } : undefined
      }
    >
      <NoteControls note={note} />

      {editing ? (
        <textarea
          autoFocus
          // Uncontrolled: a keystroke re-renders this note instead of the whole board, and
          // the caret cannot jump. Nothing else writes `body` in this phase.
          defaultValue={note.body}
          aria-label="Note text"
          rows={4}
          className="field-sizing-content max-h-72 min-h-24 w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none"
          onChange={(event) => save(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
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
