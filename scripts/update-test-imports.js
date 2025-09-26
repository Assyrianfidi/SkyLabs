// This script updates test files to use ES module imports
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Files to update
const testFiles = [
  '__tests__/health-check.test.js',
  '__tests__/simple.test.js',
  'server/__tests__/contact.test.ts',
  'server/__tests__/security.test.ts'
];

// Common replacements
const replacements = [
  { 
    pattern: /const\s+([^=]+)=\s*require\(['"]([^'"]+)['"]\)/g, 
    replacement: 'import $1 from "$2"' 
  },
  { 
    pattern: /const\s+\{\s*([^}]+)\s*\}\s*=\s*require\(['"]([^'"]+)['"]\)/g, 
    replacement: 'import { $1 } from "$2"' 
  }
];

// Process each file
testFiles.forEach(file => {
  try {
    const filePath = join(process.cwd(), file);
    let content = readFileSync(filePath, 'utf8');
    
    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
    
    // Write updated content
    writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Import updates complete!');
