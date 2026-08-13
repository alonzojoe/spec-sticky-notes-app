import { NoteCard } from '@/components/board/note_card'
import { useNotes } from '@/context/use_notes'
import type { Note } from '@/types/note'

export function Board() {
  const { notes } = useNotes()

  // Pinned notes render above every unpinned one. Computed here, at render, from the largest
  // z on the board: array order, x, y and z are all left exactly as they are. Sorting would
  // reshuffle tab order every time a pin is toggled, and writing a large value into z would
  // destroy the field P5 needs.
  const ceiling = notes.reduce((top, note) => Math.max(top, note.z), 0)

  // The one note that is new and untouched opens focused. At most one note can satisfy this,
  // so creating a note never steals focus from a note you are already writing on.
  const newest = notes.reduce<Note | null>(
    (top, note) => (top === null || note.z > top.z ? note : top),
    null,
  )
  const openId =
    newest !== null && newest.body === '' && newest.createdAt === newest.updatedAt
      ? newest.id
      : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-cork texture-cork">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          layer={note.pinned ? note.z + ceiling + 1 : note.z}
          startEditing={note.id === openId}
        />
      ))}
    </div>
  )
}
