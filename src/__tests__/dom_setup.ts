import { vi } from 'vitest'

import { USER_KEY } from '@/lib'

// jsdom implements no matchMedia, and shadcn's use-mobile hook calls it on mount.
// Defaults to desktop so the sidebar renders its panel rather than the mobile Sheet.
export const stubMatchMedia = (matches = false) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/**
 * A board that already belongs to somebody.
 *
 * P13 asks for a name on a visit that has none, and a dialog covers the app while it does —
 * Radix `aria-hidden`s everything behind an open modal, so a suite rendering the shell with an
 * empty store is a suite asserting against a board no query can reach. That is correct product
 * behaviour and the wrong starting state for a test about dragging a note.
 *
 * So every file that renders the shell seeds a name, the way it seeds a board: these tests are
 * about a returning user. The **first** visit is `user_name.test.tsx`'s subject, and it is the only
 * file that leaves this key empty on purpose.
 *
 * Called after `localStorage.clear()`, never before it.
 */
export const seedUser = (name = 'Joe Alonzo') =>
  window.localStorage.setItem(USER_KEY, JSON.stringify({ name }))

/**
 * jsdom implements no `ResizeObserver`, and Radix's positioning does.
 *
 * A `SidebarMenuButton` carrying a `tooltip` mounts a Radix tooltip beside it. Hovering one — which
 * is what a `userEvent` click does on the way in — opens it, floating-ui measures, and the app
 * throws into its error boundary mid-test. It is a **race with the tooltip's own open delay**, so it
 * fails perhaps one run in four and passes every time you go looking for it.
 *
 * Stubbed rather than mocked away: the three methods are all Radix calls, and nothing under test
 * cares what they return.
 */
export const stubResizeObserver = () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}
