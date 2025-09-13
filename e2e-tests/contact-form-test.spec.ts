import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';

test('contact form submission', async ({ page }) => {
  // Navigate to the home page
  console.log(`Navigating to ${TEST_URL}`);
  await page.goto(TEST_URL, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Find the contact form
  const contactForm = page.locator('form');
  await expect(contactForm).toBeVisible();
  
  // Fill out the form
  console.log('Filling out the contact form...');
  await contactForm.getByLabel(/name/i).fill('Test User');
  await contactForm.getByLabel(/email/i).fill('test@example.com');
  await contactForm.getByLabel(/phone/i).fill('(123) 456-7890');
  await contactForm.getByLabel(/message/i).fill('This is a test message from Playwright');
  
  // Submit the form
  console.log('Submitting the form...');
  await contactForm.getByRole('button', { name: /send message/i }).click();
  
  // Wait for form submission to complete
  await page.waitForLoadState('networkidle');
  
  // Check for success message or form reset
  const successMessage = await page.getByText(/thank you for your message/i).first().isVisible().catch(() => false);
  
  if (successMessage) {
    console.log('✅ Form submitted successfully');
  } else {
    // Check if the form was reset (another indicator of success)
    const nameValue = await contactForm.getByLabel(/name/i).inputValue();
    if (!nameValue) {
      console.log('✅ Form was reset after submission (likely successful)');
    } else {
      console.error('❌ Form submission may have failed');
      // Take a screenshot for debugging
      await page.screenshot({ path: 'form-submission.png' });
      console.log('Screenshot saved as form-submission.png');
      
      // Fail the test
      expect(successMessage).toBeTruthy();
    }
  }
});
