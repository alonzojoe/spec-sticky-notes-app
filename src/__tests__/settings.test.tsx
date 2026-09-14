// @vitest-environment jsdom
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppRouter } from '@/app/config/router_config'
import { seedUser, stubMatchMedia, stubResizeObserver } from '@/__tests__/dom_setup'
import { BOARD_KEY, SAMPLE_NOTES, SIDEBAR_KEY, USER_KEY } from '@/lib'
import type { Note } from '@/types/note'

/**
 * P14's page. Everything here navigates, so every test builds its own router over a memory
 * history: a router matches its first location once and cannot be re-loaded, and a shared instance
 * would hand the next file a board it never asked for.
 */
beforeEach(() => {
  stubMatchMedia()
  // The sidebar rows carry tooltips and this file clicks them. See dom_setup.
  stubResizeObserver()
  // TanStack Router scrolls to the top on navigation; jsdom implements no scrollTo.
  window.scrollTo = () => {}
  window.localStorage.clear()
})

/**
 * Radix locks the body while a modal is up and unlocks it on the way out. jsdom runs no exit
 * animation, so a test that ends with the reset confirmation open leaves the next one a
 * `pointer-events: none` body and every query coming back empty.
 */
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.body.removeAttribute('data-scroll-locked')
  document.body.style.pointerEvents = ''
})

const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  title: 'Standup',
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
  note({ id: 'a', order: 3 }),
  note({ id: 'b', order: 2, pinned: true }),
  note({ id: 'c', order: 1 }),
]

const seedBoard = (notes: Note[] = SEEDED) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const board = () => JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}')
const storedUser = () => window.localStorage.getItem(USER_KEY)

const renderAt = async (path: string) => {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  await router.load()
  render(<RouterProvider router={router} />)
  return router
}

/** Queried out of the DOM: Radix `aria-hidden`s the board behind any open dialog. */
const cards = () =>
  [...document.querySelectorAll('[data-slot="note-card"]')].map((card) =>
    card.getAttribute('data-note-id'),
  )

const header = () => document.querySelector('[data-sidebar="header"]') as HTMLElement
const footer = () => document.querySelector('[data-sidebar="footer"]') as HTMLElement

// T83 — the rename, where the name is read.
describe('T83 · the name on the settings page', () => {
  it('arrives prefilled with the stored name', async () => {
    seedUser()
    seedBoard()
    await renderAt('/settings')

    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Joe Alonzo')
  })

  it('stores the submitted name, trimmed', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), '  Ada Lovelace  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Ada Lovelace' }))
  })

  /**
   * **The row follows without a reload.** Two `useLocalStorage` callers on one key — this page
   * writes, the sidebar reads — kept in step by the `local-storage` event the library dispatches on
   * every write. P13 verified it in groundwork and asserted it from the dialog; the dialog no
   * longer renames, so the claim is asserted from the page that does.
   *
   * If this ever fails, the fallback is a provider beside the other two and no change to any
   * signature — not a different design.
   */
  it('updates the sidebar row and its initials without a reload', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      const row = within(header()).getByRole('link', { name: 'Ada Lovelace' })
      expect(row.textContent).toContain('AL')
    })
  })

  it('submits from the keyboard alone', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Ada{Enter}')

    await waitFor(() => expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Ada' }))
  })

  it('is inert on whitespace and on a name that has not changed', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    const save = () => screen.getByRole('button', { name: 'Save' })
    // Unchanged.
    expect(save()).toHaveProperty('disabled', true)

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), '   ')
    expect(save()).toHaveProperty('disabled', true)

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Ada')
    expect(save()).toHaveProperty('disabled', false)
  })

  /**
   * The name owns nothing (P13 **D1**), so renaming moves no note.
   *
   * **Compared parsed, never as a string.** `hydrate` rebuilds each note object rather than
   * spreading it — deliberately, since that is what gave pre-P5 `x` and `y` nowhere to survive — so
   * the key order changes while every value stays put. #17 fixed exactly this assertion in T79.
   */
  it('leaves every note untouched', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    const before = board()
    await renderAt('/settings')

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace{Enter}')
    await waitFor(() => expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Ada Lovelace' }))

    expect(board()).toEqual(before)
  })
})

