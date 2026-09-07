/**
 * Who this board belongs to, in one place.
 *
 * P13. `mission.md` § Explicitly out of scope names accounts, auth and multi-user, and the
 * amendment carves out exactly this much: **a display name is not an account.** One name, typed
 * into this browser, drawn in the sidebar. No password, no server, no second user, and **nothing in
 * the board is keyed to it** — which is what makes it a label rather than an owner, and why this
 * module exports no notion of *whose* a note is.
 *
 * The key sits beside its own defensive read for the same reason `BOARD_KEY` sits beside `hydrate`
 * in `board_storage.ts`: a key without its guard next to it is how one gets written without the
 * other.
 */

/**
 * Unversioned, like `sticky-notes:sidebar` and unlike `sticky-notes:board:v1`.
 *
 * A version number is worth carrying when a wrong guess costs data you cannot retype. The entire
 * recoverable content of this key is a name, and the recovery is one dialog — so the read repairs
 * to *no name* rather than migrating, and a malformed value is simply a first visit.
 */
export const USER_KEY = 'sticky-notes:user'

/** What is stored. An object rather than a bare string because the key names the *user*, not the
 *  name, and a second field one day should not need a `v2`. It costs six characters. */
export interface StoredUser {
  name: string
}

/**
 * The defensive read. Anything that is not an object carrying a non-empty string `name` becomes
 * `''`, which is exactly the state a first visit is in.
 *
 * Pure, and silent: nothing is thrown and nothing is logged, because there is no failure here worth
 * telling anyone about.
 */
export const readUserName = (stored: unknown): string => {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return ''
  const { name } = stored as { name?: unknown }
  return typeof name === 'string' ? name.trim() : ''
}

/**
 * The two letters in the circle, derived on every render rather than stored — it is a pure function
 * of one short string, and a stored copy is a second thing that can disagree with the name.
 *
 * First word and last word, one **code point** each, uppercased, capped at two. `Array.from` rather
 * than `name[0]`: an astral character is two UTF-16 code units and taking one of them renders half
 * a surrogate pair.
 *
 * `toUpperCase` rather than `toLocaleUpperCase`, deliberately. The locale-aware form makes the
 * rendered initials depend on the browser's locale, which is a thing to be wrong about in Turkish
 * and a thing to be flaky about everywhere else.
 *
 * **This is a Latin-alphabet idea and it degrades rather than breaking.** A mononym gives one
 * letter, a script without case gives the character unchanged, and a name whose family part comes
 * first is initialised in the order it was written. requirements § D4 picks the least-wrong rule
 * rather than a correct one; the name itself is on screen beside it either way.
 */
export const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const ends = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]]
  return ends.map((word) => Array.from(word)[0]).join('').toUpperCase()
}
