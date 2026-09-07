/**
 * One barrel for `lib/`, so an import says *`@/lib`* rather than reciting which module a function
 * happens to live in today. Moving `hasContent` from `notes.ts` to somewhere better stops being a
 * rename across thirty files.
 *
 * **Two things do not go through it, both for reasons that already have precedents here.**
 *
 * `lib/` modules import each other **deeply** — `board_storage.ts` reaches `dates.ts` directly, not
 * through this file. A module that imports the barrel that imports it is a cycle: it resolves today
 * and stops resolving the first time initialisation order matters, which is the kind of bug that
 * arrives months later looking like something else. `validation.md` greps for it.
 *
 * `components/ui/**` keeps `@/lib/utils`. `npx shadcn add` writes that exact specifier into every
 * component it generates, so a rewritten import is a conflict on every future `add` and `diff` —
 * the same reason those files keep their kebab-case names.
 *
 * Alphabetical, one line per module, and `src/__tests__/lib_barrel.test.ts` checks the list against
 * the directory rather than against itself.
 */
export * from './board_storage'
export * from './dates'
export * from './grid'
export * from './links'
export * from './note_factory'
export * from './notes'
export * from './paper'
export * from './platform'
export * from './search'
export * from './sections'
export * from './utils'
