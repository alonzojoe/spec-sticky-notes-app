import { RouterProvider } from '@tanstack/react-router'

import { router } from '@/__tests__/router_setup'

/**
 * What the tests render in place of an `App` component, because production does not have one:
 * `main.tsx` composes the router and mounts it, the way `unicare-booking`'s does.
 *
 * Named `test_app.tsx` rather than `app.tsx` so the reason stays visible — it is a thing the tests
 * need, not a thing the app has. It is also a small fork of the entry point: a provider added to
 * `main.tsx` and not to this file would be invisible here, which is the cost of having no shared
 * component and the reason both files are kept short enough to compare at a glance.
 */
export default function App() {
  return <RouterProvider router={router} />
}
