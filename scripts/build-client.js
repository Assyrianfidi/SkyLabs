#!/usr/bin/env node

import { build } from 'vite';

async function main() {
  try {
    await build({
      mode: 'production',
      logLevel: 'info'
    });
    console.log('Build completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();
