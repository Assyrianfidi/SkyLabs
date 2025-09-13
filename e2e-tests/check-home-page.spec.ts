import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';

test('check home page for contact form', async ({ page }) => {
  // Navigate to the home page
  console.log(`Navigating to ${TEST_URL}`);
  await page.goto(TEST_URL, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Check for the contact form directly
  console.log('Looking for contact form...');
  const contactForm = page.locator('form');
  const formCount = await contactForm.count();
  
  if (formCount === 0) {
    console.error('❌ No contact form found on the home page');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'home-page-screenshot.png', fullPage: true });
    console.log('Screenshot saved as home-page-screenshot.png');
    
    // List all sections and their content for debugging
    const sections = await page.locator('section').all();
    console.log('Sections found on the page:');
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const heading = await section.locator('h1,h2,h3,h4,h5,h6').first().textContent().catch(() => 'No heading');
      const sectionContent = await section.textContent() || '';
      console.log(`\n--- Section ${i + 1} ---`);
      console.log(`Heading: "${heading}"`);
      console.log(`Content preview: ${sectionContent.substring(0, 200)}...`);
      
      // Check for any forms in this section
      const sectionForms = await section.locator('form').count();
      if (sectionForms > 0) {
        console.log(`✅ Found ${sectionForms} form(s) in this section`);
      }
    }
    
    // Fail the test
    expect(formCount).toBeGreaterThan(0);
  } else {
    console.log(`✅ Found ${formCount} contact form(s) on the page`);
  }
  
  // Check for form elements within the contact section
  console.log('Checking for form elements...');
  const contactSection = await page.locator('section:has(h2:has-text("Contact"))').first();
  const form = contactSection.locator('form');
  const formInputs = await form.locator('input, textarea').all();
  
  console.log(`Found ${formInputs.length} form inputs`);
  
  // Check for specific form fields
  const nameField = form.locator('input[name="name"], input[placeholder*="name" i]');
  const emailField = form.locator('input[type="email"], input[placeholder*="email" i]');
  const messageField = form.locator('textarea, input[type="text"][name*="message" i]');
  const submitButton = form.locator('button[type="submit"], input[type="submit"]');
  
  console.log('Form fields found:');
  console.log(`- Name field: ${await nameField.count() > 0 ? '✅' : '❌'}`);
  console.log(`- Email field: ${await emailField.count() > 0 ? '✅' : '❌'}`);
  console.log(`- Message field: ${await messageField.count() > 0 ? '✅' : '❌'}`);
  console.log(`- Submit button: ${await submitButton.count() > 0 ? '✅' : '❌'}`);
  
  // Verify at least one form field exists
  const totalFields = await nameField.count() + await emailField.count() + await messageField.count();
  expect(totalFields).toBeGreaterThan(0);
  
  // If we have a form, try submitting it
  if (await form.count() > 0) {
    console.log('Attempting to fill out the form...');
    
    // Fill out the form if fields are found
    if (await nameField.count() > 0) {
      await nameField.fill('Test User');
    }
    
    if (await emailField.count() > 0) {
      await emailField.fill('test@example.com');
    }
    
    if (await messageField.count() > 0) {
      await messageField.fill('This is a test message from Playwright');
    }
    
    // Submit the form if we have a submit button
    if (await submitButton.count() > 0) {
      console.log('Submitting the form...');
      await submitButton.click();
      
      // Wait for any potential form submission
      await page.waitForTimeout(2000);
      
      // Check for success/error messages
      const successMessage = await page.locator('.success-message, .alert-success, [role="alert"]:has-text("success"), [class*="success"]').first().textContent().catch(() => null);
      const errorMessage = await page.locator('.error-message, .alert-error, [role="alert"]:has-text("error"), [class*="error"]').first().textContent().catch(() => null);
      
      if (successMessage) {
        console.log(`✅ Form submitted successfully: ${successMessage}`);
      } else if (errorMessage) {
        console.error(`❌ Form submission error: ${errorMessage}`);
      } else {
        console.log('Form submitted, but no success/error message was detected');
      }
    }
  }
});
