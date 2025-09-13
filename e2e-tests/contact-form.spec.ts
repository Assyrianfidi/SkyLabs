import { test, expect, Page } from '@playwright/test';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Set global test timeout to 120 seconds (2 minutes)
test.setTimeout(120000);

// Load environment variables
dotenv.config();

// Test database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'skylabs',
  password: process.env.DB_PASSWORD || 'skylabs',
  database: process.env.DB_NAME || 'skylabs_dev',
};

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const ELEMENT_TIMEOUT = 60000; // 60 seconds
const NAVIGATION_TIMEOUT = 120000; // 120 seconds

// Test data
const testData = {
  name: 'Test User',
  email: TEST_EMAIL,
  phone: '1234567890',
  message: 'This is a test message',
  honeypot: 'spam-bot',
};

// Database connection helper
async function withDb(callback: (pool: Pool) => Promise<void>) {
  const pool = new Pool(dbConfig);
  try {
    await callback(pool);
  } finally {
    await pool.end();
  }
}

// Clean up test data
async function cleanupTestData(email: string) {
  await withDb(async (pool) => {
    await pool.query('DELETE FROM contacts WHERE email = $1', [email]);
  });
}

test.describe('Contact Form Tests', () => {
  // Clean up before and after all tests
  test.beforeAll(async () => {
    await cleanupTestData(testData.email);
  });

  test.afterAll(async () => {
    await cleanupTestData(testData.email);
  });

  /**
   * Helper function to wait for and fill a form field with enhanced error handling
   * @param page Playwright page instance
   * @param name Name attribute of the input field
   * @param value Value to fill in the field
   * @param type Type of the input element (default: 'input')
   */
  async function fillField(page: Page, name: string, value: string, type = 'input') {
    const selector = `${type}[name="${name}"]`;
    console.log(`Attempting to fill field: ${selector}`);
    
    try {
      // Wait for the element to be attached to the DOM
      console.log(`Waiting for selector: ${selector}`);
      await page.waitForSelector(selector, { 
        state: 'attached', 
        timeout: ELEMENT_TIMEOUT 
      });
      
      // Wait for the element to be visible and enabled
      await page.waitForSelector(selector, { 
        state: 'visible', 
        timeout: ELEMENT_TIMEOUT 
      });
      
      // Scroll the element into view
      await page.$eval(selector, (el) => el.scrollIntoView());
      
      // Clear the field first
      await page.fill(selector, '');
      
      // Type the value with a small delay between keystrokes
      await page.type(selector, value, { delay: 30 });
      
      // Verify the value was set
      const fieldValue = await page.$eval(selector, (el: HTMLInputElement | HTMLTextAreaElement) => el.value);
      if (fieldValue !== value) {
        throw new Error(`Field ${name} value not set correctly. Expected: "${value}", Got: "${fieldValue}"`);
      }
      
      console.log(`Successfully filled field: ${selector}`);
    } catch (error) {
      console.error(`Failed to interact with field: ${name}`);
      console.error('Page content:', await page.content());
      throw error;
    }
  }
  
  /**
   * Helper function to wait for and click the submit button
   * @param page Playwright page instance
   */
  async function clickSubmitButton(page: Page) {
    const buttonSelector = 'button[type="submit"]';
    console.log('Waiting for submit button to be visible...');
    
    try {
      // Wait for the button to be visible and enabled
      await page.waitForSelector(buttonSelector, { 
        state: 'visible', 
        timeout: ELEMENT_TIMEOUT 
      });
      
      // Scroll the button into view
      await page.$eval(buttonSelector, (el) => el.scrollIntoView());
      
      // Click the button
      console.log('Clicking submit button...');
      await page.click(buttonSelector);
      console.log('Submit button clicked');
    } catch (error) {
      console.error('Failed to click submit button');
      console.error('Page content:', await page.content());
      throw error;
    }
  }

  test('should successfully submit valid contact form', async ({ page }) => {
    console.log('Starting test: should successfully submit valid contact form');
    
    // Navigate to the contact page with extended timeout
    console.log(`Navigating to ${TEST_URL}/contact`);
    await page.goto(`${TEST_URL}/contact`, { 
      waitUntil: 'networkidle', 
      timeout: NAVIGATION_TIMEOUT 
    });
    
    // Wait for the form to be visible with extended timeout
    console.log('Waiting for form to be visible...');
    await page.waitForSelector('form', { 
      state: 'visible', 
      timeout: ELEMENT_TIMEOUT 
    });
    
    console.log('Form is visible, filling form fields...');
    
    // Fill in the form with proper waiting and error handling
    await fillField(page, 'name', testData.name);
    await fillField(page, 'email', testData.email);
    await fillField(page, 'phone', testData.phone);
    await fillField(page, 'message', testData.message, 'textarea');
    
    console.log('Form filled, submitting...');
    
    // Submit the form and wait for the response
    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/contact') && 
                   response.request().method() === 'POST',
        { timeout: ELEMENT_TIMEOUT }
      ),
      clickSubmitButton(page)
    ]);
    
    // Verify the response
    console.log('Verifying response...');
    expect(response.status()).toBe(200);
    
    // Verify the data was saved to the database
    console.log('Verifying database entry...');
    await withDb(async (pool) => {
      const result = await pool.query('SELECT * FROM contacts WHERE email = $1', [testData.email]);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe(testData.name);
      expect(result.rows[0].email).toBe(testData.email);
      expect(result.rows[0].phone).toBe(testData.phone);
      expect(result.rows[0].message).toBe(testData.message);
    });
    
    console.log('Test completed successfully');
  });

  test('should reject form submission with honeypot field filled', async ({ page }) => {
    console.log('Starting test: should reject form submission with honeypot field filled');
    
    // Navigate to the contact page with extended timeout
    console.log(`Navigating to ${TEST_URL}/contact`);
    await page.goto(`${TEST_URL}/contact`, { 
      waitUntil: 'networkidle', 
      timeout: NAVIGATION_TIMEOUT 
    });
    
    // Wait for the form to be visible with extended timeout
    console.log('Waiting for form to be visible...');
    await page.waitForSelector('form', { 
      state: 'visible', 
      timeout: ELEMENT_TIMEOUT 
    });
    
    console.log('Filling form fields...');
    
    // Fill in the form with proper waiting and error handling
    await fillField(page, 'name', testData.name);
    await fillField(page, 'email', testData.email);
    await fillField(page, 'phone', testData.phone);
    await fillField(page, 'message', testData.message, 'textarea');
    
    // Make honeypot field visible and fill it
    console.log('Filling honeypot field...');
    await page.evaluate(() => {
      const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement;
      if (honeypot) {
        honeypot.style.display = 'block';
      }
    });
    
    await fillField(page, 'website', testData.honeypot);
    
    console.log('Submitting form with honeypot filled...');
    await clickSubmitButton(page);
    
    // Check for success message (honeypot should be invisible to users)
    console.log('Verifying honeypot rejection...');
    await expect(page.getByText('Thank you for your message!')).toBeVisible({
      timeout: ELEMENT_TIMEOUT
    });
    
    // Verify no data was saved to the database
    console.log('Verifying no database entry was created...');
    await withDb(async (pool) => {
      const result = await pool.query('SELECT * FROM contacts WHERE email = $1', [testData.email]);
      expect(result.rows.length).toBe(0);
    });
    
    console.log('Test completed successfully');
  });
  
  test('should show validation errors for required fields', async ({ page }) => {
    console.log('Starting test: should show validation errors for required fields');
    
    // Navigate to the contact page with extended timeout
    console.log(`Navigating to ${TEST_URL}/contact`);
    await page.goto(`${TEST_URL}/contact`, { 
      waitUntil: 'networkidle', 
      timeout: NAVIGATION_TIMEOUT 
    });
    
    // Wait for the form to be visible with extended timeout
    console.log('Waiting for form to be visible...');
    await page.waitForSelector('form', { 
      state: 'visible', 
      timeout: ELEMENT_TIMEOUT 
    });
    
    // Try to submit empty form
    console.log('Attempting to submit empty form...');
    await clickSubmitButton(page);
    
    // Check for validation messages with retries
    const checkValidationMessages = async () => {
      console.log('Checking for validation messages...');
      const nameError = page.getByText('Please fill in all required fields');
      const emailError = page.getByText('Please enter a valid email');
      const messageError = page.getByText('Please fill in all required fields');
      
      // Wait for at least one error to be visible
      await expect(Promise.race([
        nameError.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT }),
        emailError.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT }),
        messageError.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT })
      ])).resolves.toBeTruthy();
    };
    
    await checkValidationMessages();
    
    // Fill with invalid email
    console.log('Filling invalid email...');
    await fillField(page, 'email', 'invalid-email');
    
    console.log('Submitting form with invalid email...');
    await clickSubmitButton(page);
    
    // Check for email validation message with retry
    console.log('Verifying email validation error...');
    await expect(async () => {
      const emailError = page.getByText('Please enter a valid email');
      await expect(emailError).toBeVisible({ timeout: ELEMENT_TIMEOUT / 2 });
    }).toPass({ 
      timeout: ELEMENT_TIMEOUT,
      intervals: [1000, 2000, 5000] // Check more frequently at first
    });
    
    console.log('Test completed successfully');
  });

  test.skip('should enforce rate limiting', async ({ browser }) => {
    // Create multiple pages to simulate multiple users
    const pages = await Promise.all(Array(6).fill(0).map(() => browser.newPage()));
    
    try {
      // Submit the form 6 times in parallel
      const submissions = pages.map(async (page, index) => {
        await page.goto(`${TEST_URL}/contact`);
        
        // Use unique email for each submission
        const testEmail = `test${index}@example.com`;
        
        await page.fill('input[name="name"]', `User ${index}`);
        await page.fill('input[name="email"]', testEmail);
        await page.fill('textarea[name="message"]', `Test message ${index}`);
        
        // Bypass reCAPTCHA in test environment
        await page.evaluate(() => {
          window['grecaptcha'] = {
            getResponse: () => 'test-recaptcha-token',
            render: () => 'test-widget-id',
            execute: () => Promise.resolve('test-recaptcha-token'),
          };
        });
        
        // Submit the form
        await page.click('button[type="submit"]');
        
        // Wait for response
        const response = await page.waitForResponse(response => 
          response.url().includes('/api/contact')
        );
        
        return {
          status: response.status(),
          body: await response.json().catch(() => ({})),
          email: testEmail
        };
      });
      
      const results = await Promise.all(submissions);
      
      // First 5 should succeed, 6th should be rate limited
      const successful = results.slice(0, 5);
      const rateLimited = results[5];
      
      // Verify successful submissions
      successful.forEach(result => {
        expect(result.status).toBe(201);
        expect(result.body.success).toBe(true);
      });
      
      // Verify rate limited submission
      expect(rateLimited.status).toBe(429);
      expect(rateLimited.body.error).toContain('Too many requests');
      
    } finally {
      // Clean up test data
      await Promise.all(pages.map(page => page.close()));
      await withDb(async (pool) => {
        await pool.query('DELETE FROM contacts WHERE email LIKE $1', ['test%@example.com']);
      });
    }
  });

  test('should submit form successfully with valid data', async ({ page }) => {
    await page.goto(`${TEST_URL}/contact`);
    
    // Fill in the form
    await page.fill('input[name="name"]', testData.name);
    await page.fill('input[name="email"]', testData.email);
    await page.fill('input[name="phone"]', testData.phone);
    await page.fill('textarea[name="message"]', testData.message);
    
    // Bypass reCAPTCHA in test environment
    await page.evaluate(() => {
      window['grecaptcha'] = {
        getResponse: () => 'test-recaptcha-token',
        render: () => 'test-widget-id',
        execute: () => Promise.resolve('test-recaptcha-token'),
      };
    });
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForSelector('.text-green-600');
    const successMessage = await page.textContent('.text-green-600');
    expect(successMessage).toContain('Message sent successfully');
    
    // Verify data was saved to the database
    await withDb(async (pool) => {
      const result = await pool.query('SELECT * FROM contacts WHERE email = $1', [testData.email]);
      expect(result.rows.length).toBe(1);
      const contact = result.rows[0];
      expect(contact.name).toBe(testData.name);
      expect(contact.email).toBe(testData.email);
      expect(contact.phone).toBe(testData.phone);
      expect(contact.message).toBe(testData.message);
    });
  });
});
