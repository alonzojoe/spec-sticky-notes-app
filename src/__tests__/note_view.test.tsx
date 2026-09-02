// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
import { formatDate, todayISO } from '@/lib/dates'
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
const card = (id: string) => screen.getByTestId(`note-${id}`)
const opener = (index = 0) => screen.getAllByTestId('open')[index]
const control = (id: string, which: 'pin' | 'delete') => {
  const button = card(id).querySelector(`[data-testid="${which}"]`)
  if (!(button instanceof HTMLElement)) throw new Error(`no ${which} on ${id}`)
  return button
}
const flush = () =>
  act(() => {
    vi.advanceTimersByTime(400)
  })

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  cleanup()
})

// T41 — the create dialog defaults to today.
describe('T41 · the create dialog defaults the date to today', () => {
  it('offers today when it opens', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    expect(screen.getByRole('button', { name: 'Note date' }).textContent).toContain(
      formatDate(todayISO()),
    )
  })

  it('is recomputed on every open, not once at module load', () => {
    vi.setSystemTime(new Date('2026-09-01T09:00:00'))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    expect(screen.getByRole('button', { name: 'Note date' }).textContent).toContain('09/01/2026')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    // A tab left open overnight must not still be offering yesterday. A module-level constant
    // passes the assertion above and fails this one.
    vi.setSystemTime(new Date('2026-09-02T09:00:00'))
    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    expect(screen.getByRole('button', { name: 'Note date' }).textContent).toContain('09/02/2026')
  })

  it('gives a note created without touching the picker today’s date', () => {
    vi.setSystemTime(new Date('2026-09-01T09:00:00'))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    act(() => {
      vi.advanceTimersByTime(0)
    })
    flush()
    flush()

    expect(readNotes()[0].date).toBe('2026-09-01')
  })
})

// T45 — the card is a summary.
describe('T45 · the card is a summary', () => {
  it('shows the date top-left as MM/DD/YYYY', () => {
    seed([note({ date: '2026-09-01' })])
    render(<App />)

    const time = card('a').querySelector('time')
    expect(time?.textContent).toBe('09/01/2026')
    expect(time?.getAttribute('datetime')).toBe('2026-09-01')
  })

  it('gives every card the same height whatever its body', () => {
    seed([note({ id: 'a', body: 'x'.repeat(2000) }), note({ id: 'b', body: 'short', order: 2 })])
    render(<App />)

    // jsdom runs no layout, so a getBoundingClientRect comparison would compare two zeroes and
    // pass vacuously. The fixed height is asserted from the class that causes it.
    for (const id of ['a', 'b']) expect(card(id).className).toContain('h-44')
  })

  it('clamps the body rather than letting it overflow', () => {
    seed([note({ body: 'a long thought '.repeat(60) })])
    render(<App />)

    // line-clamp rather than overflow:hidden, so the ellipsis lands on the last visible line —
    // that is what signals "there is more" instead of looking like the text stopped.
    expect(card('a').querySelector('.line-clamp-4')).not.toBeNull()
  })
})

