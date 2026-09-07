import { useLocalStorage } from 'usehooks-ts'

import { initialsOf, readUserName, USER_KEY } from '@/lib'

/**
 * The one way to read or write the name. No component knows what the key is called.
 *
 * Two callers — the dialog writes, the sidebar reads — and no provider between them, which is a
 * departure from `notes_context.tsx` and is deliberate. `useLocalStorage` dispatches its own
 * `local-storage` event on every write and every instance on the key listens for it, so two callers
 * stay in step within a tab without a context to hold the value. Verified against usehooks-ts 3.1.1
 * in P13's groundwork rather than assumed; the fallback, if that ever stops being true, is a
 * provider beside the other two and no change to this signature.
 *
 * `initializeWithValue` is left at its default, so the first render already knows whether a name is
 * stored. Deferring that read to an effect would flash the dialog at a returning user for one
 * frame, which is the worst frame this app could draw.
 */
export function useUser() {
  const [stored, setStored] = useLocalStorage<unknown>(USER_KEY, null, {
    // Typed `unknown` and guarded here for the same reason the board is: this came from outside the
    // program, and `readUserName` is the only thing entitled to say what it is.
    deserializer: (raw) => {
      try {
        return JSON.parse(raw) as unknown
      } catch {
        // usehooks-ts's default deserializer console.errors a parse failure, which would put a
        // corrupt value in the console on every load. A malformed value is a first visit.
        return null
      }
    },
  })

  const name = readUserName(stored)

  /**
   * Whether the question has been *asked*, which is not the same as whether it was answered.
   *
   * P13 promised the intro would not reopen by itself, and the first build could not keep that:
   * skipping stored nothing, so the next load saw an empty store and could not tell a returning
   * visitor from a new one. So a skip is an answer — `{ name: '' }` — and this is what the shell
   * reads to decide whether to ask at all.
   *
   * A malformed value is deliberately *not* asked. It is repaired to no name, which makes it a
   * first visit in every other respect, and a first visit is asked.
   */
  const asked = typeof stored === 'object' && stored !== null && !Array.isArray(stored)

  return {
    name,
    initials: initialsOf(name),
    asked,
    setName: (next: string) => setStored({ name: next.trim() }),
    /** Declining is an answer, and is recorded as one. */
    skip: () => setStored({ name: '' }),
  }
}
