-- Connect to the database
\c skylabs_dev

-- Make skylabs the owner of the public schema
ALTER SCHEMA public OWNER TO skylabs;

-- Grant all privileges on the schema to skylabs
GRANT ALL PRIVILEGES ON SCHEMA public TO skylabs;

-- Grant all privileges on existing tables and sequences
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO skylabs;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO skylabs;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skylabs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skylabs;

-- Verify the changes
\dn+ public
\dp

-- Exit psql
\q
