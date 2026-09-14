import { useForm } from '@tanstack/react-form'

import { FieldLabel } from '@/components/layout/note_fields'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useNotes, useNotesDispatch } from '@/context/use_notes'
import { useReset } from '@/hooks/use_reset'
import { useUser } from '@/hooks/use_user'
import { createNoteSeed, SAMPLE_NOTES, topOrder } from '@/lib'

/**
 * The place for the things that are not notes.
 *
 * P14. Two controls had accumulated with nowhere to live — changing the name, which P13 shipped as
 * a dialog opened from the sidebar row and called a judgment call in its own D3, and emptying the
 * board, which could not be done from inside the app at all. Neither is a note and neither belongs
 * on the board, which is a settings page.
 *
 * **It is a route, not a dialog** — requirements § D1. It has a URL, the back button returns you to
 * the section you came from, and the sidebar row that reaches it is an anchor like every other
 * destination. A surface that accumulates controls is the opposite of the two-second dialog
 * principle 2 was amended for.
 *
 * **`bg-background`, never `bg-cork`** (§ D6). Cork is the board — the one surface in this app that
 * is not paper — and a form drawn on it reads as a note nailed to the board, which is the thing
 * principle 4 forbids arriving through the back door. The amendment in that principle is what makes
 * this legal: chrome never sits *on* the board, and a route that *replaces* the board is not
 * sitting on it. The board is not behind this page. It is not rendered.
 */
export function SettingsPage() {
  return (
    // The shell's outlet is `overflow-hidden`, so the scroll lives here. A column rather than the
    // full width: a settings row is a line of text with a control at the end of it, and lines that
    // long are not read.
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-8">
        <h1 className="text-lg font-medium">Settings</h1>
        <NameSetting />
        <SampleSetting />
        <Separator />
        <ResetSetting />
      </div>
    </div>
  )
}

/**
 * A block: a heading, a sentence under it, and the control.
 *
 * The `DialogTitle`/`DialogDescription` relationship, in a page — same sizes, same `text-ink-soft`
 * for the second line — so a setting reads the way every other thing in this app that explains
 * itself reads. Nothing new was added to `@theme` for it.
 */
function Setting({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm text-ink-soft">{hint}</p>
      </div>
      {children}
    </section>
  )
}

/**
 * The rename, where the name is read.
 *
 * P13 put this in the dialog that asks on a first visit, and said in its own D3 that reaching it
 * through the sidebar row was a judgment call small enough to cut. It was not cut, it moved: a
 * settings page whose only control opens a modal to do the one thing the page exists for is a
 * shrug, and the dialog is better for being only the intro it always was.
 *
 * **`Save`, and principle 3 survives.** There is no Save button in this app for a thing you are
 * writing; a name is a value you commit, which is the carve-out P3 made for creation and P13 reused
 * here. Inert while the trimmed draft is empty or unchanged, so the button says whether pressing it
 * would do anything before you press it.
 */
function NameSetting() {
  const { name, setName } = useUser()

  /**
   * P15. The form holds the value; **the *has it changed* question is still asked by comparing.**
   *
   * `state.isDirty` was the obvious fit and it is the wrong one: it means *the user has modified
   * this field*, and it is **sticky** — type a character, delete it, and the form is still dirty
   * while the value is back where it started. The hand-rolled check this replaced read
   * `draft.trim() === name`, which goes inert again, and a test written for this phase caught the
   * difference (T89). `state.isDefaultValue` is closer and still not it: it compares raw values, so
   * a trailing space would read as a change that saving cannot produce.
   *
   * So the comparison stays, and it is exact rather than approximately right. What the form
   * contributes is that there is one place the value lives.
   *
   * `canSubmit` covers the other half: a whitespace-only name is not a name, decided by the same
   * validator `intro_dialog.tsx` uses, for the same reason.
   */
  const form = useForm({
    defaultValues: { name },
    onSubmit: ({ value }) => {
      setName(value.name)
      // The saved name is the new baseline, so the button goes inert again. Reset to the trimmed
      // value rather than the raw draft, because that is what was stored — `use_user.ts` trims.
      form.reset({ name: value.name.trim() })
    },
  })

  return (
    <Setting title="Your name" hint="It goes in the sidebar and nowhere else.">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
        className="flex items-end gap-2"
      >
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => (value.trim() === '' ? 'A name is required' : undefined),
          }}
        >
          {(field) => (
            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel htmlFor="user-name">Name</FieldLabel>
              {/* No placeholder and no maxLength, both inherited from the dialog this moved out of:
                  a field labelled Name needs no example, and a limit enforced by the input is a
                  rule you discover by hitting it. A name too long for the sidebar truncates in the
                  sidebar. */}
              <Input
                id="user-name"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                autoComplete="name"
              />
            </div>
          )}
        </form.Field>
        {/* The toolbar's press feedback. A button pressed occasionally may answer when it is
            pressed; the sidebar rows, which are on screen every second, deliberately do not. */}
        <form.Subscribe
          selector={(state) => state.canSubmit && state.values.name.trim() !== name}
        >
          {(ready) => (
            <Button
              type="submit"
              disabled={!ready}
              className="transition-transform duration-(--duration-press) ease-out active:scale-[0.97]"
            >
              Save
            </Button>
          )}
        </form.Subscribe>
      </form>
    </Setting>
  )
}

