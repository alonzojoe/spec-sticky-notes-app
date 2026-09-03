import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app_shell'

/**
 * The board's layout: the sidebar, the toolbar, the providers and the two keyboard shortcuts,
 * shared by every route under `_board` and mounted once for all of them.
 *
 * Pathless — the `_` prefix means the group contributes no URL segment — so `/`, `/notes` and
 * `/pinned` are the paths the user sees while the shell is what they have in common. That is the
 * whole reason it is a group rather than a component every route remembers to render: navigating
 * between sections cannot remount the store, because the thing holding the store is above the
 * route that changed.
 */
export const Route = createFileRoute('/_board')({
  component: AppShell,
})
