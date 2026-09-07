// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '@/__tests__/test_app'
import { loadRouter } from '@/__tests__/router_setup'
import { seedUser, stubMatchMedia } from '@/__tests__/dom_setup'
import { BOARD_KEY, USER_KEY } from '@/lib'
import type { Note } from '@/types/note'

beforeAll(loadRouter)

/**
 * **The only file that starts with no name stored.** Everywhere else seeds one, because Radix
 * `aria-hidden`s the app behind an open modal and a board no query can reach is the wrong starting
 * state for a test about dragging a note. Here the first visit *is* the subject.
 */
beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
})
afterEach(cleanup)

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

const seedBoard = (notes: Note[] = [note()]) =>
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))

const storedUser = () => window.localStorage.getItem(USER_KEY)
const identity = () => screen.getByRole('button', { name: /Joe Alonzo|Add your name/ })

// T79 — the intro, and the fact that it takes no for an answer.
describe('T79 · the app asks once', () => {
  it('opens on a visit with no stored name', async () => {
    render(<App />)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Make it yours')).toBeDefined()
  })

  /**
   * The assertion that catches an asynchronous read. `useLocalStorage` reads synchronously by
   * default, and if that ever changes a returning user sees this open for a frame — the worst
   * frame the app could draw. `queryByRole` on the first render, not `waitFor`: the failure is
   * something appearing, so waiting for it to go away would hide it.
   */
  it('does not open when a name is stored', async () => {
    seedUser()
    seedBoard()
    render(<App />)

    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  /**
   * Escape closes it and **records the refusal**, which is not the same as storing a name. The
   * board learns nothing, the sidebar still asks in place, and the next load knows the question has
   * already been put — see the skip test below for why that distinction had to exist.
   */
  it('closes on Escape and stores no name', async () => {
    const user = userEvent.setup()
    seedBoard()
    render(<App />)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: '' }))
  })

  // The board is behind a blur while the dialog is up, and usable the moment it is gone. The
  // one-sentence test has to hold on the first visit too.
  it('leaves the board usable once it is dismissed', async () => {
    const user = userEvent.setup()
    seedBoard()
    render(<App />)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'New note' })).toBeDefined()
  })

  /**
   * Being asked once is the difference between a question and a nag, and this is the assertion that
   * made the feature honest. The first build stored nothing on a skip, so the next load saw an
   * empty store, could not tell a returning visitor from a new one, and asked again — a dialog that
   * returns until you comply, which was exactly what D2 forbade. **Declining is an answer**, stored
   * as `{ name: '' }`, and the shell asks on *asked* rather than on the name.
   */
  it('does not come back after it is skipped', async () => {
    const user = userEvent.setup()
    seedBoard()
    const first = render(<App />)
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: '' }))
    first.unmount()

    // A second visit against the same store — a reload, in the only terms a test has for one.
    render(<App />)

    expect(screen.queryByRole('dialog')).toBeNull()
    // And the sidebar is what still asks, in place, where it can be ignored forever.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add your name' })).toBeDefined(),
    )
  })

  it('stores the submitted name, trimmed, and nowhere else', async () => {
    const user = userEvent.setup()
    seedBoard()
    render(<App />)
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Name'), '  Joe Alonzo  ')
    await user.click(within(dialog).getByRole('button', { name: 'Get started' }))

    await waitFor(() => expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Joe Alonzo' }))
    // Not smuggled into the board, and not a second key.
    expect(Object.keys(window.localStorage)).toContain(USER_KEY)
    expect(JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? '{}').notes).toHaveLength(1)
  })

  // A space is not a name, and a disabled button says so before you press it rather than after.
  it('will not submit whitespace', async () => {
    const user = userEvent.setup()
    seedBoard()
    render(<App />)
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Name'), '   ')

    expect(within(dialog).getByRole('button', { name: 'Get started' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(storedUser()).toBeNull()
  })

  /**
   * Principle 5, and the terms P3 set for any dialog standing between a person and their board:
   * it has to open, fill and dismiss from the keyboard alone. No click anywhere in this test.
   */
  it('runs from the keyboard alone', async () => {
    const user = userEvent.setup()
    seedBoard()
    render(<App />)
    const dialog = await screen.findByRole('dialog')

    // Focus opens on the field — nothing to tab to first.
    expect(document.activeElement).toBe(within(dialog).getByLabelText('Name'))
    await user.keyboard('Joe Alonzo{Enter}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Joe Alonzo' })
  })

  /**
   * **The name owns nothing.** D1's whole argument, asserted rather than described: the stored
   * board is byte-identical before a name exists, after one is stored, and after it is changed.
   * An identity that owns data is an account whatever the dialog is called.
   */
  it('leaves the board byte-identical through naming and renaming', async () => {
    const user = userEvent.setup()
    seedBoard([note({ id: 'a', order: 2 }), note({ id: 'b', order: 1, pinned: true })])
    const before = window.localStorage.getItem(BOARD_KEY)
    render(<App />)
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Name'), 'Joe Alonzo')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.localStorage.getItem(BOARD_KEY)).toBe(before)

    await user.click(identity())
    const rename = await screen.findByRole('dialog')
    await user.clear(within(rename).getByLabelText('Name'))
    await user.type(within(rename).getByLabelText('Name'), 'Jo Alonzo')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(window.localStorage.getItem(BOARD_KEY)).toBe(before)
  })

  // Opened from the sidebar it is not an intro. Same component, different copy, and it says so.
  it('is a rename rather than a welcome once a name exists', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    await user.click(identity())

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Your name')).toBeDefined()
    expect(within(dialog).queryByText('Make it yours')).toBeNull()
    expect(within(dialog).getByLabelText('Name')).toHaveProperty('value', 'Joe Alonzo')
  })
})

