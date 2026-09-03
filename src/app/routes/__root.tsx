import { Outlet, createRootRoute } from '@tanstack/react-router'

/**
 * The document, and nothing about the board.
 *
 * unicare's root carries what is true of every page — the canonical head tag, the toaster, the
 * inactivity timers — and hangs its layout groups underneath. Ours has none of those things yet, so
 * this is deliberately an outlet and a comment: the shell lives in `_board/route.tsx`, because it
 * is what the board's routes share rather than what wraps the whole document.
 *
 * The distinction is only worth a file while something can sit outside the shell. Nothing does
 * today; the next thing that does — a printable board, an onboarding screen — lands beside `_board`
 * rather than inside the only layout there is.
 */
export const Route = createRootRoute({
  component: Outlet,
})
