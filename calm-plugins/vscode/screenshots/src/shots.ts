// Declarative shot list. Each entry produces one PNG under docs/static/img/vscode/.
//
// Adding a shot: see AGENTS.md → "Common workflows → Add a shot".

import type { Page } from 'playwright'
import { runCommand, runCommandByTitle } from './normalise.js'
import { captureFullWindow } from './shoot.js'
import { findInnerWebviewFrame } from './frames.js'

export interface Shot {
    name: string
    // Fixture folder name under fixtures/. The orchestrator opens
    // fixtures/<name>/<workspaceFile> by default; override `workspaceFile`
    // if the shot needs an entry file other than architecture.json.
    fixture: string
    workspaceFile?: string
    description: string
    implemented: boolean
    // Optional workbench-settings overrides merged into the seeded settings.json
    // for this shot's VSCode launch. Use for theme or any other setting that
    // needs to be in place before the first paint.
    settings?: Record<string, unknown>
    setup: (window: Page) => Promise<void>
    capture: (window: Page) => Promise<Buffer>
}

// Wait for the React preview's ReactFlow diagram to render at least one node
// inside its inner webview frame. The preview emits no event we can hook, so
// we poll for `.react-flow__node` and then settle.
//
// NOTE: on timeout we log a warning and return rather than throwing — the
// caller's screenshot will still run, producing whatever the preview managed
// to render. This means a regression can silently produce a degraded PNG;
// manual review of the PR diff remains the gate for catching it.
async function waitForDiagramRendered(window: Page, timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        const inner = findInnerWebviewFrame(window)
        if (inner) {
            try {
                const count = await inner.locator('.react-flow__node').count()
                if (count > 0) {
                    await window.waitForTimeout(800)
                    return
                }
            } catch {
                // frame detached mid-poll; retry
            }
        }
        await window.waitForTimeout(200)
    }
    console.warn(`[shoot]   waitForDiagramRendered timed out after ${timeoutMs}ms`)
}

async function openPreview(window: Page): Promise<void> {
    await runCommandByTitle(window, 'CALM: Open Preview')
    await window.waitForFunction(
        () => {
            const tabs = Array.from(document.querySelectorAll('.tab .tab-label'))
            return tabs.some((t) => /preview/i.test(t.textContent || ''))
        },
        { timeout: 20_000 }
    )
    await waitForDiagramRendered(window)
}

