import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'diff/index': 'src/diff/index.ts',
        'adapters/index': 'src/adapters/index.ts',
        'details/index': 'src/details/index.ts',
        'views/JsonView/index': 'src/views/JsonView/index.ts',
        'visualizer/index': 'src/visualizer/index.ts',
        'visualizer/reactflow/index': 'src/visualizer/reactflow/index.ts',
        'visualizer/contracts/index': 'src/visualizer/contracts/contracts.ts',
        'shell/index': 'src/shell/index.ts',
    },
    format: ['esm'],
    target: 'es2020',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    outDir: 'dist',
    external: [
        'react',
        'react-dom',
        'reactflow',
        '@finos/calm-models',
        '@finos/calm-design-tokens',
        'lucide-react',
        'react-icons',
        'react-icons/io5',
        '@monaco-editor/react',
        '@dagrejs/dagre',
        'zustand',
    ],
    esbuildOptions(options) {
        options.jsx = 'automatic'
    },
    async onSuccess() {
        const src = resolve('src/diff/Diff.css')
        const dest = resolve('dist/diff/Diff.css')
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(src, dest)
    },
})
