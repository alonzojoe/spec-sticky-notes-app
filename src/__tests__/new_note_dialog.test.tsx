// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '@/__tests__/test_app'
import { loadRouter } from '@/__tests__/router_setup'
import { stubMatchMedia } from '@/__tests__/dom_setup'

// The router matches its first location asynchronously; loading it here is what makes a
// synchronous render produce a board rather than an empty div. See router_setup.ts.
beforeAll(loadRouter)

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
})
afterEach(cleanup)

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'New note' }))
  return screen.findByRole('dialog')
}

const noteText = () => screen.getByRole('textbox', { name: 'Note text' })

// T20 — the phase's central claim: colour and text are both chosen before the note exists.
describe('T20 · colour and text are chosen before the note exists', () => {
  it('puts one note on the board carrying both', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.click(screen.getByRole('radio', { name: 'Mint' }))
    await user.type(noteText(), 'buy milk')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    const notes = await screen.findAllByRole('article')
    expect(notes).toHaveLength(1)
    expect(notes[0].className).toContain('bg-paper-mint')
    expect(screen.getByText('buy milk')).toBeDefined()
  })

  it('creates the note in one dispatch, not add-then-edit', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(noteText(), 'buy milk')
    await user.click(screen.getByRole('button', { name: 'Add note' }))
    await screen.findAllByRole('article')

    // D4: `add` then `edit_body` would leave these unequal. board.tsx reads exactly this
    // equality to decide which note opens focused, so the shortcut is not free.
    const read = () => JSON.parse(window.localStorage.getItem('sticky-notes:board:v1') ?? '{}')
    await waitFor(() => expect(read().notes ?? []).toHaveLength(1))
    const [stored] = read().notes
    expect(stored.createdAt).toBe(stored.updatedAt)
    expect(stored.body).toBe('buy milk')
  })

  it('hands over to the note view once the note is made', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.click(screen.getByRole('button', { name: 'Add note' }))

    // P6: the create dialog closes and the new note's own view opens in its place, because a
    // note created empty is one you are about to write on. The dialog on screen afterwards is
    // a different one — it carries the note's textarea, not a New note title.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Add note' })).toBeNull())
    // Also awaited, not asserted synchronously. The dialog dispatches `add` inside a
    // setTimeout(0) — see the comment in new_note_dialog.tsx — so the create dialog closing and
    // the note view opening are two separate macrotasks. Asserting the second the moment the
    // first lands is a race, and it failed roughly one run in three.
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Note text' })).toBeDefined())
  })
})

// T21 — decision D3. Six independent buttons was right in the sidebar, where each performed
// an action. Here they are one value, so they are one tab stop.
describe('T21 · the swatches are a radiogroup', () => {
  it('exposes a named group of six radios with exactly one checked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    expect(screen.getByRole('radiogroup', { name: 'Paper colour' })).toBeDefined()
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
  })

  it('holds a single tab stop', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    const reachable = screen.getAllByRole('radio').filter((s) => s.tabIndex === 0)
    expect(reachable).toHaveLength(1)
    expect(reachable[0].getAttribute('aria-checked')).toBe('true')
  })

  it('moves and wraps with the arrow keys, selection following focus', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    screen.getByRole('radio', { name: 'Butter' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Apricot' }).getAttribute('aria-checked')).toBe('true')

    // Butter is first, so ArrowLeft from it wraps to the last swatch.
    screen.getByRole('radio', { name: 'Butter' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Mint' }).getAttribute('aria-checked')).toBe('true')
  })

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    screen.getByRole('radio', { name: 'Butter' }).focus()
    await user.keyboard('{End}')
    expect(screen.getByRole('radio', { name: 'Mint' }).getAttribute('aria-checked')).toBe('true')

    await user.keyboard('{Home}')
    expect(screen.getByRole('radio', { name: 'Butter' }).getAttribute('aria-checked')).toBe('true')
  })
})

// T22 — the text is the thought; the colour is a default that is usually fine.
describe('T22 · the dialog opens focused on the textarea', () => {
  it('does not put focus on the first swatch or the close button', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await waitFor(() => expect(document.activeElement).toBe(noteText()))
  })
})

// T23 — a note body is multi-line. A form that submitted on Enter would put the second line
// out of reach of the keyboard, which is what the amended principle 2 promised not to do.
describe('T23 · Enter writes a newline, Ctrl+Enter submits', () => {
  it('keeps the dialog open and keeps the newline', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(noteText(), 'first{Enter}second')

    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeDefined()
    expect((noteText() as HTMLTextAreaElement).value).toBe('first\nsecond')
  })

  it('submits on Ctrl+Enter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(noteText(), 'a thought')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(await screen.findAllByRole('article')).toHaveLength(1)
  })
})

