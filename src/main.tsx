import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app.tsx'
import { router } from './router.tsx'

// The router matches its first location asynchronously, and a `RouterProvider` rendered before
// that resolves commits an empty frame. mission.md asks for no layout shift on load, so the first
// match is awaited and the app mounts with a board already in hand.
void router.load().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
