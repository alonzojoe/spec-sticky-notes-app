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
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const SEEDED = [note({ id: 'a' }), note({ id: 'b' })]

/** Lets a test cause a board change that has nothing to do with the notes it is watching. */
function AddOne() {
  const dispatch = useNotesDispatch()
  return (
    <button type="button" onClick={() => dispatch({ type: 'add', seed: createNoteSeed('sky', 0) })}>
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

  // P5 replaced stored coordinates with a stamp, and then replaced absolute positioning with
  // CSS grid. A card carries no position of its own at all now — the layout engine places it,
  // which is why two cards cannot overlap without a test having to prove it.
  it('positions no card itself; the grid does it', () => {
    renderBoard([note({ id: 'a', order: 1 })])

    const card = screen.getByTestId('note-a')
    expect(card.style.transform).toBe('')
    expect(card.style.left).toBe('')
    expect(card.style.top).toBe('')
    expect(card.className).not.toContain('absolute')
  })

  it('lays the board out as a grid that wraps by available width', () => {
    renderBoard([note({ id: 'a', order: 1 })])

    const board = document.querySelector('[data-slot="board"]') as HTMLElement
    expect(board.className).toContain('grid')
    expect(board.style.gridTemplateColumns).toContain('auto-fill')
  })

  it('draws notes square, with no rotation', () => {
    renderBoard([note({ id: 'a', order: 1 }), note({ id: 'b', order: 2 })])

    // mission.md's tilt criterion was amended in P5: a tilt reads as deliberate only when
    // nothing around it is aligned, and everything on a grid is.
    for (const id of ['a', 'b']) {
      expect(screen.getByTestId(`note-${id}`).style.transform).not.toContain('rotate')
    }
  })

  it('orders notes newest first, by stamp', () => {
    renderBoard([note({ id: 'old', order: 1 }), note({ id: 'new', order: 9 })])

    const rendered = [...document.querySelectorAll('[data-slot="note-card"]')].map((el) =>
      el.getAttribute('data-testid'),
    )
    expect(rendered).toEqual(['note-new', 'note-old'])
  })

  it('draws every note square, whatever the board does around it', () => {
    renderBoard([note({ id: 'a', order: 1 }), note({ id: 'b', order: 2 })])

    // P1 asserted a stable random tilt here. P5 amended that criterion out: the tactility
    // now comes from grain and layered shadow, not from rotation.
    for (const id of ['a', 'b']) {
      expect(screen.getByTestId(`note-${id}`).style.transform).toBe('')
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

describe('the board · a card carries no layout of its own', () => {
  // P2 stacked notes with z-index because they overlapped. A grid does not stack, so `z` went
  // the way of `x` and `y`: a field nothing reads is a field that drifts.
  it('sets no z-index', () => {
    renderBoard([note({ id: 'a' }), note({ id: 'b' })])

    expect(screen.getByTestId('note-a').style.zIndex).toBe('')
    expect(screen.getByTestId('note-b').style.zIndex).toBe('')
  })
})
