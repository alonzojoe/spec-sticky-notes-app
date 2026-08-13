// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY } from '@/lib/board_storage'
import type { Note } from '@/types/note'

const note = (id: string): Note => ({
  id,
  body: '',
  color: 'butter',
  x: 10,
  y: 20,
  z: 1,
  tilt: -1,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
})

const seed = (notes: Note[]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

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

  it('offers exactly one destination, named Notes and marked current', () => {
    render(<App />)
    const items = screen.getAllByRole('button', { name: /notes/i })
    // Not "at least one" — a second destination is still out of scope in mission.md.
    expect(items).toHaveLength(1)
    expect(items[0].getAttribute('aria-current')).toBe('page')
  })

  it('makes the destination a real button, not a clickable div', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /notes/i }).tagName).toBe('BUTTON')
  })

  it('badges an empty board with zero', () => {
    render(<App />)

    expect(screen.getByText('0')).toBeDefined()
  })

  // Comparing the badge against a length imported from the same module the component
  // imported was always circular. This compares it against what is on the board.
  it('badges the destination with the live note count', () => {
    seed([note('a'), note('b')])

    render(<App />)

    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })
})
