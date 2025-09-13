import axios from 'axios';
import { config } from 'dotenv';
import https from 'https';

// Load environment variables
config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test@1234Secure';

// Create axios instance that doesn't reject on bad status codes
const api = axios.create({
  baseURL: BASE_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Only for testing
  validateStatus: () => true // Don't throw on HTTP error status
});

// Track rate limiting state
let rateLimitReached = false;
let rateLimitResetTime = 0;

/**
 * Test rate limiting
 */
async function testRateLimiting() {
  console.log('\n🔒 Testing rate limiting...');
  
  // Make 6 requests (5 allowed + 1 over)
  for (let i = 1; i <= 6; i++) {
    const response = await api.post('/api/auth/login', {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
    
    if (i <= 5) {
      if (response.status !== 401) {
        console.error(`❌ Request ${i}: Expected 401 but got ${response.status}`);
        return false;
      }
      console.log(`✅ Request ${i}: Got expected 401 response`);
    } else {
      if (response.status === 429) {
        rateLimitReached = true;
        rateLimitResetTime = Date.now() + (parseInt(response.headers['retry-after'] || '600') * 1000);
        console.log('✅ Rate limiting is working (got 429 after 5 attempts)');
        return true;
      } else {
        console.error(`❌ Expected 429 but got ${response.status} on request ${i}`);
        return false;
      }
    }
  }
  
  return false;
}

/**
 * Test account lockout
 */
async function testAccountLockout() {
  console.log('\n🔒 Testing account lockout...');
  
  // Reset test user
  await resetTestUser();
  
  // Make 5 failed login attempts
  for (let i = 1; i <= 5; i++) {
    const response = await api.post('/api/auth/login', {
      email: TEST_EMAIL,
      password: 'wrongpassword'
    });
    
    if (i < 5) {
      if (response.status !== 401) {
        console.error(`❌ Attempt ${i}: Expected 401 but got ${response.status}`);
        return false;
      }
      console.log(`✅ Attempt ${i}: Got expected 401 response`);
    } else {
      if (response.status === 429 && response.data.error?.includes('Account locked')) {
        console.log('✅ Account lockout is working (account locked after 5 attempts)');
        return true;
      } else {
        console.error(`❌ Expected 429 with lock message but got ${response.status}`);
        return false;
      }
    }
  }
  
  return false;
}

/**
 * Test HTTPS enforcement
 */
async function testHttpsEnforcement() {
  if (BASE_URL.startsWith('https')) {
    console.log('\n🔒 Skipping HTTPS test (already using HTTPS)');
    return true;
  }
  
  console.log('\n🔒 Testing HTTPS enforcement...');
  
  try {
    // Try HTTP request to a non-HTTPS URL
    const httpUrl = BASE_URL.replace('https://', 'http://');
    const response = await axios.get(httpUrl, { maxRedirects: 0, validateStatus: null });
    
    if (response.status === 301 || response.status === 302) {
      if (response.headers.location.startsWith('https://')) {
        console.log('✅ HTTPS enforcement is working (redirects HTTP to HTTPS)');
        return true;
      }
    }
    
    console.error('❌ HTTPS enforcement is not working as expected');
    return false;
  } catch (error) {
    console.error('❌ Error testing HTTPS enforcement:', error.message);
    return false;
  }
}

/**
 * Test security headers
 */
async function testSecurityHeaders() {
  console.log('\n🔒 Testing security headers...');
  
  const requiredHeaders = [
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'referrer-policy',
    'permissions-policy'
  ];
  
  try {
    const response = await api.get('/');
    const missingHeaders = [];
    
    for (const header of requiredHeaders) {
      if (!response.headers[header]) {
        missingHeaders.push(header);
      }
    }
    
    if (missingHeaders.length > 0) {
      console.error(`❌ Missing security headers: ${missingHeaders.join(', ')}`);
      return false;
    }
    
    console.log('✅ All required security headers are present');
    return true;
  } catch (error) {
    console.error('❌ Error testing security headers:', error.message);
    return false;
  }
}

/**
 * Test password strength validation
 */
async function testPasswordStrength() {
  console.log('\n🔒 Testing password strength validation...');
  
  const testCases = [
    { password: 'short', expected: 'at least 12 characters' },
    { password: 'alllowercase123!', expected: 'uppercase letter' },
    { password: 'ALLUPPERCASE123!', expected: 'lowercase letter' },
    { password: 'NoNumbersHere!', expected: 'number' },
    { password: 'NoSpecialChar123', expected: 'special character' },
    { password: 'Password123!', expected: 'too common' }
  ];
  
  let allPassed = true;
  
  for (const { password, expected } of testCases) {
    try {
      const response = await api.post('/api/auth/register', {
        username: 'testuser',
        email: 'test@example.com',
        password
      });
      
      if (response.status === 400 && response.data.error?.toLowerCase().includes(expected.toLowerCase())) {
        console.log(`✅ Rejected weak password (${expected})`);
      } else {
        console.error(`❌ Failed to reject weak password: ${password}\nExpected: ${expected}\nGot: ${response.data.error || response.status}`);
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Error testing password: ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Reset test user between tests
 */
async function resetTestUser() {
  // This would typically be a database operation to reset the test user
  // For now, we'll just log that we would reset the user
  console.log('ℹ️  Resetting test user...');
  // In a real test environment, you would:
  // 1. Delete the test user if it exists
  // 2. Create a new test user with known credentials
  // 3. Reset any rate limiting or lockout state
}

/**
 * Main test function
 */
async function runSecurityTests() {
  console.log('🚀 Starting security tests...');
  
  // Run tests
  const results = {
    rateLimiting: await testRateLimiting(),
    accountLockout: await testAccountLockout(),
    httpsEnforcement: await testHttpsEnforcement(),
    securityHeaders: await testSecurityHeaders(),
    passwordStrength: await testPasswordStrength()
  };
  
  // Print summary
  console.log('\n📊 Security Test Results:');
  console.log('======================');
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  }
  
  const allPassed = Object.values(results).every(Boolean);
  console.log('\n' + (allPassed ? '🎉 All security tests passed!' : '❌ Some tests failed'));
  
  return allPassed ? 0 : 1;
}

// Run the tests
runSecurityTests()
  .then(process.exit)
  .catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
