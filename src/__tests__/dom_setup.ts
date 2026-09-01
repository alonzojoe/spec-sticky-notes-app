import { vi } from 'vitest'

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
