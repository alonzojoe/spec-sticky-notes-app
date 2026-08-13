// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { Board } from '@/components/board/board'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { NotesProvider } from '@/context/notes_context'
import { useNotesDispatch } from '@/context/use_notes'
import { BOARD_KEY } from '@/lib/board_storage'
import { createNoteSeed } from '@/lib/note_factory'
import type { Note } from '@/types/note'

const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  body: 'a thought',
  color: 'butter',
  x: 10,
  y: 20,
  z: 1,
  tilt: -2.1,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const SEEDED = [note({ id: 'a', tilt: -2.1 }), note({ id: 'b', tilt: 1.4, z: 2 })]

/** Lets a test cause a board change that has nothing to do with the notes it is watching. */
function AddOne() {
  const dispatch = useNotesDispatch()
  return (
    <button type="button" onClick={() => dispatch({ type: 'add', seed: createNoteSeed('sky') })}>
      add
    </button>
  )
}

const renderBoard = (notes: Note[] = SEEDED) => {
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))
  return render(
    <NotesProvider>
      <Board />
      <AddOne />
    </NotesProvider>,
  )
}

const transforms = (ids: string[]) =>
  ids.map((id) => screen.getByTestId(`note-${id}`).style.transform)

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
})
afterEach(cleanup)

describe('the board', () => {
  it('renders one card per stored note', () => {
    renderBoard()

    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('renders nothing on an empty board', () => {
    renderBoard([])

    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('places each note at its stored position', () => {
    renderBoard([note({ id: 'a', x: 123, y: 45 })])

    const card = screen.getByTestId('note-a')
    expect(card.style.left).toBe('123px')
    expect(card.style.top).toBe('45px')
  })

  it('gives every note a tilt within the -3..3 range, and never zero', () => {
    renderBoard()

    for (const transform of transforms(['a', 'b'])) {
      const degrees = Number(transform.match(/rotate\((-?[\d.]+)deg\)/)?.[1])
      expect(Number.isNaN(degrees)).toBe(false)
      expect(degrees).not.toBe(0)
      expect(Math.abs(degrees)).toBeLessThanOrEqual(3)
    }
  })

  // mission.md names a recomputed tilt as a bug by name.
  it('keeps every tilt identical across a re-render', () => {
    const { rerender } = renderBoard()
    const before = transforms(['a', 'b'])

    rerender(
      <NotesProvider>
        <Board />
        <AddOne />
      </NotesProvider>,
    )

    expect(transforms(['a', 'b'])).toEqual(before)
  })

  // Tilt now comes from the store rather than a fixture, which makes the original risk real
  // for the first time: a Math.random() in a render path survives the assertion above and
  // dies here, because an unrelated board change re-renders every card.
  it('keeps every tilt identical when an unrelated note is added', () => {
    renderBoard()
    const before = transforms(['a', 'b'])

    fireEvent.click(screen.getByRole('button', { name: 'add' }))

    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(transforms(['a', 'b'])).toEqual(before)
  })
})

describe('the board · stacking', () => {
  it('applies the stored z as the z-index', () => {
    renderBoard([note({ id: 'a', z: 3 }), note({ id: 'b', z: 7 })])

    expect(screen.getByTestId('note-a').style.zIndex).toBe('3')
    expect(screen.getByTestId('note-b').style.zIndex).toBe('7')
  })
})
