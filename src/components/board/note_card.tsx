import { Link2, Pin, Trash2 } from 'lucide-react'

import { useDeleteNote } from '@/context/use_delete_note'
import { formatDate } from '@/lib/dates'
import { linkLabel } from '@/lib/links'
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
 * How many lines of body the card shows: three, plus one for each of the title and the link this
 * note does not have.
 *
 * The height is fixed and the clamp is not, which is P7's answer to P6's open question about how
 * much note to show. Uniform height was always the requirement; a uniform clamp never was, and
 * the note that used to be served worst — nothing but prose — is exactly the one with two spare
 * rows to give back.
 *
 * A static map, not `line-clamp-${n}`. Tailwind scans source text and an interpolated class emits
 * nothing at all — the same trap lib/paper.ts documents for `bg-paper-${color}`.
 */
const BODY_LINES: Record<number, string> = {
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
}

const bodyClamp = (note: Note): string =>
  BODY_LINES[3 + (note.title === '' ? 1 : 0) + (note.link === '' ? 1 : 0)]

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
 * P7 added the title and the link chip and grew the card to `h-52` to hold them.
 *
 * **P9 took pin off the card and left delete on it.** Pinning is something you do to a note you
 * are already reading, and it moved into the note's own view; deleting is something you decide
 * about a note you can see from across the board, and making you open it first to throw it away
 * is a worse trade than the one control costs. That asymmetry is what the amended principle 4
 * says, and it is why the card still carries a `group` class and a hover-revealed corner.
 *
 * Four things now share this element and each has a deliberate answer. The body is a real button,
 * so clicking or pressing Enter on it opens the note — but only if the gesture did not become a
 * drag. The delete control stops propagation, or removing a note would open the note it just
 * removed. The link chip stops it for the same reason. The arrow keys on the article itself still
 * reorder.
 *
 * The pin glyph is **state, not a control**: it is the only way to see why a pinned note sorts
 * first, and it is deliberately not the thing you click to unpin.
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
  const { requestDelete } = useDeleteNote()

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
      className={`group relative flex h-52 cursor-pointer flex-col overflow-hidden rounded-lg p-4 text-left text-ink texture-paper ${PAPER[note.color]} ${
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
      {/* The corner: the pinned state, then the one control. They share a row so the glyph does
          not jump when the control fades in beside it. */}
      <div className="absolute top-3 right-3 flex items-center gap-0.5">
        {/* State, not a control. No handler, no tabindex, `aria-hidden` — clicking it opens the
            note like anywhere else on the card, because it is not a target. Principle 4's amended
            clause licences exactly this: state that would otherwise be invisible. Without it,
            principle 1's promise that pinned notes sort first has no visible cause. */}
        {note.pinned && (
          <span className="pointer-events-none p-1 text-ink-soft">
            <Pin className="size-3.5" aria-hidden />
          </span>
        )}

        {/* Hidden until you touch this note — principle 4's "on the note you're touching, not on
            all of them at once". `opacity-0` leaves a button focusable but invisible, so the
            group-focus-within and focus-visible escapes bring it back for the keyboard; without
            them, tabbing lands on something nobody can see, which is a defect rather than a
            style choice.

            stopPropagation on both click and pointerdown, or deleting a note would open the note
            it just removed and pressing the control would start dragging the card. */}
        <button
          type="button"
          data-testid="delete"
          aria-label="Delete note"
          onClick={(event) => {
            event.stopPropagation()
            requestDelete(note)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="rounded-sm p-1 text-ink-soft opacity-0 transition-opacity duration-(--duration-hover) ease-out group-hover:opacity-100 group-focus-within:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* A real button rather than a click handler on the article. The article keeps its
          landmark role, and the thing that opens the note is announced as a control and
          answers Enter and Space for free — none of which is true of a clickable <div>. */}
      <button
        type="button"
        data-testid="open"
        // The pin glyph is aria-hidden, so the state has to reach a screen reader through the
        // one control that names the note.
        aria-label={`Open ${note.pinned ? 'pinned ' : ''}note from ${formatDate(note.date)}`}
        onClick={onOpen}
        className="flex flex-1 cursor-pointer flex-col overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* tabular-nums so a column of dates does not jitter between a 1 and a 0. */}
        <time dateTime={note.date} className="text-xs text-ink-soft tabular-nums">
          {formatDate(note.date)}
        </time>

        {/* Rendered only when there is one. No `Untitled` placeholder: an untitled note gives
            the row back to its body rather than spending it saying nothing. */}
        {note.title !== '' && (
          <span data-slot="note-title" className="mt-2 line-clamp-1 text-sm font-semibold">
            {note.title}
          </span>
        )}

        {/* The body keeps full-strength ink. Softening it to separate it from the title was
            tried and reverted: it made the body the same tone as the date, so a card with no
            title had nothing on it that read as primary. The title separates by weight, which
            is the right axis — the date is the only thing on the card that recedes. */}
        <span className={`mt-1.5 ${bodyClamp(note)} text-sm leading-relaxed whitespace-pre-wrap`}>
          {/* Rendered, never stored. An empty note's body stays ''. */}
          {note.body === '' ? <span className="text-ink-soft">Empty note</span> : note.body}
        </span>
      </button>

      {/* A sibling of the opener, never a child of it: an <a> inside a <button> is invalid HTML
          and browsers disagree about which one a click belongs to.

          No lift and no scale on hover. mission.md asks for spring motion on pick-up, drop and
          settle, and this is none of those — a hover effect on something you pass over dozens of
          times a day is the category to reduce rather than add to. Colour and underline only,
          and Tailwind v4's `hover:` is already `@media (hover: hover)`, so a tap on a touch
          device cannot leave it stuck. */}
      {note.link !== '' && (
        <a
          href={note.link}
          data-slot="note-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open link ${linkLabel(note.link)}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="mt-3 flex shrink-0 items-center gap-1.5 text-xs text-ink-soft transition-colors duration-(--duration-hover) ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-ink hover:underline"
        >
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{linkLabel(note.link)}</span>
        </a>
      )}
    </article>
  )
}
