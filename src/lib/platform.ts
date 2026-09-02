/**
 * One question — is this a Mac — asked in one place, because the answer decides what the search
 * trigger's badge says and nothing else.
 *
 * **`navigator.platform` is deliberately not used.** It is deprecated, browsers have begun
 * freezing and lying about it, and it is the first thing anyone reaches for. T56 defines it as a
 * throwing getter so that reaching for it fails loudly here rather than quietly somewhere else.
 *
 * Neither source below is authoritative — someone on a Mac with an external PC keyboard is a real
 * person and no API knows about them. That is survivable because **the badge is only a hint**:
 * `app_shell.tsx` accepts Meta+K *and* Ctrl+K on every platform, so a wrong guess costs a slightly
 * wrong label rather than the shortcut itself.
 */

// Chromium-only, and the accurate one where it exists. Typed here rather than globally because a
// project-wide declaration would suggest it can be relied on.
type UADataNavigator = Navigator & { userAgentData?: { platform?: string } }

/**
 * Read at call time, never captured at module load. A constant assigned at import cannot be
 * changed by a test without resetting modules, and varying is this module's entire job.
 */
export const isMac = (): boolean => {
  const platform = (navigator as UADataNavigator).userAgentData?.platform
  if (typeof platform === 'string' && platform !== '') return /mac/i.test(platform)
  // The fallback is the path most browsers actually take.
  return /mac/i.test(navigator.userAgent ?? '')
}

/**
 * `⌘` is the glyph every Mac app prints. Off macOS it is the word `Ctrl` and not `⌃`, because the
 * control glyph is a macOS convention and reads as noise anywhere else.
 */
export const modifierLabel = (): string => (isMac() ? '⌘' : 'Ctrl')

/** The one letter the shortcut uses, so the handler and the badge cannot disagree about it. */
export const SHORTCUT_KEY = 'k'
