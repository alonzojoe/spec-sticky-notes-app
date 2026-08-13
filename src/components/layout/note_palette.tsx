import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar'
import { useNotes, useNotesDispatch } from '@/context/use_notes'
import { boardBounds, createNoteSeed } from '@/lib/note_factory'
import { PAPER, paperLabel } from '@/lib/paper'
import { NOTE_COLORS } from '@/types/note'

/**
 * The colour is chosen before the note exists, and one click is the whole interaction —
 * mission.md's two-second capture test leaves no room for a picker that opens first.
 *
 * 3x2 while the sidebar is open, a single column at rail width: principle 4 says the board
 * stays fully usable with the sidebar collapsed, and creating a note is the primary action.
 * Hiding the palette on the rail would make the rail decorative.
 *
 * The hover affordance is a ring rather than a scale. The prefers-reduced-motion block in
 * index.css scopes itself to the sidebar and note-card elements themselves, not their
 * descendants, so a transform here would survive reduced motion.
 */
export function NotePalette() {
  const dispatch = useNotesDispatch()
  const { notes } = useNotes()

  // Measured in the handler, never during a render: a new note has to know how big the
  // board is and what is already on it, or it lands on top of something.
  const place = (color: (typeof NOTE_COLORS)[number]) =>
    dispatch({
      type: 'add',
      seed: createNoteSeed(color, { bounds: boardBounds(), taken: notes }),
    })

  return (
    <SidebarGroup>
      <SidebarGroupLabel>New note</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="grid grid-cols-3 justify-items-center gap-2 group-data-[collapsible=icon]:grid-cols-1">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`New ${paperLabel(color)} note`}
              title={`New ${paperLabel(color)} note`}
              onClick={() => place(color)}
              className={`size-8 rounded-full border border-sidebar-border texture-paper ${PAPER[color]} hover:ring-2 hover:ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none`}
            />
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
