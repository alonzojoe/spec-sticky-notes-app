import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../', import.meta.url))
const sidebar = readFileSync(join(src, 'components/ui/sidebar.tsx'), 'utf8')

// T5 — D4 and D8. Re-running `shadcn add sidebar` restores every one of these silently.
describe('the amendments to shadcn sidebar.tsx', () => {
  it.each(['document.cookie', 'sidebar_state'])('writes no %s (D4)', (fragment) => {
    expect(sidebar).not.toContain(fragment)
  })

  it.each(['ease-linear', 'transition-all'])('uses no %s (D8)', (fragment) => {
    expect(sidebar).not.toContain(fragment)
  })

  it('uses the drawer easing token instead', () => {
    expect(sidebar).toContain('ease-drawer')
  })

  // SidebarMenuButton renders a Tooltip whenever the sidebar is collapsed, and this
  // version of the registry leaves the provider to the consumer. Hosting it here keeps
  // the tooltip dependency inside ui/, which is what lets the T9 dormancy rule hold.
  // Without it the collapsed rail throws rather than showing a label.
  it('hosts the TooltipProvider itself rather than pushing it onto the app', () => {
    expect(sidebar).toContain('<TooltipProvider>')
  })
})

// T9 — D9. The transitive components are dormant until a phase needs them. P3 woke `button`:
// the toolbar's New note control and the dialog's footer are both real uses, so it moves off
// this list rather than the list being weakened. `dialog` was never on it — it arrived in P3
// already in use. P7 woke `input` the same way: the title and link fields in note_fields.tsx
// are two real uses, shared by both dialogs.
const DORMANT = ['tooltip', 'sheet', 'skeleton', 'separator']

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = join(dir, item.name)
    if (relative(src, full).startsWith('components/ui')) return []
    if (item.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(item.name) ? [full] : []
  })

describe('the transitive shadcn components', () => {
  it.each(DORMANT)('is not imported outside the sidebar: %s', (component) => {
    for (const file of sourceFiles(src)) {
      expect(readFileSync(file, 'utf8')).not.toContain(`@/components/ui/${component}`)
    }
  })
})
