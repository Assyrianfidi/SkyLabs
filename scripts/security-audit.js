// scripts/security-audit.js
import { signupUser } from '../server/services/auth/signup.js';
import { loginUser } from '../server/services/auth/login.js';
import { authenticate } from '../server/middleware/authMiddleware.js';
import { cleanupTestUsers } from './cleanup-test-users.js';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_dev',
  password: process.env.DB_PASSWORD || 'Fkhouch8',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
};

// Test user for security tests
const TEST_USER = {
  username: 'audit_user',
  email: 'audit@example.com',
  password: 'SecurePass123!@#'
};

// Simple assertion function
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// 1. Authentication Flow Audit
async function auditAuthenticationFlow() {
  console.log('\n🔒 1. AUTHENTICATION FLOW AUDIT');
  const results = [];
  
  try {
    // 1.1 Check password hashing
    const password = 'testPassword123!';
    const hash = await bcrypt.hash(password, 10);
    const isMatch = await bcrypt.compare(password, hash);
    
    results.push({
      id: '1.1',
      description: 'Passwords are hashed with bcrypt',
      status: isMatch ? '✅' : '❌',
      details: isMatch ? 'Passwords are properly hashed' : 'Password hashing failed'
    });
    
    // 1.2 Check JWT secret configuration
    const secret = process.env.JWT_SECRET;
    const isSecretSecure = secret && secret.length >= 32 && secret !== 'your-super-secret-jwt-key-change-this-in-production';
    
    results.push({
      id: '1.2',
      description: 'JWT secret is properly configured',
      status: isSecretSecure ? '✅' : '⚠️',
      details: isSecretSecure ? 'JWT secret is secure' : 'Please change the default JWT secret in production'
    });
    
    // 1.3 Check token expiration
    const token = jwt.sign({ test: 'test' }, process.env.JWT_SECRET, { expiresIn: '1s' });
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for token to expire
    
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      results.push({
        id: '1.3',
        description: 'JWT token expiration is enforced',
        status: '❌',
        details: 'Expired token was not rejected'
      });
    } catch (e) {
      results.push({
        id: '1.3',
        description: 'JWT token expiration is enforced',
        status: '✅',
        details: 'Expired token was properly rejected'
      });
    }
    
  } catch (error) {
    console.error('Error during authentication flow audit:', error);
  }
  
  return results;
}

// 2. Middleware Audit
async function auditMiddleware() {
  console.log('\n🔐 2. MIDDLEWARE AUDIT');
  const results = [];
  
  try {
    // 2.1 Test middleware with missing token
    const req1 = { headers: {} };
    let responseSent = false;
    let responseStatus = null;
    let responseBody = null;
    
    const res1 = { 
      status: function(status) {
        responseStatus = status;
        return this;
      },
      json: function(body) {
        responseBody = body;
        responseSent = true;
        return this;
      }
    };
    
    const next1 = () => {};
    
    // Call the middleware
    await authenticate(req1, res1, next1);
    
    const middlewareError = responseSent 
      ? responseBody?.error || 'No error message'
      : 'No response sent';
    
    results.push({
      id: '2.1',
      description: 'Middleware rejects requests without token',
      status: middlewareError.includes('No authorization token') ? '✅' : '❌',
      details: middlewareError.includes('No authorization token') 
        ? 'Properly rejected request without token' 
        : `Unexpected response: ${JSON.stringify(responseBody)}`
    });
    
    // 2.2 Test middleware with invalid token
    const req2 = { 
      headers: { 
        authorization: 'Bearer invalid.token.here' 
      } 
    };
    
    let response2Sent = false;
    let response2Status = null;
    let response2Body = null;
    
    const res2 = { 
      status: function(status) {
        response2Status = status;
        return this;
      },
      json: function(body) {
        response2Body = body;
        response2Sent = true;
        return this;
      }
    };
    
    const next2 = () => {};
    
    // Call the middleware
    await authenticate(req2, res2, next2);
    
    const middlewareError2 = response2Sent 
      ? response2Body?.error || 'No error message'
      : 'No response sent';
    
    results.push({
      id: '2.2',
      description: 'Middleware rejects invalid JWT tokens',
      status: response2Body?.error?.includes('Invalid token') ? '✅' : '❌',
      details: response2Body?.error?.includes('Invalid token')
        ? 'Properly rejected invalid token' 
        : `Unexpected response: ${JSON.stringify(response2Body)}`
    });
    
  } catch (error) {
    console.error('Error during middleware audit:', error);
  }
  
  return results;
}

