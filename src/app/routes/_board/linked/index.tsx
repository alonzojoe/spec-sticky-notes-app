import { createFileRoute } from '@tanstack/react-router'

import { LinkedPage } from '@/pages/linked_page'

export const Route = createFileRoute('/_board/linked/')({
  component: LinkedPage,
})
