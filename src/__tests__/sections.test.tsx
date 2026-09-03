// @vitest-environment jsdom
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
import { SECTIONS, sectionAt } from '@/lib/sections'
import { createAppRouter } from '@/app/config/router_config'
import type { Note } from '@/types/note'

const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  title: '',
  body: 'a thought',
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
  note({ id: 'pin-one', order: 5, pinned: true, title: 'Standup' }),
  note({ id: 'plain-one', order: 4, title: 'Groceries' }),
  note({ id: 'pin-two', order: 3, pinned: true, title: 'Rent' }),
  note({ id: 'plain-two', order: 2, title: 'Dentist' }),
]

const stored = () => window.localStorage.getItem(BOARD_KEY) ?? ''

/** Everything a section could plausibly disturb, in one comparable string. */
const shape = (): string =>
  (JSON.parse(stored()).notes as Note[])
    .map((n) => `${n.id}:${n.order}:${n.pinned}:${n.updatedAt}`)
    .join(',')
const seed = (notes: Note[] = SEEDED) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

/**
 * Each test gets its own router over a memory history. A router matches its first location once
 * and cannot be re-loaded, so a shared instance could only ever start at `/` — and a test that
 * navigated would hand the next one a board it never asked for.
 */
const renderAt = async (path: string, notes: Note[] = SEEDED) => {
  seed(notes)
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  await router.load()
  render(<RouterProvider router={router} />)
  return router
}

/**
 * Queried out of the DOM rather than by role, deliberately. Radix marks everything outside an open
 * dialog `aria-hidden`, so a role query returns nothing at all while a note or the palette is open
 * — and half of what this file asserts is about what the board and the sidebar are doing *behind*
 * one.
 */
const cards = () =>
  [...document.querySelectorAll('[data-slot="note-card"]')].map((card) =>
    card.getAttribute('data-note-id'),
  )

const destinations = (): HTMLAnchorElement[] => [
  ...document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Board sections"] a'),
]

const badges = (): (string | null)[] =>
  [...document.querySelectorAll('[data-sidebar="menu-badge"]')].map((badge) => badge.textContent)

const current = () =>
  destinations().find((item) => item.getAttribute('aria-current') === 'page')?.textContent?.trim()

beforeEach(() => {
  stubMatchMedia()
  // TanStack Router scrolls to the top on navigation, and jsdom implements no scrollTo — left
  // unstubbed it prints "Not implemented" through every navigating test in this file.
  window.scrollTo = () => {}
  window.localStorage.clear()
})
afterEach(cleanup)

// T69 — the route decides what the board draws.
describe('T69 · the section is a route', () => {
  it('draws every note at the root', async () => {
    await renderAt('/')

    expect(cards()).toEqual(['pin-one', 'pin-two', 'plain-one', 'plain-two'])
  })

  it('draws every note at /notes', async () => {
    await renderAt('/notes')

    expect(cards()).toEqual(['pin-one', 'pin-two', 'plain-one', 'plain-two'])
  })

  it('draws only the pinned notes at /pinned', async () => {
    await renderAt('/pinned')

    expect(cards()).toEqual(['pin-one', 'pin-two'])
  })

  // The pinned view is a prefix of the board: `arrange` puts every pinned note above every
  // unpinned one, so this is the same order in the same relative places, with nothing removed
  // from the middle.
  it('keeps the pinned notes in the order the whole board gives them', async () => {
    await renderAt('/pinned')

    expect(cards()).toEqual(['pin-one', 'pin-two'])
  })
})

