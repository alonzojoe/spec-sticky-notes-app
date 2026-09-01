// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
import type { Note } from '@/types/note'

const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  body: 'a thought',
  color: 'butter',
  date: '2026-09-01',
  order: 1,
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
 * jsdom runs no layout, so every rectangle is zero and the board's hit test has nothing real
 * to read. The board reads rects straight off the rendered cards, so injecting them here
 * exercises the production path unchanged — a mocked drag hook would only prove the mock
 * agrees with itself.
 *
 * One column, stacked, which is what a zero-width board would give anyway.
 */
const CARD = { width: 224, height: 120 }
const GAP_Y = 16

const layOutBoard = () => {
  const cards = [...document.querySelectorAll('[data-slot="note-card"]')]
  if (cards.length === 0) throw new Error('no cards rendered')
  cards.forEach((card, index) => {
    const top = index * (CARD.height + GAP_Y)
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top,
      right: CARD.width,
      bottom: top + CARD.height,
      width: CARD.width,
      height: CARD.height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect)
    Object.defineProperty(card, 'offsetTop', { value: top, configurable: true })
  })
}

/** The centre of the card currently rendered at position `index`. */
const centreOf = (index: number) => ({
  clientX: CARD.width / 2,
  clientY: index * (CARD.height + GAP_Y) + CARD.height / 2,
})

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
    fireEvent.click(screen.getAllByTestId('open')[0])

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

    fireEvent.click(screen.getAllByTestId('open')[0])
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
    date: '2026-09-01',
    x: 10,
    y: 20,
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
