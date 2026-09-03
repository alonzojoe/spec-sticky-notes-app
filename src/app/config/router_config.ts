import { createBrowserHistory, createRouter, type RouterHistory } from '@tanstack/react-router'

import { routeTree } from '@/app/routeTree.gen'

/**
 * A router, rather than *the* router.
 *
 * A router matches its first location once and cannot be re-loaded, so a suite that shares one
 * instance across files can only ever start at `/`. Tests that need to start somewhere else — or to
 * navigate and then leave the next test alone — build their own over a memory history, which is
 * also what keeps them off the jsdom History a shared instance would leak between them.
 *
 * The tree is generated from the files under `routes/` by `@tanstack/router-plugin`, so adding a
 * route is adding a file and nothing else. Nothing is assembled here.
 */
export function createAppRouter(history: RouterHistory = createBrowserHistory()) {
  return createRouter({
    routeTree,
    history,
    // Nothing is fetched on navigation — every route renders the same board out of the same
    // reducer — so there is no pending state to show and nothing to preload on hover.
    defaultPreload: false,
  })
}
