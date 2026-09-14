import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/pages/settings_page'

export const Route = createFileRoute('/_board/settings/')({
  component: SettingsPage,
})
