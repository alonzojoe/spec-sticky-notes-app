import { createFileRoute } from '@tanstack/react-router'

import { NotesPage } from '@/pages/notes_page'

// The same page as `/`, at a path the sidebar can link to and the address bar can name. Two routes
// to one page is the price of `/` not redirecting, and it is a cheaper price than the empty frame.
export const Route = createFileRoute('/_board/notes/')({
  component: NotesPage,
})