// T70 — the sidebar navigates, and says where you are.
describe('T70 · two destinations', () => {
  it('marks the notes destination current at the root', async () => {
    await renderAt('/')

    expect(current()).toBe('Notes')
  })

  it('marks the pinned destination current at /pinned', async () => {
    await renderAt('/pinned')

    expect(current()).toBe('Pinned notes')
  })

  // Counted rather than checked on the right one: two current pages is a defect a screen reader
  // reports and an assertion about the active item would never see.
  it('never marks both', async () => {
    await renderAt('/pinned')

    expect(destinations().filter((item) => item.getAttribute('aria-current') === 'page')).toHaveLength(1)
  })

  it('badges each destination with its own count', async () => {
    // Four notes: two pinned, one of them also linked.
    await renderAt('/', [
      note({ id: 'pin-one', order: 5, pinned: true, link: 'https://example.com/a' }),
      note({ id: 'plain-one', order: 4 }),
      note({ id: 'pin-two', order: 3, pinned: true }),
      note({ id: 'plain-two', order: 2 }),
    ])

    expect(badges()).toEqual(['4', '2', '1'])
  })

  // A zero says the section exists and is empty. A badge that vanishes makes the two rows
  // different heights for no reason a reader could name.
  it('badges an empty section with a zero rather than nothing', async () => {
    await renderAt('/', [note({ id: 'a' })])

    expect(badges()).toEqual(['1', '0', '0'])
  })

  it('filters the board when the pinned destination is clicked', async () => {
    await renderAt('/')

    fireEvent.click(destinations()[1])

    await waitFor(() => expect(cards()).toEqual(['pin-one', 'pin-two']))
    expect(current()).toBe('Pinned notes')
  })

  it('brings every note back when notes is clicked again', async () => {
    await renderAt('/pinned')

    fireEvent.click(destinations()[0])

    await waitFor(() => expect(cards()).toEqual(['pin-one', 'pin-two', 'plain-one', 'plain-two']))
  })

  /**
   * The active row is the only one that carries a background.
   *
   * `data-active:` matches the ATTRIBUTE and not its value, so shadcn rendering
   * `data-active="false"` styled every inactive item exactly like the selected one — invisible
   * while the nav held a single destination, and the whole point of it once it holds two. The
   * amendment omits the attribute instead, and this is the assertion that says so from the outside.
   */
  it('leaves the unselected destination the sidebar’s own background', async () => {
    await renderAt('/pinned')
    const [notes, pinned] = destinations()

    expect(pinned.getAttribute('data-active')).toBe('true')
    expect(notes.hasAttribute('data-active')).toBe(false)
    // A hover that produced the selected appearance would be a hover that lies about where you
    // are, so an inactive row hovers to half strength.
    expect(notes.className).toContain('hover:bg-sidebar-accent/50')
  })
})

// T71 — a view is not an edit. The assertion that makes the amendment a constraint.
describe('T71 · navigating writes nothing', () => {
  it('leaves every order, pin and timestamp untouched through a round trip', async () => {
    await renderAt('/')
    // Read after the first render rather than from the seed: mounting rewrites the value through
    // the storage contract, and this test is about what *navigating* does to it. Compared as the
    // three fields a section could plausibly disturb rather than as raw JSON, because a debounced
    // write landing mid-assertion would make a string comparison flake on nothing.
    await waitFor(() => expect(cards()).toHaveLength(4))
    const before = shape()

    fireEvent.click(destinations()[1])
    await waitFor(() => expect(cards()).toEqual(['pin-one', 'pin-two']))
    fireEvent.click(destinations()[0])
    await waitFor(() => expect(cards()).toHaveLength(4))

    expect(shape()).toBe(before)
  })

  // The board's "open a note that was not here a moment ago" effect keys on unseen ids, and
  // filtering changes what is drawn rather than what is in `notes`. If that ever inverts,
  // arriving at /pinned would pop open the first pinned note.
  it('opens no note when the section changes', async () => {
    await renderAt('/')

    fireEvent.click(destinations()[1])

    await waitFor(() => expect(cards()).toEqual(['pin-one', 'pin-two']))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // Unpinning is a property change, and P9 decided a property change does not close a note you
  // are reading. That does not stop being true because the board behind stopped drawing its card.
  it('leaves the note view open when a note is unpinned out of the section', async () => {
    await renderAt('/pinned')

    fireEvent.click(screen.getByTestId('note-pin-one').querySelector('[data-testid="open"]')!)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unpin note' }))

    expect(screen.getByRole('dialog')).toBeDefined()
    await waitFor(() => expect(cards()).toEqual(['pin-two']))
  })
})

// T72 — the palette finds notes; a view is not a permission.
describe('T72 · search ignores the section', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens an unpinned note from inside the pinned section', async () => {
    await renderAt('/pinned')

    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    const field = screen.getByRole('combobox', { name: 'Search notes' })
    fireEvent.change(field, { target: { value: 'Groceries' } })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByDisplayValue('Groceries')).toBeDefined()
    // The board behind is still the pinned one: the palette opened a note, it did not navigate.
    expect(current()).toBe('Pinned notes')
    expect(cards()).toEqual(['pin-one', 'pin-two'])
  })
})

// T73 — a note you cannot see is a note you did not capture.
describe('T73 · creating a note returns you to the whole board', () => {
  it('leaves the pinned section when the toolbar button opens the dialog', async () => {
    await renderAt('/pinned')

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    await waitFor(() => expect(current()).toBe('Notes'))
    // At the moment the dialog opens, not when the note is created: the board behind it is
    // already the board the new note will land on.
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('leaves it for the n shortcut too', async () => {
    await renderAt('/pinned')

    fireEvent.keyDown(document, { key: 'n' })

    await waitFor(() => expect(current()).toBe('Notes'))
  })

  it('puts the created note on the board it returned you to', async () => {
    await renderAt('/pinned')

    fireEvent.keyDown(document, { key: 'n' })
    await waitFor(() => expect(current()).toBe('Notes'))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))

    await waitFor(() => expect(cards()).toHaveLength(5))
  })
})

