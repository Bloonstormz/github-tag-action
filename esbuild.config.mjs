import * as esbuild from 'esbuild';

const jsBanner = [
    '#!/usr/bin/env node',
    '// Built on ' + new Date().toISOString(),
].join('\n');

const args = process.argv.slice(2);

let esbuildOptions = {
    minify: true,
}

const minify = {
    args: 0,
    fn: () => esbuildOptions.minify = false
}

const argumentMap = {
    'minify': minify,
    'm': minify,
}

args.forEach((arg, index) => {
    if (arg.startsWith('--')) {
        const flag = arg.slice(2);
        const details = argumentMap[flag];
        if (details) {
            if (details.args === 0) {
                details.fn();
            } else {
                const nextArg = args[index + 1];
                if (nextArg !== undefined) {
                    details.fn(nextArg);
                } else {
                    throw new Error(`Argument expected for flag --${flag}`);
                }
            }
        }
    } else if (arg.startsWith('-')) {
        const flags = arg.slice(1);
        for (let innerIndex = 0; innerIndex < flags.length; innerIndex++) {
            const char = flags[innerIndex];
            const details = argumentMap[char];
            if (details) {
                if (details.args === 0) {
                    details.fn();
                } else {
                    if (innerIndex === flags.length - 1) {
                        // If it's the last flag, take the next argument
                        const nextArg = args[index + 1];
                        if (nextArg !== undefined) {
                            details.fn(nextArg);
                        } else {
                            throw new Error(`Argument expected for flag -${char}`);
                        }
                    } else {
                        throw new Error(`Flag -${char} requires an argument and cannot be combined with other flags`);
                    }
                }
            }
        }
    }
});

esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    platform: 'node',
    banner: {
        js: jsBanner,
    },
    outfile: 'dist/main.js',
    minify: esbuildOptions.minify,
    external: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
    ]
})