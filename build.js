#!/usr/bin/env node

import { build } from 'esbuild';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildClient() {
  console.log('Building client...');
  try {
    // Run the Vite build
    execSync('node scripts/build-client.js', { stdio: 'inherit' });
    console.log('Client build completed successfully');
    return true;
  } catch (error) {
    console.error('Client build failed:', error);
    return false;
  }
}

async function buildServer() {
  console.log('Building server...');
  try {
    await build({
      entryPoints: [path.join(__dirname, 'server/index.ts')],
      platform: 'node',
      bundle: true,
      format: 'esm',
      outdir: path.join(__dirname, 'dist'),
      minify: true,
      packages: 'external',
      logLevel: 'info',
    });
    console.log('Server build completed successfully');
    return true;
  } catch (error) {
    console.error('Server build failed:', error);
    return false;
  }
}

async function main() {
  console.log('Starting build process...');
  
  // Build client first
  const clientSuccess = await buildClient();
  if (!clientSuccess) {
    process.exit(1);
  }
  
  // Then build server
  const serverSuccess = await buildServer();
  if (!serverSuccess) {
    process.exit(1);
  }
  
  console.log('Build completed successfully!');
}

main().catch(console.error);
