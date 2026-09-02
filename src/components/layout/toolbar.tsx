import { Plus } from 'lucide-react'

import { SearchTrigger } from '@/components/layout/search_trigger'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

/**
 * The toolbar. Extracted from `app_shell.tsx` in P8, on the condition that file's own comment
 * set: *"Extract a layout component when it holds a third control — two does not pay for the
 * indirection."* Search is the third control, so the comment is honoured and then retired rather
 * than left behind describing a decision already taken.
 *
 * Below `md` the SidebarRail is hidden, so the trigger is the only pointer affordance for opening
 * the sheet. mission.md principle 4: chrome lives here, never on the board surface.
 */
export function Toolbar({
  onNewNote,
  onSearch,
}: {
  onNewNote: () => void
  onSearch: () => void
}) {
  return (
    <header className="flex h-12 shrink-0 items-center px-3">
      <SidebarTrigger />
      <SearchTrigger onOpen={onSearch} />
      <Button
        size="sm"
        title="New note (n)"
        onClick={onNewNote}
        className="ml-auto transition-transform duration-(--duration-press) ease-out active:scale-[0.97]"
      >
        <Plus aria-hidden />
        {/* sr-only rather than hidden: the label leaves the layout on a narrow screen but the
            button keeps its accessible name, with no second aria-label to drift out of sync. */}
        <span className="max-sm:sr-only">New note</span>
      </Button>
    </header>
  )
}
