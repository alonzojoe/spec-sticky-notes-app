import { describe, expect, it } from 'vitest'

import { createNoteSeed, topOrder } from '@/lib/note_factory'
import { NOTE_COLORS } from '@/types/note'

/**
 * P5 deleted the placement search this file used to cover — the lattice walk, the jitter, the
 * clearance arithmetic, the roomiest-gap fallback. Those assertions are gone rather than
 * weakened into ones that pass vacuously: the code they described does not exist, and a test
 * that still ran would be testing nothing while reporting coverage.
 *
 * What is left is the impure boundary, which is what this file was always really about.
 */
describe('createNoteSeed', () => {
  it('stamps the new note above every existing one', () => {
    expect(createNoteSeed('butter', 7).order).toBe(8)
  })

  it('starts an empty board at 1, so no note ever carries the sentinel 0', () => {
    expect(createNoteSeed('butter', topOrder([])).order).toBe(1)
  })

  it('carries the colour it was given', () => {
    for (const color of NOTE_COLORS) {
      expect(createNoteSeed(color, 0).color).toBe(color)
    }
  })

  it('defaults the body to empty and keeps one it is given', () => {
    expect(createNoteSeed('rose', 0).body).toBe('')
    expect(createNoteSeed('rose', 0, 'a thought').body).toBe('a thought')
  })

  // The tilt assertion that lived here went with mission.md's amended tactility criterion:
  // on a grid a rotation reads as sloppy rather than tactile. The seed carries no rotation at
  // all now, so there is nothing left to bound.
  it('carries no rotation', () => {
    expect(createNoteSeed('mint', 0)).not.toHaveProperty('tilt')
  })

  it('gives every note a distinct id', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createNoteSeed('sky', 0).id))
    expect(ids.size).toBe(50)
  })

  it('stamps createdAt and updatedAt from one clock reading', () => {
    const seed = createNoteSeed('lilac', 0)
    expect(typeof seed.at).toBe('number')
  })
})

describe('topOrder', () => {
  it('is 0 for an empty board, so the first note lands at 1', () => {
    expect(topOrder([])).toBe(0)
  })

  it('is the maximum stamp, not the count and not the last element', () => {
    expect(topOrder([{ order: 3 }, { order: 11 }, { order: 7 }])).toBe(11)
  })
})
