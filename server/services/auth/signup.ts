import { hash } from 'bcrypt';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_dev',
  password: process.env.DB_PASSWORD || 'Fkhouch8',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

interface UserData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

interface User extends Omit<UserData, 'password'> {
  id: string;
  created_at: Date;
  updated_at: Date;
  login_attempts: number;
  lock_until: Date | null;
  last_login: Date | null;
}

/**
 * Validates password strength
 * @param password - The password to validate
 * @throws {Error} If password doesn't meet requirements
 */
function validatePasswordStrength(password: string): void {
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
 * @param userData - User data including username, email, and password
 * @returns The created user (without password)
 */
export async function signupUser(userData: UserData): Promise<Omit<User, 'password_hash'>> {
  const { username, email, password, role = 'user' } = userData;
  const client = await pool.connect();

  try {
    validatePasswordStrength(password);
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      const existingEmail = existingUser.rows.some(row => row.email === email);
      const existingUsername = existingUser.rows.some(row => row.username === username);
      
      if (existingEmail && existingUsername) {
        throw new Error('User with this email and username already exists');
      } else if (existingEmail) {
        throw new Error('User with this email already exists');
      } else {
        throw new Error('Username is already taken');
      }
    }

    // Hash password
    const passwordHash = await hash(password, SALT_ROUNDS);
    
    // Insert new user
    const result = await client.query(
      `INSERT INTO users 
       (id, username, email, password_hash, role, created_at, updated_at, login_attempts, lock_until, last_login)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 0, NULL, NULL)
       RETURNING id, username, email, role, created_at, updated_at, login_attempts, lock_until, last_login`,
      [uuidv4(), username, email, passwordHash, role]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  signupUser
};
