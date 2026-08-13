import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // The two CLI-owned paths — the same pair src/__tests__/naming_convention.test.ts
    // exempts. `npx shadcn add` writes and regenerates these, so any fix here is reverted
    // by the next component install. Scoped off rather than disabled globally, and never
    // with an inline eslint-disable in our own code.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/hooks/use-mobile.ts'],
    rules: {
      // button.tsx exports buttonVariants, sidebar.tsx exports useSidebar. We do not
      // hot-reload-author vendor-shaped files.
      'react-refresh/only-export-components': 'off',
      // use-mobile.ts seeds its state after mount. Deliberate in shadcn's source, and
      // harmless in a client-only app with no hydration to mismatch.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
