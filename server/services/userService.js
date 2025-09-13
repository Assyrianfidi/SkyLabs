import pg from 'pg';

const pool = new pg.Pool({
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_dev',
  password: process.env.DB_PASSWORD || 'Fkhouch8',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Increment failed login attempts and lock account if necessary
 * @param {string} email - User's email
 * @returns {Promise<Object>} User data with updated login attempt info
 */
async function handleFailedLogin(email) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current login attempt data
    const result = await client.query(
      'SELECT login_attempts, lock_until FROM users WHERE email = $1 FOR UPDATE',
      [email]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    let { login_attempts, lock_until } = user;
    
    // Check if account is currently locked
    if (lock_until && lock_until > new Date()) {
      return { 
        locked: true, 
        remainingTime: Math.ceil((lock_until - new Date()) / 1000) // in seconds
      };
    }
    
    // Reset lock if it's expired
    if (lock_until && lock_until <= new Date()) {
      login_attempts = 0;
      lock_until = null;
    }
    
    // Increment failed attempts
    login_attempts += 1;
    
    // Lock account if max attempts reached
    if (login_attempts >= MAX_LOGIN_ATTEMPTS) {
      lock_until = new Date(Date.now() + LOCK_TIME);
    }
    
    // Update user record
    await client.query(
      'UPDATE users SET login_attempts = $1, lock_until = $2, updated_at = NOW() WHERE email = $3',
      [login_attempts, lock_until, email]
    );
    
    await client.query('COMMIT');
    
    return {
      locked: login_attempts >= MAX_LOGIN_ATTEMPTS,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - login_attempts,
      lockUntil: lock_until
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update login attempts:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reset login attempts after successful login
 * @param {string} email - User's email
 */
async function resetLoginAttempts(email) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(
      `UPDATE users 
       SET login_attempts = 0, 
           lock_until = NULL,
           last_login = NOW(),
           updated_at = NOW()
       WHERE email = $1`,
      [email]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to reset login attempts:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if user account is locked
 * @param {string} email - User's email
 * @returns {Promise<boolean>} True if account is locked
 */
async function isAccountLocked(email) {
  const result = await pool.query(
    'SELECT lock_until FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    return false;
  }
  
  const { lock_until } = result.rows[0];
  return lock_until && lock_until > new Date();
}

export { handleFailedLogin, resetLoginAttempts, isAccountLocked };
