// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { NotesProvider } from '@/context/notes_context'
import { useNotes, useNotesDispatch } from '@/context/use_notes'
import { BOARD_KEY, SIDEBAR_KEY } from '@/lib/board_storage'
import { createNoteSeed } from '@/lib/note_factory'
import type { Note } from '@/types/note'

// P3 replaced the sidebar palette with a dialog, so every note in this file is made through
// it. The assertions below are about what lands on the board, not about the control that
// put it there.
const addNote = (color: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'New note' }))
  fireEvent.click(screen.getByRole('radio', { name: color }))
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
  // The dialog hands the note over one macrotask after it closes, so that it mounts onto a
  // board with nothing competing for focus. See new_note_dialog.tsx.
  act(() => {
    vi.advanceTimersByTime(0)
  })
  // P6: a note created empty opens its view straight away. Dismiss it — these suites are about
  // what reaches the board, not about the view.
  const view = screen.queryByRole('dialog')
  if (view !== null) fireEvent.keyDown(view, { key: 'Escape' })
}


const stored: Note = {
  id: 'stored-1',
  body: 'written before this session',
  color: 'mint',
  title: '',
  link: '',
  date: '2026-09-01',
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
}

const seedStorage = (value: unknown) =>
  window.localStorage.setItem(BOARD_KEY, typeof value === 'string' ? value : JSON.stringify(value))

const readBoard = () => JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? 'null')

// Two things toggle the sidebar and both are named "Toggle Sidebar" — the header trigger and
// the rail. Target the trigger by slot rather than loosening the accessible-name query, which
// would stop noticing if a third one appeared.
const toggle = () => {
  const button = document.querySelector('[data-slot="sidebar-trigger"]')
  if (!(button instanceof HTMLElement)) throw new Error('no sidebar trigger rendered')
  return button
}

/** A minimal consumer, so the store is tested without waiting for the board to use it. */
function Probe() {
  const { notes } = useNotes()
  const dispatch = useNotesDispatch()

  return (
    <div>
      <span data-testid="count">{notes.length}</span>
      <span data-testid="bodies">{notes.map((note) => note.body).join('|')}</span>
      <button type="button" onClick={() => dispatch({ type: 'add', seed: createNoteSeed('butter', 0) })}>
        add
      </button>
    </div>
  )
}

const renderProbe = () =>
  render(
    <NotesProvider>
      <Probe />
    </NotesProvider>,
  )

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('restoring the board', () => {
  it('renders a stored board on the first render, not after an effect', () => {
    seedStorage({ version: 1, notes: [stored] })

    renderProbe()

    // No timer advance, no act() beyond render: the value was there before paint.
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByTestId('bodies').textContent).toBe('written before this session')
  })

  it('loads an empty board from unparseable JSON without throwing', () => {
    seedStorage('{{{')

    expect(() => renderProbe()).not.toThrow()
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('says nothing on the console about a corrupt value', () => {
    // "does not throw" is not the whole bar. usehooks-ts's default deserializer catches its
    // own parse error and console.errors it, which fails Gate 3's clean-console check and
    // leaves the library owning a failure path that D6 says is ours.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    seedStorage('{{{')

    renderProbe()

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('loads an empty board from a future version', () => {
    seedStorage({ version: 9, notes: [] })

    renderProbe()

    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('loads an empty board from a structurally wrong value', () => {
    seedStorage({ version: 1, notes: [{ id: 'a' }] })

    renderProbe()

    expect(screen.getByTestId('count').textContent).toBe('0')
  })
})

describe('writing the board', () => {
  it('does not write on every dispatch', () => {
    renderProbe()

    fireEvent.click(screen.getByRole('button', { name: 'add' }))

    expect(readBoard()?.notes ?? []).toHaveLength(0)
  })

  it('writes once the debounce elapses', () => {
    renderProbe()

    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    vi.advanceTimersByTime(400)

    expect(readBoard().notes).toHaveLength(1)
    expect(readBoard().version).toBe(1)
  })
})

describe('the round trip', () => {
  // The phase's central claim, and the automated stand-in for the manual reload check: make
  // a note, let the write land, throw the whole tree away, mount it again from scratch.
  it('survives an unmount and remount with its colour, tilt and position intact', () => {
    render(<App />)
    addNote('Lilac')

    const before = screen.getAllByRole('article')[0]
    const shape = {
      className: before.className,
      left: before.style.left,
      top: before.style.top,
      transform: before.style.transform,
    }

    vi.advanceTimersByTime(400)
    cleanup()
    render(<App />)

    const after = screen.getAllByRole('article')[0]
    expect(after.className).toBe(shape.className)
    expect(after.style.left).toBe(shape.left)
    expect(after.style.top).toBe(shape.top)
    expect(after.style.transform).toBe(shape.transform)
  })

  it('loses nothing when several notes are made in a row', () => {
    render(<App />)
    addNote('Sky')
    addNote('Rose')
    addNote('Mint')

    vi.advanceTimersByTime(400)
    cleanup()
    render(<App />)

    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByText('3')).toBeDefined()
  })
})

describe('the store contract', () => {
  it('refuses to be read outside the provider', () => {
    // A default empty board would let a component render outside the provider and silently
    // show nothing — a bug that presents as a design problem.
    expect(() => render(<Probe />)).toThrow(/NotesProvider/)
  })
})

describe('the sidebar remembers its own state', () => {
  it('starts expanded with nothing stored', () => {
    render(<App />)

    expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute('data-state')).toBe(
      'expanded',
    )
  })

  it('restores a collapsed sidebar from storage', () => {
    window.localStorage.setItem(SIDEBAR_KEY, 'false')

    render(<App />)

    expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute('data-state')).toBe(
      'collapsed',
    )
  })

  it('writes the collapse to its own key', () => {
    render(<App />)

    fireEvent.click(toggle())

    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe('false')
  })

  it('writes no cookie — P1 deleted shadcn’s and this is the replacement', () => {
    render(<App />)

    fireEvent.click(toggle())

    expect(document.cookie).toBe('')
  })
})
