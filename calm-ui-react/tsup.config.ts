import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'diff/index': 'src/diff/index.ts',
        'adapters/index': 'src/adapters/index.ts',
    },
    format: ['esm'],
    target: 'es2020',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    outDir: 'dist',
    external: ['react', 'react-dom', 'reactflow', '@finos/calm-models'],
    esbuildOptions(options) {
        options.jsx = 'automatic'
    },
})
