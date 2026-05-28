import { defineConfig } from 'tsup'

export default defineConfig([
    // Extension (Node environment)
    {
        entry: { extension: 'src/extension.ts' },
        platform: 'node',
        target: 'node18',
        format: ['cjs'],
        sourcemap: true,
        clean: true,
        dts: false,
        // Bundle runtime dependencies into the extension so the installed VSIX does
        // not rely on node_modules being present in the target environment.
        // Keep 'vscode' external (provided by the host).
        external: ['vscode'],
        noExternal: [
            'yaml',
            'lodash',
            '@finos/calm-shared',
            '@finos/calm-models',
            '@finos/calm-design-tokens',
            'zustand',
        ],
        minify: false,
        outDir: 'dist',
    },
    // React ADR webview bundle. Self-contained IIFE under VSCode's CSP.
    {
        entry: { 'features/adr/webview/main': 'src/features/adr/webview/main.tsx' },
        platform: 'browser',
        target: 'es2020',
        format: ['iife'],
        globalName: 'CalmAdrWebview',
        sourcemap: true,
        clean: false,
        dts: false,
        minify: false,
        outDir: 'dist',
        noExternal: [
            'react',
            'react-dom',
            '@finos/calm-ui-react',
            '@finos/calm-design-tokens',
            '@finos/calm-models',
            'lucide-react',
            'react-icons',
        ],
        esbuildOptions(options) {
            options.jsx = 'automatic'
        },
    },
    // React preview webview bundle. Self-contained IIFE under VSCode's CSP:
    // React, ReactFlow, and the @finos/calm-ui-react component tree are
    // baked in so the bundle loads offline.
    {
        entry: { 'webview/react/main': 'src/features/preview/webview/react/main.tsx' },
        platform: 'browser',
        target: 'es2020',
        format: ['iife'],
        globalName: 'CalmReactWebview',
        sourcemap: true,
        clean: false,
        dts: false,
        minify: false,
        outDir: 'dist',
        noExternal: [
            'react',
            'react-dom',
            'reactflow',
            'lucide-react',
            'react-icons',
            '@finos/calm-ui-react',
            '@finos/calm-design-tokens',
            '@finos/calm-models',
            '@dagrejs/dagre',
            'zustand',
        ],
        esbuildOptions(options) {
            options.jsx = 'automatic'
        },
    },
])
