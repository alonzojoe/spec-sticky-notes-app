/**
 * Where a note sits, as arithmetic. No DOM, no React, no store — the board measures its own
 * width and hands it in, which is what keeps the geometry testable and keeps the "notes never
 * overlap" claim provable in a pure test rather than a rendered one.
 *
 * P5 replaced note_factory.ts's placement search with this. That search measured the board,
 * walked a lattice of slots looking for one clear of every existing note, jittered off it so
 * the result read as thrown, and gave up into the roomiest gap when the board was full. It
 * was careful, and a grid makes all of it unnecessary: a slot index cannot collide with
 * another slot index.
 */

/** A note's footprint. `width` is `w-56` from note_card.tsx; `height` is a note in edit mode. */
export const CELL = { width: 224, height: 144 } as const

/** Clear space between cells, so "not overlapping" also reads as "not crowded". */
export const GUTTER = 16

/** Keeps the grid off the very edge of the board. */
export const MARGIN = 24

/**
 * How many columns fit in `boardWidth`.
 *
 * `n` columns carry `n - 1` gutters, hence the `+ GUTTER` in the numerator: without it the
 * arithmetic asks for a trailing gutter that nothing occupies and drops a column at exactly
 * the widths where one fits.
 *
 * Never returns less than 1. A board narrower than a single note renders one column that
 * overhangs rather than dividing by zero or rendering nothing.
 */
export const columnsFor = (boardWidth: number): number =>
  Math.max(1, Math.floor((boardWidth - 2 * MARGIN + GUTTER) / (CELL.width + GUTTER)))

/** The pixel offset of slot `index`, reading left to right and top to bottom. */
export const slotOf = (index: number, columns: number): { x: number; y: number } => ({
  x: MARGIN + (index % columns) * (CELL.width + GUTTER),
  y: MARGIN + Math.floor(index / columns) * (CELL.height + GUTTER),
})

/** How many rows `count` notes occupy, for sizing the scroll region. */
export const rowsFor = (count: number, columns: number): number => Math.ceil(count / columns)

/** The full height the grid needs, so the board scrolls to exactly the last row. */
export const gridHeight = (count: number, columns: number): number =>
  rowsFor(count, columns) * (CELL.height + GUTTER) - GUTTER + 2 * MARGIN
