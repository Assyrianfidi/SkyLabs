-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Create index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- Insert migration record
INSERT INTO pg_migrations (name) VALUES ('0006_create_contacts_table');
