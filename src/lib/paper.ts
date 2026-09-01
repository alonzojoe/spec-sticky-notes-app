import type { NoteColor } from '@/types/note'

// A static map, not a template string. Tailwind scans source text, and `bg-paper-${color}`
// would be invisible to the scanner and emit nothing at all. It lives here rather than in
// either component so that note_card.tsx and note_palette.tsx cannot drift apart.
export const PAPER: Record<NoteColor, string> = {
  butter: 'bg-paper-butter',
  apricot: 'bg-paper-apricot',
  rose: 'bg-paper-rose',
  lilac: 'bg-paper-lilac',
  sky: 'bg-paper-sky',
  mint: 'bg-paper-mint',
}

export const paperLabel = (color: NoteColor) => color[0].toUpperCase() + color.slice(1)
