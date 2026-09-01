import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'

import { Board } from '@/components/board/board'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { NewNoteDialog } from '@/components/layout/new_note_dialog'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { NotesProvider } from '@/context/notes_context'
import { SIDEBAR_KEY, parseSidebarOpen } from '@/lib/board_storage'

export function AppShell() {
  // P1 deleted shadcn's `sidebar_state` cookie and deliberately shipped no replacement, so
  // that persistence would arrive once, through the contract, rather than as two competing
  // stores. This is that arrival — the control lives here, and sidebar.tsx stays untouched.
  const [sidebarOpen, setSidebarOpen] = useLocalStorage(SIDEBAR_KEY, true, {
    deserializer: parseSidebarOpen,
  })

  const [creating, setCreating] = useState(false)

  // `n` opens the dialog. P3 replaced a one-click sidebar palette with a dialog, and the
  // amended principle 2 makes the keyboard path a condition of that carve-out rather than a
  // nicety — this is what keeps capture inside the two-second test.
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
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <AppSidebar />
        {/* SidebarInset renders the <main> element itself, so nothing here nests another
            landmark inside it. mission.md principle 4: chrome lives in the sidebar, never
            on the board surface. */}
        <SidebarInset>
          {/* The toolbar. Below md the SidebarRail is hidden, so the trigger is the only
              pointer affordance for opening the sheet; P3 put note creation beside it, and
              P7's search and P9's theme toggle land here too. Extract a layout component when
              it holds a third control — two does not pay for the indirection. */}
          <header className="flex h-12 shrink-0 items-center px-3">
            <SidebarTrigger />
            <Button
              size="sm"
              title="New note (n)"
              onClick={() => setCreating(true)}
              className="ml-auto transition-transform duration-(--duration-press) ease-out active:scale-[0.97]"
            >
              <Plus aria-hidden />
              {/* sr-only rather than hidden: the label leaves the layout on a narrow screen
                  but the button keeps its accessible name, with no second aria-label to
                  drift out of sync. */}
              <span className="max-sm:sr-only">New note</span>
            </Button>
          </header>
          <div className="flex-1 overflow-hidden">
            <Board />
          </div>
        </SidebarInset>
        <NewNoteDialog open={creating} onOpenChange={setCreating} />
      </SidebarProvider>
    </NotesProvider>
  )
}
