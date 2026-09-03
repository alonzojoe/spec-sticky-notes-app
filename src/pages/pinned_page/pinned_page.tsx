import { Board } from '@/components/board/board'

/** The pinned section: the same board, drawing only the notes that are pinned. */
export function PinnedPage() {
  return <Board section="pinned" />
}
