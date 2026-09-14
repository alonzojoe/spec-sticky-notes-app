import { useNavigate } from '@tanstack/react-router'
import { useLocalStorage } from 'usehooks-ts'

import { useNotesDispatch } from '@/context/use_notes'
import { useUser } from '@/hooks/use_user'
import { parseSidebarOpen, SIDEBAR_KEY } from '@/lib'

/**
 * The one destructive act in this app that is not about a single note.
 *
 * It clears all three keys and it does it **through the hooks that own them** — never through
 * `localStorage.clear()` or `removeItem`, and that is the load-bearing part of the decision rather
 * than a style preference. requirements § D4.
 *
 * A raw removal notifies nothing inside the tab. `useLocalStorage` dispatches its own
 * `local-storage` event on *write*, and every instance on a key listens for it — which is how the
 * sidebar sees a rename without a reload — but a direct call to the Storage API bypasses that
 * entirely. So a raw clear would leave every React state in the app holding exactly what it held a
 * moment ago, the board still on screen with every note on it.
 *
 * And then it would get worse. `notes_context.tsx` mirrors the reducer through a 300 ms debounce,
 * so the next render would write the whole board **back** to the key that had just been emptied. A
 * reset that appears to do nothing and then silently undoes itself is the worst possible shape for
 * this feature.
 *
 * So the in-memory state is the thing being reset and the storage follows, the way it does for
 * every other write in this app.
 *
 * **The intro reopens by itself.** Nothing here opens it: `app_shell.tsx` derives it from the name,
 * and this made the name empty. The navigation is so that the board behind the blur is the board a
 * first visit sees rather than the settings page the button was pressed on.
 */
export function useReset() {
  const dispatch = useNotesDispatch()
  const { setName } = useUser()
  const navigate = useNavigate()

  /**
   * A second `useLocalStorage` instance on the sidebar's key, rather than lifting `AppShell`'s
   * state somewhere both can reach. The library keeps instances on one key in step within a tab,
   * which is the same bet `use_user.ts` makes and P13 verified in its groundwork.
   *
   * The sidebar's collapse is the weakest of the three — a view preference rather than user data —
   * and it is reset anyway, because *reset everything* is the promise the button makes, and a
   * person who has just erased their board and their name does not want to find that one thing
   * about the app still remembers them.
   */
  const [, setSidebarOpen] = useLocalStorage(SIDEBAR_KEY, true, {
    deserializer: parseSidebarOpen,
  })

  return () => {
    dispatch({ type: 'reset' })
    setName('')
    setSidebarOpen(true)
    void navigate({ to: '/' })
  }
}
