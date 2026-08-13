import type { NoteColor, NoteSeed } from '@/types/note'

// Where a new note lands. Near the top-left where the eye already is, spread widely enough
// that two notes made in a row do not sit exactly on top of each other. Drag is P5; until
// then this is the only thing that decides position.
const SPAWN = { x: 48, y: 40, spreadX: 280, spreadY: 200 } as const

// mission.md: "a random rotation between -3 and +3 degrees at creation, kept forever".
const TILT = 3

/**
 * The impure boundary. This is the only place in the app that calls crypto.randomUUID,
 * Math.random, or Date.now for a note — everything downstream of it, the reducer included,
 * is a function of its arguments.
 */
export function createNoteSeed(color: NoteColor): NoteSeed {
  return {
    id: crypto.randomUUID(),
    color,
    x: Math.round(SPAWN.x + Math.random() * SPAWN.spreadX),
    y: Math.round(SPAWN.y + Math.random() * SPAWN.spreadY),
    tilt: Number((Math.random() * TILT * 2 - TILT).toFixed(2)),
    at: Date.now(),
  }
}
