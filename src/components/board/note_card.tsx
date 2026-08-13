import { PAPER } from '@/lib/paper'
import type { Note } from '@/types/note'

export function NoteCard({ note, layer }: { note: Note; layer: number; startEditing: boolean }) {
  return (
    <article
      data-slot="note-card"
      data-testid={`note-${note.id}`}
      className={`group absolute w-56 rounded-lg p-4 text-ink shadow-note texture-paper ${PAPER[note.color]} transition-[box-shadow] duration-(--duration-hover) ease-out hover:shadow-note-hover`}
      style={{
        // Position, stacking and tilt are per-note data, not design tokens. This is the one
        // place a style attribute is correct — and the tilt is read straight from the store,
        // never recomputed, so it cannot twitch between renders.
        left: `${note.x}px`,
        top: `${note.y}px`,
        zIndex: layer,
        transform: `rotate(${note.tilt}deg)`,
      }}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
    </article>
  )
}
