import { useEffect, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'

import { Board } from '@/components/board/board'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { NewNoteDialog } from '@/components/layout/new_note_dialog'
import { SearchDialog } from '@/components/layout/search_dialog'
import { Toolbar } from '@/components/layout/toolbar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { NotesProvider } from '@/context/notes_context'
import { OpenNoteProvider } from '@/context/open_note_context'
import { SIDEBAR_KEY, parseSidebarOpen } from '@/lib/board_storage'
import { SHORTCUT_KEY } from '@/lib/platform'

export function AppShell() {
  // P1 deleted shadcn's `sidebar_state` cookie and deliberately shipped no replacement, so
  // that persistence would arrive once, through the contract, rather than as two competing
  // stores. This is that arrival — the control lives here, and sidebar.tsx stays untouched.
  const [sidebarOpen, setSidebarOpen] = useLocalStorage(SIDEBAR_KEY, true, {
    deserializer: parseSidebarOpen,
  })

  const [creating, setCreating] = useState(false)
  const [searching, setSearching] = useState(false)

  /**
   * The two global shortcuts. `n` opens the create dialog — P3 replaced a one-click sidebar
   * palette with a dialog, and the amended principle 2 makes the keyboard path a condition of
   * that carve-out rather than a nicety.
   *
   * `⌘K` / `Ctrl+K` opens the search palette, and **both modifiers work on every platform.**
   * `lib/platform.ts` decides what the badge says and it can be wrong — someone on a Mac with a
   * PC keyboard is a real person and no API knows about them — so accepting either is what makes
   * a wrong guess cost a label rather than the shortcut itself.
   *
   * They differ in one deliberate way. `n` is suppressed inside a text field because it is a
   * character someone is trying to type; `⌘K` is not a character, so it stays live while a note
   * is being written and there is nothing for it to be mistaken for.
   */
  useEffect(() => {
    const onSearchKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SHORTCUT_KEY) return
      if (!event.metaKey && !event.ctrlKey) return
      if (event.altKey) return
      // Firefox binds Ctrl+K to its own search bar and will take it otherwise.
      event.preventDefault()
      setSearching(true)
    }
    document.addEventListener('keydown', onSearchKey)
    return () => document.removeEventListener('keydown', onSearchKey)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'n' && event.key !== 'N') return
      // Shift is deliberately absent: Shift+n is `N` and should behave like `n`.
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA'
      ) {
        return
      }
      event.preventDefault()
      setCreating(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <NotesProvider>
      <OpenNoteProvider>
        <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <AppSidebar />
          {/* SidebarInset renders the <main> element itself, so nothing here nests another
              landmark inside it. mission.md principle 4: chrome lives in the sidebar, never
              on the board surface. */}
          <SidebarInset>
            <Toolbar onNewNote={() => setCreating(true)} onSearch={() => setSearching(true)} />
            <div className="flex-1 overflow-hidden">
              <Board />
            </div>
          </SidebarInset>
          <NewNoteDialog open={creating} onOpenChange={setCreating} />
          <SearchDialog open={searching} onOpenChange={setSearching} />
        </SidebarProvider>
      </OpenNoteProvider>
    </NotesProvider>
  )
}
