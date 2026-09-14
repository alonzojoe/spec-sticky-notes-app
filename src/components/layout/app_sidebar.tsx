import { Link, useRouterState } from '@tanstack/react-router'
import { Plus, Settings } from 'lucide-react'

import { StickyMark } from '@/components/layout/sticky_mark'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { useUser } from '@/hooks/use_user'
import { sectionAt, SECTIONS } from '@/lib'

// P3 moved note creation out of here and into the toolbar's dialog. P10 gave it the second
// destination it had been missing since P1 — a nav with one item is a label that happens to be
// focusable, not navigation. P12 stopped it naming sections at all: the rows come from
// `lib/sections.ts`, so adding one is an entry in a list rather than an edit here.
//
// Slots later phases fill, named here so it grows by plan rather than by improvisation:
//   *Tags* — the tag list, as a SidebarGroup below the nav group (search became a ⌘K palette
//            in the toolbar in P8, so no field lands here). **A group, not destinations**: the
//            nav stays at three rows, and a tag is not a place you go — see roadmap.md § Tags.
//   *Dark mode* — the theme toggle, as a row on the settings page. P13 left the SidebarFooter
//                 empty for it; P14 took the slot and amended the reservation rather than
//                 breaking it — see that phase's D2. What Dark mode was promised was a home for
//                 the theme control, and a labelled row beside the other things you set is a
//                 better one than a toggle in a corner.
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

/**
 * The identity's hover, which is the destinations' hover and nothing more.
 *
 * This row is on screen every second the app is open — one of the things you look at dozens of
 * times a day without meaning to — which puts it in the category to take motion *out* of. Colour
 * only, at half the sidebar's accent, so it reads as "you are over this" without ever producing
 * the appearance of a selected destination. No scale on press and no animation when the name
 * changes.
 */
/**
 * Collapsed, the row is the circle and only the circle.
 *
 * `SidebarMenuButton` forces `size-8! p-2!` in icon mode, which is a 32px box with a 16px content
 * area — right for the 16px glyphs every destination carries, and wrong for anything bigger. The
 * 28px circle started at the content box's left edge and ran 4px past the button's right, where
 * `overflow-hidden` clipped it: it sat 6px right of every other mark in the rail *and* lost a
 * sliver of its own edge. The bug was invisible expanded, because there the padding is exactly what
 * the row wants.
 *
 * So the padding goes and the content is centred, which is what `size="lg"` in that same file
 * already does for the same reason. The label is hidden rather than clipped — with it still in the
 * flex row, centring would centre *circle plus label* and push the circle back off to the left. The
 * mark above does the same thing to the word "Sticky", and the tooltip carries the name.
 */
const IDENTITY =
  'transition-colors duration-(--duration-hover) ease-out hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!'

/**
 * `size-7` — well above the mark's `size-5` and the destinations' `size-4` glyphs.
 *
 * It was drawn at the mark's size first, on the argument that the two header rows are a pair and a
 * person's badge larger than the application's own mark inverts the corner's hierarchy. That was
 * wrong on screen twice over: the initials are the thing you actually look for up there, and two
 * letters need room to be legible at a glance. **The square/round distinction is what separates the
 * app from the person, and it does that at any size** — which is what makes the badge free to be
 * the larger of the two.
 */
const CIRCLE =
  'flex size-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold'

const ADD_YOUR_NAME = 'Add your name'

/** Named once, because three things in this file point at it. */
const SETTINGS_PATH = '/settings'