// T74 — an empty pinned board explains itself.
describe('T74 · the pinned empty state', () => {
  it('says what to do when nothing is pinned', async () => {
    await renderAt('/pinned', [note({ id: 'a' })])

    expect(screen.getByText('No pinned notes')).toBeDefined()
    // Names the way out, which is the one thing an empty pinned board cannot otherwise tell you.
    expect(screen.getByText('Open a note and pin it to keep it up here.')).toBeDefined()
  })

  it('says nothing once something is pinned', async () => {
    await renderAt('/pinned')

    expect(screen.queryByText('No pinned notes')).toBeNull()
  })

  // The general empty board belongs to *Polish*, and this assertion is what stops this phase
  // quietly becoming it.
  it('leaves an empty whole board bare', async () => {
    await renderAt('/', [])

    expect(screen.queryByText('No pinned notes')).toBeNull()
    expect(cards()).toEqual([])
  })
})

// T75 — the keyboard gained two stops and lost nothing.
describe('T75 · the keyboard', () => {
  it('makes every destination a real link in the tab order', async () => {
    await renderAt('/')

    for (const item of destinations()) {
      expect(item.tagName).toBe('A')
      expect(item.getAttribute('href')).toMatch(/^\/(notes|pinned|linked)$/)
      expect(item.getAttribute('tabindex')).not.toBe('-1')
    }
  })

  // The pinned view is a prefix of the board, so a swap made here is the swap the whole board
  // would have made rather than an approximation of it.
  it('reorders inside the pinned section, and the whole board agrees', async () => {
    await renderAt('/pinned')

    fireEvent.keyDown(screen.getByTestId('note-pin-one'), { key: 'ArrowRight' })

    await waitFor(() => expect(cards()).toEqual(['pin-two', 'pin-one']))

    fireEvent.click(destinations()[0])
    await waitFor(() =>
      expect(cards()).toEqual(['pin-two', 'pin-one', 'plain-one', 'plain-two']),
    )
  })

  it('still pins from a card inside the pinned section', async () => {
    await renderAt('/pinned')

    fireEvent.click(screen.getByTestId('note-pin-two').querySelector('[data-testid="pin"]')!)

    await waitFor(() => expect(cards()).toEqual(['pin-one']))
  })
})

/**
 * T76 — the registry is what a section *is*.
 *
 * Requirements § Risks: `keep` is one expression per row and nothing type-checks that it names the
 * right field. A section pointing at the wrong one would compile, render, and look plausible — so
 * every predicate is asserted directly, against a note that satisfies it and one that does not.
 */
describe('T76 · the section registry', () => {
  const rows = Object.fromEntries(SECTIONS.map((row) => [row.section, row]))

  it('keeps every note in the notes section', () => {
    expect(rows.notes.keep(note({ id: 'a' }))).toBe(true)
    expect(rows.notes.keep(note({ id: 'b', pinned: true, link: 'https://example.com' }))).toBe(true)
  })

  it('keeps a pinned note out of the pinned section only when it is not pinned', () => {
    expect(rows.pinned.keep(note({ id: 'a', pinned: true }))).toBe(true)
    expect(rows.pinned.keep(note({ id: 'b', pinned: false }))).toBe(false)
  })

  it('keeps a note in the linked section on its link field alone', () => {
    expect(rows.linked.keep(note({ id: 'a', link: 'https://example.com/rent' }))).toBe(true)
    expect(rows.linked.keep(note({ id: 'b', link: '' }))).toBe(false)
  })

  // The field, not the note's substance: an empty note with a link is linked, and a note full of
  // words without one is not.
  it('reads the field rather than the note', () => {
    expect(
      rows.linked.keep(note({ id: 'a', title: '', body: '', link: 'https://example.com' })),
    ).toBe(true)
    expect(rows.linked.keep(note({ id: 'b', title: 'Standup', body: 'a paragraph' }))).toBe(false)
  })

  // A URL typed into the body is not a link. `lib/links.ts` judges the field, and a body-scanning
  // rule would put notes in the section with no chip on their card.
  it('does not scan the body for URLs', () => {
    expect(rows.linked.keep(note({ id: 'a', body: 'see https://x.example for more' }))).toBe(false)
  })

  // Two routes render one page — P10 chose that over a redirect — so an unmatched path marks Notes
  // current rather than marking nothing current, which is the state T70 exists to catch.
  it('reads the root path as the notes section', () => {
    expect(sectionAt('/').section).toBe('notes')
    expect(sectionAt('/notes').section).toBe('notes')
    expect(sectionAt('/pinned').section).toBe('pinned')
    expect(sectionAt('/linked').section).toBe('linked')
  })

  // An empty whole board is still bare cork: a first-run screen wants an illustration and an
  // invitation to write the first note, and empty_state.tsx belongs to *Polish* with those.
  it('gives every section but the whole board an empty state', () => {
    expect(rows.notes.empty).toBeNull()
    expect(rows.pinned.empty).not.toBeNull()
    expect(rows.linked.empty).not.toBeNull()
  })
})

