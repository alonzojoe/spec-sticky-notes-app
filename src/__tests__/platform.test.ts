// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { SHORTCUT_KEY, isMac, modifierLabel } from '@/lib/platform'

/**
 * Both stubs are `configurable` so afterEach can take them back off. `userAgentData` does not
 * exist in jsdom at all, so it is defined rather than overwritten.
 */
const stubUAData = (platform: string | undefined) => {
  Object.defineProperty(navigator, 'userAgentData', {
    value: platform === undefined ? undefined : { platform },
    configurable: true,
  })
}

const stubUA = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true })
}

const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const PC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

afterEach(() => {
  Reflect.deleteProperty(navigator, 'userAgentData')
  Reflect.deleteProperty(navigator, 'userAgent')
})

// T56 — the platform is detected, and the label follows it.
describe('T56 · isMac and modifierLabel', () => {
  it.each([
    ['macOS', true],
    ['Windows', false],
    ['Linux', false],
    ['', false],
  ])('reads userAgentData.platform %s', (platform, expected) => {
    stubUAData(platform)

    expect(isMac()).toBe(expected)
  })

  // The fallback is the path most browsers actually take — userAgentData is Chromium-only.
  it.each([
    [MAC_UA, true],
    [PC_UA, false],
  ])('falls back to the user agent when userAgentData is absent', (ua, expected) => {
    stubUAData(undefined)
    stubUA(ua)

    expect(isMac()).toBe(expected)
  })

  it('is not a Mac when neither source says anything', () => {
    stubUAData(undefined)
    stubUA('')

    expect(isMac()).toBe(false)
  })

  it('labels the modifier the way each platform writes it', () => {
    stubUAData('macOS')
    // The glyph, not the word: ⌘K is what every Mac app shows.
    expect(modifierLabel()).toBe('⌘')

    stubUAData('Windows')
    // The word, not ⌃: nobody outside macOS reads the control glyph.
    expect(modifierLabel()).toBe('Ctrl')
  })

  /**
   * navigator.platform is deprecated and is exactly what someone reaches for by habit. Defined
   * as a throwing getter so that reaching for it fails loudly rather than working today and
   * breaking when a browser drops it.
   */
  it('never reads the deprecated navigator.platform', () => {
    stubUAData('macOS')
    Object.defineProperty(navigator, 'platform', {
      get() {
        throw new Error('navigator.platform is deprecated — see lib/platform.ts')
      },
      configurable: true,
    })

    expect(() => isMac()).not.toThrow()
    expect(() => modifierLabel()).not.toThrow()

    Reflect.deleteProperty(navigator, 'platform')
  })

  // Read at call time, not at module load. A value captured at import cannot be changed by a
  // test without resetting modules, and this is the one module whose job is to vary.
  it('answers from the environment at call time', () => {
    stubUAData('macOS')
    expect(modifierLabel()).toBe('⌘')

    stubUAData('Windows')
    expect(modifierLabel()).toBe('Ctrl')
  })

  it('names the shortcut key once', () => {
    expect(SHORTCUT_KEY).toBe('k')
  })
})
