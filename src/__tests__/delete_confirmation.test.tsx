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
  title: '',
  body: '',
  link: '',
  color: 'butter',
  date: '2026-09-01',
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const readNotes = (): Note[] =>
  JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes ?? []

const flush = () =>
  act(() => {
    vi.advanceTimersByTime(400)
  })

const openNote = (id = 'a') => {
  const opener = screen.getByTestId(`note-${id}`).querySelector('[data-testid="open"]')
  fireEvent.click(opener as Element)
}

const pressDelete = () => {
  const dialog = screen.getByRole('dialog')
  fireEvent.click(dialog.querySelector('[data-testid="delete"]') as Element)
}

const alert = () => screen.queryByRole('alertdialog')
const cards = () => document.querySelectorAll('[data-slot="note-card"]')

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

// T64 — a note with content asks first.
describe('T64 · a note with something in it confirms', () => {
  /**
   * All three arms asserted separately. `hasContent` is an `||`, so a bug in any one of them is
   * invisible from the other two.
   */
  it.each([
    ['a body', { body: 'a thought' }],
    ['only a title', { title: 'Standup' }],
    ['only a link', { link: 'https://meet.google.com/abc' }],
  ])('opens the alert for a note with %s', (_name, over) => {
    seed([note(over)])
    render(<App />)
    openNote()

    pressDelete()

    expect(alert()).not.toBeNull()
    expect(cards()).toHaveLength(1)
  })

  it('names the note by its title', () => {
    seed([note({ title: 'Standup with the team', body: 'x' })])
    render(<App />)
    openNote()

    pressDelete()

    expect(alert()?.textContent).toContain('Standup with the team')
  })

  it('says “this note” when it has no title', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)
    openNote()

    pressDelete()

    expect(alert()?.textContent).toContain('this note')
  })

  it('leaves the note on the board when cancelled, with the view still open', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)
    openNote()
    pressDelete()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    flush()

    expect(readNotes()).toHaveLength(1)
    expect(cards()).toHaveLength(1)
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('removes it and closes both dialogs when confirmed', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)
    openNote()
    pressDelete()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    flush()

    expect(readNotes()).toHaveLength(0)
    expect(cards()).toHaveLength(0)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(alert()).toBeNull()
  })

  // A destructive confirmation whose button says OK is one nobody reads.
  it('labels the destructive button Delete, never OK', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)
    openNote()

    pressDelete()

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined()
    expect(screen.queryByRole('button', { name: /^ok$/i })).toBeNull()
  })

  // The difference between a guard and a speed bump: Enter on a dialog you did not read.
  it('puts the default focus on Cancel', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)
    openNote()

    pressDelete()

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
  })

  /**
   * One Escape, one outcome. If the key escapes to the outer dialog, a single press cancels the
   * delete AND closes the note, which is two results for one intent.
   */
  it('cancels the alert on Escape without closing the note view', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)
    openNote()
    pressDelete()

    fireEvent.keyDown(alert() as Element, { key: 'Escape' })
    flush()

    expect(alert()).toBeNull()
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(readNotes()).toHaveLength(1)
  })
})

// T65 — an empty note does not ask.
describe('T65 · an empty note goes immediately', () => {
  it('deletes with no alert at all', () => {
    seed([note()])
    render(<App />)
    openNote()

    pressDelete()
    flush()

    expect(alert()).toBeNull()
    expect(readNotes()).toHaveLength(0)
    expect(cards()).toHaveLength(0)
  })

  /**
   * The assertion that pins D6's rule to the three fields it names. Every note has a date and a
   * colour whether you chose them or not, so counting either would make every note confirm and
   * collapse the rule to "always ask".
   */
  it('still counts as empty with a date, a colour and a pin', () => {
    seed([note({ date: '2026-12-25', color: 'mint', pinned: true })])
    render(<App />)
    openNote()

    pressDelete()
    flush()

    expect(alert()).toBeNull()
    expect(readNotes()).toHaveLength(0)
  })

  it('closes the view it was deleted from', () => {
    seed([note()])
    render(<App />)
    openNote()

    pressDelete()

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

/**
 * The card's own delete control. Deleting is something you decide about a note you can see from
 * across the board, so making you open it first would be a worse trade than the one control costs.
 * Both entry points share one confirmation, mounted once in the shell.
 */
describe('T64 · deleting from the card', () => {
  const cardDelete = (id = 'a') => {
    const button = screen.getByTestId(`note-${id}`).querySelector('[data-testid="delete"]')
    if (!(button instanceof HTMLElement)) throw new Error(`no delete control on ${id}`)
    return button
  }

  it('asks first for a note with something in it', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)

    fireEvent.click(cardDelete())

    expect(alert()).not.toBeNull()
    expect(cards()).toHaveLength(1)
  })

  it('deletes an empty note straight from the board', () => {
    seed([note()])
    render(<App />)

    fireEvent.click(cardDelete())
    flush()

    expect(alert()).toBeNull()
    expect(readNotes()).toHaveLength(0)
  })

  // The collision the old T46 assertion guarded, restored now that the control is back.
  it('does not open the note it is deleting', () => {
    seed([note({ body: 'a thought' })])
    render(<App />)

    fireEvent.click(cardDelete())

    expect(screen.queryByRole('textbox', { name: 'Note text' })).toBeNull()
  })

  it('does not begin a drag from the delete control', () => {
    seed([note({ id: 'a', body: 'x', order: 2 }), note({ id: 'b', body: 'y', order: 1 })])
    render(<App />)
    const button = cardDelete('a')

    fireEvent.pointerDown(button, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(button, { clientX: 200, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(button, { clientX: 200, clientY: 0, pointerId: 1 })

    expect(screen.getByTestId('note-a').dataset.dragging).toBeUndefined()
  })

  it('confirms once, from either entry point, and there is only one alert in the tree', () => {
    seed([note({ id: 'a', body: 'x' }), note({ id: 'b', body: 'y', order: 2 })])
    render(<App />)

    fireEvent.click(cardDelete('a'))

    // One dialog for the whole board, not one per card.
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(alert()?.textContent).toContain('this note')
  })

  it('closes the note view when the note it is showing is deleted from the card', () => {
    seed([note({ id: 'a', body: 'a thought' })])
    render(<App />)
    openNote('a')

    // The view is open; delete the same note through the shared confirmation.
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog.querySelector('[data-testid="delete"]') as Element)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    flush()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(readNotes()).toHaveLength(0)
  })
})
