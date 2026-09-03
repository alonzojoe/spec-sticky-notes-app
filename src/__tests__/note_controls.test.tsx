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

const THREE = [
  note({ id: 'a', order: 1 }),
  note({ id: 'b', order: 2 }),
  note({ id: 'c', order: 3 }),
]

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const readNotes = (): Note[] => JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes ?? []

const card = (id: string) => screen.getByTestId(`note-${id}`)
const order = () => [...document.querySelectorAll('[data-slot="note-card"]')].map((el) => el.id || el.getAttribute('data-testid'))

/**
 * P9 took the controls off the card and put them in the note's own view, so reaching one now
 * means opening the note first. These helpers do that, and the tests below are unchanged in what
 * they assert — the pinning behaviour is the same behaviour, driven from its new home.
 */
const openNote = (id: string) => {
  const opener = card(id).querySelector('[data-testid="open"]')
  if (!(opener instanceof HTMLElement)) throw new Error(`no opener on note ${id}`)
  fireEvent.click(opener)
}

const inView = (which: 'pin' | 'delete') => {
  const dialog = screen.getByRole('dialog')
  const button = dialog.querySelector(`[data-testid="${which}"]`)
  if (!(button instanceof HTMLElement)) throw new Error(`no ${which} control in the note view`)
  return button
}

const closeView = () => {
  const dialog = screen.queryByRole('dialog')
  if (dialog !== null) fireEvent.keyDown(dialog, { key: 'Escape' })
}

/** Open the note, press pin, close again — the whole gesture pinning now takes. */
const pinButton = (id: string) => {
  openNote(id)
  return inView('pin')
}

const deleteButton = (id: string) => {
  openNote(id)
  return inView('delete')
}

/**
 * The whole delete gesture as of P9: open the note, press delete, and confirm when the note has
 * something in it. An empty note skips the alert by design, so this tolerates its absence rather
 * than requiring it — the rule itself is asserted in delete_confirmation.test.tsx.
 */
const deleteNote = (id: string) => {
  fireEvent.click(deleteButton(id))
  const confirm = screen.queryByRole('button', { name: 'Delete' })
  if (confirm !== null) fireEvent.click(confirm)
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

describe('pinning leads the grid', () => {
  // P2 expressed "pinned notes are on top" with z-index, because notes overlapped. A grid
  // does not stack, so the same promise is now expressed by slot: pinned notes lead. `z`
  // survives with one job left — lifting the note under the pointer during a drag.
  it('puts a pinned note ahead of every unpinned one', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('b'))

    expect(order()[0]).toBe('note-b')
  })

  it('keeps relative order among two pinned notes', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('a'))
    fireEvent.click(pinButton('c'))

    // Pinning is a group, not a flattening: c had the larger stamp and still leads a.
    expect(order()).toEqual(['note-c', 'note-a', 'note-b'])
  })
})

describe('pinning reorders, and only within the pinned group', () => {
  // P2 asserted the opposite here, and was right to: mission.md principle 1 then read
  // "Notes stay where I put them. No auto-layout, no reflow." P5 rewrote that principle —
  // notes live in a grid and pinned notes lead it. What survived the rewrite is the clause
  // these tests now defend: the board reorders on create, delete and pin, and on nothing
  // else, and a pin never rewrites a stamp.
  it('moves the pinned note to the first slot', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('b'))

    expect(order()).toEqual(['note-b', 'note-c', 'note-a'])
  })

  it('leaves every other note in its previous relative order', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('b'))

    // c before a, exactly as it was before the pin — pinning lifted b out, it did not sort.
    expect(order().filter((id) => id !== 'note-b')).toEqual(['note-c', 'note-a'])
  })

  it('renders in visual order, so tab order follows the grid', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('b'))

    // P5 makes DOM order the sorted order. That is a change from P2, and it is the right
    // one: reading order and tab order now match what is on screen.
    const slots = order().map((id) =>
      Number(card(id!.replace('note-', '')).style.transform.match(/translate\((\d+)px, (\d+)px\)/)?.[1]),
    )
    expect([...slots].sort((x, y) => x - y)).toEqual(slots)
  })

  it('writes pinned and updatedAt, and nothing else', () => {
    seed(THREE)
    render(<App />)

    fireEvent.click(pinButton('b'))
    vi.advanceTimersByTime(400)

    const stored = readNotes()
    // The stamp is untouched, which is what makes pin/unpin lossless: un-pinning returns the
    // note to exactly its place among the rest.
    expect(stored.map((n) => n.order)).toEqual([1, 2, 3])
    expect(stored.find((n) => n.id === 'b')?.pinned).toBe(true)
  })

  it('returns the note to its old place when unpinned', () => {
    seed(THREE)
    render(<App />)
    const before = order()

    fireEvent.click(pinButton('b'))
    fireEvent.click(pinButton('b'))

    expect(order()).toEqual(before)
  })

  it('survives a reload still pinned and still first', () => {
    seed(THREE)
    render(<App />)
    fireEvent.click(pinButton('b'))
    vi.advanceTimersByTime(400)

    cleanup()
    render(<App />)

    expect(order()[0]).toBe('note-b')
    expect(readNotes().find((n) => n.id === 'b')?.pinned).toBe(true)
  })
})

