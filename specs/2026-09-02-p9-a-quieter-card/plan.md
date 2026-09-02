# P9 · A quieter card — Plan

A groundwork step and six task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `docs`, `build`, `feat`, `refactor`, `test`.

**Ordering note.** Group 1 is the amendment, so a rejection kills the phase before code exists.
Group 2 installs and audits the alert-dialog. **Group 3 puts pin and delete in the note view before
group 5 takes them off the card** — at no point between them is a note unpinnable or undeletable.
Group 4 adds the confirmation to the control that now exists. Group 5 is the removal, which is the
smallest diff in the phase and the last one, because everything it removes has somewhere else to be
by then.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`NoteControls` already dispatches through context**, not through props. Moving it from the card
  to the dialog does not change how it talks to the reducer.
- **The note view already dispatches and stays open** — `set_color` and `set_date` have done that
  since P6, so pinning without closing needs no new mechanism.
- **A nested Radix dialog works**: P6 put a `Popover` inside the view for the calendar. The
  alert-dialog inside the view is the same shape, and the same focus-scope risk.

*To verify in group 0:*

- **`npx shadcn@latest add alert-dialog` writes one file** and does not rewrite `button.tsx`. T5
  guards P1's button amendments and the sidebar is downstream of it.
- **The generated `alert-dialog.tsx` emits real styles under Tailwind v4.** P5 found the dialog's
  `tw-animate-css` classes inert and P6 found the calendar's the same; assume the same here.
- **An `AlertDialog` nested inside the view `Dialog` traps focus correctly and returns it.** This is
  the exact combination that breaks focus scopes. If it misbehaves, the alert moves to the shell and
  is driven by the id, rather than fighting two nested scopes.
- **Escape inside the alert cancels the alert without also closing the view.** If the key escapes to
  the outer dialog, one press would cancel a delete *and* close the note.

---

## 0. Groundwork

0.1 Branch `feat/p9-a-quieter-card` off **`feat/p8-find-things`**, since P8's PR #10 is not merged
    and this phase edits `note_view_dialog.tsx` and `note_card.tsx` as P8 left them. Rebase onto
    `main` once #10 lands.

0.2 Full gate on the clean branch: **23 suites, 604 assertions.**

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The amendment

1.1 `mission.md` principle 4 — replace the per-note clause with **D2**'s text. The second sentence
    is what licences the pinned glyph and is deliberately narrow.

1.2 `roadmap.md` — insert this phase as **P9 · A quieter card**.

1.3 `roadmap.md` — **the unbuilt phases lose their numbers** (**D1**). *Tags*, *Markdown and
    checkboxes*, *Dark mode* and *Polish* move under a **Planned, in order** heading with names
    only. P0–P9 keep theirs; their spec directories are named after them.

1.4 Rewrite every reference to `P10`/`P11`/`P12` across `specs/` to the phase's **name**. Where a
    spec says "deferred to P12" it will say "deferred to *Polish*", which is what it meant.

1.5 `roadmap.md` — *Polish* loses its delete-confirmation line; it ships here.

1.6 `README.md` — status to P9.

1.7 Commit: `docs: amend the constitution so a card carries no controls`

---

## 2. The alert-dialog

2.1 `npx shadcn@latest add alert-dialog`. `git status` — expect exactly one new file.

2.2 Audit it the way P3 audited the dialog and P6 the calendar: achromatic colour literals replaced
    with warm tokens, inert `tw-animate-css` classes removed, motion routed through the existing
    `--duration-*` and `--ease-*` tokens so `prefers-reduced-motion` collapses it with everything
    else.

2.3 **A modal, so `transform-origin` stays centred.** The popover rule about origin-awareness is
    for things anchored to a trigger; an alert is not.

2.4 Commit: `build(shadcn): add the alert-dialog and make it warm`

---

## 3. Pin and delete move into the note view

Test-first: extend `note_view.test.tsx`, T63.

3.1 Move `note_controls.tsx` from `components/board/` to `components/layout/`. It goes **whole** —
    the `aria-pressed` toggle and the pin/unpin labelling are already right and already tested.

3.2 Drop its `stopPropagation` wrapper. It existed because the card underneath was a click target
    and a drag handle; a dialog footer is neither.

3.3 Render it in `note_view_dialog.tsx`'s footer, left of `Done`, with the layout pushing `Done`
    right. Real accessible names, visible focus rings, `ghost` styling.

3.4 **Pinning does not close the view.** It is a property of the note like its colour, and P6
    established that changing those happens with the view open.

3.5 T63. Commit: `feat(board): put pin and delete in the note's own view`

---

## 4. Delete asks first

Test-first: `src/__tests__/delete_confirmation.test.tsx`, T64–T65.

4.1 `hasContent(note)` — `title`, `body` or `link` non-empty. **`date`, `color` and `pinned` are not
    content**: every note has them whether you chose them or not, so counting them would collapse
    the rule to "always confirm".

4.2 A note with content opens the alert; one without is deleted immediately.

4.3 The alert names the note — its title, or `this note` when untitled.

4.4 **Cancel takes the default focus**, so `Enter` on a dialog you did not read cancels rather than
    deletes. Confirm is `destructive` and reads `Delete`, never `OK`.

4.5 Deleting closes the note view too — the note it was showing is gone.

4.6 T64–T65. Commit: `feat(board): confirm before deleting a note with something in it`

---

## 5. The card goes quiet

Test-first: extend `board.test.tsx`, T66–T67.

5.1 `note_card.tsx` — remove `<NoteControls />`, the `group` class, and the absolute container.

5.2 Add the pinned glyph (**D4**): `size-3.5`, `text-ink-soft`, `aria-hidden`, in a `<span>`, **no
    handler and no tabindex**. Rendered only when `note.pinned`.

5.3 The opener's `aria-label` gains `Pinned` when the note is pinned, so the state is not
    glyph-only.

5.4 **T67 asserts the card contains no `<button>` but its opener.** Requirements § Risks: nothing
    otherwise stops a later phase regrowing a control there, because tests assert what is present.

5.5 Re-point T35 rather than deleting it. It asserted that the controls do not open the note; the
    collision is gone, but the coverage that *clicking a card opens the note* is worth keeping.

5.6 T66–T67. Commit: `feat(board): take the controls off the card`

---

## 6. The tests and the documents

6.1 Whatever of T63–T68 is not already written by its group, plus the count check: **more than 23
    suites and more than 604 assertions.**

6.2 Commit: `test: cover the quiet card and the delete confirmation`

6.3 `tech-stack.md` — `note_controls.tsx` moves under `layout/`; the tree gains `alert-dialog.tsx`;
    phase markers become names per **D1**.

6.4 Commit: `docs: record the quiet card across the constitution`

6.5 Open the PR against **`main`**, or against `feat/p8-find-things` if #10 has not landed.

---

## What could go wrong

**The nested alert inside the view is the risk.** Two Radix focus scopes, one inside the other, and
an Escape key that must cancel the inner one without closing the outer. Group 0 verifies it before
group 4 depends on it, and the fallback — hoisting the alert to the shell and driving it by id — is
named in advance.

**Deleting a note while its view is open is a two-unmount sequence.** The alert closes, the note
leaves the store, and the view's `note` prop becomes `null` on the same tick. P6 made the view
return `null` for a null note, so this should be inert, but it is the first time anything has
removed the note a view is showing.

**T35 is the assertion most likely to be deleted rather than re-pointed.** It is about a collision
that stops existing, and the lazy move is to drop it. The coverage underneath it is not lazy.
