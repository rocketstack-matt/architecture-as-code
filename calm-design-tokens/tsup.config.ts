import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export default defineConfig({
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    target: 'es2020',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    outDir: 'dist',
    async onSuccess() {
        const src = resolve('src/tokens.css')
        const dest = resolve('dist/tokens.css')
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(src, dest)
    },
})
