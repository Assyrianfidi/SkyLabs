import { test, expect, Page } from '@playwright/test';

// Set global test timeout to 5 minutes
test.setTimeout(300000);

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';

// Helper function to log page state
async function logPageState(page: Page) {
  console.log('\n=== Page State ===');
  console.log(`URL: ${page.url()}`);
  console.log(`Title: ${await page.title()}`);
  console.log('Body content (first 1000 chars):', (await page.content()).substring(0, 1000));
  console.log('Network Idle State:', await page.evaluate(() => (window as any).performance.timing.loadEventEnd > 0 ? 'Loaded' : 'Loading'));
  console.log('Document Ready State:', await page.evaluate('document.readyState'));
  console.log('==================================\n');
}

test('debug contact form loading', async ({ page }) => {
  // Enable request/response logging
  page.on('request', request => console.log('>>', request.method(), request.url()));
  page.on('response', response => console.log('<<', response.status(), response.url()));

  console.log(`Navigating to ${TEST_URL}/contact`);
  
  // Try different navigation approaches
  try {
    // First try with networkidle
    console.log('Trying navigation with networkidle...');
    await page.goto(`${TEST_URL}/contact`, { 
      waitUntil: 'networkidle',
      timeout: 120000 
    });
    console.log('Navigation with networkidle completed');
  } catch (error) {
    console.log('Navigation with networkidle failed, trying with domcontentloaded...');
    await page.goto(`${TEST_URL}/contact`, { 
      waitUntil: 'domcontentloaded',
      timeout: 120000 
    });
    console.log('Navigation with domcontentloaded completed');
  }
  
  // Log page state
  await logPageState(page);
  
  // Try to find the form with different selectors
  const formSelectors = [
    'form',
    'form[action*="contact"]',
    'form[method="post"]',
    '//form',
    '//form[contains(@action, "contact")]',
    'body form',
    'main form',
    'div form',
    'form.contact-form',
    'form#contact-form'
  ];
  
  for (const selector of formSelectors) {
    try {
      console.log(`Trying to find form with selector: ${selector}`);
      const form = await page.$(selector);
      if (form) {
        console.log(`✅ Form found with selector: ${selector}`);
        await logPageState(page);
        return; // Success!
      }
    } catch (error) {
      console.log(`❌ Form not found with selector: ${selector}`);
    }
  }
  
  // If we get here, no form was found
  console.error('❌ No form found with any selector');
  await logPageState(page);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  console.log('Screenshot saved as debug-screenshot.png');
  
  // Fail the test
  throw new Error('Could not find contact form');
});
