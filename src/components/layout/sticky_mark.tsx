/**
 * The app's mark: cork behind, one sheet of butter paper in front carrying the same contact
 * shadow the board's cards do, three ruled lines in ink with the shortest last.
 *
 * **This is deliberately a duplicate of `public/favicon.svg`, and the duplication cannot be
 * removed.** A favicon is fetched by the browser as a standalone file before any JavaScript
 * runs, so it cannot import a React component; a React component cannot be served as
 * `image/svg+xml`. Inlining the file through a build plugin would trade a fifteen-line copy for
 * a build dependency. If one changes, change the other — they are the same mark and a drift
 * between the tab and the sidebar is exactly the kind of thing nobody notices for months.
 *
 * The colours are the literal hex of the `oklch` tokens in `index.css` — `--color-cork`,
 * `--color-cork-deep`, `--color-paper-butter` and `--color-ink`. They are literals rather than
 * `currentColor` because the mark is a *picture of the board*, not an icon that takes on the
 * colour of the text beside it; a monochrome version of it is just a rounded square.
 */
export function StickyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="#aa805c" />
      <rect x="6.5" y="7.5" width="19" height="18" rx="2.5" fill="#906749" opacity="0.55" />
      <rect x="6" y="6.5" width="19" height="18" rx="2.5" fill="#f6ecc3" />
      <g fill="#342a22" opacity="0.62">
        <rect x="9" y="11" width="13" height="1.8" rx="0.9" />
        <rect x="9" y="14.7" width="13" height="1.8" rx="0.9" />
        <rect x="9" y="18.4" width="8" height="1.8" rx="0.9" />
      </g>
    </svg>
  )
}