// T24 — decision D6. The shortcut is what keeps capture inside the two-second test now that
// a dialog stands in the way, so its suppression list is load-bearing.
describe('T24 · n opens the dialog, and is inert while typing', () => {
  it('opens from the board', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('n')

    expect(await screen.findByRole('dialog')).toBeDefined()
  })

  it('is not suppressed by Shift, because Shift+n is N', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('{Shift>}n{/Shift}')

    expect(await screen.findByRole('dialog')).toBeDefined()
  })

  it.each([
    ['Control', '{Control>}n{/Control}'],
    ['Meta', '{Meta>}n{/Meta}'],
    ['Alt', '{Alt>}n{/Alt}'],
  ])('ignores %s+n', async (_name, keys) => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard(keys)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lets n reach a note being written on instead of opening the create dialog', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Make a note; P6 opens its view straight away, focused on the textarea.
    await user.keyboard('n')
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    const body = await screen.findByRole('textbox', { name: 'Note text' })
    await user.click(body)
    await user.keyboard('note')

    // The `n` reached the textarea rather than opening a second, nested create dialog.
    expect(screen.queryByRole('button', { name: 'Add note' })).toBeNull()
    expect((body as HTMLTextAreaElement).value).toBe('note')
  })
})

// T25 — the amendment in D1 made the keyboard path a condition of the carve-out, not an
// aspiration. If this fails, the phase has not shipped what mission.md now says it does.
describe('T25 · the whole dialog is completable without a mouse', () => {
  it('opens, chooses a colour, types, and submits from the keyboard alone', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('n')
    await screen.findByRole('dialog')
    await waitFor(() => expect(document.activeElement).toBe(noteText()))

    await user.keyboard('a thought')
    // Two shifts back to the swatches, not one. P7 put the title input between the radiogroup
    // and the textarea, which is a stop the keyboard path gained rather than one it lost — the
    // carve-out's condition is that the dialog is completable without a mouse, not that any
    // particular control is exactly one tab away.
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Control>}{Enter}{/Control}')

    const notes = await screen.findAllByRole('article')
    expect(notes).toHaveLength(1)
    expect(notes[0].className).toContain('bg-paper-apricot')
    expect(screen.getByText('a thought')).toBeDefined()
  })
})

// T26 — a cancelled draft is not a draft.
describe('T26 · Escape and Cancel close without creating, and clear the draft', () => {
  it('creates nothing on Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(noteText(), 'never mind')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('reopens empty, with the colour back to the default', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.click(screen.getByRole('radio', { name: 'Mint' }))
    await user.type(noteText(), 'never mind')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await open(user)
    expect((noteText() as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByRole('radio', { name: 'Butter' }).getAttribute('aria-checked')).toBe('true')
  })
})

// T52 — P7. The create dialog carries the title and the link, and the link is stored normalised.
describe('T52 · the create dialog carries the title and the link', () => {
  const read = () => JSON.parse(window.localStorage.getItem('sticky-notes:board:v1') ?? '{}')

  it('puts a note on the board with both', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(screen.getByLabelText('Title'), 'Standup with the team')
    await user.type(noteText(), 'went through the merge')
    await user.type(screen.getByLabelText('Link'), 'https://meet.google.com/abc-defg-hij')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    await waitFor(() => expect(read().notes ?? []).toHaveLength(1))
    const [stored] = read().notes
    expect(stored.title).toBe('Standup with the team')
    expect(stored.link).toBe('https://meet.google.com/abc-defg-hij')
  })

  // The whole point of normalizeLink at the boundary: a bare host is what people type.
  it('stores a bare host normalised', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(screen.getByLabelText('Link'), 'meet.google.com/abc-defg-hij')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    await waitFor(() => expect(read().notes ?? []).toHaveLength(1))
    expect(read().notes[0].link).toBe('https://meet.google.com/abc-defg-hij')
  })

  // Ctrl/Cmd+Enter never blurs the link input, so this is the path where a draft held privately
  // inside the field would be silently dropped.
  it('normalises a link submitted from the keyboard without blurring', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(screen.getByLabelText('Link'), 'meet.google.com/xyz')
    await user.keyboard('{Control>}{Enter}{/Control}')

    await waitFor(() => expect(read().notes ?? []).toHaveLength(1))
    expect(read().notes[0].link).toBe('https://meet.google.com/xyz')
  })

  it('stores an empty string for each when neither is filled in', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(noteText(), 'just a thought')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    await waitFor(() => expect(read().notes ?? []).toHaveLength(1))
    const [stored] = read().notes
    expect(stored.title).toBe('')
    expect(stored.link).toBe('')
    expect(stored.createdAt).toBe(stored.updatedAt)
  })

  it('refuses an unsafe link rather than storing it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(screen.getByLabelText('Link'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    await waitFor(() => expect(read().notes ?? []).toHaveLength(1))
    expect(read().notes[0].link).toBe('')
  })

  // A cancelled draft is not a draft — the two new fields join the four that already reset.
  it('clears both on Cancel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await open(user)

    await user.type(screen.getByLabelText('Title'), 'Standup')
    await user.type(screen.getByLabelText('Link'), 'meet.google.com/abc')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await open(user)

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Link') as HTMLInputElement).value).toBe('')
  })
})
