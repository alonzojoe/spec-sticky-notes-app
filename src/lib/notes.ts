import type { Note } from '@/types/note'

/**
 * What makes a note worth confirming before it is destroyed.
 *
 * `date`, `color` and `pinned` are deliberately absent. Every note has a date and a colour whether
 * you chose them or not, so counting them would make every note confirm and collapse the rule to
 * "always ask" — which is a rule, but not this one. What is left is the three fields you have to
 * have typed something into.
 *
 * The note this spares is the one you get by pressing `n` and changing your mind, which is the
 * most common thing anyone deletes.
 *
 * It lives in `lib/` rather than beside the dialog that uses it because a module exporting both a
 * component and a function trips react-refresh/only-export-components — the same rule that split
 * `use_notes.ts` from `notes_context.tsx` in P2.
 */
export const hasContent = (note: Note): boolean =>
  note.title !== '' || note.body !== '' || note.link !== ''
