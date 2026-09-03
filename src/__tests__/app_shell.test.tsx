// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

import App from '@/__tests__/test_app'
import { loadRouter } from '@/__tests__/router_setup'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
import { SECTIONS } from '@/lib/sections'
import type { Note } from '@/types/note'

const note = (id: string): Note => ({
  id,
  body: '',
  color: 'butter',
  title: '',
  link: '',
  date: '2026-09-01',
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
})

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

// The router matches its first location asynchronously; loading it here is what makes a
// synchronous render produce a board rather than an empty div. See router_setup.ts.
beforeAll(loadRouter)

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
})
afterEach(cleanup)

describe('the application shell', () => {
  it('renders exactly one main landmark for the board region', () => {
    render(<App />)
    // SidebarInset is itself a <main>. Two landmarks would be an a11y defect.
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('exposes a named navigation landmark', () => {
    render(<App />)
    expect(screen.getByRole('navigation', { name: 'Board sections' })).toBeDefined()
  })

  // Scoped to the navigation landmark since P8. The assertion is about how many DESTINATIONS
  // the sidebar offers, and it was relying on nothing else in the document mentioning notes —
  // which stopped being true the moment a control named "Search notes" reached the toolbar.
  // Widening the query would have meant renaming that control to protect a test.
  const destinations = () =>
    within(screen.getByRole('navigation', { name: 'Board sections' })).getAllByRole('link', {
      name: /notes/i,
    })

  it('offers a destination per section in the registry', () => {
    render(<App />)

    // P1 through P9 asserted exactly one, which was honest while the nav held one item: a nav
    // with a single destination is a label that happens to be focusable. P10 gave it the second
    // and P12 the third — and asserted against `lib/sections.ts`, so a row added there has to
    // appear here rather than the two drifting apart.
    expect(destinations().map((item) => item.textContent?.trim())).toEqual(
      SECTIONS.map((row) => row.label),
    )
  })

  // Counted rather than checked on the active one. Two current pages is a defect a screen reader
  // reports and an assertion about the right one would never see.
  it('marks exactly one destination as the current page', () => {
    render(<App />)

    expect(destinations().filter((item) => item.getAttribute('aria-current') === 'page')).toHaveLength(1)
  })

  it('starts on Notes', () => {
    render(<App />)

    expect(destinations()[0].getAttribute('aria-current')).toBe('page')
  })

  // Anchors, not buttons with handlers: a section you can middle-click, bookmark and return to
  // with the back button is a place rather than a mode. P9 asserted BUTTON here for the same
  // reason — that it is a real control and not a clickable div.
  it('makes each destination a real link with an href', () => {
    render(<App />)

    for (const item of destinations()) {
      expect(item.tagName).toBe('A')
    }
    expect(destinations().map((item) => item.getAttribute('href'))).toEqual(
      SECTIONS.map((row) => row.path),
    )
  })

  it('badges an empty board with zero, on every destination', () => {
    render(<App />)

    // A zero per row, not a missing badge. One that vanishes when it is empty makes the rows
    // different heights for no reason a reader could name, and a zero is information.
    expect(screen.getAllByText('0')).toHaveLength(SECTIONS.length)
  })

  // Comparing the badge against a length imported from the same module the component
  // imported was always circular. This compares it against what is on the board.
  it('badges the destination with the live note count', () => {
    seed([note('a'), note('b')])

    render(<App />)

    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  // P3 moved creation to the toolbar. Asserting the palette's swatch label is absent is the
  // assertion that would have quietly passed had the palette merely been hidden.
  it('offers a New note control in the toolbar', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'New note' })).toBeDefined()
  })

  it('keeps the New note control out of the board surface', () => {
    render(<App />)

    // mission.md principle 4's board-surface clause is not amended: chrome never sits on the
    // board itself.
    const board = screen.getByRole('main').querySelector('[data-slot="board"]')
    expect(board?.contains(screen.getByRole('button', { name: 'New note' }))).toBe(false)
  })

  it('no longer creates notes from the sidebar', () => {
    render(<App />)

    expect(screen.queryByRole('button', { name: 'New butter note' })).toBeNull()
    expect(screen.queryByText('New note', { selector: 'div' })).toBeNull()
  })
})

// T58 — the trigger says what this platform presses.
describe('T58 · the search trigger', () => {
  const stubPlatform = (platform: string) => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: { platform },
      configurable: true,
    })
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'userAgentData')
  })

  const trigger = () => screen.getByRole('button', { name: /search notes/i })

  // D4 turns on this: an input in a toolbar that does not accept typing is a lie the first time
  // someone types into it. Asserted by tag name rather than by looking like a field.
  it('is a button, never an input', () => {
    render(<App />)

    expect(trigger().tagName).toBe('BUTTON')
    expect(document.querySelector('header input')).toBeNull()
  })

  it('badges the Mac shortcut with the command glyph', () => {
    stubPlatform('macOS')
    render(<App />)

    expect(document.querySelector('[data-slot="search-shortcut"]')?.textContent).toBe('⌘K')
  })

  it('badges every other platform with Ctrl+K', () => {
    stubPlatform('Windows')
    render(<App />)

    expect(document.querySelector('[data-slot="search-shortcut"]')?.textContent).toBe('Ctrl+K')
  })

  // Both are named, because both work — see D6. A screen reader should not be told about only
  // the one this platform guessed.
  it('announces both modifiers as shortcuts', () => {
    render(<App />)

    expect(trigger().getAttribute('aria-keyshortcuts')).toBe('Meta+K Control+K')
  })

  it('opens the palette when clicked', () => {
    render(<App />)

    fireEvent.click(trigger())

    expect(screen.getByRole('combobox', { name: 'Search notes' })).toBeDefined()
  })

  // The extraction moved the header into toolbar.tsx; everything that was in it is still in it.
  it('keeps the sidebar toggle and the New note button beside it', () => {
    render(<App />)
    const header = document.querySelector('header')

    expect(header?.querySelector('[data-sidebar="trigger"]')).not.toBeNull()
    expect(header?.querySelector('[data-slot="search-trigger"]')).not.toBeNull()
    expect(within(header as HTMLElement).getByRole('button', { name: 'New note' })).toBeDefined()
  })
})
