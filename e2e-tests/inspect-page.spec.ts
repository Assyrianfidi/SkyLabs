import { test, expect } from '@playwright/test';

// Set global test timeout to 2 minutes
test.setTimeout(120000);

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';

test('inspect contact page content', async ({ page }) => {
  // Navigate to the contact page
  console.log(`Navigating to ${TEST_URL}/contact`);
  await page.goto(`${TEST_URL}/contact`, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });

  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Get the page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get the full HTML content
  const content = await page.content();
  console.log('Page content (first 2000 chars):', content.substring(0, 2000));
  
  // Check if there are any forms on the page
  const formCount = await page.locator('form').count();
  console.log(`Number of forms found: ${formCount}`);
  
  // If forms exist, log their attributes
  if (formCount > 0) {
    const forms = await page.locator('form').all();
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const id = await form.getAttribute('id');
      const className = await form.getAttribute('class');
      const action = await form.getAttribute('action');
      const method = await form.getAttribute('method');
      console.log(`Form ${i + 1}:`);
      console.log(`  ID: ${id}`);
      console.log(`  Class: ${className}`);
      console.log(`  Action: ${action}`);
      console.log(`  Method: ${method}`);
      
      // Log form fields
      const inputs = await form.locator('input, textarea, button, select').all();
      console.log(`  Form has ${inputs.length} fields:`);
      
      for (const input of inputs) {
        const tag = await input.evaluate(el => el.tagName.toLowerCase());
        const type = await input.getAttribute('type') || 'N/A';
        const name = await input.getAttribute('name') || 'N/A';
        const id = await input.getAttribute('id') || 'N/A';
        const placeholder = await input.getAttribute('placeholder') || 'N/A';
        console.log(`    - ${tag} [type=${type}, name=${name}, id=${id}, placeholder=${placeholder}]`);
      }
    }
  }
  
  // Take a screenshot of the visible viewport
  await page.screenshot({ path: 'contact-page-screenshot.png' });
  console.log('Screenshot saved as contact-page-screenshot.png');
  
  // Save the full page HTML for inspection
  await page.evaluate(() => {
    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact-page.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  
  console.log('Page HTML saved as contact-page.html');
  
  // Check for common form container elements
  const possibleContainers = [
    'form',
    '.contact-form',
    '#contact-form',
    'form[action*="contact"]',
    'form[method="post"]',
    'form[class*="form"]',
    'form[id*="form"]',
    'div[class*="form"]',
    'div[id*="form"]',
    'section[class*="contact"]',
    'section[id*="contact"]',
    'div[class*="contact"]',
    'div[id*="contact"]'
  ];
  
  console.log('\nChecking for form containers:');
  for (const selector of possibleContainers) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✅ Found ${count} element(s) with selector: ${selector}`);
      const elements = await page.locator(selector).all();
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const id = await element.getAttribute('id') || 'N/A';
        const className = await element.getAttribute('class') || 'N/A';
        console.log(`  ${i + 1}. ${tagName} [id=${id}, class=${className}]`);
      }
    }
  }
  
  // Check for common form field names
  const commonFieldNames = [
    'name', 'email', 'phone', 'message', 'subject', 'firstname', 'lastname',
    'first_name', 'last_name', 'contact_name', 'contact-email', 'contact-phone',
    'contact_message', 'comments', 'feedback', 'enquiry'
  ];
  
  console.log('\nChecking for common form fields:');
  for (const fieldName of commonFieldNames) {
    const selector = `input[name*="${fieldName}"], textarea[name*="${fieldName}"]`;
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✅ Found field with name containing: ${fieldName}`);
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const id = await element.getAttribute('id') || 'N/A';
        const type = await element.getAttribute('type') || 'N/A';
        console.log(`  - ${tagName} [type=${type}, id=${id}]`);
      }
    }
  }
  
  // Check for submit buttons
  const submitButtons = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Send"), button:has-text("Submit")').all();
  console.log(`\nFound ${submitButtons.length} submit buttons:`);
  for (const button of submitButtons) {
    const tagName = await button.evaluate(el => el.tagName.toLowerCase());
    const type = await button.getAttribute('type') || 'N/A';
    const text = await button.innerText();
    console.log(`  - ${tagName} [type=${type}, text="${text}"]`);
  }
  
  // Check for any iframes that might contain the form
  const iframeCount = await page.locator('iframe').count();
  console.log(`\nFound ${iframeCount} iframes on the page`);
  if (iframeCount > 0) {
    const iframes = await page.locator('iframe').all();
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      const src = await iframe.getAttribute('src') || 'N/A';
      const id = await iframe.getAttribute('id') || 'N/A';
      const className = await iframe.getAttribute('class') || 'N/A';
      console.log(`  Iframe ${i + 1}: [id=${id}, class=${className}, src=${src}]`);
    }
  }
  
  // Fail the test to see the output (since we're just inspecting)
  throw new Error('Inspection complete - this is not a real test failure');
});
