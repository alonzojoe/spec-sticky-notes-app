import { Search } from 'lucide-react'

import { SHORTCUT_KEY, modifierLabel } from '@/lib/platform'

/**
 * A `<button>`, never an `<input>`.
 *
 * It is *shaped* like a field because that is what makes it read as search at a glance — the
 * pattern every app with a palette uses. But an input in a toolbar that does not accept typing is
 * a lie the first time someone types into it, and typing belongs in the dialog. So the whole
 * control opens the dialog and nothing here takes a caret.
 *
 * The badge is a hint, not a contract: `lib/platform.ts` can be wrong about someone on a Mac with
 * a PC keyboard, and `app_shell.tsx` accepts both modifiers on every platform so that being wrong
 * costs a label rather than the shortcut. `aria-keyshortcuts` names both for the same reason.
 */
export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  const modifier = modifierLabel()
  // '⌘K' with no separator is what a Mac prints; 'Ctrl+K' needs the plus to be readable.
  const shortcut = `${modifier}${modifier === '⌘' ? '' : '+'}${SHORTCUT_KEY.toUpperCase()}`

  return (
    <button
      type="button"
      data-slot="search-trigger"
      onClick={onOpen}
      aria-keyshortcuts="Meta+K Control+K"
      aria-label={`Search notes (${shortcut})`}
      className="ml-2 flex h-8 items-center gap-2 rounded-lg border border-border px-2.5 text-sm text-ink-soft transition-colors duration-(--duration-hover) ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-ring/40 hover:text-ink max-sm:w-8 max-sm:justify-center max-sm:px-0 sm:w-56"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      {/* Below sm the label and the badge leave the layout and the magnifier stays, matching
          what the New note button already does. A phone has no ⌘K to press and no room for a
          badge saying so. aria-label above carries the name either way. */}
      <span className="max-sm:hidden" aria-hidden>
        Search
      </span>
      <kbd
        data-slot="search-shortcut"
        aria-hidden
        className="ml-auto rounded border border-border px-1.5 py-0.5 font-sans text-xs text-ink-soft max-sm:hidden"
      >
        {shortcut}
      </kbd>
    </button>
  )
}
