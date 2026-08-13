import { describe, expect, it } from 'vitest'

import { NOTE_SIZE, createNoteSeed } from '@/lib/note_factory'
import { NOTE_COLORS } from '@/types/note'

const SEEDS = Array.from({ length: 200 }, (_, index) =>
  createNoteSeed(NOTE_COLORS[index % NOTE_COLORS.length]),
)

describe('createNoteSeed · identity', () => {
  it('gives every seed a non-empty string id', () => {
    // The id's only contract is uniqueness. Asserting a UUID shape would couple the test to
    // a platform API that is stubbed in some environments.
    expect(SEEDS.every((seed) => typeof seed.id === 'string' && seed.id.length > 0)).toBe(true)
  })

  it('never repeats an id across 200 seeds', () => {
    expect(new Set(SEEDS.map((seed) => seed.id)).size).toBe(200)
  })

  it('carries back the colour it was asked for', () => {
    expect(createNoteSeed('lilac').color).toBe('lilac')
  })
})

describe('createNoteSeed · tilt', () => {
  it('stays within -3 and 3 degrees', () => {
    expect(SEEDS.every((seed) => seed.tilt >= -3 && seed.tilt <= 3)).toBe(true)
  })

  it('leans both ways across many notes', () => {
    // mission.md: "Notes never sit perfectly square."
    expect(SEEDS.some((seed) => seed.tilt < 0)).toBe(true)
    expect(SEEDS.some((seed) => seed.tilt > 0)).toBe(true)
  })

  it('is not always the same value', () => {
    expect(new Set(SEEDS.map((seed) => seed.tilt)).size).toBeGreaterThan(50)
  })
})

describe('createNoteSeed · spawn position', () => {
  it('produces whole pixels', () => {
    expect(SEEDS.every((seed) => Number.isInteger(seed.x) && Number.isInteger(seed.y))).toBe(true)
  })

  it('does not put two notes made in a row in the same place', () => {
    expect(new Set(SEEDS.map((seed) => `${seed.x},${seed.y}`)).size).toBeGreaterThan(150)
  })
})

const BOUNDS = { width: 1200, height: 700 }

/** Positive when the two note rectangles are apart; negative when they overlap. */
const separation = (a: Spot, b: Spot) =>
  Math.max(
    b.x - (a.x + NOTE_SIZE.width),
    a.x - (b.x + NOTE_SIZE.width),
    b.y - (a.y + NOTE_SIZE.height),
    a.y - (b.y + NOTE_SIZE.height),
  )

type Spot = { x: number; y: number }

const fill = (count: number, bounds = BOUNDS): Spot[] => {
  const taken: Spot[] = []
  for (let i = 0; i < count; i += 1) {
    const seed = createNoteSeed('butter', { bounds, taken })
    taken.push({ x: seed.x, y: seed.y })
  }
  return taken
}

describe('createNoteSeed · does not land on another note', () => {
  // The bug this replaces: a fixed 280x200 spawn box against a 224px-wide note meant two
  // notes made in a row almost always overlapped, and the board's real size was ignored.
  it('keeps every note clear of the ones already on the board', () => {
    const taken = fill(12)

    for (let i = 0; i < taken.length; i += 1) {
      for (let j = i + 1; j < taken.length; j += 1) {
        expect(separation(taken[i], taken[j])).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('spreads across the board rather than clustering in one corner', () => {
    const taken = fill(10)

    // A spawn box that ignores the board's size fails this by a mile.
    expect(Math.max(...taken.map((s) => s.x))).toBeGreaterThan(400)
  })

  it('keeps every note fully inside the board', () => {
    const taken = fill(10)

    expect(taken.every((s) => s.x >= 0 && s.x + NOTE_SIZE.width <= BOUNDS.width)).toBe(true)
    expect(taken.every((s) => s.y >= 0 && s.y + NOTE_SIZE.height <= BOUNDS.height)).toBe(true)
  })

  it('still places a note on a board with no room left, inside the bounds', () => {
    // Degrades to "the roomiest spot available" rather than throwing or escaping the board.
    const cramped = { width: 400, height: 300 }
    const taken = fill(8, cramped)

    expect(taken).toHaveLength(8)
    expect(taken.every((s) => s.x >= 0 && s.x + NOTE_SIZE.width <= cramped.width)).toBe(true)
    expect(taken.every((s) => s.y >= 0 && s.y + NOTE_SIZE.height <= cramped.height)).toBe(true)
  })

  it('handles a board narrower than a note without going negative', () => {
    const sliver = { width: 120, height: 90 }
    const seed = createNoteSeed('sky', { bounds: sliver, taken: [] })

    expect(seed.x).toBeGreaterThanOrEqual(0)
    expect(seed.y).toBeGreaterThanOrEqual(0)
  })
})

describe('createNoteSeed · timestamp', () => {
  it('stamps roughly now', () => {
    const seed = createNoteSeed('mint')

    expect(seed.at).toBeGreaterThan(Date.now() - 5_000)
    expect(seed.at).toBeLessThanOrEqual(Date.now())
  })
})
