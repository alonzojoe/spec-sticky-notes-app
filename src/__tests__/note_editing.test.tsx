// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
import { loadRouter } from '@/__tests__/router_setup'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
import type { Note } from '@/types/note'

const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  body: 'a thought',
  color: 'butter',
  title: '',
  link: '',
  date: '2026-09-01',
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  ...over,
})

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const readNotes = (): Note[] => JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes ?? []

const body = () => screen.getAllByTestId('open')[0]
const textarea = () => screen.getByRole('textbox', { name: 'Note text' })
const view = () => screen.queryByRole('dialog')
const openNote = (index = 0) => fireEvent.click(screen.getAllByTestId('open')[index])
/**
 * Two debounces chain, deliberately: the view coalesces keystrokes into a dispatch, then the
 * provider coalesces board changes into a write. Neither is redundant — the first keeps the
 * reducer quiet, the second keeps localStorage quiet — so a test that reads storage has to let
 * the second one land even when the first was cancelled.
 */
const flush = () =>
  act(() => {
    vi.advanceTimersByTime(400)
  })

const dismiss = () => {
  const dialog = view()
  if (dialog !== null) fireEvent.keyDown(dialog, { key: 'Escape' })
}

// The router matches its first location asynchronously; loading it here is what makes a
// synchronous render produce a board rather than an empty div. See router_setup.ts.
beforeAll(loadRouter)

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

/**
 * P6 moved reading and editing off the card and into the note's own view. Every claim this
 * file used to make is still a claim this app makes — autosave on change, an immediate write
 * on dismissal, text that survives a reload, and no other note touched — so the suite is
 * rewritten against the new control rather than deleted. Only where the editing happens
 * changed.
 */