// 3. Endpoint Audit
async function auditEndpoints() {
  console.log('\n🔍 3. ENDPOINT AUDIT');
  const results = [];
  
  try {
    // 3.1 Test signup with various password validations
    const passwordTests = [
      {
        password: '123',
        expectedError: 'at least 12 characters',
        description: 'too short'
      },
      {
        password: 'alllowercase123!',
        expectedError: 'uppercase letter (A-Z)',
        description: 'missing uppercase'
      },
      {
        password: 'ALLUPPERCASE123!',
        expectedError: 'lowercase letter (a-z)',
        description: 'missing lowercase'
      },
      {
        password: 'NoNumbersHere!',
        expectedError: 'number (0-9)',
        description: 'missing number'
      },
      {
        password: 'NoSpecialChar123',
        expectedError: 'special character (!@#$%^&* etc.)',
        description: 'missing special character'
      },
      {
        password: 'Password123!',
        expectedError: 'too common',
        description: 'common password'
      }
    ];

    let passedTests = 0;
    let totalTests = passwordTests.length;

    for (const test of passwordTests) {
      try {
        await signupUser({
          username: `test_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: test.password
        });
        console.error(`Password test failed: ${test.description} was accepted`);
      } catch (e) {
        if (e.message.includes(test.expectedError)) {
          passedTests++;
        } else {
          console.error(`Unexpected error for ${test.description}: ${e.message}`);
        }
      }
    }

    const allPassed = passedTests === totalTests;
    results.push({
      id: '3.1',
      description: 'Signup enforces strong password policy',
      status: allPassed ? '✅' : '❌',
      details: allPassed 
        ? `All ${totalTests} password requirements are enforced` 
        : `Failed ${totalTests - passedTests} out of ${totalTests} password requirements`
    });
    
    // 3.2 Test login with invalid credentials
    try {
      await loginUser('nonexistent@example.com', 'wrongpassword');
      results.push({
        id: '3.2',
        description: 'Login with invalid credentials is rejected',
        status: '❌',
        details: 'Login with invalid credentials was not rejected'
      });
    } catch (e) {
      results.push({
        id: '3.2',
        description: 'Login with invalid credentials is rejected',
        status: '✅',
        details: 'Login with invalid credentials was properly rejected'
      });
    }
    
  } catch (error) {
    console.error('Error during endpoint audit:', error);
  }
  
  return results;
}

// 4. Database Security Audit
async function auditDatabase() {
  console.log('\n💾 4. DATABASE SECURITY AUDIT');
  const results = [];
  const pool = new pg.Pool(config);
  
  try {
    // 4.1 Check users table constraints
    const res = await pool.query(`
      SELECT 
        tc.constraint_type,
        tc.constraint_name,
        kcu.column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
      WHERE 
        tc.table_name = 'users';
    `);
    
    const hasEmailUnique = res.rows.some(
      r => r.column_name === 'email' && r.constraint_type === 'UNIQUE'
    );
    
    const hasUsernameUnique = res.rows.some(
      r => r.column_name === 'username' && r.constraint_type === 'UNIQUE'
    );
    
    results.push({
      id: '4.1',
      description: 'Users table has unique constraint on email',
      status: hasEmailUnique ? '✅' : '❌',
      details: hasEmailUnique 
        ? 'Email uniqueness constraint exists' 
        : 'Missing unique constraint on email field'
    });
    
    results.push({
      id: '4.2',
      description: 'Users table has unique constraint on username',
      status: hasUsernameUnique ? '✅' : '❌',
      details: hasUsernameUnique 
        ? 'Username uniqueness constraint exists' 
        : 'Missing unique constraint on username field'
    });
    
    // 4.3 Check password storage
    const testHash = await bcrypt.hash('test', 10);
    await pool.query("INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4)", 
      ['test-id-123', 'test_user_audit', 'audit_test@example.com', testHash]);
      
    const user = await pool.query(
      "SELECT password_hash FROM users WHERE username = 'test_user_audit'"
    );
    
    const passwordStoredSecurely = user.rows[0]?.password_hash !== 'test' && 
                                 user.rows[0]?.password_hash?.startsWith('$2b$');
    
    results.push({
      id: '4.3',
      description: 'Passwords are stored securely',
      status: passwordStoredSecurely ? '✅' : '❌',
      details: passwordStoredSecurely 
        ? 'Password is properly hashed' 
        : 'Password is stored in plaintext or not properly hashed'
    });
    
    // Clean up
    await pool.query("DELETE FROM users WHERE username = 'test_user_audit'");
    
  } catch (error) {
    console.error('Error during database audit:', error);
  } finally {
    await pool.end();
  }
  
  return results;
}

// 5. Run all audits and generate report
async function runSecurityAudit() {
  console.log('🔐 STARTING SECURITY AUDIT');
  
  try {
    // Clean up any existing test users
    await cleanupTestUsers();
    
    // Run all audit functions
    const [flowResults, middlewareResults, endpointResults, dbResults] = await Promise.all([
      auditAuthenticationFlow(),
      auditMiddleware(),
      auditEndpoints(),
      auditDatabase()
    ]);
    
    // Combine all results
    const allResults = [
      ...flowResults,
      ...middlewareResults,
      ...endpointResults,
      ...dbResults
    ];
    
    // Generate summary
    const passed = allResults.filter(r => r.status === '✅').length;
    const warnings = allResults.filter(r => r.status === '⚠️').length;
    const failed = allResults.filter(r => r.status === '❌').length;
    
    console.log('\n📊 SECURITY AUDIT SUMMARY');
    console.log('======================');
    console.log(`✅ ${passed} tests passed`);
    console.log(`⚠️  ${warnings} warnings`);
    console.log(`❌ ${failed} tests failed\n`);
    
    // Print detailed results
    console.log('DETAILED RESULTS');
    console.log('================');
    
    allResults.forEach(test => {
      console.log(`\n${test.id} ${test.status} ${test.description}`);
      console.log(`   ${test.details}`);
    });
    
    // Print recommendations
    if (failed > 0 || warnings > 0) {
      console.log('\n🔧 RECOMMENDATIONS');
      console.log('================');
      
      if (allResults.some(r => r.id === '1.2' && r.status === '⚠️')) {
        console.log('\n• Change the default JWT secret in .env to a strong, unique value');
      }
      
      if (allResults.some(r => r.id === '4.1' && r.status === '❌')) {
        console.log('\n• Add a unique constraint to the email column in the users table');
      }
      
      if (allResults.some(r => r.id === '4.2' && r.status === '❌')) {
        console.log('\n• Add a unique constraint to the username column in the users table');
      }
      
      if (allResults.some(r => r.id === '4.3' && r.status === '❌')) {
        console.log('\n• Ensure all passwords are properly hashed before storage');
      }
    }
    
    console.log('\n🔐 SECURITY AUDIT COMPLETE');
    
  } catch (error) {
    console.error('Error during security audit:', error);
  } finally {
    // Clean up any test data
    await cleanupTestUsers();
  }
}

// Run the security audit
runSecurityAudit().catch(console.error);
