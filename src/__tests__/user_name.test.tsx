// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '@/__tests__/test_app'
import { loadRouter } from '@/__tests__/router_setup'
import { seedUser, stubMatchMedia, stubResizeObserver } from '@/__tests__/dom_setup'
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
  // This file is the one that clicks a sidebar row carrying a tooltip, repeatedly. See dom_setup.
  stubResizeObserver()
  // TanStack Router scrolls to the top on navigation and jsdom implements no scrollTo — left
  // unstubbed it prints "Not implemented" through every test in this file.
  window.scrollTo = () => {}
  window.localStorage.clear()
})
/**
 * Radix locks the body while a modal is up and unlocks it on the way out — and several tests here
 * end with the intro still open, because refusing to close is the thing being asserted. jsdom runs
 * no animations, so that unlock never happens and the next test inherits a `pointer-events: none`
 * body and a scroll lock: every pointer interaction throws and every role query comes back empty.
 * Cleared here rather than worked around in each test.
 */
afterEach(() => {
  cleanup()
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
   * **The intro has no way out but a name**, and this is the whole of it: every route out of a
   * Radix dialog — Escape, the backdrop, the ✕ — is refused while there is no name.
   *
   * The phase shipped the opposite first, and § D2 records both. What settled it is that an intro
   * you can wave away is a thing to wave away, and the app then spends the rest of its life asking
   * in the corner instead.
   */
  it('cannot be closed with Escape', async () => {
    const user = userEvent.setup()
    seedBoard()
    render(<App />)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(storedUser()).toBeNull()
  })

  it('cannot be closed by clicking away from it', async () => {
    seedBoard()
    render(<App />)
    await screen.findByRole('dialog')

    // `userEvent` cannot click here at all — Radix sets `pointer-events: none` on the body while a
    // modal is up, which is itself half the answer. `fireEvent` on the overlay is what asks the
    // remaining question: does the dismiss handler fire, and is it refused?
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    fireEvent.pointerDown(overlay)
    fireEvent.click(overlay)

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(storedUser()).toBeNull()
  })

  /**
   * Removed rather than made inert. A control that is drawn and does nothing reads as a broken
   * dialog; one that was never drawn reads as a required one.
   */
  it('draws no close button and no way to skip', async () => {
    seedBoard()
    render(<App />)
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Skip' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  // The board is behind it until a name exists, and reachable the moment one does.
  it('hands over the board once a name is given', async () => {
    const user = userEvent.setup()
    seedBoard()
    render(<App />)
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Name'), 'Joe Alonzo')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'New note' })).toBeDefined()
  })

  /**
   * Asked exactly once per browser: the visit that names the board. An earlier build let the intro
   * be skipped and had to *record* the refusal to avoid asking on every load — with no way to
   * refuse, the name itself is the answer and there is nothing else to store.
   */
  it('does not come back once a name exists', async () => {
    const user = userEvent.setup()
    seedBoard()
    const first = render(<App />)
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Joe Alonzo')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    first.unmount()

    // A second visit against the same store — a reload, in the only terms a test has for one.
    render(<App />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // The rename is not the intro and is not forced: there is a name to fall back to.
  it('lets the rename be dismissed', async () => {
    const user = userEvent.setup()
    seedUser()
    seedBoard()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    await user.click(identity())
    const rename = await screen.findByRole('dialog')

    expect(within(rename).getByRole('button', { name: 'Cancel' })).toBeDefined()
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(JSON.parse(storedUser() ?? '{}')).toEqual({ name: 'Joe Alonzo' })
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

  /**
   * The unnamed row is a degenerate state now rather than a designed one: the intro cannot be left
   * without a name, so an empty stored name is something only a hand-edited store produces — and
   * the app treats it as what it is, a board that has not been named, and asks again.
   *
   * The row still has to render something behind that dialog. Queried out of the DOM rather than by
   * role, because Radix `aria-hidden`s everything behind an open modal.
   */
  it('asks again, and still draws a way back, when the stored name is empty', async () => {
    seedUser('')
    seedBoard()
    render(<App />)

    await screen.findByRole('dialog')
    expect(header().textContent).toContain('Add your name')
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
