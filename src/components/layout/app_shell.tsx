import { useLocalStorage } from 'usehooks-ts'

import { Board } from '@/components/board/board'
import { AppSidebar } from '@/components/layout/app_sidebar'
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

  return (
    <NotesProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <AppSidebar />
        {/* SidebarInset renders the <main> element itself, so nothing here nests another
            landmark inside it. mission.md principle 4: chrome lives in the sidebar, never
            on the board surface. */}
        <SidebarInset>
          {/* Below md the SidebarRail is hidden, so the trigger is the only pointer
              affordance for opening the sheet. It holds nothing else. */}
          <header className="flex h-12 shrink-0 items-center px-3">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-hidden">
            <Board />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </NotesProvider>
  )
}
