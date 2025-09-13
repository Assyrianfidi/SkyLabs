// scripts/test-auth.js
import { signupUser } from '../server/services/auth/signup.js';
import { loginUser } from '../server/services/auth/login.js';
import { cleanupTestUsers } from './cleanup-test-users.js';

// Test user data
const TEST_USER = {
  username: 'test_auth_user',
  email: 'test_auth@example.com',
  password: 'Test@12345!',
};

async function runAuthTests() {
  console.log('🔐 Starting authentication tests...\n');
  
  try {
    // Clean up any existing test users
    console.log('🧹 Cleaning up test users...');
    await cleanupTestUsers();
    console.log('✅ Cleanup complete\n');
    
    // Test 1: User Signup
    console.log('1️⃣ Testing user signup...');
    const newUser = await signupUser(TEST_USER);
    console.log(`✅ Signup successful for user: ${newUser.username} (ID: ${newUser.id})`);
    
    // Test 2: Login with correct credentials
    console.log('\n2️⃣ Testing login with correct credentials...');
    const loggedInUser = await loginUser(TEST_USER.email, TEST_USER.password);
    console.log(`✅ Login successful for user: ${loggedInUser.username}`);
    
    // Test 3: Login with incorrect password
    console.log('\n3️⃣ Testing login with incorrect password...');
    try {
      await loginUser(TEST_USER.email, 'wrong_password');
      console.error('❌ Login should have failed with wrong password');
    } catch (error) {
      console.log(`✅ Login correctly rejected: ${error.message}`);
    }
    
    // Test 4: Login with non-existent email
    console.log('\n4️⃣ Testing login with non-existent email...');
    try {
      await loginUser('nonexistent@example.com', 'anypassword');
      console.error('❌ Login should have failed with non-existent email');
    } catch (error) {
      console.log(`✅ Login correctly rejected: ${error.message}`);
    }
    
    console.log('\n🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('\n❌ Authentication test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAuthTests();
