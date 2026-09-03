import { router } from '@/router'

/**
 * P10 put the board behind a router, and TanStack Router matches its first location
 * asynchronously: a `RouterProvider` rendered before that resolves commits an empty div, which is
 * not what any test in this suite — or any user — should see.
 *
 * Loading it once before each test, and returning it to `/`, is what makes a synchronous
 * `render(<App />)` produce a board on the first commit. The reset matters as much as the load:
 * the router is a module singleton, so a test that navigates to `/pinned` would otherwise hand the
 * next one a filtered board it never asked for.
 *
 * `main.tsx` does the same thing for the same reason — it awaits the first match before mounting,
 * so the app never paints an empty frame on load.
 */
export const loadRouter = async () => {
  // Through the router's own history rather than `router.navigate`: navigate resolves when a
  // mounted RouterProvider has committed the new match, and nothing is mounted yet in a
  // `beforeEach`, so awaiting it hangs until the hook times out.
  if (router.history.location.pathname !== '/') router.history.replace('/')
  await router.load()
}
