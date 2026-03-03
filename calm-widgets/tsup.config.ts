import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: true,
        external: ['handlebars'],
        onSuccess: 'node scripts/copy-widgets.mjs'
    },
    {
        entry: { 'reactflow': 'src/reactflow/index.ts' },
        format: ['esm'],
        dts: {
            tsconfig: 'tsconfig.reactflow.json',
        },
        splitting: false,
        sourcemap: true,
        external: ['react', 'react-dom', 'reactflow', '@dagrejs/dagre'],
        esbuildOptions(options) {
            options.jsx = 'automatic';
        },
    }
]);
