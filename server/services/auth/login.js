// server/services/auth/login.js
import { compare } from 'bcrypt';
import pg from 'pg';
import { generateToken } from './jwt.js';

const pool = new pg.Pool({
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
});

/**
 * Authenticate a user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - User data without password if authentication succeeds
 */
export async function loginUser(email, password) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if account is locked
    const locked = await isAccountLocked(email);
    if (locked) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Find user by email
    const { rows } = await client.query(
      'SELECT * FROM users WHERE email = $1 FOR UPDATE',
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
      // Handle failed login attempt
      const result = await handleFailedLogin(email);
      
      if (result.locked) {
        const minutes = Math.ceil(result.remainingTime / 60);
        throw new Error(`Account locked. Try again in ${minutes} minutes.`);
      }
      
      throw new Error(`Invalid email or password. ${result.remainingAttempts} attempts remaining.`);
    }
    
    // Reset login attempts on successful login
    await resetLoginAttempts(email);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role || 'user'
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: process.env.JWT_ISSUER || 'skylabs-api'
      }
    );

    // Update last login time
    await client.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    await client.query('COMMIT');

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || 'user'
      },
      token,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Login error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  loginUser
};
