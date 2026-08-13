import { Board } from '@/components/board/board'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export function AppShell() {
  return (
    <SidebarProvider>
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
  )
}
