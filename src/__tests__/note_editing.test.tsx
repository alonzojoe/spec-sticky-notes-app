// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
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
}


const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  body: 'a thought',
  color: 'butter',
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  ...over,
})

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const readNotes = (): Note[] => JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes ?? []

const body = () => screen.getByRole('button', { name: /a thought|Empty note/ })
const textarea = () => screen.getByRole('textbox', { name: 'Note text' })

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('a note that is not being edited', () => {
  it('renders its body inside a real button, not a div with a handler', () => {
    seed([note()])

    render(<App />)

    expect(body().tagName).toBe('BUTTON')
  })

  it('shows a placeholder for an empty note without storing it', () => {
    seed([note({ body: '' })])

    render(<App />)

    expect(screen.getByText('Empty note')).toBeDefined()
    expect(readNotes()[0].body).toBe('')
  })

  it('shows no textarea until it is asked for', () => {
    seed([note()])

    render(<App />)

    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('entering edit mode', () => {
  it('swaps the body for a textarea carrying the current text', () => {
    seed([note()])
    render(<App />)

    fireEvent.click(body())

    expect((textarea() as HTMLTextAreaElement).value).toBe('a thought')
  })

  it('focuses the textarea so typing can start immediately', () => {
    seed([note()])
    render(<App />)

    fireEvent.click(body())

    expect(document.activeElement).toBe(textarea())
  })

  it('opens a freshly created note ready for typing', () => {
    render(<App />)

    addNote('Butter')

    expect(document.activeElement).toBe(textarea())
  })

  it('opens only the newest note when a second is created', () => {
    render(<App />)

    addNote('Butter')
    addNote('Sky')

    // startEditing is an initial value, not a binding. The new textarea's autoFocus blurs
    // the old one, which saves and closes it. That cascade is what keeps this at one.
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })
})

describe('saving what was typed', () => {
  it('persists on blur without waiting for the debounce', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(body())

    fireEvent.change(textarea(), { target: { value: 'a better thought' } })
    fireEvent.blur(textarea())

    // No timer advance. The last keystroke before leaving a note is the one most easily
    // lost, and this is the assertion that it is not.
    expect(screen.getByRole('button', { name: 'a better thought' })).toBeDefined()
  })

  it('persists while typing once both debounces elapse, without blurring', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(body())

    fireEvent.change(textarea(), { target: { value: 'still typing' } })

    // Two debounces chain here, deliberately: the card coalesces keystrokes into a dispatch,
    // then the provider coalesces board changes into a write. Neither is redundant — the
    // first keeps the reducer quiet, the second keeps localStorage quiet — but together they
    // mean a write while typing lands up to ~600ms after the last keystroke. Blurring skips
    // the first, which is why the test above needs no timers at all.
    // act() because the debounced callback dispatches: a state update fired from a timer
    // rather than an event is not flushed otherwise, and the effect that writes never runs.
    act(() => void vi.advanceTimersByTime(400))
    expect(screen.getByRole('textbox')).toBeDefined()

    act(() => void vi.advanceTimersByTime(400))
    expect(readNotes()[0].body).toBe('still typing')
  })

  it('writes the text through to storage', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(body())

    fireEvent.change(textarea(), { target: { value: 'written down' } })
    fireEvent.blur(textarea())
    vi.advanceTimersByTime(400)

    expect(readNotes()[0].body).toBe('written down')
  })

  it('leaves edit mode on blur', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(body())

    fireEvent.blur(textarea())

    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('leaves edit mode on Escape and keeps what was typed', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(body())

    fireEvent.change(textarea(), { target: { value: 'escaped but kept' } })
    fireEvent.keyDown(textarea(), { key: 'Escape' })

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'escaped but kept' })).toBeDefined()
  })

  it('does not touch any other note', () => {
    seed([note({ id: 'a' }), note({ id: 'b', body: 'untouched' })])
    render(<App />)

    fireEvent.click(body())
    fireEvent.change(textarea(), { target: { value: 'changed' } })
    fireEvent.blur(textarea())
    vi.advanceTimersByTime(400)

    expect(readNotes().find((n) => n.id === 'b')?.body).toBe('untouched')
  })
})

// The proof that the textarea is uncontrolled lives in note_controls.test.tsx: it needs an
// unrelated board change to re-render the note, and pinning another note is the only one
// that does not also move focus.
