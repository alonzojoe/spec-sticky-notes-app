/**
 * What the grid needs from code, now that CSS owns the layout.
 *
 * P5's first draft computed slots here — a column count from the board's width, a pixel
 * offset per index — and positioned every note absolutely. That was replaced: CSS grid does
 * the same arithmetic in the layout engine, reflows on resize with no ResizeObserver, and
 * sizes rows to their content instead of to a constant that has to be kept in sync with the
 * card. It also makes non-overlap structural rather than something a test has to prove.
 *
 * What is left is the one number the stylesheet cannot infer: how narrow a column may get
 * before it should wrap.
 */

/** Minimum column width. `w-56` is 224px, and the card was designed at that width. */
export const MIN_COLUMN = 224

/** The gap between cards, matching Tailwind's `gap-4`, for the drag's row arithmetic. */
export const GAP = 16