// T84 — the door at the bottom of the sidebar.
describe('T84 · the settings destination', () => {
  it('is one link in the footer, with no badge', async () => {
    seedUser()
    seedBoard()
    await renderAt('/notes')

    const row = within(footer()).getByRole('link', { name: 'Settings' })
    expect(row.getAttribute('href')).toBe('/settings')
    // A count here would be a number about settings, and there is no such number.
    expect(footer().querySelector('[data-sidebar="menu-badge"]')).toBeNull()
  })

  it('navigates to the page, and the board stops being rendered', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/notes')
    expect(cards()).toHaveLength(3)

    await user.click(within(footer()).getByRole('link', { name: 'Settings' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Settings' })).toBeDefined())
    expect(cards()).toHaveLength(0)
  })

  /**
   * `sectionAt` falls back to the first row for a path it does not recognise — right for deciding
   * which notes `/` draws, wrong as an answer to which row is lit. Without the fix in
   * `app_sidebar.tsx` this lights `Notes` while the board is not even rendered.
   */
  it('is the only active row on /settings', async () => {
    seedUser()
    seedBoard()
    await renderAt('/settings')

    const active = [...document.querySelectorAll('[data-slot="sidebar"] a[data-active]')]
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toContain('Settings')
  })

  it('is not active on a board section, where the section is', async () => {
    seedUser()
    seedBoard()
    await renderAt('/pinned')

    const active = [...document.querySelectorAll('[data-slot="sidebar"] a[data-active]')]
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toContain('Pinned')
  })

  it('is reachable from the identity row too', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/notes')

    await user.click(within(header()).getByRole('link', { name: 'Joe Alonzo' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Settings' })).toBeDefined())
  })
})

// T85 — reset everything.
describe('T85 · reset', () => {
  it('changes nothing until it is confirmed', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    const before = board()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))

    expect(await screen.findByRole('alertdialog')).toBeDefined()
    expect(board()).toEqual(before)
    expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Joe Alonzo' })
  })

  it('counts the notes it is about to delete', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))

    expect(within(await screen.findByRole('alertdialog')).getByText(/all 3 notes/)).toBeDefined()
  })

  // A board of one is the board where a wrong click costs least and reads worst.
  it('says note rather than notes for a board of one', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard([note({ id: 'only' })])
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))

    expect(within(await screen.findByRole('alertdialog')).getByText(/all 1 note and/)).toBeDefined()
  })

  it('empties the board, the name and the sidebar, and lands on /', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    window.localStorage.setItem(SIDEBAR_KEY, JSON.stringify(false))
    const router = await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Reset everything',
    }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    await waitFor(() => expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: '' }))
    expect(JSON.parse(window.localStorage.getItem(SIDEBAR_KEY) ?? 'null')).toBe(true)
  })

  /**
   * **The store empties too**, once the 300 ms debounced mirror has run. The window in which the
   * reducer is empty and `localStorage` still holds every note is named in requirements § Risks and
   * is not fixed; this asserts that it closes.
   */
  it('empties the stored board once the mirror has settled', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Reset everything',
    }))

    await waitFor(() => expect(board().notes).toEqual([]), { timeout: 2000 })
  })

  /**
   * **The intro opens by itself.** Nothing in the reset opens it: `app_shell.tsx` derives it from
   * the name, and this emptied the name. The assertion a `useState`-held `asking` would have
   * failed.
   */
  it('leaves the intro open over an empty board', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Reset everything',
    }))

    await waitFor(() => expect(screen.getByText('Make it yours')).toBeDefined())
    expect(cards()).toHaveLength(0)
  })

  /**
   * Gate 1 greps the source for `localStorage.clear`; this catches a library doing it on our
   * behalf. A raw removal notifies nothing in-tab and the debounced mirror would write the board
   * straight back — requirements § D4.
   */
  it('never reaches for the Storage API directly', async () => {
    const user = userEvent.setup()
    const clear = vi.spyOn(Storage.prototype, 'clear')
    const remove = vi.spyOn(Storage.prototype, 'removeItem')
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Reset everything',
    }))
    await waitFor(() => expect(screen.getByText('Make it yours')).toBeDefined())

    expect(clear).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })
})

