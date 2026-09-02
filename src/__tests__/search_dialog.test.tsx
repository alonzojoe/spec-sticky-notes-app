// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
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

const SEEDED = [
  note({ id: 'standup', order: 9, title: 'Standup with the team', body: 'the merge landed' }),
  note({ id: 'groceries', order: 8, title: 'Groceries', body: 'milk, bread' }),
  note({ id: 'untitled', order: 7, body: 'a standup ran long yesterday' }),
]

const seed = (notes: Note[] = SEEDED) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const readNotes = (): Note[] =>
  JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes ?? []

const field = () => screen.getByRole('combobox', { name: 'Search notes' })
const rows = () => screen.queryAllByRole('option')

/** The query is debounced before it reaches the matcher, so a test must let it settle. */
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(200)
  })

const type = (value: string) => {
  fireEvent.change(field(), { target: { value } })
  settle()
}

const openPalette = () => {
  fireEvent.keyDown(document, { key: 'k', metaKey: true })
  return field()
}

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

// T59 — the shortcut opens it, on either modifier.
describe('T59 · the shortcut', () => {
  // The assertion that makes D2's detection cosmetic. lib/platform.ts decides what the BADGE
  // says and it can be wrong; both modifiers work regardless, on every platform.
  it.each([
    ['Meta+K', { key: 'k', metaKey: true }],
    ['Control+K', { key: 'k', ctrlKey: true }],
  ])('opens the palette on %s', (_name, init) => {
    seed()
    render(<App />)

    fireEvent.keyDown(document, init)

    expect(screen.getByRole('combobox', { name: 'Search notes' })).toBeDefined()
  })

  it('is case-insensitive about the key itself', () => {
    seed()
    render(<App />)

    fireEvent.keyDown(document, { key: 'K', metaKey: true })

    expect(screen.getByRole('combobox', { name: 'Search notes' })).toBeDefined()
  })

  // Firefox binds Ctrl+K to its own search bar and takes it otherwise.
  it('prevents the browser default', () => {
    seed()
    render(<App />)

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it.each([
    ['k alone', { key: 'k' }],
    ['Alt+K', { key: 'k', altKey: true }],
  ])('ignores %s', (_name, init) => {
    seed()
    render(<App />)

    fireEvent.keyDown(document, init)

    expect(screen.queryByRole('combobox', { name: 'Search notes' })).toBeNull()
  })

  /**
   * The one place the two global shortcuts deliberately differ. `n` is a character someone is
   * trying to type, so it is suppressed inside a text field; ⌘K is not a character and cannot be
   * mistaken for typing, so it stays live while a note is being written.
   */
  it('still opens while a note is being written, unlike n', () => {
    seed([note({ id: 'a', body: 'a thought' })])
    render(<App />)

    fireEvent.click(screen.getAllByTestId('open')[0])
    const textarea = screen.getByRole('textbox', { name: 'Note text' })

    fireEvent.keyDown(textarea, { key: 'n' })
    expect(screen.queryByRole('button', { name: 'Add note' })).toBeNull()

    fireEvent.keyDown(textarea, { key: 'k', metaKey: true })
    expect(screen.getByRole('combobox', { name: 'Search notes' })).toBeDefined()
  })

  it('leaves n opening the create dialog', () => {
    seed()
    render(<App />)

    fireEvent.keyDown(document, { key: 'n' })

    expect(screen.getByRole('button', { name: 'Add note' })).toBeDefined()
  })
})

// T60 — typing finds notes, and the list is the matcher's.
describe('T60 · the results', () => {
  it('shows the prompt and no rows for an empty query', () => {
    seed()
    render(<App />)
    openPalette()

    expect(rows()).toHaveLength(0)
    expect(screen.getByText(/search your notes/i)).toBeDefined()
  })

  it('lists one row per hit, in the matcher order', () => {
    seed()
    render(<App />)
    openPalette()

    type('standup')

    // The titled note outranks the one that only mentions it, even though both match.
    expect(rows()).toHaveLength(2)
    expect(rows()[0].textContent).toContain('Standup with the team')
    expect(rows()[1].textContent).toContain('a standup ran long yesterday')
  })

  /**
   * An untitled note has no name, so its excerpt is the row's primary line. Gate 3 found the
   * alternative: three untitled hits rendered as three identical rows reading "Untitled note",
   * with the only distinguishing text demoted to the quiet caption underneath.
   */
  it('leads an untitled row with its text rather than with the word Untitled', () => {
    seed([note({ id: 'a', body: 'a standup ran long' })])
    render(<App />)
    openPalette()

    type('standup')

    expect(rows()[0].textContent).toContain('a standup ran long')
    expect(rows()[0].textContent).not.toContain('Untitled')
  })

  it('falls back to the card\'s own language for a note with no text at all', () => {
    seed([note({ id: 'a', title: 'Standup', body: '' })])
    render(<App />)
    openPalette()

    type('standup')

    // Titled but empty: the title names it and there is no excerpt to caption it with.
    expect(rows()[0].textContent).toContain('Standup')
  })

  it('says so, and names the query, when nothing matches', () => {
    seed()
    render(<App />)
    openPalette()

    type('zzzznothing')

    expect(rows()).toHaveLength(0)
    expect(screen.getByText(/no notes match/i).textContent).toContain('zzzznothing')
  })

  it('counts the results in the footer', () => {
    seed()
    render(<App />)
    openPalette()

    type('standup')

    expect(screen.getByText('2 notes')).toBeDefined()
  })

  it('does not match the link', () => {
    seed([note({ id: 'a', title: 'Standup', link: 'https://meet.google.com/abc' })])
    render(<App />)
    openPalette()

    type('google')

    expect(rows()).toHaveLength(0)
  })
})

// T61 — the keyboard drives the list without losing the caret.
describe('T61 · the roving selection', () => {
  const selectedId = () => field().getAttribute('aria-activedescendant')

  it('selects the first row as soon as there are results', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')

    expect(rows()[0].getAttribute('aria-selected')).toBe('true')
    expect(selectedId()).toBe(rows()[0].id)
  })

  it('moves down and up, and wraps at both ends', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')

    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    expect(rows()[1].getAttribute('aria-selected')).toBe('true')

    // Two results, so a second ArrowDown wraps back to the first.
    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    expect(rows()[0].getAttribute('aria-selected')).toBe('true')

    // And ArrowUp from the first wraps to the last rather than landing on -1.
    fireEvent.keyDown(field(), { key: 'ArrowUp' })
    expect(rows()[1].getAttribute('aria-selected')).toBe('true')
  })

  it('keeps aria-activedescendant naming the selected row', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')

    fireEvent.keyDown(field(), { key: 'ArrowDown' })

    expect(selectedId()).toBe(rows()[1].id)
  })

  /**
   * The half of the roving pattern that is easy to get wrong and invisible until someone types
   * after pressing ArrowDown. If focus ever moves to a row, typing stops working.
   */
  it('never moves DOM focus off the input', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')

    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    fireEvent.keyDown(field(), { key: 'ArrowUp' })

    expect(document.activeElement).toBe(field())
  })

  it('resets the selection to the first row when the query changes', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')
    fireEvent.keyDown(field(), { key: 'ArrowDown' })

    type('standup w')

    expect(rows()[0].getAttribute('aria-selected')).toBe('true')
  })

  it('opens the selected note on Enter and closes the palette', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')

    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(screen.queryByRole('combobox', { name: 'Search notes' })).toBeNull()
    // The second hit is the untitled note, so its body is what the view shows.
    expect((screen.getByRole('textbox', { name: 'Note text' }) as HTMLTextAreaElement).value).toBe(
      'a standup ran long yesterday',
    )
  })

  it('closes on Escape without opening anything', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.queryByRole('combobox', { name: 'Search notes' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Note text' })).toBeNull()
  })

  it('does nothing on Enter when there are no results', () => {
    seed()
    render(<App />)
    openPalette()
    type('zzzznothing')

    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(screen.getByRole('combobox', { name: 'Search notes' })).toBeDefined()
  })
})

