import { useState } from 'react'

import { FieldLabel } from '@/components/layout/note_fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/hooks/use_user'

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
  const [draft, setDraft] = useState(name)

  const trimmed = draft.trim()
  const unchanged = trimmed === name

  return (
    <Setting title="Your name" hint="It goes in the sidebar and nowhere else.">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed === '' || unchanged) return
          setName(draft)
        }}
        className="flex items-end gap-2"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <FieldLabel htmlFor="user-name">Name</FieldLabel>
          {/* No placeholder and no maxLength, both inherited from the dialog this moved out of: a
              field labelled Name needs no example, and a limit enforced by the input is a rule you
              discover by hitting it. A name too long for the sidebar truncates in the sidebar. */}
          <Input
            id="user-name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="name"
          />
        </div>
        {/* The toolbar's press feedback. A button pressed occasionally may answer when it is
            pressed; the sidebar rows, which are on screen every second, deliberately do not. */}
        <Button
          type="submit"
          disabled={trimmed === '' || unchanged}
          className="transition-transform duration-(--duration-press) ease-out active:scale-[0.97]"
        >
          Save
        </Button>
      </form>
    </Setting>
  )
}
