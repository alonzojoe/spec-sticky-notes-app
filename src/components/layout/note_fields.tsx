import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { normalizeLink } from '@/lib/links'

/**
 * The title and the link, shared by the create dialog and the note view exactly as
 * `date_field.tsx` and `paper_radiogroup.tsx` are. Both dialogs show the same fields in the same
 * order, so a note looks the same when you make it as when you open it.
 *
 * The labels are visible rather than placeholders. A placeholder disappears at precisely the
 * moment you need to know what the field was — while you are typing in it.
 */

const LABEL = 'text-xs font-medium text-ink-soft'

export function TitleField({
  value,
  onChange,
  id = 'note-title',
}: {
  value: string
  onChange: (title: string) => void
  id?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        Title
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Standup with the team"
        // No maxLength. A limit enforced by the input is a rule you discover by hitting it, and
        // a title too long for the card is already visibly too long — see requirements § D3.
        className="text-ink"
      />
    </div>
  )
}

/**
 * The link field holds what you typed and commits what `normalizeLink` makes of it — **on blur,
 * never on change.** Normalising per keystroke rewrites `h` into `https://h` between the first
 * and second character of `https`, which is unusable.
 *
 * An unparseable link is not an error state. The field keeps the text, `''` is stored, and the
 * card simply shows no chip — which is honest, because the note has no usable link. A dialog
 * that blocked on a malformed URL would be a Save button wearing a different hat, and principle
 * 3 forbids the original.
 */
export function LinkField({
  value,
  onCommit,
  id = 'note-link',
}: {
  value: string
  onCommit: (link: string) => void
  id?: string
}) {
  // Draft state, seeded from the stored value and re-seeded when the stored value changes under
  // it — which is how switching notes in the view dialog reaches this field.
  const [draft, setDraft] = useState(value)
  const [seeded, setSeeded] = useState(value)
  if (value !== seeded) {
    setSeeded(value)
    setDraft(value)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        Link
      </label>
      <Input
        id={id}
        type="url"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const normalized = normalizeLink(draft)
          // Show what will actually be stored, so `https://` appearing is visible rather than a
          // silent rewrite discovered later on the card.
          setDraft(normalized === '' ? draft : normalized)
          onCommit(normalized)
        }}
        // The example the phase was asked for, and it demonstrates that a bare host is accepted
        // without a paragraph explaining that it is.
        placeholder="meet.google.com/abc-defg-hij"
        className="text-ink"
      />
    </div>
  )
}
