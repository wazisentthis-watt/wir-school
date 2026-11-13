import * as esbuild from 'esbuild';
const [entry, out] = process.argv.slice(2);
await esbuild.build({ entryPoints: [entry], bundle: true, minify: process.argv.includes('--min'), format: 'iife', outfile: out, loader: { '.json': 'json' }, target: 'es2020', nodePaths: ['/home/claude/ngb/tools/node_modules'], logLevel: 'warning' });
