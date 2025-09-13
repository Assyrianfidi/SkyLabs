// server/services/auth/signup.js
import { hash } from 'bcrypt';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @throws {Error} If password doesn't meet requirements
 */
function validatePasswordStrength(password) {
  // Check for common passwords first
  const commonPasswords = [
    'password', '123456', '12345678', '123456789', '1234567890',
    'qwerty', 'abc123', 'letmein', 'welcome', 'admin123', 'password1',
    'Password123', 'Password123!', 'Qwerty123!', 'Qwerty12345!', 'Qwerty12345!@#'
  ];
  
  if (commonPasswords.includes(password)) {
    throw new Error('This password is too common and not secure. Please choose a stronger password.');
  }

  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter (A-Z)');
  }
  
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter (a-z)');
  }
  
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number (0-9)');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Password must contain at least one special character (!@#$%^&* etc.)');
  }
}

const SALT_ROUNDS = 10;

/**
 * Sign up a new user
 * @param {Object} userData - User data including username, email, and password
 * @returns {Promise<Object>} - The created user (without password)
 */
export async function signupUser(userData) {
  const { username, email, password } = userData;
  
  // Validate password strength
  validatePasswordStrength(password);
  const pool = new pg.Pool({
    user: 'skylabs',
    host: 'localhost',
    database: 'skylabs_dev',
    password: 'Fkhouch8',
    port: 5432,
    ssl: false
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      throw new Error('User with this email or username already exists');
    }
    
    // Hash password
    const hashedPassword = await hash(password, SALT_ROUNDS);
    
    // Create user
    const result = await client.query(
      `INSERT INTO users (
        id, username, email, password_hash
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, created_at`,
      [uuidv4(), username, email, hashedPassword]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    // Re-throw with more context if needed
    if (!error.message.includes('already exists')) {
      console.error('Signup error:', error);
      error.message = 'Failed to create user';
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export default {
  signupUser
};
