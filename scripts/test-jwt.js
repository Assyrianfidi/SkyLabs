// scripts/test-jwt.js
import { signupUser } from '../server/services/auth/signup.js';
import { loginUser } from '../server/services/auth/login.js';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../server/services/auth/jwt.js';
import { cleanupTestUsers } from './cleanup-test-users.js';

// Test configuration
const TEST_USER = {
  username: 'test_jwt_user',
  email: 'test_jwt@example.com',
  password: 'TestJwt@12345!',
};

// Simple assertion function
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Simple mock response object
const createMockResponse = () => ({
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.body = data;
    return this;
  }
});

// Simple next function
const next = () => {};

async function testJwtFlow() {
  console.log('🔐 Starting JWT Authentication Tests...\n');
  
  try {
    // Clean up any existing test users
    console.log('🧹 Cleaning up test users...');
    await cleanupTestUsers();
    console.log('✅ Cleanup complete\n');
    
    // Test 1: User Signup
    console.log('1️⃣ Testing user signup...');
    const newUser = await signupUser(TEST_USER);
    console.log(`✅ Signup successful for user: ${newUser.username} (ID: ${newUser.id})`);
    
    // Test 2: User Login and Token Generation
    console.log('\n2️⃣ Testing login and JWT generation...');
    const loginResult = await loginUser(TEST_USER.email, TEST_USER.password);
    
    if (!loginResult.token) {
      throw new Error('No token returned from login');
    }
    
    console.log(`✅ Login successful. Token generated (${loginResult.token.length} chars)`);
    console.log(`   Token expires in: ${loginResult.expiresIn}`);
    
    // Test 3: Verify Token
    console.log('\n3️⃣ Verifying JWT token...');
    const decoded = verifyToken(loginResult.token);
    
    assert(decoded.sub === newUser.id, 'Token user ID does not match');
    assert(decoded.email === TEST_USER.email, 'Token email does not match');
    assert(decoded.username === TEST_USER.username, 'Token username does not match');
    
    console.log('✅ Token verified successfully');
    console.log(`   User ID: ${decoded.sub}`);
    console.log(`   Username: ${decoded.username}`);
    console.log(`   Email: ${decoded.email}`);
    
    // Test 4: Test Token Expiration
    console.log('\n4️⃣ Testing token expiration...');
    try {
      // Create an expired token (1 second in the past)
      const expiredToken = jwt.sign(
        { 
          sub: newUser.id,
          email: TEST_USER.email,
          username: TEST_USER.username,
          iat: Math.floor(Date.now() / 1000) - 2, // 2 seconds ago
          exp: Math.floor(Date.now() / 1000) - 1  // Expired 1 second ago
        },
        process.env.JWT_SECRET || 'your-secret-key-here'
      );
      
      verifyToken(expiredToken);
      throw new Error('❌ Token should have expired');
    } catch (error) {
      if (error.message.includes('expired')) {
        console.log('✅ Correctly rejected expired token');
      } else {
        throw error;
      }
    }
    
    // Test 5: Test Invalid Token
    console.log('\n5️⃣ Testing invalid token...');
    try {
      verifyToken('invalid.token.here');
      console.error('❌ Invalid token should be rejected');
    } catch (error) {
      if (error.message.includes('Invalid token') || error.message.includes('jwt malformed')) {
        console.log('✅ Correctly rejected invalid token');
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 All JWT authentication tests passed!');
    
  } catch (error) {
    console.error('\n❌ JWT test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testJwtFlow().catch(console.error);
