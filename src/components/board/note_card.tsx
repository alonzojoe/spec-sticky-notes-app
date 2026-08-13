import type { MockNote } from '@/components/board/mock_notes'

// A static map, not a template string — Tailwind scans source text, and `bg-paper-${color}`
// would be invisible to the scanner and emit nothing at all.
const PAPER: Record<MockNote['color'], string> = {
  butter: 'bg-paper-butter',
  apricot: 'bg-paper-apricot',
  rose: 'bg-paper-rose',
  lilac: 'bg-paper-lilac',
  sky: 'bg-paper-sky',
  mint: 'bg-paper-mint',
}

export function NoteCard({ note }: { note: MockNote }) {
  return (
    <article
      data-slot="note-card"
      data-testid={`note-${note.id}`}
      className={`absolute w-56 rounded-lg p-4 text-ink shadow-note texture-paper ${PAPER[note.color]} transition-[box-shadow] duration-(--duration-hover) ease-out hover:shadow-note-hover`}
      style={{
        // Position and tilt are per-note data, not design tokens. This is the one place
        // a style attribute is correct — and the tilt is read straight from the fixture,
        // never recomputed, so it cannot twitch between renders.
        left: `${note.x}px`,
        top: `${note.y}px`,
        transform: `rotate(${note.tilt}deg)`,
      }}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
    </article>
  )
}