// T80 — the sidebar says whose board it is.
describe('T80 · the identity in the sidebar', () => {
  const header = () => document.querySelector('[data-sidebar="header"]') as HTMLElement

  it('draws the initials and the name', async () => {
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    const row = within(header()).getByRole('button', { name: 'Joe Alonzo' })
    expect(row.textContent).toContain('JA')
    expect(row.textContent).toContain('Joe Alonzo')
  })

  /**
   * **Position, not mere presence.** Which end of the sidebar this sits at is the decision D3
   * reversed — the footer was the first draft and it belongs to *Dark mode* — so the test asserts
   * the header, and that the bottom of the sidebar stayed empty.
   */
  it('sits in the header, under the mark, and leaves the footer alone', async () => {
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    expect(within(header()).getByRole('button', { name: 'Joe Alonzo' })).toBeDefined()
    expect(header().textContent).toContain('Sticky')
    // The mark's row is written before the identity's, which is what "under the mark" means in a
    // document that has no layout to measure.
    expect(header().textContent?.indexOf('Sticky')).toBeLessThan(
      header().textContent?.indexOf('Joe Alonzo') ?? -1,
    )
    expect(document.querySelector('[data-sidebar="footer"]')).toBeNull()
  })

  it('asks in place when there is no name', async () => {
    seedBoard()
    render(<App />)
    const dialog = await screen.findByRole('dialog')
    await userEvent.setup().keyboard('{Escape}')
    await waitFor(() => expect(dialog.isConnected).toBe(false))

    expect(within(header()).getByRole('button', { name: 'Add your name' })).toBeDefined()
  })

  // Two letters read aloud on top of the word they were cut from is noise.
  it('hides the circle from the accessibility tree', async () => {
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    const row = within(header()).getByRole('button', { name: 'Joe Alonzo' })
    const circle = [...row.querySelectorAll('span')].find((span) => span.textContent === 'JA')
    expect(circle?.getAttribute('aria-hidden')).toBe('true')
  })

  /**
   * The collapsed rail, asserted the only way jsdom can: by the classes, not by the geometry.
   *
   * `SidebarMenuButton` forces `size-8! p-2!` in icon mode — a 32px box with a 16px content area,
   * right for a 16px glyph and wrong for a 28px circle, which started at the content edge, sat 6px
   * right of every other mark in the rail and was clipped by `overflow-hidden` on the way out. The
   * suite could not see any of that (**jsdom runs no layout**) and neither could a reviewer; the
   * rail did, immediately.
   *
   * So this pins the mechanism that fixes it. The measurement belongs to Gate 3, and it is written
   * down there: five marks, all centred on the same axis.
   */
  it('takes the rail button\'s padding off so the circle can centre', async () => {
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    const row = within(header()).getByRole('button', { name: 'Joe Alonzo' })
    expect(row.className).toContain('group-data-[collapsible=icon]:p-0!')
    expect(row.className).toContain('group-data-[collapsible=icon]:justify-center')

    // Hidden rather than clipped: left in the flex row, the label would be centred along with the
    // circle and push it back off to the left.
    const label = [...row.querySelectorAll('span')].find((span) => span.textContent === 'Joe Alonzo')
    expect(label?.className).toContain('group-data-[collapsible=icon]:hidden')
  })

  it('is a button in the tab order, before the destinations', async () => {
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    const focusable = [
      ...document.querySelectorAll('[data-slot="sidebar"] button, [data-slot="sidebar"] a'),
    ]
    const row = within(header()).getByRole('button', { name: 'Joe Alonzo' })
    const notes = screen.getByRole('link', { name: /Notes/ })
    expect(focusable.indexOf(row)).toBeGreaterThanOrEqual(0)
    expect(focusable.indexOf(row)).toBeLessThan(focusable.indexOf(notes))
  })

  /**
   * The row updates without a reload. Two `useLocalStorage` callers on one key — the dialog writes,
   * this reads — kept in step by the `local-storage` event the library dispatches. Verified in
   * groundwork; asserted here so a library change that drops it fails loudly rather than showing a
   * stale name until someone refreshes.
   */
  it('follows the name without a reload', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    await user.click(within(header()).getByRole('button', { name: 'Joe Alonzo' }))
    const dialog = await screen.findByRole('dialog')
    await user.clear(within(dialog).getByLabelText('Name'))
    await user.type(within(dialog).getByLabelText('Name'), 'Ada Lovelace')
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(within(header()).getByRole('button', { name: 'Ada Lovelace' }).textContent).toContain(
        'AL',
      ),
    )
  })
})
