import { useCallback, useRef } from 'react'

import { NoteCard } from '@/components/board/note_card'
import { useNotes, useNotesDispatch } from '@/context/use_notes'
import { useDraggable, type DragTarget } from '@/hooks/use_draggable'
import { MIN_COLUMN } from '@/lib/grid'
import type { Note } from '@/types/note'

/**
 * Pinned first, then newest first. `order` is a descending key — see types/note.ts — and this
 * is the only place the sort lives, so "the grid never rearranges itself" is enforced by there
 * being nothing else that could rearrange it.
 *
 * The copy matters. Sorting `notes` in place would mutate the array the reducer holds, which
 * is the class of bug T19 freezes state to catch.
 */
const arrange = (notes: Note[]): Note[] =>
  [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.order - a.order)

export function Board() {
  const { notes } = useNotes()
  const dispatch = useNotesDispatch()

  const surface = useRef<HTMLDivElement>(null)

  const swap = useCallback(
    (a: string, b: string) => dispatch({ type: 'swap_order', a, b, at: Date.now() }),
    [dispatch],
  )
  const { drag, start, move, end } = useDraggable(swap)

  const ordered = arrange(notes)

  /**
   * The cards a drag hit-tests against, read from the DOM once when the press begins.
   *
   * Reading real rectangles is what makes CSS grid workable here: nothing in this file knows
   * the column count or the row heights any more, because the layout engine decided them.
   * Measuring per pointermove would be O(n) per frame; nothing moves during a drag except the
   * note under the pointer, so press-time rectangles stay true for the whole gesture.
   */
  const candidates = (): DragTarget[] =>
    [...(surface.current?.querySelectorAll('[data-slot="note-card"]') ?? [])].map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        id: element.getAttribute('data-note-id') ?? '',
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      }
    })

  /**
   * How many cards sit on one row, counted from where the browser actually put them. Needed
   * only by the up/down arrows — everything else is a step of one in the sorted array.
   */
  const columnCount = (): number => {
    const cards = [...(surface.current?.querySelectorAll('[data-slot="note-card"]') ?? [])]
    if (cards.length === 0) return 1
    const firstTop = (cards[0] as HTMLElement).offsetTop
    const inFirstRow = cards.filter((card) => (card as HTMLElement).offsetTop === firstTop).length
    return Math.max(1, inFirstRow)
  }

  return (
    <div
      ref={surface}
      data-slot="board"
      className="relative grid h-full w-full auto-rows-min content-start gap-4 overflow-y-auto bg-cork p-6 texture-cork"
      // The layout, in one line, done by the engine rather than by arithmetic here: as many
      // equal columns as fit at MIN_COLUMN or wider. Resizing reflows with no observer, and
      // two cards cannot overlap because the grid will not place them in the same cell.
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_COLUMN}px, 1fr))` }}
    >
      {ordered.map((note, index) => (
        <NoteCard
          key={note.id}
          note={note}
          dragging={drag?.id === note.id ? { dx: drag.dx, dy: drag.dy } : null}
          isDropTarget={drag?.over === note.id}
          onPointerDown={(event) => start(event, note.id, candidates())}
          onPointerMove={move}
          onPointerUp={end}
          onReorder={(direction) => {
            const columns = columnCount()
            const step =
              direction === 'left' ? -1 : direction === 'right' ? 1 : direction === 'up' ? -columns : columns
            const other =
              direction === 'first'
                ? (ordered[0] ?? null)
                : direction === 'last'
                  ? (ordered[ordered.length - 1] ?? null)
                  : // No wrap at the ends: a wrap would fling a note from the first slot to
                    // the last on a keypress meant to nudge it one place.
                    (ordered[index + step] ?? null)
            if (other !== null && other.id !== note.id) swap(note.id, other.id)
          }}
          startEditing={
            // The one note that is new and untouched opens focused. At most one note can
            // satisfy this, so creating a note never steals focus from one being written on.
            note.body === '' && note.createdAt === note.updatedAt && index === 0
          }
        />
      ))}
    </div>
  )
}