/**
 * The other half of an empty board.
 *
 * P1 wrote three notes to prove the visual language and P2 deleted them when the board became
 * real. This puts them back — see `lib/sample_notes.ts` for why the words came back and the fields
 * did not — as real notes, through the same `createNoteSeed` the create dialog uses.
 *
 * **Dispatched in reverse**, so `SAMPLE_NOTES[0]` takes the highest stamp and therefore the first
 * slot. The board sorts `order` descending; without the reverse the list lands upside down and
 * nothing else about it looks wrong.
 *
 * **Inert unless the board is empty**, and the hint says so. Nothing in this app can be undone, so
 * a control that appends three notes to a board of forty is a control that can bury what you wrote
 * — and the guard that costs nothing is the one that makes that impossible rather than the one that
 * asks. It is also why this needs no confirmation: it destroys nothing, and reset stays the only
 * irreversible act on the page rather than one of two.
 */
function SampleSetting() {
  const { notes } = useNotes()
  const dispatch = useNotesDispatch()

  const empty = notes.length === 0

  return (
    <Setting
      title="Sample notes"
      hint="The three notes this app was first drawn around. Available on an empty board."
    >
      <Button
        variant="secondary"
        disabled={!empty}
        className="self-start transition-transform duration-(--duration-press) ease-out active:scale-[0.97]"
        onClick={() => {
          const base = topOrder(notes)
          // Reversed: the last one dispatched carries the highest stamp and sorts first.
          ;[...SAMPLE_NOTES].reverse().forEach((sample, index) => {
            dispatch({
              type: 'add',
              seed: createNoteSeed(sample.color, base + index, sample.body, undefined, sample.title),
            })
          })
        }}
      >
        Load sample notes
      </Button>
    </Setting>
  )
}

/**
 * The only irreversible act on this page, and the only one behind a confirmation.
 *
 * Nothing in this app can be undone — `mission.md` rules out an undo history and a trash by name —
 * so the confirmation is the entire safety story, and it is one sentence with a real number in it.
 *
 * **The count is real, and that is the decision.** *Deletes all your notes* is a sentence about a
 * feature; *deletes all 8 notes* is a sentence about your board, and that is the difference between
 * a confirmation someone reads and one they click through.
 *
 * `Cancel` holds the default focus and the action says what it does rather than `OK` — both
 * straight from `delete_note_dialog.tsx`, for the reasons written there. The dialog is local to
 * this page rather than a provider in the shell: that one is a provider because a hundred cards
 * would otherwise mount a hundred Radix layers, and exactly one place can raise this one.
 */
function ResetSetting() {
  const { notes } = useNotes()
  const reset = useReset()

  const count = notes.length
  const noun = count === 1 ? 'note' : 'notes'

  return (
    <Setting
      title="Reset everything"
      hint="Deletes the board and your name from this browser. There is no undo."
    >
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            className="self-start transition-transform duration-(--duration-press) ease-out active:scale-[0.97]"
          >
            Reset everything
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everything?</AlertDialogTitle>
            <AlertDialogDescription>
              {/* Your board, in the sentence — not the feature. An empty board still says so
                  plainly rather than hiding the zero, because a person who resets an empty board
                  is a person who wants their name gone. */}
              Deletes all {count} {noun} and your name from this browser. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Enter on a dialog you did not read cancels rather than erases. That is the
                difference between a guard and a speed bump. */}
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={reset}>
              Reset everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Setting>
  )
}
