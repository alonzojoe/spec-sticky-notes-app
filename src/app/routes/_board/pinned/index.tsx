import { createFileRoute } from '@tanstack/react-router'

import { PinnedPage } from '@/pages/pinned_page'

export const Route = createFileRoute('/_board/pinned/')({
  component: PinnedPage,
})
