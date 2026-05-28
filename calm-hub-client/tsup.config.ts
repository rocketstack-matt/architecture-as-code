import { defineConfig } from 'tsup'

export default defineConfig({
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    target: 'es2020',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    outDir: 'dist',
    external: ['axios', '@finos/calm-models', '@finos/calm-shared'],
})
