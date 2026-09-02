import { useMemo, useState, type ReactNode } from 'react'

import { OpenNoteContext } from '@/context/use_open_note'

/**
 * One piece of state, shared by the two things that can open a note: a card on the board, and a
 * result row in the search palette.
 *
 * Not split into state and dispatch the way `NotesProvider` is. That split exists because the
 * board re-renders 100+ cards on every keystroke; this value changes when a dialog opens or
 * closes, which is not a rate anything needs protecting from.
 */
export function OpenNoteProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const value = useMemo(() => ({ openId, setOpenId }), [openId])

  return <OpenNoteContext value={value}>{children}</OpenNoteContext>
}
