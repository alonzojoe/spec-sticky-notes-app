import { describe, expect, it } from 'vitest'

import { notesReducer } from '@/context/notes_reducer'
import { EMPTY_BOARD, type BoardState, type Note, type NoteSeed } from '@/types/note'

const seed = (over: Partial<NoteSeed> = {}): NoteSeed => ({
  id: 'seed-1',
  color: 'butter',
  body: '',
  order: 1,
  at: 1_700_000_000_000,
  ...over,
})

const note = (over: Partial<Note> = {}): Note => ({
  id: 'note-1',
  body: 'a thought',
  color: 'sky',
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const board = (notes: Note[]): BoardState => ({ version: 1, notes })

/**
 * The reducer must never mutate what it is handed. Freezing the board and every note in it
 * turns a `notes.push(...)` or a `note.pinned = !note.pinned` into a thrown TypeError rather
 * than a test that quietly passes every other assertion in this file.
 */
const frozen = (state: BoardState): BoardState =>
  Object.freeze({ ...state, notes: Object.freeze(state.notes.map((n) => Object.freeze(n))) as Note[] })

describe('notesReducer · add', () => {
  it('appends a note built from the seed', () => {
    const next = notesReducer(frozen(EMPTY_BOARD), { type: 'add', seed: seed() })

    expect(next.notes).toHaveLength(1)
    expect(next.notes[0]).toMatchObject({
      id: 'seed-1',
      body: '',
      color: 'butter',
      order: 1,
      pinned: false,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('does not leak the seed timestamp onto the note as `at`', () => {
    const next = notesReducer(frozen(EMPTY_BOARD), { type: 'add', seed: seed() })

    expect(next.notes[0]).not.toHaveProperty('at')
  })



  it('appends rather than prepends, because array order is tab order', () => {
    const state = frozen(board([note({ id: 'a' }), note({ id: 'b' })]))

    const next = notesReducer(state, { type: 'add', seed: seed({ id: 'new' }) })

    expect(next.notes.map((n) => n.id)).toEqual(['a', 'b', 'new'])
  })
})

describe('notesReducer · edit_body', () => {
  it('sets the body and stamps updatedAt from the action', () => {
    const state = frozen(board([note({ id: 'a', body: 'old', updatedAt: 1 })]))

    const next = notesReducer(state, { type: 'edit_body', id: 'a', body: 'new', at: 500 })

    expect(next.notes[0].body).toBe('new')
    expect(next.notes[0].updatedAt).toBe(500)
  })

  it('leaves every other field of the target untouched', () => {
    const target = note({ id: 'a', body: 'old', pinned: true, createdAt: 7, updatedAt: 7 })
    const state = frozen(board([target]))

    const next = notesReducer(state, { type: 'edit_body', id: 'a', body: 'new', at: 500 })

    expect(next.notes[0]).toEqual({ ...target, body: 'new', updatedAt: 500 })
  })

  it('touches no other note', () => {
    const other = note({ id: 'b', body: 'untouched' })
    const state = frozen(board([note({ id: 'a' }), other]))

    const next = notesReducer(state, { type: 'edit_body', id: 'a', body: 'new', at: 500 })

    expect(next.notes[1]).toBe(other)
  })

  it('is a no-op for an id that is not on the board', () => {
    const state = frozen(board([note({ id: 'a', body: 'kept' })]))

    const next = notesReducer(state, { type: 'edit_body', id: 'ghost', body: 'new', at: 500 })

    expect(next.notes).toEqual(state.notes)
  })
})

describe('notesReducer · toggle_pin', () => {
  it('flips pinned and stamps updatedAt', () => {
    const state = frozen(board([note({ id: 'a', pinned: false, updatedAt: 1 })]))

    const next = notesReducer(state, { type: 'toggle_pin', id: 'a', at: 500 })

    expect(next.notes[0].pinned).toBe(true)
    expect(next.notes[0].updatedAt).toBe(500)
  })

  it('returns to the original pinned value when applied twice', () => {
    const state = frozen(board([note({ id: 'a', pinned: false })]))

    const once = notesReducer(state, { type: 'toggle_pin', id: 'a', at: 500 })
    const twice = notesReducer(once, { type: 'toggle_pin', id: 'a', at: 600 })

    expect(twice.notes[0].pinned).toBe(false)
  })


  // P5: pinning moves a note to the front of the pinned group at render and never rewrites
  // its stamp, so un-pinning returns it to exactly its place among the rest.
  it('does not change the note\'s place in the order', () => {
    const state = frozen(board([note({ id: 'a', order: 42 })]))

    const next = notesReducer(state, { type: 'toggle_pin', id: 'a', at: 500 })

    expect(next.notes[0].order).toBe(42)
  })

  it('is a no-op for an id that is not on the board', () => {
    const state = frozen(board([note({ id: 'a' })]))

    const next = notesReducer(state, { type: 'toggle_pin', id: 'ghost', at: 500 })

    expect(next.notes).toEqual(state.notes)
  })
})

describe('notesReducer · delete', () => {
  it('removes exactly the target and keeps the rest in order', () => {
    const state = frozen(board([note({ id: 'a' }), note({ id: 'b' }), note({ id: 'c' })]))

    const next = notesReducer(state, { type: 'delete', id: 'b' })

    expect(next.notes.map((n) => n.id)).toEqual(['a', 'c'])
  })

  it('is a no-op for an id that is not on the board', () => {
    const state = frozen(board([note({ id: 'a' })]))

    const next = notesReducer(state, { type: 'delete', id: 'ghost' })

    expect(next.notes).toEqual(state.notes)
  })

  it('empties the board when the last note goes', () => {
    const state = frozen(board([note({ id: 'a' })]))

    const next = notesReducer(state, { type: 'delete', id: 'a' })

    expect(next.notes).toEqual([])
  })
})

describe('notesReducer · invariants', () => {
  it('keeps version at 1 through every action', () => {
    const state = frozen(board([note({ id: 'a' })]))

    expect(notesReducer(state, { type: 'add', seed: seed() }).version).toBe(1)
    expect(notesReducer(state, { type: 'edit_body', id: 'a', body: 'x', at: 1 }).version).toBe(1)
    expect(notesReducer(state, { type: 'toggle_pin', id: 'a', at: 1 }).version).toBe(1)
    expect(notesReducer(state, { type: 'delete', id: 'a' }).version).toBe(1)
  })

  it('never mutates the state it is given', () => {
    const state = frozen(board([note({ id: 'a', body: 'original', pinned: false })]))

    notesReducer(state, { type: 'add', seed: seed() })
    notesReducer(state, { type: 'edit_body', id: 'a', body: 'changed', at: 1 })
    notesReducer(state, { type: 'toggle_pin', id: 'a', at: 1 })
    notesReducer(state, { type: 'delete', id: 'a' })

    expect(state.notes).toHaveLength(1)
    expect(state.notes[0].body).toBe('original')
    expect(state.notes[0].pinned).toBe(false)
  })
})

// P3 · D4. The dialog chooses colour and text together, so `body` rides in on the seed and
// creation stays one dispatch. Dispatching `add` then `edit_body` would leave
// `updatedAt !== createdAt`, which is the equality board.tsx reads to decide what opens
// focused.
describe('notesReducer · add carries the seed body', () => {
  it('writes the body the seed arrived with', () => {
    const next = notesReducer(frozen(EMPTY_BOARD), { type: 'add', seed: seed({ body: 'buy milk' }) })

    expect(next.notes[0].body).toBe('buy milk')
  })

  it('leaves createdAt equal to updatedAt even when the note is born with text', () => {
    const next = notesReducer(frozen(EMPTY_BOARD), { type: 'add', seed: seed({ body: 'buy milk' }) })
    const [note] = next.notes

    expect(note.createdAt).toBe(note.updatedAt)
  })

  it('still produces an empty body when the seed carries none', () => {
    const next = notesReducer(frozen(EMPTY_BOARD), { type: 'add', seed: seed() })

    expect(next.notes[0].body).toBe('')
  })
})

// T27-T29 — the ordering rules. `order` is descending: higher is earlier in the grid.
// P5 removed `z` along with x and y: a grid does not stack, and a field nothing reads drifts.
// The suites that covered it are gone rather than adapted — there is no behaviour left there.
describe('notesReducer · ordering', () => {
  it('T27 · add stamps above every existing note and renumbers nothing', () => {
    const state = frozen(
      board([note({ id: 'a', order: 1 }), note({ id: 'b', order: 2 }), note({ id: 'c', order: 3 })]),
    )

    const next = notesReducer(state, { type: 'add', seed: seed({ id: 'd', order: 7 }) })

    expect(next.notes.find((n) => n.id === 'd')?.order).toBe(7)
    expect(next.notes.filter((n) => n.id !== 'd').map((n) => n.order)).toEqual([1, 2, 3])
  })

  it('T28 · delete renumbers nothing; the gap closes at render, by rank', () => {
    const state = frozen(
      board([
        note({ id: 'a', order: 1 }),
        note({ id: 'b', order: 2 }),
        note({ id: 'c', order: 3 }),
        note({ id: 'd', order: 4 }),
        note({ id: 'e', order: 5 }),
      ]),
    )

    const next = notesReducer(state, { type: 'delete', id: 'c' })

    // A reducer that renumbered here would touch updatedAt on notes nobody edited.
    expect(next.notes.map((n) => [n.id, n.order])).toEqual([
      ['a', 1],
      ['b', 2],
      ['d', 4],
      ['e', 5],
    ])
  })

  it('T29 · swap_order exchanges two stamps and stamps both updatedAt', () => {
    const state = frozen(
      board([note({ id: 'a', order: 1 }), note({ id: 'b', order: 5 }), note({ id: 'c', order: 3 })]),
    )

    const next = notesReducer(state, { type: 'swap_order', a: 'a', b: 'b', at: 900 })

    expect(next.notes.find((n) => n.id === 'a')?.order).toBe(5)
    expect(next.notes.find((n) => n.id === 'b')?.order).toBe(1)
    expect(next.notes.find((n) => n.id === 'a')?.updatedAt).toBe(900)
    expect(next.notes.find((n) => n.id === 'b')?.updatedAt).toBe(900)
  })

  it('T29 · leaves every other note completely alone', () => {
    const untouched = note({ id: 'c', order: 3, updatedAt: 1 })
    const state = frozen(board([note({ id: 'a', order: 1 }), note({ id: 'b', order: 5 }), untouched]))

    const next = notesReducer(state, { type: 'swap_order', a: 'a', b: 'b', at: 900 })

    expect(next.notes.find((n) => n.id === 'c')).toEqual(untouched)
  })

  // The drop handler hit tests against rendered geometry, so a stale id is a miss rather than
  // a bug worth crashing the board over.
  it('T29 · is a no-op for a self-swap or an id that is not on the board', () => {
    const state = frozen(board([note({ id: 'a', order: 1 }), note({ id: 'b', order: 5 })]))

    expect(notesReducer(state, { type: 'swap_order', a: 'a', b: 'a', at: 900 })).toBe(state)
    expect(notesReducer(state, { type: 'swap_order', a: 'a', b: 'ghost', at: 900 })).toBe(state)
    expect(notesReducer(state, { type: 'swap_order', a: 'ghost', b: 'b', at: 900 })).toBe(state)
  })
})
