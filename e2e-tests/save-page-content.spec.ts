import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'page-content');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

test('inspect contact page', async ({ page }) => {
  // Set up error collection
  const errors: string[] = [];
  
  // Listen for page errors
  page.on('pageerror', error => {
    const errorMsg = `Page error: ${error.message}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  });

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errorText = `Console error: ${msg.text()}`;
      console.error(errorText);
      errors.push(errorText);
    }
  });

  // Navigate to the contact page
  console.log(`Navigating to ${TEST_URL}/contact`);
  await page.goto(`${TEST_URL}/contact`, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Save the full page HTML
  const htmlContent = await page.content();
  const htmlPath = path.join(OUTPUT_DIR, 'contact-page.html');
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`Page HTML saved to: ${htmlPath}`);
  
  // Save the rendered text content
  const textContent = await page.evaluate(() => document.body.innerText);
  const textPath = path.join(OUTPUT_DIR, 'contact-page.txt');
  fs.writeFileSync(textPath, textContent);
  console.log(`Page text saved to: ${textPath}`);
  
  // Take a screenshot
  const screenshotPath = path.join(OUTPUT_DIR, 'contact-page.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  // Check for common form elements
  console.log('\nChecking for common form elements:');
  const commonElements = [
    'form',
    'input[name="name"]',
    'input[type="email"]',
    'input[type="tel"]',
    'textarea',
    'button[type="submit"]',
    '[class*="contact"]',
    '[id*="contact"]',
    '[class*="form"]',
    '[id*="form"]'
  ];
  
  for (const selector of commonElements) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✅ Found ${count} element(s) with selector: ${selector}`);
    }
  }
  
  // Output any errors found
  if (errors.length > 0) {
    console.error('\nErrors found during page load:');
    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });
  }
  
  // Check if we found any forms
  const formCount = await page.locator('form').count();
  if (formCount === 0) {
    console.error('\n❌ No forms found on the page!');
  } else {
    console.log(`\n✅ Found ${formCount} form(s) on the page`);
  }
  
  // Save the DOM structure for inspection
  const domStructure = await page.evaluate(() => {
    interface DomElement {
      tag: string;
      id: string | null;
      class: string | null;
      text: string | null;
    }
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      { acceptNode: () => NodeFilter.FILTER_ACCEPT }
    );
    
    const elements: DomElement[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const element = node as Element;
      if (element.tagName) {
        elements.push({
          tag: element.tagName,
          id: element.id || null,
          class: element.className?.toString() || null,
          text: element.textContent?.trim().substring(0, 100) || null
        });
      }
    }
    return elements;
  });
  
  const domPath = path.join(OUTPUT_DIR, 'dom-structure.json');
  fs.writeFileSync(domPath, JSON.stringify(domStructure, null, 2));
  console.log(`DOM structure saved to: ${domPath}`);
  
  // Intentionally fail to show the output
  expect(formCount).toBeGreaterThan(0);
});
