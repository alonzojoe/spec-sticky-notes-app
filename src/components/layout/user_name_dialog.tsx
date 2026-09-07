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
 * **The intro has no way out but a name.** No Escape, no backdrop, no ✕, no Skip. This reverses the
 * decision the phase shipped on — see requirements § D2, where both versions and the reasoning for
 * each are written down — and it is the version that matches what the dialog is *for*: an intro
 * that can be waved away is a thing to wave away, and a person who skips it lands on an app that
 * spends the rest of its life asking them again in the corner.
 *
 * The cost is real and is paid once. The first visit is no longer two seconds to a captured
 * thought; it is a name and then two seconds, on that visit only, and never again.
 *
 * **The rename is not blocking.** Opened from the sidebar it takes Escape, the backdrop, the ✕ and
 * Cancel, because by then there is a name to fall back to and nothing to force.
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

  // The intro is the visit with no name behind it. A rename opened from the sidebar is the same
  // dialog and is not an intro, and the copy is the only thing that differs.
  const intro = name === ''

  const submit = () => {
    if (draft.trim() === '') return
    setName(draft)
    onOpenChange(false)
  }

  // The intro cannot be closed; a rename can. Every route out of a Radix dialog funnels through
  // `onOpenChange`, so refusing here is what makes the three below — Escape, the backdrop, the ✕ —
  // consistent rather than three separate handlers that could disagree.
  const close = () => {
    if (intro) return
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        className="sm:max-w-sm"
        // The ✕ is removed rather than made inert. A control that is drawn and does nothing is
        // worse than one that was never there — it reads as a broken dialog rather than as a
        // required one.
        showCloseButton={!intro}
        onEscapeKeyDown={(event) => intro && event.preventDefault()}
        onPointerDownOutside={(event) => intro && event.preventDefault()}
        onInteractOutside={(event) => intro && event.preventDefault()}
      >
        <DialogHeader>
          {/* The mark, once, at the only moment it is worth showing large: the intro. Absent on a
              rename, where it would be a logo on a settings dialog. */}
          {intro && <StickyMark className="mb-1 size-10 rounded-[10px]" />}
          <DialogTitle>{intro ? 'Make it yours' : 'Your name'}</DialogTitle>
          <DialogDescription>
            {/* Says what the app is, and asks. It does *not* say where the name ends up: on the
                intro that would be an instruction about an interface nobody has looked at yet, and
                the sidebar is one screen away and explains itself. The rename does say it, because
                by then that is the question being asked. */}
            {intro
              ? 'A corkboard for the thoughts you want back tomorrow. Tell it your name to get started.'
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
              // No placeholder. A field labelled `Name` on a dialog that is asking for your name
              // needs no example, and a greyed-out name in the box is one more thing to read past
              // on the first screen the app ever shows.
              //
              // No maxLength either, following `note_fields.tsx`: a limit enforced by the input is
              // a rule you discover by hitting it. A name too long for the row truncates in the row.
              autoComplete="name"
            />
          </div>

          <DialogFooter>
            {/* No Cancel on the intro — there is nothing to cancel into. The rename keeps one,
                because there a name already exists to fall back to. */}
            {!intro && (
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
            )}
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
