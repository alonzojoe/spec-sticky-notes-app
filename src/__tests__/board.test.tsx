// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { Board } from '@/components/board/board'
import { MOCK_NOTES } from '@/components/board/mock_notes'
import { stubMatchMedia } from '@/__tests__/dom_setup'

beforeEach(() => stubMatchMedia())
afterEach(cleanup)

const transforms = () =>
  MOCK_NOTES.map((note) => screen.getByTestId(`note-${note.id}`).style.transform)

describe('the board', () => {
  it('renders one card per mock note', () => {
    render(<Board />)
    expect(screen.getAllByRole('article')).toHaveLength(MOCK_NOTES.length)
  })

  it('gives every note a tilt within the -3..3 range, and never zero', () => {
    render(<Board />)
    for (const transform of transforms()) {
      const degrees = Number(transform.match(/rotate\((-?[\d.]+)deg\)/)?.[1])
      expect(Number.isNaN(degrees)).toBe(false)
      expect(degrees).not.toBe(0)
      expect(Math.abs(degrees)).toBeLessThanOrEqual(3)
    }
  })

  // mission.md names a recomputed tilt as a bug by name. A Math.random() tilt passes the
  // test above and fails this one.
  it('keeps every tilt identical across a re-render', () => {
    const { rerender } = render(<Board />)
    const before = transforms()
    rerender(<Board />)
    expect(transforms()).toEqual(before)
  })
})
