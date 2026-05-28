import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'diff/index': 'src/diff/index.ts',
        'adapters/index': 'src/adapters/index.ts',
        'details/index': 'src/details/index.ts',
        'views/JsonView/index': 'src/views/JsonView/index.ts',
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
    ],
    esbuildOptions(options) {
        options.jsx = 'automatic'
    },
})
