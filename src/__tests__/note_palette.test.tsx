// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'
import { PAPER, paperLabel } from '@/lib/paper'
import { NOTE_COLORS, type NoteColor } from '@/types/note'

const swatch = (color: NoteColor) =>
  screen.getByRole('button', { name: `New ${paperLabel(color)} note` })

const cards = () => screen.queryAllByRole('article')

beforeEach(() => {
  stubMatchMedia()
  window.localStorage.clear()
})
afterEach(cleanup)

describe('the paper palette', () => {
  it('offers one swatch per paper colour', () => {
    render(<App />)

    // Iterated from the exported array, so a seventh paper cannot be added without a
    // swatch appearing.
    for (const color of NOTE_COLORS) {
      expect(swatch(color)).toBeDefined()
    }
  })

  it('offers exactly six, and no more', () => {
    render(<App />)

    expect(screen.getAllByRole('button', { name: /^New .+ note$/ })).toHaveLength(6)
  })

  it('makes every swatch a real button', () => {
    render(<App />)

    for (const color of NOTE_COLORS) {
      expect(swatch(color).tagName).toBe('BUTTON')
    }
  })

  it('carries the paper colour on the swatch itself', () => {
    render(<App />)

    for (const color of NOTE_COLORS) {
      expect(swatch(color).className).toContain(PAPER[color])
    }
  })
})

describe('creating a note', () => {
  it('starts with an empty board', () => {
    render(<App />)

    expect(cards()).toHaveLength(0)
  })

  it('puts one note on the board in the colour that was clicked', () => {
    render(<App />)

    fireEvent.click(swatch('apricot'))

    expect(cards()).toHaveLength(1)
    expect(cards()[0].className).toContain('bg-paper-apricot')
  })

  it('keeps each note in its own colour', () => {
    render(<App />)

    fireEvent.click(swatch('apricot'))
    fireEvent.click(swatch('mint'))

    expect(cards()).toHaveLength(2)
    expect(cards()[0].className).toContain('bg-paper-apricot')
    expect(cards()[1].className).toContain('bg-paper-mint')
  })

  it('gives the new note a stored tilt within -3..3', () => {
    render(<App />)

    fireEvent.click(swatch('rose'))

    const degrees = Number(cards()[0].style.transform.match(/rotate\((-?[\d.]+)deg\)/)?.[1])
    expect(Number.isNaN(degrees)).toBe(false)
    expect(Math.abs(degrees)).toBeLessThanOrEqual(3)
  })

  it('stacks each new note above the last', () => {
    render(<App />)

    fireEvent.click(swatch('sky'))
    fireEvent.click(swatch('lilac'))

    expect(Number(cards()[1].style.zIndex)).toBeGreaterThan(Number(cards()[0].style.zIndex))
  })

  it('updates the sidebar badge', () => {
    render(<App />)

    fireEvent.click(swatch('butter'))

    expect(screen.getByText('1')).toBeDefined()
  })
})
