// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
import { CELL, GUTTER, MARGIN } from '@/lib/grid'
import type { Note } from '@/types/note'

const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  body: 'a thought',
  color: 'butter',
  order: 1,
  z: 1,
  tilt: -1,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  ...over,
})

const THREE = [
  note({ id: 'a', order: 3 }),
  note({ id: 'b', order: 2 }),
  note({ id: 'c', order: 1 }),
]

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const readNotes = (): Note[] => JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes ?? []
const rendered = () =>
  [...document.querySelectorAll('[data-slot="note-card"]')].map((el) => el.getAttribute('data-testid'))
const card = (id: string) => screen.getByTestId(`note-${id}`)

/**
 * jsdom measures every element at zero width, so `columnsFor` gives the board a single
 * column and the grid runs straight down. That is genuinely what the component computes here,
 * so the hit test is exercised against the real arithmetic rather than a mocked layout — a
 * stubbed rectangle would prove the board agrees with the stub, which is not the claim.
 */
const COLUMNS = 1

/** The centre of slot `index`, in the coordinates the board hit-tests against. */
const centreOf = (index: number) => ({
  clientX: MARGIN + (index % COLUMNS) * (CELL.width + GUTTER) + CELL.width / 2,
  clientY: MARGIN + Math.floor(index / COLUMNS) * (CELL.height + GUTTER) + CELL.height / 2,
})

/** Kept as a named no-op so each test reads as "the board has been laid out" at a glance. */
const layOutBoard = () => {
  if (document.querySelector('[data-slot="board"]') === null) throw new Error('no board rendered')
}

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // jsdom implements no pointer capture, though lib.dom's types say otherwise — narrowing on
  // `'setPointerCapture' in HTMLElement.prototype` compiles to `never` and tells you nothing.
  // use_draggable calls all three, so they are stubbed here rather than branched around in
  // production code.
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  cleanup()
})

// T33
describe('T33 · a drag that lands on another note swaps them', () => {
  it('trades the two notes places and moves nothing else', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()

    fireEvent.pointerDown(card('a'), { button: 0, pointerId: 1, ...centreOf(0) })
    fireEvent.pointerMove(card('a'), { pointerId: 1, ...centreOf(2) })
    fireEvent.pointerUp(card('a'), { pointerId: 1, ...centreOf(2) })

    expect(rendered()).toEqual(['note-c', 'note-b', 'note-a'])
  })

  it('stamps updatedAt on both notes, because the arrangement is user data', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()

    fireEvent.pointerDown(card('a'), { button: 0, pointerId: 1, ...centreOf(0) })
    fireEvent.pointerMove(card('a'), { pointerId: 1, ...centreOf(2) })
    fireEvent.pointerUp(card('a'), { pointerId: 1, ...centreOf(2) })
    vi.advanceTimersByTime(400)

    const stored = readNotes()
    expect(stored.find((n) => n.id === 'a')?.updatedAt).toBeGreaterThan(2)
    expect(stored.find((n) => n.id === 'c')?.updatedAt).toBeGreaterThan(2)
    // The note nobody touched keeps the timestamp it had.
    expect(stored.find((n) => n.id === 'b')?.updatedAt).toBe(2)
  })

  it('survives a reload', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()

    fireEvent.pointerDown(card('a'), { button: 0, pointerId: 1, ...centreOf(0) })
    fireEvent.pointerMove(card('a'), { pointerId: 1, ...centreOf(2) })
    fireEvent.pointerUp(card('a'), { pointerId: 1, ...centreOf(2) })
    vi.advanceTimersByTime(400)

    cleanup()
    render(<App />)
    expect(rendered()).toEqual(['note-c', 'note-b', 'note-a'])
  })
})

// T34
describe('T34 · a drag that lands on nothing changes nothing', () => {
  it('dispatches no swap and leaves the order alone', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()
    const before = rendered()

    fireEvent.pointerDown(card('a'), { button: 0, pointerId: 1, ...centreOf(0) })
    // Far below the last row — over the board, over no note.
    fireEvent.pointerMove(card('a'), { pointerId: 1, clientX: 600, clientY: 700 })
    fireEvent.pointerUp(card('a'), { pointerId: 1, clientX: 600, clientY: 700 })

    expect(rendered()).toEqual(before)
  })

  it('ignores a secondary mouse button entirely', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()
    const before = rendered()

    fireEvent.pointerDown(card('a'), { button: 2, pointerId: 1, ...centreOf(0) })
    fireEvent.pointerMove(card('a'), { pointerId: 1, ...centreOf(2) })
    fireEvent.pointerUp(card('a'), { pointerId: 1, ...centreOf(2) })

    expect(rendered()).toEqual(before)
  })
})

