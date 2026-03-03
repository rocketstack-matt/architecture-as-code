import { defineConfig } from 'tsup'
import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)
const reactDir = path.dirname(require.resolve('react/package.json'))
const reactDomDir = path.dirname(require.resolve('react-dom/package.json'))

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
            '@finos/calm-widgets',
            'markdown-it',
            'mermaid',
            'jsdom',
            'zustand'
        ],
        minify: false,
        outDir: 'dist',
    },
    // Webview (Browser environment)
    {
        entry: { 'webview/main': 'src/features/preview/webview/main.ts' },
        platform: 'browser',
        target: 'es2020',
        format: ['iife'],
        globalName: 'CalmWebview',
        sourcemap: true,
        clean: false,
        dts: false,
        minify: false,
        outDir: 'dist',
        noExternal: [
            'react',
            'react-dom',
            'reactflow',
            '@dagrejs/dagre',
            'elkjs',
            '@finos/calm-widgets/reactflow',
        ],
        esbuildOptions(options) {
            options.jsx = 'automatic'
            // Force all react imports (including those inside pre-built
            // @finos/calm-widgets/reactflow) to resolve to the same copy,
            // preventing the "Cannot read properties of null (reading 'useState')"
            // error caused by duplicate React instances.
            options.alias = {
                'react': reactDir,
                'react-dom': reactDomDir,
            }
        },
    }
])
