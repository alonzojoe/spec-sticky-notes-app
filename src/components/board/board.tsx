import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { NoteCard } from '@/components/board/note_card'
import { useNotes, useNotesDispatch } from '@/context/use_notes'
import { useDraggable, type DragTarget } from '@/hooks/use_draggable'
import { CELL, columnsFor, gridHeight, slotOf } from '@/lib/grid'
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
  const [columns, setColumns] = useState(1)

  // Measured, never guessed. A layout effect for the first value so the first paint is not a
  // single column that immediately reflows, and a ResizeObserver after that because the column
  // count is a function of the window.
  useLayoutEffect(() => {
    const element = surface.current
    if (element === null) return
    const measure = () => setColumns(columnsFor(element.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const swap = useCallback(
    (a: string, b: string) => dispatch({ type: 'swap_order', a, b, at: Date.now() }),
    [dispatch],
  )
  const { drag, start, move, end } = useDraggable(swap)

  const ordered = arrange(notes)

  // The candidates a drag hit-tests against, measured once when the press begins. Slots are
  // known arithmetic, so this needs the board's own position and nothing per-note.
  const candidates = (): DragTarget[] => {
    const box = surface.current?.getBoundingClientRect()
    const left = (box?.left ?? 0) - (surface.current?.scrollLeft ?? 0)
    const top = (box?.top ?? 0) - (surface.current?.scrollTop ?? 0)
    return ordered.map((note, index) => {
      const slot = slotOf(index, columns)
      return {
        id: note.id,
        rect: {
          left: left + slot.x,
          top: top + slot.y,
          right: left + slot.x + CELL.width,
          bottom: top + slot.y + CELL.height,
        },
      }
    })
  }

  // Where a note goes when an arrow key moves it. Returns null at the ends: wrapping would
  // fling a note from the first slot to the last on a keypress meant to nudge it.
  const neighbour = (index: number, step: number): Note | null =>
    ordered[index + step] ?? null

  return (
    <div
      ref={surface}
      data-slot="board"
      className="relative h-full w-full overflow-y-auto bg-cork texture-cork"
    >
      {/* Sizes the scroll region to the last row. The notes themselves are positioned, so
          without this the board would never scroll to reach them. */}
      <div style={{ height: `${gridHeight(ordered.length, columns)}px` }} aria-hidden />

      {ordered.map((note, index) => (
        <NoteCard
          key={note.id}
          note={note}
          slot={slotOf(index, columns)}
          dragging={drag?.id === note.id ? { dx: drag.dx, dy: drag.dy } : null}
          isDropTarget={drag?.over === note.id}
          onPointerDown={(event) => start(event, note.id, candidates())}
          onPointerMove={move}
          onPointerUp={end}
          onReorder={(direction) => {
            const step =
              direction === 'left' ? -1 : direction === 'right' ? 1 : direction === 'up' ? -columns : columns
            const other =
              direction === 'first'
                ? (ordered[0] ?? null)
                : direction === 'last'
                  ? (ordered[ordered.length - 1] ?? null)
                  : neighbour(index, step)
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
