import { useCallback, useEffect, useRef, useState } from 'react'

import { NoteCard } from '@/components/board/note_card'
import { NoteViewDialog } from '@/components/layout/note_view_dialog'
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
  const { drag, start, move, end, isDragging } = useDraggable(swap)

  // The id, not the note: the open note is then always a live lookup and never a stale copy of
  // one that has since been edited, recoloured or redated.
  const [openId, setOpenId] = useState<string | null>(null)
  const open = notes.find((note) => note.id === openId) ?? null

  const ordered = arrange(notes)

  /**
   * A note created with an empty body opens straight away. P2 through P5 expressed this as
   * "born focused on its textarea"; the textarea moved into the view, so the note is born open.
   *
   * The test is "an id that was not here a moment ago", not P2's
   * `body === '' && createdAt === updatedAt`. That heuristic cannot tell a note created just
   * now from one loaded out of localStorage, which was harmless while it only chose where focus
   * went and is not harmless now that it opens a modal: reloading a board whose newest note was
   * empty would pop the dialog every time, and Radix would aria-hide the board behind it.
   */
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (seen.current === null) {
      // First render: everything already on the board is old news.
      seen.current = new Set(notes.map((note) => note.id))
      return
    }
    const fresh = notes.find((note) => !seen.current?.has(note.id))
    notes.forEach((note) => seen.current?.add(note.id))
    if (fresh !== undefined && fresh.body === '') setOpenId(fresh.id)
  }, [notes])

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
          // Only when the gesture stayed a click. useDraggable's 4px threshold is what
          // separates the two, and without this check every drop would open a note.
          onOpen={() => {
            if (!isDragging()) setOpenId(note.id)
          }}
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
        />
      ))}

      <NoteViewDialog note={open} onOpenChange={(next) => setOpenId(next ? openId : null)} />
    </div>
  )
}