/**
 * T62 — the phase's central claim, and what D5 trades the roadmap's original wording for.
 *
 * Read from localStorage rather than from the DOM, so a re-render cannot mask a write.
 */
describe('T62 · the board does not move, dim, or reorder', () => {
  const orders = () =>
    readNotes()
      .map((n) => `${n.id}:${n.order}`)
      .sort()

  it('leaves every order untouched through a whole search', () => {
    seed()
    render(<App />)
    const before = orders()

    openPalette()
    type('standup')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(orders()).toEqual(before)
  })

  /**
   * Queried from the DOM rather than by role, and the reason matters: Radix `aria-hidden`s the
   * board behind any open modal, so a role query returns nothing while the palette is up. That is
   * correct modal behaviour and has nothing to do with filtering — the question here is whether
   * the board still HOLDS every card, which is a DOM question.
   */
  const cards = () => document.querySelectorAll('[data-slot="note-card"]')

  it('renders every card throughout — nothing is filtered out of the board', () => {
    seed()
    render(<App />)
    const before = cards().length
    expect(before).toBe(3)

    openPalette()
    type('standup')

    expect(cards()).toHaveLength(before)
  })

  it('dims no card while the palette is open', () => {
    seed()
    render(<App />)
    openPalette()
    type('standup')

    for (const card of cards()) {
      expect(card.className).not.toMatch(/opacity-|grayscale|dimmed/)
    }
  })
})

// Gate 3 found the footer offering "↑↓ to move · ↵ to open" with nothing to move through.
describe('T60 · the footer only offers what is possible', () => {
  it('drops the movement hints when there are no results', () => {
    seed()
    render(<App />)
    openPalette()

    expect(screen.getByText('esc to close')).toBeDefined()
    expect(screen.queryByText(/to move/)).toBeNull()
  })

  it('offers them once there are', () => {
    seed()
    render(<App />)
    openPalette()

    type('standup')

    expect(screen.getByText(/↑↓ to move/)).toBeDefined()
  })
})
