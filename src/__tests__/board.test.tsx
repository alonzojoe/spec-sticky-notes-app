// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { Board } from '@/components/board/board'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { NotesProvider } from '@/context/notes_context'
import { OpenNoteProvider } from '@/context/open_note_context'
import { useNotesDispatch } from '@/context/use_notes'
import { BOARD_KEY } from '@/lib/board_storage'
import { createNoteSeed } from '@/lib/note_factory'
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
  updatedAt: 1,
  ...over,
})

const SEEDED = [note({ id: 'a' }), note({ id: 'b' })]

/** Lets a test cause a board change that has nothing to do with the notes it is watching. */
function AddOne() {
  const dispatch = useNotesDispatch()
  return (
    <button type="button" onClick={() => dispatch({ type: 'add', seed: createNoteSeed('sky', 0) })}>
      add
    </button>
  )
}

const renderBoard = (notes: Note[] = SEEDED) => {
  window.localStorage.setItem(BOARD_KEY, JSON.stringify({ version: 1, notes }))
  return render(
    // P8 lifted `openId` out of the board, so the board now needs its provider the same way it
    // needs NotesProvider. App renders both; a test that mounts <Board /> directly supplies both.
    <NotesProvider>
      <OpenNoteProvider>
        <Board />
        <AddOne />
      </OpenNoteProvider>
    </NotesProvider>,
  )
}

const transforms = (ids: string[]) =>
  ids.map((id) => screen.getByTestId(`note-${id}`).style.transform)

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
})
afterEach(cleanup)

