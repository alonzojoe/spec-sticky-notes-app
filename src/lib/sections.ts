import { Link2, Pin, StickyNote, type LucideIcon } from 'lucide-react'

import type { BoardSection, Note } from '@/types/note'

/**
 * What a section *is*, in one place.
 *
 * P10 shipped two sections as a union member, an arm of a filter in `board.tsx`, an item in
 * `app_sidebar.tsx` and a branch in the empty state — and said in its own Risks that two sections is
 * not a framework, and that the next phase to want a third would have to generalise both. This is
 * that list.
 *
 * A row holds everything that varies between sections. The sidebar maps over it; the board looks up
 * its own row and applies `keep`. Neither of them names a section any more: they know there is one,
 * and this file knows what it means.
 *
 * **A fourth section costs one row here, one route file and one page.** The route file and the page
 * are P11's convention — a route is a file you can find by reading a path — and that is the floor
 * rather than duplication.
 *
 * The icon is in the row, which is why `lib/` imports from `lucide-react` for the first time. The
 * alternative is a second map from section to icon in the sidebar, which is exactly the
 * two-places-to-edit problem this file exists to remove. Nothing here renders; a component is a
 * value like any other.
 */
export interface BoardSectionRow {
  section: BoardSection
  /** The URL. `/` is not listed: it renders the same page as `/notes` — see `sectionAt`. */
  path: string
  label: string
  icon: LucideIcon
  /** What the section draws. A question about a note, never a change to one. */
  keep: (note: Note) => boolean
  /**
   * What an empty section says. `null` for the whole board, deliberately: a first-run screen wants
   * an illustration and an invitation to write the first note, and `empty_state.tsx` belongs to
   * *Polish* along with those decisions. An empty board stays bare cork.
   */
  empty: { title: string; hint: string } | null
}

export const SECTIONS: readonly BoardSectionRow[] = [
  {
    section: 'notes',
    path: '/notes',
    label: 'Notes',
    icon: StickyNote,
    keep: () => true,
    empty: null,
  },
  {
    section: 'pinned',
    path: '/pinned',
    label: 'Pinned notes',
    // The same glyph the card draws when a note is pinned, so the mark and the destination that
    // collects marked notes are one shape.
    icon: Pin,
    keep: (note) => note.pinned,
    empty: {
      title: 'No pinned notes',
      // Names the way out. It is the one thing an empty section cannot otherwise tell you.
      hint: 'Open a note and pin it to keep it up here.',
    },
  },
  {
    section: 'linked',
    path: '/linked',
    label: 'Linked notes',
    // The same glyph the card puts on its link chip.
    icon: Link2,
    /**
     * The field, and never a parse of `body`.
     *
     * `lib/links.ts` is the only judge of what a URL is in this app: `normalizeLink` guards what
     * the field writes and `board_storage.ts` re-checks the scheme on read. A note is here exactly
     * when that judgement produced something — so this section can never disagree with the chip on
     * the card, which a body-scanning rule would do the first time someone typed a bare URL into a
     * sentence.
     */
    keep: (note) => note.link !== '',
    empty: {
      title: 'No linked notes',
      hint: 'Add a link to a note and it will show up here.',
    },
  },
]

/**
 * Which section a path is showing. `/` renders the same page as `/notes` — P10 chose that over a
 * redirect, because a redirect resolves asynchronously and the app would paint an empty frame first
 * — so anything unmatched falls back to the first row rather than to nothing.
 */
export const sectionAt = (pathname: string): BoardSectionRow =>
  SECTIONS.find((row) => row.path === pathname) ?? SECTIONS[0]

export const rowFor = (section: BoardSection): BoardSectionRow =>
  SECTIONS.find((row) => row.section === section) ?? SECTIONS[0]
