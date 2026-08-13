import { MOCK_NOTES } from '@/components/board/mock_notes'
import { NoteCard } from '@/components/board/note_card'

export function Board() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-cork texture-cork">
      {MOCK_NOTES.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  )
}
