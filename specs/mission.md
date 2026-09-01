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

1. **Spatial, not sorted.** Notes stay where I put them. No auto-layout, no reflow, no
   "smart" ordering. The only thing that changes stacking is me clicking a note.
2. **Direct manipulation.** Drag the note itself. Edit text in place on the note — no
   dialog stands between me and a thought I am already writing. Creating a note may ask
   for colour and text first, as long as the keyboard can open it, fill it, and dismiss it
   without touching the mouse.
3. **Persistent by default.** There is no Save button. State is written as it changes and
   restored exactly on reload — position, stacking, colors, and all.
4. **Quiet chrome.** The interface is the notes. Global controls live in the sidebar and
   the toolbar above it, and never on the board surface itself; per-note controls appear on the note
   you're touching, not on all of them at once. The sidebar can be collapsed to a rail, and
   the board stays fully usable with it collapsed.
5. **Keyboard-reachable.** Anything the mouse can do — including moving a note — has a
   keyboard path. Beauty that excludes the keyboard isn't finished.

## What "modern UI" means here (testable, not vibes)

The look is **soft depth on paper**: tactile, warm, physical. These are acceptance
criteria, not suggestions.

- **Layered shadows.** Every note carries a two-or-three-layer shadow (tight contact
  shadow + wide ambient shadow). On hover the note lifts slightly; while dragging it
  lifts distinctly further. Shadow depth must read as height off the board.
- **Tilt.** Each note gets a random rotation between −3° and +3° at creation and keeps it
  forever. Notes never sit perfectly square, and a note's tilt must not change on re-render.
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

- **Freeform board** — create, drag, and stack notes anywhere; click to bring to front.
- **Inline editing with autosave** — click a note, type on it, it saves itself.
- **Colors + pin** — a curated paper palette per note; pinned notes stay above the pile.
- **Search + tags** — a live filter box, and `#tags` parsed out of note text and clickable.
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
