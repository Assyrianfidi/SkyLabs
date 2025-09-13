-- Add login_attempts, lock_until, and last_login columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS login_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lock_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update existing users to set default values
UPDATE users 
SET 
  login_attempts = 0,
  lock_until = NULL,
  last_login = NULL
WHERE login_attempts IS NULL 
   OR lock_until IS NULL 
   OR last_login IS NULL;
