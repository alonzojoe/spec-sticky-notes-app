import { useRef } from 'react'

import { PAPER, paperLabel } from '@/lib/paper'
import { NOTE_COLORS, type NoteColor } from '@/types/note'

/**
 * The six papers as a radiogroup. Extracted from new_note_dialog.tsx in P6 unchanged, because
 * the note view needs the same control and P3's reasoning for it applies to both: in the
 * sidebar six independent tab stops was right, since each swatch performed an action; inside a
 * dialog they are one value being chosen, so the group holds a single tab stop and the arrow
 * keys move within it.
 */
export function PaperRadiogroup({
  value,
  onChange,
  label = 'Paper colour',
}: {
  value: NoteColor
  onChange: (color: NoteColor) => void
  label?: string
}) {
  const swatches = useRef<(HTMLButtonElement | null)[]>([])

  // Selection follows focus. Correct for six equivalent options: choosing one costs nothing,
  // so making the user confirm a colour they have already arrowed onto would be a second
  // decision for no information.
  const moveTo = (index: number) => {
    const next = (index + NOTE_COLORS.length) % NOTE_COLORS.length
    onChange(NOTE_COLORS[next])
    swatches.current[next]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (step !== undefined) {
      event.preventDefault()
      moveTo(index + step)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      moveTo(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      moveTo(NOTE_COLORS.length - 1)
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-3">
      {NOTE_COLORS.map((swatch, index) => (
        <button
          key={swatch}
          ref={(node) => {
            swatches.current[index] = node
          }}
          type="button"
          role="radio"
          aria-checked={swatch === value}
          aria-label={paperLabel(swatch)}
          // One tab stop for the whole group; the arrow keys move inside it.
          tabIndex={swatch === value ? 0 : -1}
          onClick={() => onChange(swatch)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={`size-8 rounded-full border border-border texture-paper ${PAPER[swatch]} transition-[box-shadow] duration-(--duration-hover) ease-out outline-none ${
            // A ring, not a tick. A checkmark drawn on paper is a different visual language
            // from the rest of the board.
            swatch === value ? 'ring-2 ring-ring ring-offset-2 ring-offset-popover' : ''
          } focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover`}
        />
      ))}
    </div>
  )
}