// T77 — the third section, and the fact that a section is a question rather than a folder.
describe('T77 · the linked section', () => {
  const MIXED = [
    note({ id: 'both', order: 5, pinned: true, link: 'https://example.com/both' }),
    note({ id: 'linked-one', order: 4, link: 'https://example.com/one' }),
    note({ id: 'pinned-only', order: 3, pinned: true }),
    note({ id: 'neither', order: 2 }),
    // Deliberately last on the whole board and second-to-last in its own section: `neither` sits
    // between the two linked notes in `/notes`, which is what makes them non-neighbours there.
    note({ id: 'linked-two', order: 1, link: 'https://example.com/two' }),
  ]

  it('draws only the notes carrying a link', async () => {
    await renderAt('/linked', MIXED)

    expect(cards()).toEqual(['both', 'linked-one', 'linked-two'])
  })

  // Sections are questions about a note, not folders it lives in.
  it('draws a note that is pinned and linked in both sections, and in notes', async () => {
    await renderAt('/linked', MIXED)
    expect(cards()).toContain('both')

    fireEvent.click(destinations()[1])
    await waitFor(() => expect(cards()).toEqual(['both', 'pinned-only']))

    fireEvent.click(destinations()[0])
    await waitFor(() => expect(cards()).toHaveLength(5))
  })

  it('says what to do when nothing is linked', async () => {
    await renderAt('/linked', [note({ id: 'a' })])

    expect(screen.getByText('No linked notes')).toBeDefined()
    expect(screen.getByText('Add a link to a note and it will show up here.')).toBeDefined()
  })

  it('says nothing once something is linked', async () => {
    await renderAt('/linked', MIXED)

    expect(screen.queryByText('No linked notes')).toBeNull()
  })

  it('leaves every order, pin and timestamp untouched through a round trip', async () => {
    await renderAt('/', MIXED)
    await waitFor(() => expect(cards()).toHaveLength(5))
    const before = shape()

    fireEvent.click(destinations()[2])
    await waitFor(() => expect(cards()).toEqual(['both', 'linked-one', 'linked-two']))
    fireEvent.click(destinations()[0])
    await waitFor(() => expect(cards()).toHaveLength(5))

    expect(shape()).toBe(before)
  })

  it('marks the linked destination current', async () => {
    await renderAt('/linked', MIXED)

    expect(current()).toBe('Linked notes')
    expect(destinations().filter((item) => item.getAttribute('aria-current') === 'page')).toHaveLength(1)
  })

  /**
   * **The linked section is not a prefix of the board, and the pinned one is.**
   *
   * P10 leaned on that: every pinned note sorts above every unpinned one, so a swap inside the
   * pinned view is the swap the whole board would have made. A linked note sorts nowhere in
   * particular, so the two cards swapped here are not neighbours in `/notes` — and asserting "the
   * same swap" would be asserting something false. What is true is what dragging has always done:
   * those two notes swap, and nothing else moves.
   */
  it('swaps exactly the two notes an arrow key names, and moves nothing else', async () => {
    await renderAt('/linked', MIXED)
    expect(cards()).toEqual(['both', 'linked-one', 'linked-two'])

    // Neighbours here, and two apart in `/notes` — `neither` is between them there.
    fireEvent.keyDown(screen.getByTestId('note-linked-one'), { key: 'ArrowRight' })
    await waitFor(() => expect(cards()).toEqual(['both', 'linked-two', 'linked-one']))

    fireEvent.click(destinations()[0])
    // The two swapped their places in the whole board's ordering; `pinned-only` and `neither` are
    // exactly where they were.
    await waitFor(() =>
      expect(cards()).toEqual(['both', 'pinned-only', 'linked-two', 'neither', 'linked-one']),
    )
  })
})
