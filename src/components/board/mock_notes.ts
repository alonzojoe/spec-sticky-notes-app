export type MockNoteColor = 'butter' | 'apricot' | 'rose' | 'lilac' | 'sky' | 'mint'

export interface MockNote {
  id: string
  body: string
  color: MockNoteColor
  x: number
  y: number
  /** Degrees, -3..3. A literal, never Math.random() — mission.md calls a recomputed tilt a bug. */
  tilt: number
}

// Hardcoded on purpose: P1 proves the visual language, P2 replaces this with real state.
// Swapping this for `useNotes()` should be a one-line change in board.tsx and touch
// note_card.tsx not at all. The type stays local until P2 promotes it to src/types/note.ts
// alongside the reducer that consumes it.
export const MOCK_NOTES: MockNote[] = [
  {
    id: 'mock-1',
    body: 'Where a note sits is part of what it means.',
    color: 'butter',
    x: 64,
    y: 48,
    tilt: -2.1,
  },
  {
    id: 'mock-2',
    body: 'Pick it up, move it, put it down.\nThe board stays where you left it.',
    color: 'sky',
    x: 296,
    y: 128,
    tilt: 1.4,
  },
  {
    id: 'mock-3',
    body: 'No save button.',
    color: 'rose',
    x: 152,
    y: 300,
    tilt: -0.8,
  },
]
