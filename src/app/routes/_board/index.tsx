import { createFileRoute } from '@tanstack/react-router'

import { NotesPage } from '@/pages/notes_page'

// `/` is the whole board. P10 chose that over redirecting to `/notes`: a redirect resolves
// asynchronously, and the app — and every test that renders it — expects a board on the first
// commit rather than an empty frame followed by one.
export const Route = createFileRoute('/_board/')({
  component: NotesPage,
})
