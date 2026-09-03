import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { createAppRouter } from '@/app/config/router_config'

import './main.css'

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// The top of the app, with no `App` component under it — the providers the board needs live in the
// `_board` layout route, where the routes that need them can see them.
//
// The first match is awaited before mounting: a RouterProvider rendered before the router has
// matched commits an empty frame, and mission.md asks for no layout shift on load.
void router.load().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
})
