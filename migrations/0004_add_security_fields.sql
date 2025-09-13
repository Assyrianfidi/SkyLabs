-- Add login_attempts, lock_until, and last_login columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS login_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lock_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups on email (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update the migration tracking table
INSERT INTO migrations (name, executed_at)
VALUES ('0004_add_security_fields', NOW())
ON CONFLICT (name) DO NOTHING;
