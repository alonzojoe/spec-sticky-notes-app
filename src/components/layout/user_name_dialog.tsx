import { useState } from 'react'

import { FieldLabel } from '@/components/layout/note_fields'
import { StickyMark } from '@/components/layout/sticky_mark'
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
 * The one question this app asks, and the first thing it ever says.
 *
 * **It is the intro.** On a visit with no stored name this is the whole product for a moment — the
 * mark, one sentence about what a board is for, and the field. So it is written as a welcome rather
 * than as a settings prompt: *Welcome to Sticky* and a way in, not *enter your name* and a form.
 * Opened again later from the sidebar it is not an intro at all — it is a rename, and it says so.
 *
 * That is the whole of the difference. **No tour, no steps, no second screen**: an intro that takes
 * more than one look is onboarding, and this app fits in a sentence.
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
  const { name, setName, skip } = useUser()
  const [draft, setDraft] = useState(name)

  // Resynced when the dialog opens rather than once at mount — the row can open this after the name
  // has changed, and a stale draft would offer to overwrite the name with an older one. Adjusted
  // during render, which is React's own pattern for state that follows a prop.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(name)
  }

  // The intro is the visit with no name behind it. A rename opened from the sidebar is the same
  // dialog and is not an intro, and the copy is the only thing that differs.
  const intro = name === ''

  const submit = () => {
    if (draft.trim() === '') return
    setName(draft)
    onOpenChange(false)
  }

  /**
   * Closing the intro without a name **records the refusal**, by every route out of it — Skip, the
   * corner ✕, the backdrop and Escape. Otherwise the next load cannot tell someone who declined
   * from someone who has never been here, and the promise that this is asked once becomes a
   * promise that it is asked once *per visit*, which is the nag D2 exists to forbid.
   *
   * A rename closed without saving records nothing: the question was answered a while ago.
   */
  const close = () => {
    if (intro) skip()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          {/* The mark, once, at the only moment it is worth showing large: the intro. Absent on a
              rename, where it would be a logo on a settings dialog. */}
          {intro && <StickyMark className="mb-1 size-10 rounded-[10px]" />}
          <DialogTitle>{intro ? 'Make it yours' : 'Your name'}</DialogTitle>
          <DialogDescription>
            {/* Says what the app is and that the name is optional, and does *not* say where the
                name ends up. On the intro that would be an instruction about an interface nobody
                has looked at yet — the sidebar is two seconds away and explains itself. The rename
                does say it, because by then it is the answer to "where does this go". */}
            {intro
              ? 'A corkboard for the thoughts you want back tomorrow. Add your name to get started, or skip — the board works either way.'
              : 'It goes in the sidebar and nowhere else.'}
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
            {/* "Skip" rather than "Cancel" on the intro. Cancel implies undoing something you
                started; nothing has started here, and naming the way past it is what makes the
                dialog honest about being optional. */}
            <Button type="button" variant="ghost" onClick={close}>
              {intro ? 'Skip' : 'Cancel'}
            </Button>
            {/* Inert on whitespace: a space is not a name, and a disabled button says so before
                you press it rather than after. */}
            <Button type="submit" disabled={draft.trim() === ''}>
              {intro ? 'Get started' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
