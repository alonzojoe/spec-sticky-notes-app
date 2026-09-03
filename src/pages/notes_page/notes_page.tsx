import { Board } from '@/components/board/board'

/**
 * The whole board: every note, pinned ones first.
 *
 * A handful of lines, and that is the layer working rather than an argument against it. A route
 * file should say what the URL is; what the screen contains belongs here, where a header, an empty
 * state or a second widget can arrive without the route file growing.
 */
export function NotesPage() {
  return <Board section="notes" />
}