describe('the board', () => {
  it('renders one card per stored note', () => {
    renderBoard()

    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('renders nothing on an empty board', () => {
    renderBoard([])

    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  // P5 replaced stored coordinates with a stamp, and then replaced absolute positioning with
  // CSS grid. A card carries no position of its own at all now — the layout engine places it,
  // which is why two cards cannot overlap without a test having to prove it.
  it('positions no card itself; the grid does it', () => {
    renderBoard([note({ id: 'a', order: 1 })])

    const card = screen.getByTestId('note-a')
    expect(card.style.transform).toBe('')
    expect(card.style.left).toBe('')
    expect(card.style.top).toBe('')
    expect(card.className).not.toContain('absolute')
  })

  it('lays the board out as a grid that wraps by available width', () => {
    renderBoard([note({ id: 'a', order: 1 })])

    const board = document.querySelector('[data-slot="board"]') as HTMLElement
    expect(board.className).toContain('grid')
    expect(board.style.gridTemplateColumns).toContain('auto-fill')
  })

  it('draws notes square, with no rotation', () => {
    renderBoard([note({ id: 'a', order: 1 }), note({ id: 'b', order: 2 })])

    // mission.md's tilt criterion was amended in P5: a tilt reads as deliberate only when
    // nothing around it is aligned, and everything on a grid is.
    for (const id of ['a', 'b']) {
      expect(screen.getByTestId(`note-${id}`).style.transform).not.toContain('rotate')
    }
  })

  it('orders notes newest first, by stamp', () => {
    renderBoard([note({ id: 'old', order: 1 }), note({ id: 'new', order: 9 })])

    const rendered = [...document.querySelectorAll('[data-slot="note-card"]')].map((el) =>
      el.getAttribute('data-testid'),
    )
    expect(rendered).toEqual(['note-new', 'note-old'])
  })

  it('draws every note square, whatever the board does around it', () => {
    renderBoard([note({ id: 'a', order: 1 }), note({ id: 'b', order: 2 })])

    // P1 asserted a stable random tilt here. P5 amended that criterion out: the tactility
    // now comes from grain and layered shadow, not from rotation.
    for (const id of ['a', 'b']) {
      expect(screen.getByTestId(`note-${id}`).style.transform).toBe('')
    }
  })

  // mission.md names a recomputed tilt as a bug by name.
  it('keeps every tilt identical across a re-render', () => {
    const { rerender } = renderBoard()
    const before = transforms(['a', 'b'])

    rerender(
      <NotesProvider>
        <OpenNoteProvider>
          <Board />
          <AddOne />
        </OpenNoteProvider>
      </NotesProvider>,
    )

    expect(transforms(['a', 'b'])).toEqual(before)
  })

  // Tilt now comes from the store rather than a fixture, which makes the original risk real
  // for the first time: a Math.random() in a render path survives the assertion above and
  // dies here, because an unrelated board change re-renders every card.
  it('leaves the existing cards alone when an unrelated note is added', () => {
    renderBoard()
    const before = transforms(['a', 'b'])

    fireEvent.click(screen.getByRole('button', { name: 'add' }))

    // P1 asserted stable tilts here; P5 removed the tilt and P6 removed the positioning, so
    // what is left to assert is that neither existing card acquired a transform of its own.
    expect(screen.getAllByTestId(/^note-/)).toHaveLength(3)
    expect(transforms(['a', 'b'])).toEqual(before)
  })
})

describe('the board · a card carries no layout of its own', () => {
  // P2 stacked notes with z-index because they overlapped. A grid does not stack, so `z` went
  // the way of `x` and `y`: a field nothing reads is a field that drifts.
  it('sets no z-index', () => {
    renderBoard([note({ id: 'a' }), note({ id: 'b' })])

    expect(screen.getByTestId('note-a').style.zIndex).toBe('')
    expect(screen.getByTestId('note-b').style.zIndex).toBe('')
  })
})

// T54 — P7. The card renders the summary, and the chip is a link that does not fight the four
// gestures already on the card.
describe('T54 · the title and the link chip on the card', () => {
  const chip = (id: string) => screen.getByTestId(`note-${id}`).querySelector('[data-slot="note-link"]')
  const title = (id: string) =>
    screen.getByTestId(`note-${id}`).querySelector('[data-slot="note-title"]')

  it('renders a title when the note has one', () => {
    renderBoard([note({ id: 'a', title: 'Standup with the team' })])

    expect(title('a')?.textContent).toBe('Standup with the team')
  })

  // No `Untitled` placeholder — the row goes back to the body instead.
  it('renders no title element and no placeholder when it has none', () => {
    renderBoard([note({ id: 'a', title: '' })])

    expect(title('a')).toBeNull()
    expect(screen.queryByText(/untitled/i)).toBeNull()
  })

  it('renders the link as one anchor carrying the stored URL', () => {
    renderBoard([note({ id: 'a', link: 'https://meet.google.com/abc-defg-hij' })])

    const anchor = chip('a')
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('https://meet.google.com/abc-defg-hij')
    expect(anchor?.textContent).toContain('meet.google.com/abc-defg-hij')
    expect(anchor?.getAttribute('target')).toBe('_blank')
    // noopener because a new tab holding window.opener can navigate the board out from under
    // itself; noreferrer because there is no reason to tell the destination where it came from.
    expect(anchor?.getAttribute('rel')).toContain('noopener')
    expect(anchor?.getAttribute('rel')).toContain('noreferrer')
  })

  it('renders no anchor when the note has no link', () => {
    renderBoard([note({ id: 'a', link: '' })])

    expect(chip('a')).toBeNull()
  })

  // An <a> inside a <button> is invalid HTML and browsers disagree about which one a click
  // belongs to. Asserted structurally because it is invisible at runtime until one does.
  it('puts the chip beside the opener, never inside it', () => {
    renderBoard([note({ id: 'a', link: 'https://meet.google.com/abc' })])

    const opener = screen.getByTestId(`note-a`).querySelector('[data-testid="open"]')
    expect(opener?.contains(chip('a') as Node)).toBe(false)
    expect(chip('a')?.parentElement).toBe(screen.getByTestId('note-a'))
  })

  // Same contract as T35's pin and delete: following a link must not open the note behind it.
  it('does not open the note when the chip is clicked', () => {
    renderBoard([note({ id: 'a', link: 'https://meet.google.com/abc' })])

    fireEvent.click(chip('a') as Element)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // And pressing it must not begin a drag, or a link would be unclickable on a board.
  it('does not begin a drag from the chip', () => {
    renderBoard([
      note({ id: 'a', order: 2, link: 'https://meet.google.com/abc' }),
      note({ id: 'b', order: 1 }),
    ])
    const anchor = chip('a') as Element

    fireEvent.pointerDown(anchor, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(anchor, { clientX: 200, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(anchor, { clientX: 200, clientY: 0, pointerId: 1 })

    expect(screen.getByTestId('note-a').dataset.dragging).toBeUndefined()
  })
})

// T55 — the clamp follows requirements § D5's table, and the height does not.
describe('T55 · the body clamp varies while the height does not', () => {
  const LINK = 'https://meet.google.com/abc'
  const CASES: [string, Partial<Note>, string][] = [
    ['titled and linked', { title: 'Standup', link: LINK }, 'line-clamp-3'],
    ['titled, no link', { title: 'Standup', link: '' }, 'line-clamp-4'],
    ['untitled, linked', { title: '', link: LINK }, 'line-clamp-4'],
    ['untitled, unlinked', { title: '', link: '' }, 'line-clamp-5'],
  ]

  it.each(CASES)('clamps a %s note to the stated lines', (_name, over, expected) => {
    renderBoard([note({ id: 'a', ...over })])

    expect(screen.getByTestId('note-a').querySelector(`.${expected}`)).not.toBeNull()
  })

  // The assertion the phase exists for: the clamp varies, h-52 does not.
  it('gives all four cards the same height class', () => {
    renderBoard(
      CASES.map(([name, over], index) => note({ id: name, order: index + 1, ...over })),
    )

    for (const [name] of CASES) {
      expect(screen.getByTestId(`note-${name}`).className).toContain('h-52')
    }
  })
})
