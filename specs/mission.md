# Mission

## What this is

A personal digital corkboard. Notes are pieces of paper you throw onto a board and
arrange with your hands — not rows in a list. **Where** a note sits is part of what it
means, so the board never rearranges itself behind your back.

Built for one user (me). No accounts, no sync, no collaboration, no server. Everything
lives in this browser.

## The one-sentence test

> Can I capture a thought in under two seconds, and will the board look exactly as I
> left it when I come back tomorrow?

Every feature is judged against that sentence. If a change makes capture slower or makes
the board rearrange itself, it is wrong regardless of how good it looks.

## Principles

1. **Ordered, not scattered.** Notes live in a grid, newest first. A new note takes the
   first slot and pushes the rest along; deleting one closes the gap. The order is mine to
   change — dragging a note onto another swaps the two of them, permanently — and nothing
   else reorders the board. **A section may change which notes are on screen; it never
   changes their order, and leaving it shows the board exactly as it was.**
2. **Direct manipulation.** Drag the note itself to reorder it. A card is a summary —
   click it and the note opens for reading and editing, with its colour and its date.
   Whatever opens a note must open, fill and dismiss from the keyboard alone.
3. **Persistent by default.** There is no Save button. State is written as it changes and
   restored exactly on reload — position, stacking, colors, and all.
4. **Quiet chrome.** The interface is the notes. Global controls live in the sidebar and
   the toolbar above it, and never on the board surface itself; a card carries **two** per-note
   controls — pin and delete — revealed on the note you're touching, not on all of them at once.
   Everything else you can do to a note happens in the note, which is one click away. **A control
   may stay visible when it is also *state*:** a pinned note draws its pin without a hover, because
   otherwise nothing on the board explains why it sorts first. The sidebar can be collapsed to a
   rail, and the board stays fully usable with it collapsed.
5. **Keyboard-reachable.** Anything the mouse can do — including moving a note — has a
   keyboard path. Beauty that excludes the keyboard isn't finished.

## What "modern UI" means here (testable, not vibes)

The look is **soft depth on paper**: tactile, warm, physical. These are acceptance
criteria, not suggestions.

- **Layered shadows.** Every note carries a two-or-three-layer shadow (tight contact
  shadow + wide ambient shadow). On hover the note lifts slightly; while dragging it
  lifts distinctly further. Shadow depth must read as height off the board.
- **Square, not scattered.** Notes sit straight in their grid cells. P5's earlier draft kept
  the −3°..+3° tilt from the freeform board; on a grid it reads as sloppy rather than
  tactile, because a tilt only looks deliberate when nothing around it is aligned. The paper
  still carries grain and layered shadow — the tactility comes from those, not from rotation.
- **Grain.** The paper has a subtle noise/grain texture; the board behind it reads as cork
  or felt. Neither is a flat single color.
- **Spring motion.** Pick-up, drop, and settle animate with spring easing, not linear or
  ease-in-out. Target ~200–300ms. Motion is felt, never waited on.
- **Warm neutrals.** The palette is warm — paper colors and a cork-toned backdrop. No cold
  grays, no pure `#fff` paper, no pure `#000` text.
- **Generous geometry.** Rounded corners (`rounded-lg` class of radius) and real padding
  inside notes. Text never touches an edge.
- **Respect `prefers-reduced-motion`.** When it's set, springs collapse to instant state
  changes. Drag still works; it just doesn't bounce.

## Core scope

These are in the constitution. They ship.

- **Ordered board** — create, drag to reorder, and pin; the grid never rearranges itself
  except to open or close a slot.
- **Open and edit** — click a note to read it in full and edit it; it saves itself, with
  no Save button.
- **Colors + pin** — a curated paper palette per note; pinned notes stay above the pile, and
  the sidebar has a section that shows only them.
- **Title and link** — a note can carry a one-line title and one URL. The card shows both so
  the board can be scanned rather than read; the link opens in a new tab, and the sidebar has a
  section that shows only the notes carrying one.
- **Search** — a palette on `⌘K` that finds a note by its title or its text. The board never
  filters, dims, or reorders.
- **Tags** — `#tags` parsed out of note text, shown on the note and clickable to filter.
- **Markdown + checklists** — bold, italic, links, lists, and `- [ ]` checkboxes that can
  be ticked directly on the note without entering edit mode.
- **Dark mode** — follows the system by default, with a manual override that is remembered.

## Explicitly out of scope

Named here so they don't creep in later. Each would need a deliberate amendment to this
document.

- Accounts, auth, multi-user, sharing, real-time collaboration
- Any backend, database, or network request — the app must work fully offline
- Multiple boards / workspaces / folders (one board, one user)
- Rich-text WYSIWYG editing (markdown source is the format; no contenteditable engine)
- Attachments, image upload, drawing, or handwriting
- Reminders, notifications, calendar or email integration
- Mobile-native apps (the web app should be *usable* on a phone, not optimized for one)
- Undo history beyond the current session, or a trash/archive system

## Done means

- Notes survive a hard refresh and a browser restart with identical positions and stacking.
- A new note is on the board and focused for typing within one interaction.
- Every note action is reachable by keyboard, and the board is navigable with a screen
  reader.
- Light and dark both look deliberate — neither is an inverted afterthought.
- No console errors, no layout shift on load, and the board renders smoothly at 100+ notes.

See [tech-stack.md](./tech-stack.md) for how it's built and [roadmap.md](./roadmap.md) for
the order it gets built in.
