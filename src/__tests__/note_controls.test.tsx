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
  x: 10,
  y: 20,
  z: 1,
  tilt: -1,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  ...over,
})

const THREE = [
  note({ id: 'a', x: 10, y: 20, z: 1 }),
  note({ id: 'b', x: 90, y: 60, z: 2 }),
  note({ id: 'c', x: 170, y: 120, z: 3 }),
]

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const readNotes = (): Note[] => JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes ?? []

const card = (id: string) => screen.getByTestId(`note-${id}`)
const order = () => [...document.querySelectorAll('[data-slot="note-card"]')].map((el) => el.id || el.getAttribute('data-testid'))
const shapeOf = (id: string) => {
  const el = card(id)
  return { left: el.style.left, top: el.style.top, transform: el.style.transform }
}
const layer = (id: string) => Number(card(id).style.zIndex)

const pinButton = (id: string) => {
  const button = card(id).querySelector('[data-testid="pin"]')
  if (!(button instanceof HTMLElement)) throw new Error(`no pin control on note ${id}`)
  return button
}
const deleteButton = (id: string) => {
  const button = card(id).querySelector('[data-testid="delete"]')
  if (!(button instanceof HTMLElement)) throw new Error(`no delete control on note ${id}`)
  return button
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

describe('pinning raises stacking', () => {
  it('lifts a pinned note above every unpinned one', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('b'))

    expect(layer('b')).toBeGreaterThan(layer('a'))
    expect(layer('b')).toBeGreaterThan(layer('c'))
  })

  it('keeps relative order among two pinned notes', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('a'))
    fireEvent.click(pinButton('c'))

    // Pinning is a layer, not a flattening: c had the larger z and still does.
    expect(layer('c')).toBeGreaterThan(layer('a'))
    expect(layer('a')).toBeGreaterThan(layer('b'))
  })

  it('returns the note to exactly its previous layer when unpinned', () => {
    seed(THREE)
    render(<App />)
    const before = layer('b')

    fireEvent.click(pinButton('b'))
    fireEvent.click(pinButton('b'))

    expect(layer('b')).toBe(before)
  })
})

describe('pinning moves nothing', () => {
  // mission.md principle 1: "Notes stay where I put them. No auto-layout, no reflow."
  // A wrong implementation of pinning looks correct on screen and fails here.
  it('leaves the pinned note at exactly the same position', () => {
    seed(THREE)
    render(<App />)
    const before = shapeOf('b')

    fireEvent.click(pinButton('b'))

    expect(shapeOf('b')).toEqual(before)
  })

  it('leaves every other note where it was', () => {
    seed(THREE)
    render(<App />)
    const before = { a: shapeOf('a'), c: shapeOf('c') }

    fireEvent.click(pinButton('b'))

    expect(shapeOf('a')).toEqual(before.a)
    expect(shapeOf('c')).toEqual(before.c)
  })

  it('leaves DOM order untouched, so tab order cannot reshuffle', () => {
    seed(THREE)
    render(<App />)
    const before = order()

    fireEvent.click(pinButton('b'))

    // A sort would pass every assertion above and fail this one.
    expect(order()).toEqual(before)
  })

  it('writes pinned and updatedAt, and nothing else', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('b'))
    vi.advanceTimersByTime(400)

    const stored = readNotes()
    expect(stored.map((n) => n.z)).toEqual([1, 2, 3])
    expect(stored.map((n) => [n.x, n.y])).toEqual([
      [10, 20],
      [90, 60],
      [170, 120],
    ])
    expect(stored.find((n) => n.id === 'b')?.pinned).toBe(true)
  })

  it('survives a reload still pinned and still on top', () => {
    seed(THREE)
    render(<App />)
    fireEvent.click(pinButton('b'))
    vi.advanceTimersByTime(400)

    cleanup()
    render(<App />)

    expect(layer('b')).toBeGreaterThan(layer('c'))
    expect(readNotes().find((n) => n.id === 'b')?.pinned).toBe(true)
  })
})

describe('the controls are quiet but reachable', () => {
  it('hides both controls on an unhovered note', () => {
    seed([note()])
    render(<App />)

    expect(pinButton('a').className).toContain('opacity-0')
    expect(deleteButton('a').className).toContain('opacity-0')
  })

  it('brings them back on hover, on focus within the note, and on their own focus', () => {
    seed([note()])
    render(<App />)

    // opacity-0 leaves a button focusable but invisible. Without these escapes, tabbing
    // lands on something nobody can see — an accessibility defect, not a style choice.
    for (const control of [pinButton('a'), deleteButton('a')]) {
      expect(control.className).toContain('group-hover:opacity-100')
      expect(control.className).toContain('group-focus-within:opacity-100')
      expect(control.className).toContain('focus-visible:opacity-100')
    }
  })

  it('marks the note as the group those escapes hang off', () => {
    seed([note()])
    render(<App />)

    // Without `group` on the card every group-* class above is inert, and no other
    // assertion would notice.
    expect(card('a').className.split(/\s+/)).toContain('group')
  })

  it('keeps a pinned note’s pin control visible with nothing hovering it', () => {
    seed([note({ pinned: true })])
    render(<App />)

    // Otherwise the only way to find out what is pinned is to point at every note in turn.
    expect(pinButton('a').className).not.toContain('opacity-0')
  })

  it('makes both controls real buttons with accessible names', () => {
    seed([note()])
    render(<App />)

    expect(pinButton('a').tagName).toBe('BUTTON')
    expect(deleteButton('a').tagName).toBe('BUTTON')
    expect(pinButton('a').getAttribute('aria-label')).toBe('Pin note')
    expect(deleteButton('a').getAttribute('aria-label')).toBe('Delete note')
  })

  it('reports pin state through aria-pressed', () => {
    seed([note({ id: 'a' }), note({ id: 'b', pinned: true })])
    render(<App />)

    expect(pinButton('a').getAttribute('aria-pressed')).toBe('false')
    expect(pinButton('b').getAttribute('aria-pressed')).toBe('true')
    expect(pinButton('b').getAttribute('aria-label')).toBe('Unpin note')
  })
})

describe('deleting a note', () => {
  it('removes that note and leaves the others', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(deleteButton('b'))

    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByTestId('note-b')).toBeNull()
  })

  it('writes the removal through to storage', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(deleteButton('b'))
    vi.advanceTimersByTime(400)

    expect(readNotes().map((n) => n.id)).toEqual(['a', 'c'])
  })

  it('updates the sidebar badge', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(deleteButton('b'))

    expect(screen.getByText('2')).toBeDefined()
  })
})

describe('the textarea is uncontrolled', () => {
  it('keeps in-progress text when an unrelated board change re-renders it', () => {
    seed([note({ id: 'a' }), note({ id: 'b', body: 'other' })])
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'a thought' }))
    const textarea = screen.getByRole('textbox', { name: 'Note text' }) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'half a sent' } })

    // Pinning another note is the only unrelated change that re-renders this card without
    // also moving focus. A controlled textarea driven by note.body would revert here.
    fireEvent.click(pinButton('b'))

    expect((screen.getByRole('textbox', { name: 'Note text' }) as HTMLTextAreaElement).value).toBe(
      'half a sent',
    )
    expect(document.activeElement).toBe(textarea)
  })
})
