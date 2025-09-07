import * as esbuild from 'esbuild';

const jsBanner = [
    '#!/usr/bin/env node',
    '// Built on ' + new Date().toISOString(),
].join('\n');


esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    platform: 'node',
    banner: {
        js: jsBanner,
    },
    outfile: 'dist/main.js',
    minify: true
})