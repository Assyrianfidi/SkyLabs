#!/usr/bin/env node

import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    await build({
      entryPoints: [path.join(__dirname, '../server/index.ts')],
      platform: 'node',
      bundle: true,
      format: 'esm',
      outdir: path.join(__dirname, '../dist'),
      minify: true,
      packages: 'external',
      logLevel: 'info',
    });
    console.log('Server build completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Server build failed:', error);
    process.exit(1);
  }
}

main();
