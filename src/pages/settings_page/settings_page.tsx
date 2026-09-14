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
      </div>
    </div>
  )
}
