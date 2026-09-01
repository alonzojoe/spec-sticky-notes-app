import type { NoteColor, NoteSeed } from '@/types/note'

/**
 * A note's footprint, both figures measured in the browser rather than guessed. `width` is
 * `w-56` from note_card.tsx. `height` is a note in edit mode — `min-h-24` on the textarea
 * plus the card's padding, ~142px — which is the state every note is born into, and so the
 * space every new note actually needs.
 *
 * An earlier version of this reserved 96px on the theory that under-stating was the safe
 * direction. It is the opposite: too short a footprint is exactly what lets a new note be
 * born overlapping the one next to it.
 */
export const NOTE_SIZE = { width: 224, height: 144 } as const

/** Clear space to leave between notes, so "not overlapping" also reads as "not crowded". */
const GUTTER = 16

/** Keep notes off the very edge of the board. */
const MARGIN = 24

/**
 * How far a note may wander from its slot, so the board reads as thrown rather than filed.
 *
 * Deliberately larger than the gutter, and *not* budgeted into the slot spacing: a jittered
 * spot is accepted only if it is still clear of every other note, and the plain slot is the
 * fallback. Reserving room for the jitter instead would cost roughly half the board's
 * capacity to buy the same look.
 */
const JITTER = 40

/** How many jittered offsets to try per slot before settling for the slot itself. */
const JITTER_TRIES = 12

/** How many spots to try before settling for the roomiest one seen, on a board with no room. */
const TRIES = 60

/** Used when the board has not been measured — a first note on a board of unknown size. */
const DEFAULT_BOUNDS = { width: 1024, height: 640 }

// mission.md: "a random rotation between -3 and +3 degrees at creation, kept forever".
const TILT = 3

export interface Spot {
  x: number
  y: number
}

export interface Placement {
  bounds: { width: number; height: number }
  taken: Spot[]
}

/**
 * Positive when two note rectangles are apart, negative when they overlap. The maximum of
 * the four edge gaps is the standard axis-aligned separation: two boxes are clear if they
 * are clear along any one axis.
 */
const separation = (a: Spot, b: Spot) =>
  Math.max(
    b.x - (a.x + NOTE_SIZE.width),
    a.x - (b.x + NOTE_SIZE.width),
    b.y - (a.y + NOTE_SIZE.height),
    a.y - (b.y + NOTE_SIZE.height),
  )

const clearanceAt = (spot: Spot, taken: Spot[]) =>
  taken.reduce((least, other) => Math.min(least, separation(spot, other)), Infinity)

/**
 * Where a new note lands. Random, but not blind: it samples the whole board rather than a
 * fixed corner of it, and rejects spots that would land on a note already there.
 *
 * The previous version picked uniformly from a 280x200 box while a note is 224px wide, so
 * two notes made in a row almost always overlapped — the board's actual size was never
 * consulted at all. Randomness alone cannot solve that; the placement has to know what is
 * already on the board.
 *
 * On a board with no room left this returns the roomiest spot it saw rather than failing or
 * escaping the bounds. Notes stay reachable; they just touch. Tidying a full board is the
 * user's job, and P5 gives them the means.
 */
const findSpot = ({ bounds, taken }: Placement): Spot => {
  // A board narrower than a note clamps to the margin rather than going negative.
  const maxX = Math.max(0, bounds.width - NOTE_SIZE.width - MARGIN)
  const maxY = Math.max(0, bounds.height - NOTE_SIZE.height - MARGIN)
  const spanX = Math.max(0, maxX - MARGIN)
  const spanY = Math.max(0, maxY - MARGIN)

  const origin = { x: Math.min(MARGIN, maxX), y: Math.min(MARGIN, maxY) }

  // Slots, not free-for-all sampling. Pure rejection sampling looks right and degrades
  // sharply: past about half full it keeps landing on notes already there, and a board that
  // still has room starts stacking. Slots make "not born on top of each other" a guarantee.
  // The jitter, and shuffling which free slot gets used, keep it from reading as a grid.
  const stepX = NOTE_SIZE.width + GUTTER
  const stepY = NOTE_SIZE.height + GUTTER

  const slots: Spot[] = []
  for (let y = origin.y; y <= maxY; y += stepY) {
    for (let x = origin.x; x <= maxX; x += stepX) {
      slots.push({ x, y })
    }
  }

  // Fisher-Yates, so the second note is not always immediately right of the first.
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }

  const wander = (slot: Spot): Spot => ({
    x: Math.round(Math.min(maxX, Math.max(0, slot.x + (Math.random() * 2 - 1) * JITTER))),
    y: Math.round(Math.min(maxY, Math.max(0, slot.y + (Math.random() * 2 - 1) * JITTER))),
  })

  let roomiest: Spot = origin
  let bestClearance = clearanceAt(origin, taken)

  const consider = (spot: Spot) => {
    const clearance = clearanceAt(spot, taken)
    if (clearance > bestClearance) {
      bestClearance = clearance
      roomiest = spot
    }
    return clearance >= 0
  }

  for (const slot of slots) {
    if (clearanceAt(slot, taken) < GUTTER) continue

    // The slot is free. Wander off it as far as the neighbours allow, so the result looks
    // thrown; fall back to the slot itself, which is known clear.
    for (let attempt = 0; attempt < JITTER_TRIES; attempt += 1) {
      const spot = wander(slot)
      if (consider(spot)) return spot
    }
    consider(slot)
    return slot
  }

  // Every slot is blocked — but slots are a coarse lattice, and notes that wandered off
  // theirs can straddle two. A fine sweep finds a clear spot wherever one actually exists,
  // so the guarantee does not depend on anything staying aligned.
  for (let y = origin.y; y <= maxY; y += GUTTER) {
    for (let x = origin.x; x <= maxX; x += GUTTER) {
      const spot = { x: Math.round(x), y: Math.round(y) }
      if (consider(spot)) return spot
    }
  }

  // Genuinely no room left. Sample for the roomiest gap: notes touch, but every one stays
  // inside the board and reachable. Tidying a full board is the user's job, and P5 gives
  // them the means.
  for (let attempt = 0; attempt < TRIES; attempt += 1) {
    consider({
      x: Math.round(origin.x + Math.random() * spanX),
      y: Math.round(origin.y + Math.random() * spanY),
    })
  }

  return roomiest
}

/**
 * The impure boundary. This is the only place in the app that calls crypto.randomUUID,
 * Math.random, or Date.now for a note — everything downstream of it, the reducer included,
 * is a function of its arguments. `placement` is passed in as data for the same reason: the
 * caller measures the board, so this stays testable without a DOM.
 */
export function createNoteSeed(color: NoteColor, placement?: Placement, body = ''): NoteSeed {
  const { x, y } = findSpot(placement ?? { bounds: DEFAULT_BOUNDS, taken: [] })

  return {
    id: crypto.randomUUID(),
    color,
    body,
    x,
    y,
    tilt: Number((Math.random() * TILT * 2 - TILT).toFixed(2)),
    at: Date.now(),
  }
}

/**
 * Measures the board so `createNoteSeed` can aim at it. Called from a click handler, never
 * during a render. Falls back to a sane region when the board is not on screen — which is
 * what happens in jsdom, where every rect is zero.
 */
export function boardBounds(): { width: number; height: number } {
  const rect = document.querySelector('[data-slot="board"]')?.getBoundingClientRect()
  return rect && rect.width > 0 && rect.height > 0
    ? { width: rect.width, height: rect.height }
    : DEFAULT_BOUNDS
}
