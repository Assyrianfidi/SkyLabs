-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- Add comment to table
COMMENT ON TABLE contacts IS 'Stores contact form submissions';

-- Add comments to columns
COMMENT ON COLUMN contacts.id IS 'Primary key';
COMMENT ON COLUMN contacts.name IS 'Name of the person submitting the form';
COMMENT ON COLUMN contacts.email IS 'Email address for response';
COMMENT ON COLUMN contacts.phone IS 'Phone number (optional)';
COMMENT ON COLUMN contacts.message IS 'Message content';
COMMENT ON COLUMN contacts.ip_address IS 'IP address of the submitter';
COMMENT ON COLUMN contacts.user_agent IS 'User agent string of the browser';
COMMENT ON COLUMN contacts.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN contacts.updated_at IS 'Timestamp when the record was last updated';

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
