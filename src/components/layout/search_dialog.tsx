import { Search } from 'lucide-react'
import { useState } from 'react'
import { useDebounceValue } from 'usehooks-ts'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useNotes } from '@/context/use_notes'
import { useOpenNote } from '@/context/use_open_note'
import { PAPER } from '@/lib/paper'
import { search } from '@/lib/search'

const ROW_ID = (index: number) => `search-result-${index}`

/** Below the ~150ms at which a delay stops reading as instant. See the comment at its use. */
const DEBOUNCE_MS = 120

/**
 * The search palette.
 *
 * It renders on the same shadcn `Dialog` the create dialog uses, which is the whole reason the
 * backdrop matches: `bg-ink/20` with `backdrop-blur-xs` lives in `dialog.tsx` and nothing here
 * restates it. A copied overlay would drift the first time either one was touched.
 *
 * **It is not `cmdk`.** That would be a third dependency for a list of at most a few dozen rows,
 * and the roadmap's own rule is not to install a component a phase does not need. What it would
 * give us — roving selection, `aria-activedescendant`, wrapping — is the sixty lines below, and
 * writing them keeps the keyboard contract in this repo where the suite can hold it. If a later
 * phase wants a real command palette with actions and groups, `cmdk` becomes right and this file
 * is the one that gets replaced.
 *
 * **The board is not involved.** Nothing here filters, dims, hides or reorders a note; the query
 * lives and dies inside this component, and closing the palette leaves the stored board
 * byte-identical. That is a stronger reading of principle 1 than the dim-in-place filter this
 * phase originally promised — nothing dims because nothing is excluded.
 */
export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { notes } = useNotes()
  const { setOpenId } = useOpenNote()

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  /**
   * The field updates on every keystroke; the matcher runs on a settled value.
   *
   * Short on purpose. The debounce here is not protecting the matcher — `includes` over a few
   * hundred notes is faster than the keypress that triggered it — it is protecting the *list*,
   * which re-renders a row per hit and would otherwise thrash through a wide intermediate result
   * on the way to a narrow one. Typing `s` in a board of 300 notes builds 200 rows that exist for
   * 40ms. 120ms is below the ~150ms threshold where a delay stops reading as instant, so the
   * result still lands within the same glance as the keystroke.
   */
  const [debounced] = useDebounceValue(query, DEBOUNCE_MS)

  const hits = search(notes, debounced)

  const close = () => {
    onOpenChange(false)
    // Reset on close rather than on open, so the dialog is never briefly showing the last
    // search's results while it animates in.
    setQuery('')
    setSelected(0)
  }

  const openHit = (index: number) => {
    const hit = hits[index]
    if (hit === undefined) return
    close()
    setOpenId(hit.note.id)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (hits.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((current) => (current + 1) % hits.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      // + length before the modulo, or -1 % n is -1 rather than the last row.
      setSelected((current) => (current - 1 + hits.length) % hits.length)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      openHit(selected)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-lg">
        {/* Radix requires a title for the dialog's accessible name. It is visually hidden
            because the input directly below it says the same thing in the space a heading
            would otherwise take from a palette that wants to be all list. */}
        <DialogTitle className="sr-only">Search notes</DialogTitle>

        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-ink-soft" aria-hidden />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded
            aria-controls="search-results"
            aria-label="Search notes"
            // The selection is an attribute, never real focus. DOM focus stays in this input for
            // the life of the dialog — the moment it moves to a row, typing stops working, which
            // is the whole reason the roving pattern exists.
            aria-activedescendant={hits.length > 0 ? ROW_ID(selected) : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              // The list underneath has changed, so the old index means nothing.
              setSelected(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search notes…"
            className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/60"
          />
        </div>

        <div id="search-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1">
          {debounced.trim() === '' && (
            <p className="px-3 py-6 text-center text-sm text-ink-soft">
              Search your notes by title or text.
            </p>
          )}

          {debounced.trim() !== '' && hits.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-ink-soft">
              No notes match “{debounced.trim()}”.
            </p>
          )}

          {hits.map((hit, index) => (
            <div
              key={hit.note.id}
              id={ROW_ID(index)}
              role="option"
              aria-selected={index === selected}
              data-slot="search-result"
              // A row, deliberately not a card: one line of title, one of excerpt, no paper, no
              // shadow, no date. It should read as an index entry into the board rather than as
              // a second, smaller board.
              onMouseDown={(event) => {
                // Before the click, or the input blurs first and Radix moves focus mid-close.
                event.preventDefault()
                openHit(index)
              }}
              className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 ${
                index === selected ? 'bg-ink/5' : ''
              }`}
            >
              <span
                aria-hidden
                className={`mt-1 size-2.5 shrink-0 rounded-full ${PAPER[hit.note.color]}`}
              />
              {/* A titled note is named by its title and explained by its excerpt. An untitled
                  one has no name, so the excerpt IS its primary line rather than a caption under
                  the words "Untitled note" — which named nothing and pushed the only
                  distinguishing text into the quiet row. Found by running Gate 3 against thirty
                  notes: three untitled hits were three identical rows. */}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">
                  {hit.note.title !== ''
                    ? hit.note.title
                    : hit.excerpt !== ''
                      ? hit.excerpt
                      : // Matches the card's own language for a note with nothing in it.
                        'Empty note'}
                </span>
                {hit.note.title !== '' && hit.excerpt !== '' && (
                  <span className="block truncate text-xs text-ink-soft">{hit.excerpt}</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-ink-soft">
          <span>
            {hits.length === 0
              ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
              : `${hits.length} ${hits.length === 1 ? 'note' : 'notes'}`}
          </span>
          {/* The movement hints are offered only when there is something to move through.
              Gate 3 found the footer promising "↑↓ to move · ↵ to open" to an empty board. */}
          <span aria-hidden>
            {hits.length > 0 ? '↑↓ to move · ↵ to open · esc to close' : 'esc to close'}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
