import { describe, expect, it } from 'vitest'

import { CELL, GUTTER, MARGIN, columnsFor, gridHeight, rowsFor, slotOf } from '@/lib/grid'

/** The width that fits exactly `n` columns: n cells, n-1 gutters, two margins. */
const widthFor = (n: number) => 2 * MARGIN + n * CELL.width + (n - 1) * GUTTER

describe('columnsFor', () => {
  it('fits exactly n columns at the width that holds n', () => {
    for (const n of [1, 2, 3, 5, 8]) {
      expect(columnsFor(widthFor(n))).toBe(n)
    }
  })

  // The off-by-one the `+ GUTTER` in the numerator exists for. Without it the arithmetic asks
  // for a trailing gutter nothing occupies, and a column is lost at exactly these widths.
  it('drops to n-1 one pixel below that width', () => {
    for (const n of [2, 3, 5]) {
      expect(columnsFor(widthFor(n) - 1)).toBe(n - 1)
    }
  })

  it('never returns less than one, however narrow or absurd the board', () => {
    for (const width of [0, 1, 100, -50, Number.NEGATIVE_INFINITY]) {
      expect(columnsFor(width)).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('slotOf', () => {
  it('puts slot 0 at the margin for every column count', () => {
    for (const columns of [1, 2, 6]) {
      expect(slotOf(0, columns)).toEqual({ x: MARGIN, y: MARGIN })
    }
  })

  it('starts a new row directly below the first, at the same x', () => {
    const columns = 4
    const first = slotOf(0, columns)
    const wrapped = slotOf(columns, columns)

    expect(wrapped.x).toBe(first.x)
    expect(wrapped.y).toBe(first.y + CELL.height + GUTTER)
  })

  it('steps one cell plus one gutter along a row', () => {
    expect(slotOf(1, 4).x - slotOf(0, 4).x).toBe(CELL.width + GUTTER)
  })

  /**
   * This is the "they will not override each other" claim, and it belongs here rather than in
   * a rendered test: a slot index cannot collide with another slot index, and that is provable
   * arithmetic rather than something to eyeball on a board.
   */
  it('never produces two overlapping rectangles', () => {
    for (const columns of [1, 2, 3, 5]) {
      const boxes = Array.from({ length: 24 }, (_, i) => slotOf(i, columns))
      for (let a = 0; a < boxes.length; a += 1) {
        for (let b = a + 1; b < boxes.length; b += 1) {
          const apart =
            boxes[b].x - (boxes[a].x + CELL.width) >= 0 ||
            boxes[a].x - (boxes[b].x + CELL.width) >= 0 ||
            boxes[b].y - (boxes[a].y + CELL.height) >= 0 ||
            boxes[a].y - (boxes[b].y + CELL.height) >= 0
          expect(apart).toBe(true)
        }
      }
    }
  })
})

describe('rowsFor and gridHeight', () => {
  it('counts rows without a trailing empty one', () => {
    expect(rowsFor(0, 3)).toBe(0)
    expect(rowsFor(1, 3)).toBe(1)
    expect(rowsFor(3, 3)).toBe(1)
    expect(rowsFor(4, 3)).toBe(2)
  })

  it('reserves height for the last row and no gutter past it', () => {
    expect(gridHeight(1, 3)).toBe(CELL.height + 2 * MARGIN)
    expect(gridHeight(4, 3)).toBe(2 * CELL.height + GUTTER + 2 * MARGIN)
  })
})
