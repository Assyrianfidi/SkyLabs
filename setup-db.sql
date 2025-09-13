-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE skylabs_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'skylabs_dev')\gexec

-- Connect to the database
\c skylabs_dev

-- Create the user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'skylabs') THEN
        CREATE USER skylabs WITH PASSWORD 'skylabs_password';
    END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE skylabs_dev TO skylabs;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO skylabs;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO skylabs;

-- Make sure the user has all necessary privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skylabs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skylabs;

-- Verify the setup
\du skylabs*
\l skylabs_dev*
