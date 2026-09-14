import { useForm } from '@tanstack/react-form'

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
 * **It is the intro, and now it is only the intro.** On a visit with no stored name this is the
 * whole product for a moment — the mark, one sentence about what a board is for, and the field. So
 * it is written as a welcome rather than as a settings prompt: *Make it yours* and a way in, not
 * *enter your name* and a form.
 *
 * P13 shipped this component doing two jobs: the intro, and the rename it opened into from the
 * sidebar row. **P14 moved the rename onto the settings page** — it is changed where it is read,
 * beside the other things you set — and what was left here was the half that was always the
 * interesting one. The file is renamed with it, because `user_name_dialog.tsx` holding a component
 * that welcomes you to the app is a file the next person greps for the rename and finds.
 *
 * **No tour, no steps, no second screen**: an intro that takes more than one look is onboarding,
 * and this app fits in a sentence.
 *
 * **There is no way out but a name.** No Escape, no backdrop, no ✕, no Skip. This reverses the
 * decision P13 shipped on — see that phase's requirements § D2, where both versions and the
 * reasoning for each are written down — and it is the version that matches what the dialog is
 * *for*: an intro that can be waved away is a thing to wave away, and a person who skips it lands
 * on an app that spends the rest of its life asking them again in the corner.
 *
 * The cost is real and is paid once. The first visit is no longer two seconds to a captured
 * thought; it is a name and then two seconds, on that visit only, and never again.
 *
 * **It takes no `onOpenChange`, because it closes by being answered.** Its open state is derived in
 * `app_shell.tsx` from the name itself — there is no name, so there is an intro — which is what
 * makes it impossible for a piece of state to disagree with the key. That is also what makes
 * P14's reset work: erasing the name reopens this, with nothing having to remember to.
 *
 * No motion of its own. It animates because every dialog in this app does, with the tokens in
 * `main.css`, and it keeps `transform-origin: center` because a modal is not anchored to a trigger.
 */
export function IntroDialog({ open }: { open: boolean }) {
  const { setName } = useUser()

  /**
   * P15. One field, and **one** definition of what an empty name is.
   *
   * It was two: `draft.trim() === ''` on the button's `disabled` and the same expression as an
   * early return in the submit handler. Two expressions that have to agree, in the one dialog a
   * person cannot leave any other way — the duplication was harmless and it was the kind that stops
   * being harmless the moment somebody edits one of them.
   *
   * The validator is the definition now, and `canSubmit` is what the button reads. Nothing renders
   * the message: this app has no error UI anywhere (requirements § D6), and the string exists
   * because the API takes one.
   */
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: ({ value }) => setName(value.name),
  })

  return (
    // No `onOpenChange`. Every route out of a Radix dialog funnels through it, and this dialog has
    // no route out — it closes because `open` is derived from the name and the name now exists.
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-sm"
        // The ✕ is removed rather than made inert. A control that is drawn and does nothing is
        // worse than one that was never there — it reads as a broken dialog rather than as a
        // required one.
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          {/* The mark, once, at the only moment it is worth showing large. */}
          <StickyMark className="mb-1 size-10 rounded-[10px]" />
          <DialogTitle>Make it yours</DialogTitle>
          <DialogDescription>
            {/* Says what the app is, and asks. It does *not* say where the name ends up: that would
                be an instruction about an interface nobody has looked at yet, and the sidebar is
                one screen away and explains itself. */}
            A corkboard for the thoughts you want back tomorrow. Tell it your name to get started.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.Field
            name="name"
            validators={{
              // A space is not a name. The one place that is decided.
              onChange: ({ value }) => (value.trim() === '' ? 'A name is required' : undefined),
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="user-name">Name</FieldLabel>
                <Input
                  id="user-name"
                  autoFocus
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  // No placeholder. A field labelled `Name` on a dialog that is asking for your
                  // name needs no example, and a greyed-out name in the box is one more thing to
                  // read past on the first screen the app ever shows.
                  //
                  // No maxLength either, following `note_fields.tsx`: a limit enforced by the input
                  // is a rule you discover by hitting it. A name too long for the row truncates in
                  // the row.
                  autoComplete="name"
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            {/* No Cancel — there is nothing to cancel into. Inert on whitespace: a space is not a
                name, and a disabled button says so before you press it rather than after.

                Subscribed rather than read off `form.state`, so the button re-renders when
                `canSubmit` changes and the rest of the dialog does not. */}
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <Button type="submit" disabled={!canSubmit}>
                  Get started
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
