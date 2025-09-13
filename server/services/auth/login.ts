import { compare } from 'bcrypt';
import { Pool } from 'pg';
import { generateToken } from './jwt.js';
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

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  login_attempts: number;
  lock_until: Date | null;
  [key: string]: any;
}

/**
 * Check if an account is locked
 */
async function isAccountLocked(email: string): Promise<boolean> {
  const result = await pool.query<{ lock_until: Date | null }>(
    'SELECT lock_until FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) return false;
  
  const { lock_until } = result.rows[0];
  if (!lock_until) return false;
  
  // Check if the lock has expired
  if (new Date() > lock_until) {
    // Reset lock if it has expired
    await pool.query(
      'UPDATE users SET lock_until = NULL, login_attempts = 0 WHERE email = $1',
      [email]
    );
    return false;
  }
  
  return true;
}

/**
 * Handle failed login attempt
 */
async function handleFailedLogin(email: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current login attempts and lock status
    const { rows } = await client.query<{ login_attempts: number }>(
      'SELECT login_attempts FROM users WHERE email = $1 FOR UPDATE',
      [email]
    );
    
    if (rows.length === 0) return;
    
    const loginAttempts = (rows[0].login_attempts || 0) + 1;
    let lockUntil = null;
    
    // Lock the account if max attempts reached
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
    
    // Update login attempts and lock status
    await client.query(
      'UPDATE users SET login_attempts = $1, lock_until = $2, updated_at = NOW() WHERE email = $3',
      [loginAttempts, lockUntil, email]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reset login attempts on successful login
 */
async function resetLoginAttempts(email: string): Promise<void> {
  await pool.query(
    'UPDATE users SET login_attempts = 0, lock_until = NULL, last_login = NOW() WHERE email = $1',
    [email]
  );
}

/**
 * Authenticate a user
 */
export async function loginUser(email: string, password: string): Promise<{
  user: Omit<User, 'password_hash'>;
  token: string;
  expiresIn: number;
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if account is locked
    const locked = await isAccountLocked(email);
    if (locked) {
      throw new Error('Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.');
    }

    // Find user by email with row-level lock
    const { rows } = await client.query<User>(
      `SELECT id, email, username, password_hash, login_attempts, lock_until, created_at, updated_at 
       FROM users 
       WHERE email = $1 
       FOR UPDATE`,
      [email]
    );
    
    if (rows.length === 0) {
      // Simulate password check timing to prevent user enumeration
      await compare(password, '$2b$10$simulatedhashforsecurity');
      throw new Error('Invalid email or password');
    }

    const user = rows[0];
    
    // Verify password
    const isMatch = await compare(password, user.password_hash);
    
    if (!isMatch) {
      await handleFailedLogin(email);
      
      // Get remaining attempts
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - ((user.login_attempts || 0) + 1);
      
      if (remainingAttempts <= 0) {
        throw new Error('Account has been locked due to too many failed login attempts. Please try again in 15 minutes.');
      }
      
      throw new Error(`Invalid email or password. ${remainingAttempts} attempts remaining.`);
    }
    
    // Reset login attempts on successful login
    await resetLoginAttempts(email);
    
    // Generate JWT token
    const { token, expiresIn } = await generateToken(user);
    
    // Remove sensitive data before sending user data
    const { password_hash, ...userWithoutPassword } = user;
    
    await client.query('COMMIT');
    
    return {
      user: userWithoutPassword,
      token,
      expiresIn
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  loginUser
};