// T35 — the assertion that catches the drag swallowing the edit path.
describe('T35 · a click is not a drag', () => {
  it('opens the note for editing when the pointer never moved', () => {
    seed([note({ id: 'a', body: 'written' })])
    render(<App />)
    layOutBoard()

    fireEvent.pointerDown(card('a'), { button: 0, pointerId: 1, ...centreOf(0) })
    fireEvent.pointerUp(card('a'), { pointerId: 1, ...centreOf(0) })
    fireEvent.click(screen.getByRole('button', { name: /written/ }))

    expect(screen.getByRole('textbox', { name: 'Note text' })).toBeDefined()
  })

  it('still counts as a click under the 4px threshold', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()
    const before = rendered()

    const from = centreOf(0)
    fireEvent.pointerDown(card('a'), { button: 0, pointerId: 1, ...from })
    fireEvent.pointerMove(card('a'), { pointerId: 1, clientX: from.clientX + 2, clientY: from.clientY + 1 })
    fireEvent.pointerUp(card('a'), { pointerId: 1, clientX: from.clientX + 2, clientY: from.clientY + 1 })

    expect(rendered()).toEqual(before)
  })
})

// T36
describe('T36 · the keyboard reorders', () => {
  it('swaps with the next note on ArrowRight and back on ArrowLeft', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()

    fireEvent.keyDown(card('a'), { key: 'ArrowRight' })
    expect(rendered()).toEqual(['note-b', 'note-a', 'note-c'])

    fireEvent.keyDown(card('a'), { key: 'ArrowLeft' })
    expect(rendered()).toEqual(['note-a', 'note-b', 'note-c'])
  })

  it('sends a note to the ends with Home and End', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()

    fireEvent.keyDown(card('a'), { key: 'End' })
    expect(rendered()).toEqual(['note-c', 'note-b', 'note-a'])

    fireEvent.keyDown(card('a'), { key: 'Home' })
    expect(rendered()).toEqual(['note-a', 'note-b', 'note-c'])
  })

  it('does nothing at the ends rather than wrapping', () => {
    seed(THREE)
    render(<App />)
    layOutBoard()

    // A wrap here would fling the first note to the last slot on a keypress meant to nudge.
    fireEvent.keyDown(card('a'), { key: 'ArrowLeft' })
    fireEvent.keyDown(card('a'), { key: 'Home' })

    expect(rendered()).toEqual(['note-a', 'note-b', 'note-c'])
  })

  it('leaves the arrow keys to the caret while the note is being written on', () => {
    seed([note({ id: 'a', order: 2, body: 'one' }), note({ id: 'b', order: 1, body: 'two' })])
    render(<App />)
    layOutBoard()

    fireEvent.click(screen.getByRole('button', { name: /one/ }))
    const textarea = screen.getByRole('textbox', { name: 'Note text' })
    fireEvent.keyDown(textarea, { key: 'ArrowRight' })
    fireEvent.keyDown(textarea, { key: 'End' })

    expect(rendered()).toEqual(['note-a', 'note-b'])
  })
})

// T37 — decision D8.
describe('T37 · a board saved before the grid opens ordered', () => {
  const legacy = (id: string, createdAt: number, extra: Record<string, unknown> = {}) => ({
    id,
    body: id,
    color: 'butter',
    x: 10,
    y: 20,
    z: 1,
    tilt: 0,
    pinned: false,
    createdAt,
    updatedAt: createdAt,
    ...extra,
  })

  it('stamps an order onto notes that have none, newest first', () => {
    window.localStorage.setItem(
      BOARD_KEY,
      JSON.stringify({ version: 1, notes: [legacy('old', 100), legacy('mid', 200), legacy('new', 300)] }),
    )

    render(<App />)
    layOutBoard()

    expect(rendered()).toEqual(['note-new', 'note-mid', 'note-old'])
  })

  it('repairs a non-numeric order rather than rendering a NaN slot', () => {
    window.localStorage.setItem(
      BOARD_KEY,
      JSON.stringify({
        version: 1,
        notes: [legacy('a', 100, { order: 'first' }), legacy('b', 200, { order: null })],
      }),
    )

    render(<App />)
    layOutBoard()

    for (const id of ['a', 'b']) {
      expect(card(id).style.transform).not.toContain('NaN')
    }
  })

  it('drops x and y on the way through, and leaves version at 1', () => {
    window.localStorage.setItem(
      BOARD_KEY,
      JSON.stringify({ version: 1, notes: [legacy('a', 100), legacy('b', 200)] }),
    )

    render(<App />)
    layOutBoard()
    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    vi.advanceTimersByTime(400)

    const board = JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}')
    expect(board.version).toBe(1)
    for (const stored of board.notes) {
      expect(stored).not.toHaveProperty('x')
      expect(stored).not.toHaveProperty('y')
      expect(typeof stored.order).toBe('number')
    }
  })
})