describe('a card is a summary', () => {
  it('shows its body inside a real button, not a div with a handler', () => {
    seed([note()])
    render(<App />)

    expect(body().tagName).toBe('BUTTON')
    expect(body().textContent).toContain('a thought')
  })

  it('shows a placeholder for an empty note without storing it', () => {
    seed([note({ body: '' })])
    render(<App />)

    expect(body().textContent).toContain('Empty note')
    expect(readNotes()[0].body).toBe('')
  })

  it('carries no textarea of its own', () => {
    seed([note()])
    render(<App />)

    // D6: the card stopped being an editor. A hidden textarea would pass every other
    // assertion here and fail this one.
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('shows the date top-left, formatted MM/DD/YYYY', () => {
    seed([note({ date: '2026-09-01' })])
    render(<App />)

    expect(screen.getByText('09/01/2026')).toBeDefined()
  })

  it('clamps the body rather than growing the card', () => {
    seed([note({ body: 'a very long note\n'.repeat(40) }), note({ id: 'b', body: 'short' })])
    render(<App />)

    // jsdom runs no layout, so heights are all zero and a rect comparison would pass
    // vacuously. The clamp and the fixed height are asserted from the classes that cause them.
    // P7 grew the card to h-52 to hold the title and the link chip, and made the clamp depend
    // on which of those the note has. Neither note here has either, so both take the widest
    // clamp — see BODY_LINES in note_card.tsx.
    const cards = screen.getAllByRole('article')
    for (const card of cards) expect(card.className).toContain('h-52')
    expect(document.querySelector('.line-clamp-5')).not.toBeNull()
  })
})

describe('opening a note', () => {
  it('opens the view with the full body, including what the card clamped', () => {
    seed([note({ body: 'a thought that goes on' })])
    render(<App />)

    openNote()

    expect(view()).not.toBeNull()
    expect((textarea() as HTMLTextAreaElement).value).toBe('a thought that goes on')
  })

  it('focuses the textarea so typing can start immediately', () => {
    seed([note()])
    render(<App />)

    openNote()

    expect(document.activeElement).toBe(textarea())
  })

  it('shows the right note when a second one is opened', () => {
    seed([note({ id: 'a', body: 'first', order: 2 }), note({ id: 'b', body: 'second', order: 1 })])
    render(<App />)

    openNote(0)
    expect((textarea() as HTMLTextAreaElement).value).toBe('first')
    dismiss()

    openNote(1)
    // The dialog does not unmount between notes the way the card did, so without a key on the
    // textarea this still reads 'first'. Invisible without a second note.
    expect((textarea() as HTMLTextAreaElement).value).toBe('second')
  })

  it('opens a freshly created note straight away', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(view()).not.toBeNull()
    expect(document.activeElement).toBe(textarea())
  })

  it('does not open anything when a stored board is merely loaded', () => {
    // The heuristic P2 used could not tell a note made just now from one read out of storage.
    // That was harmless while it only chose where focus went; opening a modal on every reload
    // is not.
    seed([note({ id: 'a', body: '', createdAt: 5, updatedAt: 5 })])
    render(<App />)

    expect(view()).toBeNull()
  })
})

describe('saving what was typed', () => {
  it('persists on dismissal without waiting for the debounce', () => {
    seed([note()])
    render(<App />)

    openNote()
    fireEvent.change(textarea(), { target: { value: 'written down' } })
    dismiss()

    // The dispatch is immediate — the card shows it before any timer runs, which is the claim
    // that the last keystroke before dismissal is never the one that is lost.
    expect(body().textContent).toContain('written down')
    flush()
    expect(readNotes()[0].body).toBe('written down')
  })

  it('persists while typing once both debounces elapse, without dismissing', () => {
    seed([note()])
    render(<App />)

    openNote()
    fireEvent.change(textarea(), { target: { value: 'still typing' } })
    // Advanced twice on purpose. The first advance fires the view's debounce, which dispatches;
    // React commits that update after the advance returns, and only then is the provider's
    // write debounce scheduled. One long advance runs the first timer and schedules the second
    // without ever reaching it.
    flush()
    flush()

    // ~600ms after the last keystroke, both debounces having elapsed. Dismissing skips the
    // wait; typing on does not.
    expect(readNotes()[0].body).toBe('still typing')
  })

  it('offers no Save button, and no Cancel', () => {
    seed([note()])
    render(<App />)

    openNote()

    // mission.md principle 3 was NOT amended by this phase: "There is no Save button. State is
    // written as it changes." A Save button would create the state where what is on screen is
    // not what is stored, which is the state the persistence contract exists to prevent.
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull()
  })

  it('closes and keeps what was typed on Escape', () => {
    seed([note()])
    render(<App />)

    openNote()
    fireEvent.change(textarea(), { target: { value: 'escaped but kept' } })
    dismiss()
    flush()

    expect(view()).toBeNull()
    expect(readNotes()[0].body).toBe('escaped but kept')
  })

  it('saves through the same path when Done is pressed', () => {
    seed([note()])
    render(<App />)

    openNote()
    fireEvent.change(textarea(), { target: { value: 'done with it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    flush()

    expect(view()).toBeNull()
    expect(readNotes()[0].body).toBe('done with it')
  })

  it('does not touch any other note', () => {
    seed([note({ id: 'a', body: 'first', order: 2 }), note({ id: 'b', body: 'second', order: 1 })])
    render(<App />)

    openNote(0)
    fireEvent.change(textarea(), { target: { value: 'changed' } })
    dismiss()
    flush()

    expect(readNotes().find((n) => n.id === 'b')?.body).toBe('second')
  })
})

describe('editing the colour and the date from the view', () => {
  it('recolours the note immediately, without a debounce', () => {
    seed([note({ color: 'butter' })])
    render(<App />)

    openNote()
    fireEvent.click(screen.getByRole('radio', { name: 'Mint' }))
    flush()

    // Not typed, so not debounced at the view: there is no keystroke storm to absorb. Only the
    // provider's write debounce stands between the click and storage.
    expect(readNotes()[0].color).toBe('mint')
  })

  it('leaves the note where it is when its colour or date changes', () => {
    seed([note({ id: 'a', order: 2 }), note({ id: 'b', order: 1 })])
    render(<App />)
    const before = screen.getAllByRole('article').map((c) => c.getAttribute('data-testid'))

    openNote(1)
    fireEvent.click(screen.getByRole('radio', { name: 'Sky' }))
    dismiss()

    // mission.md principle 1 survived P5 with one clause intact: the board reorders on create,
    // delete and pin, and on nothing else. A date or colour change must not be what breaks it.
    expect(screen.getAllByRole('article').map((c) => c.getAttribute('data-testid'))).toEqual(before)
  })
})