export const shots: Shot[] = [
    {
        name: '01-activity-bar',
        fixture: 'three-tier',
        description: 'CALM icon and Model Elements view in the activity bar.',
        implemented: true,
        async setup(window) {
            await runCommand(window, 'workbench.view.extension.calm')
            await window.waitForTimeout(800)
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    {
        name: '02-tree-view',
        fixture: 'three-tier',
        description: 'Model Elements tree with Nodes, Relationships, Flows, Controls, and ADRs groups (Phase 7).',
        implemented: true,
        async setup(window) {
            await runCommand(window, 'workbench.view.extension.calm')
            await window.waitForTimeout(1_200)

            const first = window.locator('[role="treeitem"]').first()
            await first.click()
            await window.waitForTimeout(200)

            await window.keyboard.press('ArrowRight')
            await window.waitForTimeout(300)

            // Walk down the tree with ArrowDown + ArrowRight to expand each
            // visible top-level group (Nodes, Relationships, Flows, Controls,
            // ADRs). 8 iterations covers the five groups plus a couple of
            // buffer steps for any future top-level entries; on a closed leaf
            // ArrowRight is a no-op, on an already-expanded node it just
            // moves focus.
            for (let i = 0; i < 8; i++) {
                await window.keyboard.press('ArrowDown')
                await window.keyboard.press('ArrowRight')
                await window.waitForTimeout(120)
            }
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    {
        name: '03-tree-search',
        fixture: 'three-tier',
        description: 'Search & filter in the Model Elements tree.',
        implemented: true,
        async setup(window) {
            await runCommand(window, 'workbench.view.extension.calm')
            await window.waitForTimeout(1_000)
            await runCommandByTitle(window, 'Search Model Elements')
            await window.waitForSelector('.quick-input-widget', { timeout: 5_000 })
            await window.keyboard.type('api')
            await window.waitForTimeout(400)
            await window.keyboard.press('Enter')
            await window.waitForTimeout(800)
            const first = window.locator('[role="treeitem"]').first()
            await first.click()
            await window.keyboard.press('ArrowRight')
            await window.waitForTimeout(300)
            for (let i = 0; i < 6; i++) {
                await window.keyboard.press('ArrowDown')
                await window.keyboard.press('ArrowRight')
                await window.waitForTimeout(100)
            }
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    {
        name: '04-preview-hero',
        fixture: 'three-tier',
        description: 'Live React preview (ReactFlow + Sidebar from @finos/calm-ui-react) next to the JSON source.',
        implemented: true,
        async setup(window) {
            await openPreview(window)
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    {
        name: '04b-preview-with-sidebar',
        fixture: 'three-tier',
        description: 'React preview with the details sidebar open on a selected node.',
        implemented: true,
        async setup(window) {
            await openPreview(window)
            const inner = findInnerWebviewFrame(window)
            if (inner) {
                try {
                    const firstNode = inner.locator('.react-flow__node').first()
                    if ((await firstNode.count()) > 0) {
                        await firstNode.click({ force: true })
                        await window.waitForTimeout(1_000)
                    }
                } catch { /* best-effort */ }
            }
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    // The Phase 11 purge removed `calm.docify.theme` and `calm.preview.layout`
    // — the React preview ships with the @finos/calm-design-tokens stylesheet
    // baked in and uses a single brand-neutral palette. The light/dark/HC +
    // ELK/Dagre shots that used to toggle Mermaid options no longer have a
    // meaningful axis to vary.
    {
        name: '05-theme-light',
        fixture: 'three-tier',
        description: 'Preview rendered with the light theme (legacy — superseded by Phase 11 design-tokens).',
        implemented: false,
        async setup() { /* removed */ },
        async capture(window) { return await captureFullWindow(window) },
    },
    {
        name: '05-theme-dark',
        fixture: 'three-tier',
        description: 'Preview rendered with the dark theme (legacy — superseded by Phase 11 design-tokens).',
        implemented: false,
        async setup() { /* removed */ },
        async capture(window) { return await captureFullWindow(window) },
    },
    {
        name: '06-layout-elk',
        fixture: 'three-tier',
        description: 'Preview rendered with the ELK layout (legacy — superseded by Phase 6 ReactFlow).',
        implemented: false,
        async setup() { /* removed */ },
        async capture(window) { return await captureFullWindow(window) },
    },
    {
        name: '06-layout-dagre',
        fixture: 'three-tier',
        description: 'Preview rendered with the Dagre layout (legacy — superseded by Phase 6 ReactFlow).',
        implemented: false,
        async setup() { /* removed */ },
        async capture(window) { return await captureFullWindow(window) },
    },

    {
        name: '07-validation-problems',
        fixture: 'broken',
        description: 'Real-time validation surfaces errors in the Problems panel.',
        implemented: true,
        async setup(window) {
            await runCommand(window, 'workbench.actions.view.problems')
            await window.waitForTimeout(2_500)
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    {
        name: '08-hover',
        fixture: 'three-tier',
        description: 'Hover info on a node reference in the JSON editor.',
        implemented: false,
        async setup(window) {
            const editor = window.locator('.monaco-editor').first()
            await editor.click()
            await window.waitForTimeout(300)
            for (let i = 0; i < 100; i++) {
                await window.keyboard.press('ArrowUp')
            }
            for (let i = 0; i < 13; i++) {
                await window.keyboard.press('ArrowDown')
            }
            await window.keyboard.press('End')
            for (let i = 0; i < 5; i++) {
                await window.keyboard.press('ArrowLeft')
            }
            await window.waitForTimeout(300)
            await window.keyboard.press('ControlOrMeta+K')
            await window.keyboard.press('ControlOrMeta+I')
            await window.waitForTimeout(1_500)
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    {
        name: '09-timeline',
        fixture: 'timeline',
        workspaceFile: 'calm-timeline.json',
        description: 'Timeline navigation showing architecture moments in the sidebar.',
        implemented: true,
        async setup(window) {
            const editor = window.locator('.monaco-editor').first()
            await editor.click()
            await window.waitForTimeout(500)

            await window.keyboard.press('ControlOrMeta+S')
            await window.waitForTimeout(2_000)

            await runCommand(window, 'workbench.view.extension.calm')
            await window.waitForTimeout(1_500)

            const first = window.locator('[role="treeitem"]').first()
            await first.click()
            await window.waitForTimeout(200)
            await window.keyboard.press('ArrowRight')
            await window.waitForTimeout(200)
            for (let i = 0; i < 4; i++) {
                await window.keyboard.press('ArrowDown')
                await window.keyboard.press('ArrowRight')
                await window.waitForTimeout(120)
            }
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },

    // Docify tab — removed in Phase 11 along with the rest of the
    // template/docify preview tabs. CALM: Create Documentation Website still
    // produces docify output as static HTML, but it's no longer surfaced in
    // the live preview.
    {
        name: '10-docify',
        fixture: 'docify-template',
        workspaceFile: 'architecture.json',
        description: 'Docify tab rendering the architecture (legacy — removed in Phase 11).',
        implemented: false,
        async setup() { /* removed */ },
        async capture(window) { return await captureFullWindow(window) },
    },

    // ===== Phase 14 addition =====

    {
        name: '11-hub-view-disabled',
        fixture: 'three-tier',
        description: 'CALM Hub sidebar in disabled state (calm.hub.url unset) — Phase 14.',
        implemented: true,
        async setup(window) {
            await runCommand(window, 'workbench.view.extension.calm')
            await window.waitForTimeout(800)
            // Open the CALM Hub view explicitly — its default visibility is
            // collapsed, so without a click it's hidden behind the Model
            // Elements view.
            await runCommand(window, 'workbench.view.calmHubSidebar')
            await window.waitForTimeout(1_000)
        },
        async capture(window) {
            return await captureFullWindow(window)
        },
    },
]

export const implementedShots = shots.filter((s) => s.implemented)
