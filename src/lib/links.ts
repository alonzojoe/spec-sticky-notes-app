/**
 * Everything the app knows about a URL string. A note's `link` is stored already normalised, so
 * this module runs at exactly two boundaries: the field the user types into, and the defensive
 * read that loads a board off disk.
 *
 * **The scheme is allowlisted, never denylisted, and that is the whole security decision.** A
 * stored string reaches the DOM as an `href`, and `javascript:alert(1)` in an `href` executes on
 * click. A denylist that names `javascript:` loses to `JavaScript:`, to leading whitespace, and to
 * the next scheme nobody thought of; an allowlist of `http:` and `https:` cannot lose to any of
 * them. The board is a single-user local app today, but the value passes through `localStorage`,
 * which is precisely what a future import feature would read back without thinking.
 *
 * Nothing here fetches. mission.md rules out network requests entirely, which is also why the
 * card's chip shows the URL's own host and path rather than a page title it had to go and get.
 */

const SAFE_SCHEMES = ['http:', 'https:']

/** Parses, or gives up. `URL` throws on an unparseable string rather than returning null. */
const parse = (value: string): URL | null => {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/** True only for an absolute `http(s)` URL. A bare host has no scheme yet and is not one. */
export const isSafeLink = (value: string): boolean => {
  const url = parse(value)
  return url !== null && SAFE_SCHEMES.includes(url.protocol)
}

/**
 * What gets stored. Trims, prefixes a bare host with `https://`, and returns `''` for anything
 * that is not left an `http(s)` URL — the caller stores the result either way, so an unsafe value
 * can never be what is written.
 *
 * The prefix matters: `<a href="meet.google.com/abc">` is a *relative path*, so a link typed the
 * way people actually type one would navigate the board to a page that does not exist.
 */
export const normalizeLink = (raw: string): string => {
  const trimmed = raw.trim()
  if (trimmed === '') return ''

  // A scheme, if there is one at all. Tested before prefixing so `javascript:` is judged as the
  // scheme it is rather than becoming `https://javascript:alert(1)` and passing.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  const candidate = hasScheme ? trimmed : `https://${trimmed}`

  const url = parse(candidate)
  if (url === null || !SAFE_SCHEMES.includes(url.protocol)) return ''
  // A host is what makes it a link. `https://` alone parses but points at nothing.
  if (url.hostname === '') return ''
  return candidate
}

/**
 * What the chip shows. String work on a value that has already been through `normalizeLink`, so
 * it never re-parses raw input.
 *
 * Truncation is CSS, not a slice here: the card's width comes from whatever column the grid gave
 * it, and a hardcoded character count would be wrong at every width but one.
 */
export const linkLabel = (url: string): string =>
  url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    // `example.com/` reads as a typo; `example.com/a/` is a path and keeps its slash.
    .replace(/^([^/]+)\/$/, '$1')
