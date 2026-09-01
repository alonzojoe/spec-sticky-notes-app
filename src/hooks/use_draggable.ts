import { useRef, useState } from 'react'

/** How far the pointer must travel before a press becomes a drag rather than a click. */
const THRESHOLD = 4

export interface DragTarget {
  id: string
  rect: { left: number; top: number; right: number; bottom: number }
}

export interface DragState {
  id: string
  dx: number
  dy: number
  over: string | null
}

/**
 * Pointer-event dragging for the grid. Owns the gesture and nothing else: it dispatches no
 * actions and knows nothing about notes beyond their ids and rectangles. The board hands it
 * the candidates at press time and receives the drop.
 *
 * Two things here are load-bearing rather than incidental.
 *
 * The 4px threshold: without it a stationary pointerdown/pointerup is indistinguishable from
 * a drag, and clicking a note to write on it stops working. mission.md principle 2 says
 * editing happens in place on the note, so swallowing that click would break a principle to
 * add a feature.
 *
 * Measuring once, at pointerdown: the alternative is getBoundingClientRect per candidate on
 * every pointermove, which is O(n) per frame and shows up at the 100+ notes the mission asks
 * about. Nothing moves during a drag except the note under the pointer, so rectangles taken
 * at press time stay true for the whole gesture.
 */
export function useDraggable(onSwap: (a: string, b: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const targets = useRef<DragTarget[]>([])
  const moved = useRef(false)

  const hit = (x: number, y: number, self: string): string | null => {
    const found = targets.current.find(
      (t) => t.id !== self && x >= t.rect.left && x <= t.rect.right && y >= t.rect.top && y <= t.rect.bottom,
    )
    return found?.id ?? null
  }

  const start = (event: React.PointerEvent, id: string, candidates: DragTarget[]) => {
    // Secondary buttons open context menus; they are not drags.
    if (event.button !== 0) return
    origin.current = { x: event.clientX, y: event.clientY }
    targets.current = candidates
    moved.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ id, dx: 0, dy: 0, over: null })
  }

  const move = (event: React.PointerEvent) => {
    if (drag === null) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    if (!moved.current && Math.hypot(dx, dy) < THRESHOLD) return
    moved.current = true
    setDrag({ id: drag.id, dx, dy, over: hit(event.clientX, event.clientY, drag.id) })
  }

  const end = (event: React.PointerEvent) => {
    if (drag === null) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    // A drop on empty board is not a swap. The note transitions back to its slot on its own,
    // because its slot never changed.
    if (moved.current && drag.over !== null) onSwap(drag.id, drag.over)
    setDrag(null)
    moved.current = false
  }

  return { drag, start, move, end, isDragging: () => moved.current }
}