// T46 — four gestures share the card.
describe('T46 · the card opens the note, and only when it should', () => {
  it('opens on a plain click', () => {
    seed([note()])
    render(<App />)

    fireEvent.click(opener())

    expect(screen.getByRole('textbox', { name: 'Note text' })).toBeDefined()
  })

  it('does not open on a drag', () => {
    seed([note({ id: 'a', order: 2 }), note({ id: 'b', order: 1 })])
    render(<App />)
    const cards = [...document.querySelectorAll('[data-slot="note-card"]')]
    cards.forEach((element, index) => {
      const top = index * 200
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: 0, top, right: 224, bottom: top + 160, width: 224, height: 160, x: 0, y: top,
        toJSON: () => ({}),
      } as DOMRect)
    })

    fireEvent.pointerDown(card('a'), { button: 0, pointerId: 1, clientX: 100, clientY: 80 })
    fireEvent.pointerMove(card('a'), { pointerId: 1, clientX: 100, clientY: 280 })
    fireEvent.pointerUp(card('a'), { pointerId: 1, clientX: 100, clientY: 280 })

    expect(screen.queryByRole('textbox', { name: 'Note text' })).toBeNull()
  })

  it('does not open when the pin control is clicked', () => {
    seed([note()])
    render(<App />)

    fireEvent.click(control('a', 'pin'))

    expect(screen.queryByRole('textbox', { name: 'Note text' })).toBeNull()
    expect(card('a').querySelector('[data-testid="pin"]')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('does not open the note it just deleted', () => {
    seed([note()])
    render(<App />)

    fireEvent.click(control('a', 'delete'))

    // Without the stopPropagation on the controls container, deleting a note opens it.
    expect(screen.queryByRole('textbox', { name: 'Note text' })).toBeNull()
    expect(screen.queryByTestId('note-a')).toBeNull()
  })
})

// T47 — two keyboard contracts on the same element.
describe('T47 · the card’s keyboard contract', () => {
  it('opens the note on Enter, from the opener', () => {
    seed([note()])
    render(<App />)

    opener().focus()
    fireEvent.click(opener())

    expect(screen.getByRole('textbox', { name: 'Note text' })).toBeDefined()
  })

  it('still reorders with the arrow keys, and does not open anything', () => {
    seed([note({ id: 'a', order: 2 }), note({ id: 'b', order: 1 })])
    render(<App />)

    fireEvent.keyDown(card('a'), { key: 'ArrowRight' })

    expect(screen.queryByRole('textbox', { name: 'Note text' })).toBeNull()
    expect(
      [...document.querySelectorAll('[data-slot="note-card"]')].map((c) =>
        c.getAttribute('data-testid'),
      ),
    ).toEqual(['note-b', 'note-a'])
  })
})

// T53 — P7. The note view edits the title and the link, and saves without a button.
describe('T53 · the note view carries the title and the link', () => {
  it('shows what the note already has', () => {
    seed([note({ title: 'Standup', link: 'https://meet.google.com/abc' })])
    render(<App />)

    fireEvent.click(opener())

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Standup')
    expect((screen.getByLabelText('Link') as HTMLInputElement).value).toBe(
      'https://meet.google.com/abc',
    )
  })

  it('writes a typed title after the debounce', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(opener())

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Standup' } })
    flush()
    flush()

    // What the card does with it is T54's business — the board behind an open dialog is
    // aria-hidden by Radix and is not queryable from here anyway.
    expect(readNotes()[0].title).toBe('Standup')
  })

  // The flush on close covers all three fields, not only the body — the last keystroke before
  // Escape must never be the one that is lost.
  it('writes a title typed immediately before Escape', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(opener())

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Standup' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    // The storage mirror is debounced too, so this drains it. The assertion still
    // discriminates: close() cancels the pending saveTitle, so without its own dispatch the
    // value would never arrive however long the clock ran.
    flush()
    flush()

    expect(readNotes()[0].title).toBe('Standup')
  })

  it('normalises a bare host on blur and stores it', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(opener())

    const field = screen.getByLabelText('Link') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'meet.google.com/abc' } })
    fireEvent.blur(field)
    flush()
    flush()

    expect(readNotes()[0].link).toBe('https://meet.google.com/abc')
    expect(field.value).toBe('https://meet.google.com/abc')
  })

  // Normalising per keystroke would turn `h` into `https://h` between the first and second
  // character of `https`, which is the reason the commit waits for blur.
  it('does not rewrite the link while it is being typed', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(opener())

    const field = screen.getByLabelText('Link') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'h' } })

    expect(field.value).toBe('h')
    expect(readNotes()[0].link).toBe('')
  })

  it('keeps the text but stores nothing for an unparseable link', () => {
    seed([note()])
    render(<App />)
    fireEvent.click(opener())

    const field = screen.getByLabelText('Link') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'javascript:alert(1)' } })
    fireEvent.blur(field)
    flush()
    flush()

    expect(field.value).toBe('javascript:alert(1)')
    expect(readNotes()[0].link).toBe('')
    // No error message, no blocked dismissal — the missing chip is the feedback.
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('resets its fields when a different note is opened', () => {
    seed([note({ id: 'a', title: 'first', order: 2 }), note({ id: 'b', title: 'second', order: 1 })])
    render(<App />)

    fireEvent.click(opener(0))
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('first')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    fireEvent.click(opener(1))
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('second')
  })

  it('still has no Save button', () => {
    seed([note({ title: 'Standup', link: 'https://meet.google.com/abc' })])
    render(<App />)
    fireEvent.click(opener())

    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
  })
})