// T86 — the confirmation is a guard, not a speed bump.
describe('T86 · cancelling the reset', () => {
  it('leaves the board, the name and the sidebar exactly as they were', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    const before = board()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Cancel',
    }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(board()).toEqual(before)
    expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Joe Alonzo' })
  })

  // Enter on a dialog you did not read cancels rather than erases. P9's rule.
  it('holds focus on Cancel', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    const dialog = await screen.findByRole('alertdialog')

    await waitFor(() =>
      expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' })),
    )
  })

  it('closes on Escape and changes nothing', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    const before = board()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(board()).toEqual(before)
  })

  // "Reset everything", never "OK". A destructive confirmation that says OK is one nobody reads.
  it('names the act rather than saying OK', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(within(dialog).queryByRole('button', { name: 'OK' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Reset everything' })).toBeDefined()
  })
})

// T87 — the sample board.
describe('T87 · sample notes', () => {
  const load = () => screen.getByRole('button', { name: 'Load sample notes' })

  it('puts three real notes on an empty board', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard([])
    await renderAt('/settings')

    await user.click(load())

    await waitFor(() => expect(board().notes).toHaveLength(3))
    const notes = board().notes as Note[]
    // Real notes: distinct ids, a clock reading, and today's date.
    expect(new Set(notes.map((n) => n.id)).size).toBe(3)
    notes.forEach((n) => {
      expect(n.id).toMatch(/[0-9a-f-]{36}/)
      expect(n.createdAt).toBeGreaterThan(0)
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(n.pinned).toBe(false)
    })
  })

  /**
   * The board sorts `order` descending, so the note dispatched last is the one in the first slot.
   * Without the reverse in `settings_page.tsx` the list lands upside down and nothing else about it
   * looks wrong.
   */
  it('lands the right way up', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard([])
    const router = await renderAt('/settings')

    await user.click(load())
    await waitFor(() => expect(board().notes).toHaveLength(3))
    await router.navigate({ to: '/notes' })

    await waitFor(() => expect(cards()).toHaveLength(3))
    const titles = [...document.querySelectorAll('[data-slot="note-card"]')].map(
      (card) => card.textContent ?? '',
    )
    expect(titles[0]).toContain(SAMPLE_NOTES[0].title)
    expect(titles[2]).toContain(SAMPLE_NOTES[2].title)
  })

  /**
   * The guard that makes this control unable to bury what you wrote. Nothing in this app can be
   * undone, so being unable to append is better than asking whether to.
   */
  it('is inert while the board has anything on it', async () => {
    seedUser()
    seedBoard()
    await renderAt('/settings')

    expect(load()).toHaveProperty('disabled', true)
  })

  it('cannot be pressed twice, because loading three notes disables it', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard([])
    await renderAt('/settings')

    expect(load()).toHaveProperty('disabled', false)
    await user.click(load())

    await waitFor(() => expect(load()).toHaveProperty('disabled', true))
    // The store, once the 300 ms mirror has run — the button is disabled from the reducer, which
    // is ahead of it.
    await waitFor(() => expect(board().notes).toHaveLength(3))
  })

  // Content, not notes. An id in a fixture is a fixture that ships the same note twice; x, y and
  // tilt are P1 fields the model dropped in P5 and they do not come back with the writing.
  it('exports content and nothing else', () => {
    expect(SAMPLE_NOTES).toHaveLength(3)
    SAMPLE_NOTES.forEach((sample) => {
      expect(Object.keys(sample).sort()).toEqual(['body', 'color', 'title'])
    })
  })
})