export function AppSidebar() {
  const { notes } = useNotes()
  const { name, initials } = useUser()

  // Read from the router rather than held here, so the URL is the single answer to "which section
  // is this" and the sidebar cannot disagree with the board.
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const active = sectionAt(pathname)

  /**
   * Whether a board destination may claim to be the current one at all.
   *
   * `sectionAt` falls back to the first row for any path it does not recognise, which is correct
   * for what it is for — deciding which notes `/` draws — and wrong as an answer to *which row is
   * lit*. On `/settings` the fallback would light `Notes` while the board is not even rendered.
   *
   * So the sidebar asks a second question the registry does not: does the active row's path
   * actually match where we are? `/` is the one path that is deliberately unmatched and still on
   * the board — P10 chose that over a redirect, because a redirect resolves asynchronously and the
   * app would paint an empty frame first — so it is named here rather than inferred.
   *
   * **The registry is untouched.** Teaching `sectionAt` about a page that has no notes is how a
   * section list learns about things that are not sections.
   */
  const onBoard = pathname === '/' || active.path === pathname

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Collapsed, this row centres the same way the identity below it does. Its `px-2` sits the
            20px mark at x=16, and every button in the rail is inset 8px and 32px wide — so the mark
            was centred at 26 while the identity and all three destinations were at 24. Two pixels,
            invisible until the rail put four marks in one column. */}
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {/* The same mark the tab shows. A lucide glyph here and a drawn mark in the tab meant
              the app had two identities depending on where you looked. rounded-[5px] rather than
              the SVG's own rx, so the corner radius reads right at 20px. */}
          <StickyMark className="size-5 shrink-0 rounded-[5px]" />
          <span className="truncate font-medium group-data-[collapsible=icon]:hidden">
            Sticky
          </span>
        </div>

        {/* Whose board this is, under the app's own mark rather than beside it. Side by side the
            two compete; stacked, the row above is the product and this one is whose copy of it you
            are looking at. mission.md principle 4: the sidebar holds one identity, and it is the
            only thing in here that is neither a control nor a note.

            An earlier draft put this at the bottom of the sidebar, on the strength of the
            convention that every sidebar-shaped app puts a person there. That is not reason enough
            to take a slot tech-stack.md promised *Dark mode*, so the bottom of the sidebar is left
            exactly as it was found — and Gate 1 greps this file to keep it that way. */}
        <SidebarMenu>
          <SidebarMenuItem>
            {/* A link rather than a button with a handler, since P14: the way to change your name
                is a place now, not a dialog. Everything else about the row is unchanged — the
                circle, the initials, the tooltip, the hover. */}
            <SidebarMenuButton
              asChild
              tooltip={name === '' ? ADD_YOUR_NAME : name}
              className={IDENTITY}
            >
              <Link to={SETTINGS_PATH}>
                {/* aria-hidden: the row is already named by the name, and two letters read aloud
                    on top of the word they were cut from is noise. */}
                <span
                  aria-hidden
                  className={
                    name === ''
                      ? `${CIRCLE} bg-sidebar-accent text-ink-soft`
                      : `${CIRCLE} bg-sidebar-primary text-sidebar-primary-foreground`
                  }
                >
                  {/* rounded-full against the mark's rounded-[5px], and deliberately not
                      harmonised: a square is the paper this app is made of, a circle is a person.
                      Softening one toward the other to tidy the corner is what would turn two
                      kinds of thing into two logos. */}
                  {name === '' ? <Plus className="size-3.5" /> : initials}
                </span>
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  {name === '' ? ADD_YOUR_NAME : name}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                const current = onBoard && row.section === active.section
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

      {/* The one row at the bottom of the sidebar, and the first thing this app has ever put
          there. It is a **door, not a control** — which is the whole of P14's D2 and the reason it
          can sit in the slot `tech-stack.md` reserved for the theme toggle without ever needing to
          move again. A control in a corner gets outgrown; a way to the page where the controls
          live does not.

          No `SidebarMenuBadge`. A count here would be a number about settings, and there is no
          such number. */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === SETTINGS_PATH}
              tooltip="Settings"
              className={DESTINATION}
            >
              <Link
                to={SETTINGS_PATH}
                aria-current={pathname === SETTINGS_PATH ? 'page' : undefined}
              >
                <Settings aria-hidden />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
