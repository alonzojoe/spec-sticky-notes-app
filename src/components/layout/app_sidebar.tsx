import { Link, useRouterState } from '@tanstack/react-router'

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
import { SECTIONS, sectionAt } from '@/lib/sections'

// P3 moved note creation out of here and into the toolbar's dialog. P10 gave it the second
// destination it had been missing since P1 — a nav with one item is a label that happens to be
// focusable, not navigation. P12 stopped it naming sections at all: the rows come from
// `lib/sections.ts`, so adding one is an entry in a list rather than an edit here.
//
// Slots later phases fill, named here so it grows by plan rather than by improvisation:
//   *Tags* — the tag list, as a SidebarGroup below the nav group (search became a ⌘K palette
//            in the toolbar in P8, so no field lands here)
//   *Dark mode* — the theme toggle, in a SidebarFooter
// Nothing is rendered for them now. A control that cannot be used should not be drawn.
/**
 * How a destination says it is the one you are on.
 *
 * The active row keeps shadcn's own `data-active` treatment — the sidebar's accent behind it and a
 * medium weight — and everything here is about making that the *only* row that looks like that.
 * The base variant hovers an inactive item to the same full accent, which is what made the two
 * rows indistinguishable the moment a pointer crossed one: a hover that produces the selected
 * appearance is a hover that lies about which section you are in.
 *
 * So an inactive destination is plain — the sidebar's own background, nothing behind it — and its
 * hover is a half-strength wash that reads as "you are over this" rather than "you are on this".
 *
 * The accent alone was not enough to answer "which section am I in" at a glance: it sits five
 * percent of lightness from the sidebar itself, which is visible when you look for it and invisible
 * when you glance. The bar down the left edge is what answers it — one saturated 2px inset, in the
 * sidebar's own primary, which survives the collapse to the icon rail where the label is gone.
 *
 * Colour only: navigating is a thing you do dozens of times a day, which is the category to reduce
 * motion in rather than add it to.
 */
const DESTINATION =
  'transition-colors duration-(--duration-hover) ease-out hover:bg-sidebar-accent/50 data-active:text-ink data-active:shadow-[inset_2px_0_0_var(--sidebar-primary)]'

export function AppSidebar() {
  const { notes } = useNotes()

  // Read from the router rather than held here, so the URL is the single answer to "which section
  // is this" and the sidebar cannot disagree with the board.
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const active = sectionAt(pathname)

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
              {/* One row per registry entry. A section added to `lib/sections.ts` appears here
                  without this file being edited, which is the whole point of the list. */}
              {SECTIONS.map((row) => {
                const current = row.section === active.section
                const Icon = row.icon

                return (
                  <SidebarMenuItem key={row.section}>
                    {/* Anchors, not buttons with handlers. A destination that can be
                        middle-clicked, bookmarked and restored by the back button is what makes
                        the section a place rather than a mode. */}
                    <SidebarMenuButton
                      asChild
                      isActive={current}
                      tooltip={row.label}
                      className={DESTINATION}
                    >
                      <Link to={row.path} aria-current={current ? 'page' : undefined}>
                        <Icon aria-hidden />
                        <span>{row.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {/* Each row counts with its own predicate, so the Notes badge is the whole
                        board by construction rather than by a second expression that happens to
                        agree. Rendered at 0 too: a zero says the section exists and is empty, and
                        a badge that vanishes makes the rows different heights for no reason a
                        reader could name. */}
                    <SidebarMenuBadge>{notes.filter(row.keep).length}</SidebarMenuBadge>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
