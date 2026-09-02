import { describe, expect, it } from 'vitest'

import { notesReducer } from '@/context/notes_reducer'
import { EMPTY_BOARD, type BoardState, type Note, type NoteSeed } from '@/types/note'

const seed = (over: Partial<NoteSeed> = {}): NoteSeed => ({
  id: 'seed-1',
  color: 'butter',
  title: '',
  link: '',
  date: '2026-09-01',
  body: '',
  order: 1,
  at: 1_700_000_000_000,
  ...over,
})

const note = (over: Partial<Note> = {}): Note => ({
  id: 'note-1',
  title: '',
  body: 'a thought',
  link: '',
  color: 'sky',
  date: '2026-09-01',
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
      date: '2026-09-01',
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

// T39 — the date rides in on the seed and is edited by its own action, and neither reorders
// anything. mission.md principle 1 survived P5 with one clause intact: the board reorders on
// create, delete and pin and on nothing else.
describe('T39 · notesReducer · the date', () => {
  it('writes the date the seed arrived with', () => {
    const next = notesReducer(frozen(EMPTY_BOARD), {
      type: 'add',
      seed: seed({ date: '2026-09-01' }),
    })

    expect(next.notes[0].date).toBe('2026-09-01')
  })

  it('set_date changes one note and stamps its updatedAt', () => {
    const state = frozen(board([note({ id: 'a', date: '2026-09-01' }), note({ id: 'b' })]))

    const next = notesReducer(state, { type: 'set_date', id: 'a', date: '2026-12-25', at: 900 })

    expect(next.notes.find((n) => n.id === 'a')?.date).toBe('2026-12-25')
    expect(next.notes.find((n) => n.id === 'a')?.updatedAt).toBe(900)
  })

  it('set_date leaves every other note untouched', () => {
    const other = note({ id: 'b', date: '2026-01-01', updatedAt: 1 })
    const state = frozen(board([note({ id: 'a' }), other]))

    const next = notesReducer(state, { type: 'set_date', id: 'a', date: '2026-12-25', at: 900 })

    expect(next.notes.find((n) => n.id === 'b')).toEqual(other)
  })

  it('set_date leaves the order alone, so nothing moves', () => {
    const state = frozen(board([note({ id: 'a', order: 1 }), note({ id: 'b', order: 2 })]))

    const next = notesReducer(state, { type: 'set_date', id: 'a', date: '2020-01-01', at: 900 })

    expect(next.notes.map((n) => n.order)).toEqual([1, 2])
  })

  it('set_date is a no-op for an id that is not on the board', () => {
    const state = frozen(board([note({ id: 'a' })]))

    expect(notesReducer(state, { type: 'set_date', id: 'ghost', date: '2026-12-25', at: 900 }))
      .toEqual(state)
  })

  it('set_color recolours one note without reordering', () => {
    const state = frozen(board([note({ id: 'a', color: 'butter', order: 1 }), note({ id: 'b', order: 2 })]))

    const next = notesReducer(state, { type: 'set_color', id: 'a', color: 'mint', at: 900 })

    expect(next.notes.find((n) => n.id === 'a')?.color).toBe('mint')
    expect(next.notes.find((n) => n.id === 'a')?.updatedAt).toBe(900)
    expect(next.notes.map((n) => n.order)).toEqual([1, 2])
  })
})

// T49 — the title and the link are carried, edited, and never reorder anything.
describe('T49 · notesReducer · the title and the link', () => {
  it('add writes the seed title and link unchanged', () => {
    const next = notesReducer(frozen(EMPTY_BOARD), {
      type: 'add',
      seed: seed({ title: 'Standup', link: 'https://meet.google.com/abc' }),
    })

    expect(next.notes[0].title).toBe('Standup')
    expect(next.notes[0].link).toBe('https://meet.google.com/abc')
  })

  it('edit_title changes one note and stamps it', () => {
    const state = frozen(board([note({ id: 'a' }), note({ id: 'b', title: 'untouched' })]))

    const next = notesReducer(state, { type: 'edit_title', id: 'a', title: 'Standup', at: 900 })

    expect(next.notes.find((n) => n.id === 'a')?.title).toBe('Standup')
    expect(next.notes.find((n) => n.id === 'a')?.updatedAt).toBe(900)
    expect(next.notes.find((n) => n.id === 'b')?.title).toBe('untouched')
    expect(next.notes.find((n) => n.id === 'b')?.updatedAt).toBe(1)
  })

  it('set_link changes one note and stamps it', () => {
    const state = frozen(board([note({ id: 'a' }), note({ id: 'b', link: 'https://b.example' })]))

    const next = notesReducer(state, {
      type: 'set_link',
      id: 'a',
      link: 'https://meet.google.com/abc',
      at: 900,
    })

    expect(next.notes.find((n) => n.id === 'a')?.link).toBe('https://meet.google.com/abc')
    expect(next.notes.find((n) => n.id === 'a')?.updatedAt).toBe(900)
    expect(next.notes.find((n) => n.id === 'b')?.link).toBe('https://b.example')
  })

  // A title can be removed. `''` is the absent value, so clearing the field is a real edit and
  // not something the reducer should quietly decline.
  it('clearing a title to an empty string is a real edit', () => {
    const state = frozen(board([note({ id: 'a', title: 'Standup' })]))

    const next = notesReducer(state, { type: 'edit_title', id: 'a', title: '', at: 900 })

    expect(next.notes[0].title).toBe('')
    expect(next.notes[0].updatedAt).toBe(900)
  })

  it.each([
    ['edit_title', { type: 'edit_title', id: 'ghost', title: 'x', at: 900 }] as const,
    ['set_link', { type: 'set_link', id: 'ghost', link: 'https://x.example', at: 900 }] as const,
  ])('%s is a no-op for an id that is not on the board', (_name, action) => {
    const state = frozen(board([note({ id: 'a' })]))

    expect(notesReducer(state, action)).toEqual(state)
  })

  // mission.md principle 1's surviving clause: the board reorders on create, delete and pin and
  // on nothing else. A title edit must not be what finally breaks it.
  it('neither action touches any note order', () => {
    const state = frozen(
      board([note({ id: 'a', order: 5 }), note({ id: 'b', order: 3 }), note({ id: 'c', order: 9 })]),
    )
    const before = state.notes.map((n) => n.order)

    const titled = notesReducer(state, { type: 'edit_title', id: 'a', title: 'Standup', at: 900 })
    const linked = notesReducer(titled, {
      type: 'set_link',
      id: 'b',
      link: 'https://meet.google.com/abc',
      at: 901,
    })

    expect(titled.notes.map((n) => n.order)).toEqual(before)
    expect(linked.notes.map((n) => n.order)).toEqual(before)
  })
})
