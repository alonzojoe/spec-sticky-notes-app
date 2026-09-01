import { describe, expect, it } from 'vitest'

import { BOARD_KEY, SIDEBAR_KEY, hydrate } from '@/lib/board_storage'
import { EMPTY_BOARD, type Note } from '@/types/note'

const valid: Note = {
  id: 'a',
  body: 'a thought',
  color: 'butter',
  order: 1,
  z: 1,
  tilt: -1.2,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
}

describe('the storage keys', () => {
  // These are a contract with data already on disk. A typo in either silently orphans every
  // note the user has, and nothing else in the suite would notice.
  it('names the board key exactly', () => {
    expect(BOARD_KEY).toBe('sticky-notes:board:v1')
  })

  it('names the sidebar key exactly', () => {
    expect(SIDEBAR_KEY).toBe('sticky-notes:sidebar')
  })
})

describe('hydrate · rejects anything that is not a board', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not json'],
    ['a number', 42],
    ['an array', []],
    ['an empty object', {}],
    ['a future version', { version: 2, notes: [] }],
    ['a stringified version', { version: '1', notes: [] }],
    ['notes that are not an array', { version: 1, notes: 'nope' }],
    ['a note missing most of its fields', { version: 1, notes: [{ id: 'a' }] }],
    ['a note with an unknown colour', { version: 1, notes: [{ ...valid, color: 'chartreuse' }] }],
    ['a note with a string where a number belongs', { version: 1, notes: [{ ...valid, z: '10' }] }],
    ['a note with a null body', { version: 1, notes: [{ ...valid, body: null }] }],
  ])('returns an empty board for %s', (_label, stored) => {
    expect(hydrate(stored)).toEqual(EMPTY_BOARD)
  })

  it('rejects the whole board when only one note is bad', () => {
    // A board silently missing a note is worse than one that is visibly empty: the first
    // looks like it worked.
    const stored = { version: 1, notes: [valid, { ...valid, id: 'b', pinned: 'yes' }] }

    expect(hydrate(stored).notes).toEqual([])
  })
})

describe('hydrate · accepts a well-formed board', () => {
  it('returns an empty board unchanged', () => {
    expect(hydrate({ version: 1, notes: [] })).toEqual(EMPTY_BOARD)
  })

  it('returns the notes it was given', () => {
    const stored = { version: 1, notes: [valid, { ...valid, id: 'b', pinned: true }] }

    expect(hydrate(stored).notes).toHaveLength(2)
    expect(hydrate(stored).notes[0]).toEqual(valid)
  })

  it('does not hand the reducer the same object it was given', () => {
    const stored = { version: 1, notes: [valid] }

    expect(hydrate(stored)).not.toBe(stored)
  })

  it('accepts every colour in the palette', () => {
    const notes = (['butter', 'apricot', 'rose', 'lilac', 'sky', 'mint'] as const).map(
      (color, index) => ({ ...valid, id: `n${index}`, color }),
    )

    expect(hydrate({ version: 1, notes }).notes).toHaveLength(6)
  })

  it('is pure — calling it twice on the same input gives equal results', () => {
    // useReducer's lazy initialiser runs it twice under StrictMode.
    const stored = { version: 1, notes: [valid] }

    expect(hydrate(stored)).toEqual(hydrate(stored))
  })
})