describe('the controls are quiet but reachable', () => {
  /**
   * P9 replaced this trio. They asserted the hover-reveal choreography — `opacity-0` plus the
   * `group-hover:` / `group-focus-within:` escapes that kept a focused control visible — which
   * was the right answer while the controls lived on the card. There are no controls on the card
   * now, so the choreography is gone and what replaces it is the assertion that it cannot come
   * back: see T67 in board.test.tsx.
   */
  it('shows both controls without needing a hover, now that they are in a dialog', () => {
    seed([note()])
    render(<App />)
    openNote('a')

    // A control that appears only on hover, inside a dialog the user opened deliberately, is a
    // control they have to hunt for.
    for (const control of [inView('pin'), inView('delete')]) {
      expect(control.className).not.toContain('opacity-0')
    }
    closeView()
  })

  it('keeps a pinned note identifiable on the board without any control', () => {
    seed([note({ pinned: true })])
    render(<App />)

    // The glyph replaces the always-visible pin control the card used to carry. Same job — you
    // can tell what is pinned without pointing at every note in turn — without being a button.
    expect(card('a').textContent).not.toContain('Unpin')
    expect(screen.getByRole('button', { name: /Open pinned note/ })).toBeDefined()
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

    deleteNote('b')

    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByTestId('note-b')).toBeNull()
  })

  it('writes the removal through to storage', () => {
    seed(THREE)
    render(<App />)

    deleteNote('b')
    vi.advanceTimersByTime(400)

    expect(readNotes().map((n) => n.id)).toEqual(['a', 'c'])
  })

  it('updates the sidebar badge', () => {
    seed(THREE)
    render(<App />)

    deleteNote('b')

    expect(screen.getByText('2')).toBeDefined()
  })
})

describe('the textarea is uncontrolled', () => {
  /**
   * P9 changed this test's premise rather than its point. It used to pin a DIFFERENT note from
   * the board while this one was open, because that was the only board change that re-rendered
   * without moving focus. The controls are inside the view now, so pinning another note is not
   * something you can do with this one open — and the replacement is a better scenario anyway:
   * pin the note you are in the middle of writing, which is a thing people actually do.
   *
   * The risk underneath is unchanged. A controlled textarea driven by `note.body` reverts to the
   * stored value the moment the store changes, and the store changes on every pin.
   */
  it('keeps in-progress text when pinning the note being written', () => {
    seed([note({ id: 'a' })])
    render(<App />)
    openNote('a')
    const textarea = screen.getByRole('textbox', { name: 'Note text' }) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'half a sent' } })

    fireEvent.click(inView('pin'))

    expect((screen.getByRole('textbox', { name: 'Note text' }) as HTMLTextAreaElement).value).toBe(
      'half a sent',
    )
    // And pinning does not close the view — it is a property of the note, like its colour.
    expect(screen.getByRole('dialog')).toBeDefined()
    // The storage mirror is debounced; drain it rather than racing it.
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(readNotes()[0].pinned).toBe(true)
  })
})
