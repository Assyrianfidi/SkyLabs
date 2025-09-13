-- Create database user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'skylabs_app') THEN
    CREATE USER skylabs_app WITH PASSWORD '${DATABASE_PASSWORD}';
  END IF;
END
$$;

-- Create databases if they don't exist
SELECT 'CREATE DATABASE skylabs_prod'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'skylabs_prod')\gexec

SELECT 'CREATE DATABASE skylabs_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'skylabs_dev')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE skylabs_prod TO skylabs_app;
GRANT ALL PRIVILEGES ON DATABASE skylabs_dev TO skylabs_app;

-- Connect to the database and grant schema privileges
\c skylabs_prod
GRANT ALL ON SCHEMA public TO skylabs_app;

\c skylabs_dev
GRANT ALL ON SCHEMA public TO skylabs_app;
