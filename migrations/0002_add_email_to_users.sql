-- Add email column to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL;

-- Add unique constraint on email
ALTER TABLE users 
  ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Update migration tracking
INSERT INTO pg_migrations (name) VALUES ('0002_add_email_to_users.sql');
