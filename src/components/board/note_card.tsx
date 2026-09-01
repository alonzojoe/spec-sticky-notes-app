import { NoteControls } from '@/components/board/note_controls'
import { formatDate } from '@/lib/dates'
import { PAPER } from '@/lib/paper'
import type { Note } from '@/types/note'

export type ReorderDirection = 'left' | 'right' | 'up' | 'down' | 'first' | 'last'

const REORDER_KEYS: Record<string, ReorderDirection> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'first',
  End: 'last',
}

/**
 * A card is a summary, not an editor. P6 moved the textarea into the note's own view, so this
 * file lost its debounce, its blur handler and its local editing state — one way to edit, one
 * place to maintain it.
 *
 * Fixed height and a clamped body are the point of the change: a grid of a one-line note beside
 * a ten-line note had ragged rows, and a long note was unreadable because the card *was* the
 * reader. `line-clamp` rather than `overflow: hidden` so the ellipsis lands on the last visible
 * line — that is what signals "there is more" instead of looking like the text stopped.
 *
 * Four gestures share this element and each has a deliberate answer. The body is a real button,
 * so clicking or pressing Enter on it opens the note — but only if the gesture did not become a
 * drag. The pin and delete controls stop propagation, or deleting a note would open the note it
 * just deleted. The arrow keys on the article itself still reorder.
 */
export function NoteCard({
  note,
  dragging,
  isDropTarget,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onReorder,
}: {
  note: Note
  dragging: { dx: number; dy: number } | null
  isDropTarget: boolean
  onOpen: () => void
  onPointerDown: (event: React.PointerEvent) => void
  onPointerMove: (event: React.PointerEvent) => void
  onPointerUp: (event: React.PointerEvent) => void
  onReorder: (direction: ReorderDirection) => void
}) {
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
        // Only when the article itself has focus, so a control inside it keeps its own keys.
        if (event.target !== event.currentTarget) return
        const direction = REORDER_KEYS[event.key]
        if (direction === undefined) return
        event.preventDefault()
        onReorder(direction)
      }}
      className={`group flex h-44 cursor-pointer flex-col overflow-hidden rounded-lg p-4 text-left text-ink texture-paper ${PAPER[note.color]} ${
        dragging !== null
          ? // Tracks the pointer exactly. A transition on the thing following your hand is
            // the classic mistake, and mission.md asks for a distinct lift while dragging.
            'relative z-50 cursor-grabbing shadow-note-drag'
          : 'shadow-note transition-[transform,box-shadow] duration-(--duration-note) ease-out hover:shadow-note-hover'
      } ${isDropTarget ? 'ring-2 ring-ring' : ''}`}
      style={
        dragging !== null ? { transform: `translate(${dragging.dx}px, ${dragging.dy}px)` } : undefined
      }
    >
      <NoteControls note={note} />

      {/* A real button rather than a click handler on the article. The article keeps its
          landmark role, and the thing that opens the note is announced as a control and
          answers Enter and Space for free — none of which is true of a clickable <div>. */}
      <button
        type="button"
        data-testid="open"
        aria-label={`Open note from ${formatDate(note.date)}`}
        onClick={onOpen}
        className="flex flex-1 cursor-pointer flex-col overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* tabular-nums so a column of dates does not jitter between a 1 and a 0. */}
        <time dateTime={note.date} className="text-xs text-ink-soft tabular-nums">
          {formatDate(note.date)}
        </time>

        <span className="mt-3 line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap">
          {/* Rendered, never stored. An empty note's body stays ''. */}
          {note.body === '' ? <span className="text-ink-soft">Empty note</span> : note.body}
        </span>
      </button>
    </article>
  )
}
