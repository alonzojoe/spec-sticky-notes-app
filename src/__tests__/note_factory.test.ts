import { describe, expect, it } from 'vitest'

import { createNoteSeed } from '@/lib/note_factory'
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

  it('stays inside a sane region of the board', () => {
    expect(SEEDS.every((seed) => seed.x >= 0 && seed.x <= 400)).toBe(true)
    expect(SEEDS.every((seed) => seed.y >= 0 && seed.y <= 320)).toBe(true)
  })

  it('does not put two notes made in a row in the same place', () => {
    expect(new Set(SEEDS.map((seed) => `${seed.x},${seed.y}`)).size).toBeGreaterThan(150)
  })
})

describe('createNoteSeed · timestamp', () => {
  it('stamps roughly now', () => {
    const seed = createNoteSeed('mint')

    expect(seed.at).toBeGreaterThan(Date.now() - 5_000)
    expect(seed.at).toBeLessThanOrEqual(Date.now())
  })
})
