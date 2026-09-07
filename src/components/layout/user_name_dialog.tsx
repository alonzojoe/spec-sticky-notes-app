import { useState } from 'react'

import { FieldLabel } from '@/components/layout/note_fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useUser } from '@/hooks/use_user'

/**
 * The one question this app asks.
 *
 * It opens on a visit with no stored name, and **Escape closes it, the backdrop closes it, and
 * Cancel closes it** — nothing is stored, and the board behind it is immediately usable. The
 * one-sentence test — *can I capture a thought in under two seconds* — has to hold on the first
 * visit too, and a modal that must be answered before the board exists makes the first thought the
 * slowest one the app will ever take.
 *
 * **It does not reopen by itself**, not on the next load and not after a reload. A modal that
 * returns until you comply was never dismissible. Once it is gone the sidebar is the only thing
 * that still asks — quietly, in place, where it can be ignored forever.
 *
 * The same component is also the rename: opened from the sidebar row it arrives prefilled, so a
 * typo is fixable without editing localStorage by hand. Creation and correction are the same act
 * here, which is the reason there is one component rather than two.
 *
 * No motion of its own. It animates because every dialog in this app does, with the tokens in
 * `main.css`, and it keeps `transform-origin: center` because a modal is not anchored to a trigger.
 */
export function UserNameDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { name, setName } = useUser()
  const [draft, setDraft] = useState(name)

  // Resynced when the dialog opens rather than once at mount — the row can open this after the name
  // has changed, and a stale draft would offer to overwrite the name with an older one. Adjusted
  // during render, which is React's own pattern for state that follows a prop.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(name)
  }

  const submit = () => {
    if (draft.trim() === '') return
    setName(draft)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{name === '' ? 'Who is this board for?' : 'Your name'}</DialogTitle>
          <DialogDescription>
            {/* Says where it goes and what it costs to skip, because the honest answer to "why
                does a notes app want my name" is that it does not need one. */}
            It goes in the sidebar and nowhere else. You can skip this.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="user-name">Name</FieldLabel>
            <Input
              id="user-name"
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Joe Alonzo"
              // No maxLength, following `note_fields.tsx`: a limit enforced by the input is a rule
              // you discover by hitting it. A name too long for the row truncates in the row.
              autoComplete="name"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* Inert on whitespace: a space is not a name, and a disabled button says so before
                you press it rather than after. */}
            <Button type="submit" disabled={draft.trim() === ''}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
