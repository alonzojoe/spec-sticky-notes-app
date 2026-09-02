import { StickyNote } from 'lucide-react'

import { StickyMark } from '@/components/layout/sticky_mark'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useNotes } from '@/context/use_notes'

// P3 moved note creation out of here and into the toolbar's dialog, so the sidebar is down
// to its nav group. Slots later phases fill, named here so it grows by plan rather than by
// improvisation:
//   P10 — the tag list, as a SidebarGroup below the nav group (search became a ⌘K palette
//         in the toolbar in P8, so no field lands here)
//   Dark mode — the theme toggle, in a SidebarFooter
// Nothing is rendered for them now. A control that cannot be used should not be drawn.
export function AppSidebar() {
  const { notes } = useNotes()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* The same mark the tab shows. A lucide glyph here and a drawn mark in the tab meant
              the app had two identities depending on where you looked. rounded-[5px] rather than
              the SVG's own rx, so the corner radius reads right at 20px. */}
          <StickyMark className="size-5 shrink-0 rounded-[5px]" />
          <span className="truncate font-medium group-data-[collapsible=icon]:hidden">
            Sticky
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* shadcn's Sidebar emits no landmark of its own. */}
        <nav aria-label="Board sections">
          <SidebarGroup>
            <SidebarGroupLabel>Board</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive aria-current="page" tooltip="Notes">
                  <StickyNote aria-hidden />
                  <span>Notes</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{notes.length}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
