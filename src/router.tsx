import {
  createRootRoute,
  createRoute,
  createRouter,
  createBrowserHistory,
  type RouterHistory,
} from '@tanstack/react-router'

import { Board } from '@/components/board/board'
import { AppShell } from '@/components/layout/app_shell'

/**
 * The two sections of the board, as routes.
 *
 * P10 first specified the section as one piece of context persisted under a `sticky-notes:section`
 * key. It is a route instead: a URL already remembers which view you were in across a reload, is
 * shareable and survives the back button, and two sources of truth for one fact — a key and a path —
 * would be worse than either alone. The storage contract is unchanged by this phase as a result;
 * `localStorage` still holds the board and the sidebar and nothing else.
 *
 * **Code-based routes, not the file-based plugin.** The plugin generates `routeTree.gen.ts`, which
 * is camelCase, and P1's naming rule is enforced by a test whose `EXEMPT` list P9 pinned shut. A
 * route tree written by hand is three routes long and costs less than an amendment to that list.
 *
 * `/` is the whole board rather than a redirect to `/notes`. A redirect resolves asynchronously,
 * and every test in this suite renders the app at `/` and expects a board on the first commit.
 * `/notes` is a real route to the same view, so the sidebar has a path to link at and the URL says
 * which section you are in once you have chosen one.
 */
const rootRoute = createRootRoute({ component: AppShell })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Board section="notes" />,
})

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  component: () => <Board section="notes" />,
})

const pinnedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pinned',
  component: () => <Board section="pinned" />,
})

const routeTree = rootRoute.addChildren([indexRoute, notesRoute, pinnedRoute])

/**
 * A router, rather than *the* router.
 *
 * A router matches its first location once and cannot be re-loaded, so a suite that shares one
 * instance across files can only ever start at `/`. Tests that need to start somewhere else — or
 * to navigate and then leave the next test alone — build their own over a memory history, which is
 * also what keeps them off the jsdom History that a shared instance would leak between them.
 */
export function createAppRouter(history: RouterHistory = createBrowserHistory()) {
  return createRouter({
    routeTree,
    history,
    // Nothing is fetched on navigation — both routes render the same board out of the same
    // reducer — so there is no pending state to show and nothing to preload on hover.
    defaultPreload: false,
  })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
