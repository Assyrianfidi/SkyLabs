#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
BACKUP_FILE=""
FORCE="false"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    --file)
      BACKUP_FILE="$2"
      shift # past argument
      shift # past value
      ;;
    --force)
      FORCE="true"
      shift # past argument
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>] [--file <backup-file>] [--force]"
      echo "  --env   Environment (staging or production), default: staging"
      echo "  --file  Path to the backup file to restore (required)"
      echo "  --force Skip confirmation prompt"
      exit 0
      ;;
    *)    # unknown option
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo -e "${RED}Error: Environment must be either 'staging' or 'production'${NC}"
  exit 1
fi

# Validate backup file
if [ -z "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file is required. Use --file flag${NC}"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

# Set Kubernetes context based on environment
KUBE_CONTEXT="do-${ENV}-cluster"
if ! kubectl config use-context "$KUBE_CONTEXT" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Context $KUBE_CONTEXT not found, using current context${NC}"
fi

# Get database credentials from secret
echo -e "${YELLOW}🔍 Retrieving database credentials...${NC}"
DB_SECRET=$(kubectl -n apps get secret skylabs-secrets -o jsonpath='{.data}' 2>/dev/null || true)

if [ -z "$DB_SECRET" ]; then
  echo -e "${RED}❌ Database secret not found${NC}"
  exit 1
fi

# Extract database URL from secret
DB_URL_ENCODED=$(echo "$DB_SECRET" | jq -r '.DATABASE_URL // empty')

if [ -z "$DB_URL_ENCODED" ]; then
  echo -e "${RED}❌ DATABASE_URL not found in secret${NC}"
  exit 1
fi

# Decode the database URL
DB_URL=$(echo "$DB_URL_ENCODED" | base64 --decode)

# Parse database connection details
DB_USER=$(echo "$DB_URL" | sed -n 's/^postgres:\/\/\([^:]*\):.*$/\1/p')
DB_PASS=$(echo "$DB_URL" | sed -n 's/^postgres:\/\/[^:]*:\([^@]*\)@.*$/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/^postgres:\/\/[^@]*@\([^:]*\).*$/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/^.*:\([0-9]*\)\/.*$/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/^.*\/\([^?]*\).*$/\1/p')

# Display restore information
echo -e "\n${YELLOW}📋 Restore Information${NC}"
echo -e "  Environment: ${ENV}"
echo -e "  Database: ${DB_NAME}"
echo -e "  Host: ${DB_HOST}:${DB_PORT}"
echo -e "  Backup File: ${BACKUP_FILE}"
echo -e "  Force: ${FORCE}"

# Confirm before proceeding
if [ "$FORCE" != "true" ]; then
  read -p "Are you sure you want to restore this backup? This will overwrite existing data! [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
  fi
fi

# Find a pod with psql installed
PSQL_POD=$(kubectl -n apps get pods -l app=skylabs -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)

if [ -z "$PSQL_POD" ]; then
  echo -e "${RED}❌ No running pods found for skylabs app${NC}"
  exit 1
fi

# Copy backup file to pod
echo -e "${YELLOW}📤 Uploading backup to pod...${NC}"
if ! kubectl -n apps cp "${BACKUP_FILE}" "${PSQL_POD}:/tmp/restore.dump"; then
  echo -e "${RED}❌ Failed to upload backup to pod${NC}"
  exit 1
fi

# Drop and recreate the database
echo -e "${YELLOW}♻️  Preparing database...${NC}"
cat << EOF | kubectl -n apps exec -i "$PSQL_POD" -- bash -c 'cat > /tmp/cleanup.sql'
-- Disable all connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();

-- Drop and recreate database
DROP DATABASE IF EXISTS "${DB_NAME}";
CREATE DATABASE "${DB_NAME}";
\c "${DB_NAME}";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# Execute the cleanup script
echo -e "${YELLOW}🧹 Cleaning up database...${NC}"
if ! kubectl -n apps exec "$PSQL_POD" -- bash -c "PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -U ${DB_USER} -d postgres -f /tmp/cleanup.sql"; then
  echo -e "${RED}❌ Failed to clean up database${NC}"
  exit 1
fi

# Restore the backup
echo -e "${YELLOW}🔄 Restoring database from backup...${NC}"
if ! kubectl -n apps exec "$PSQL_POD" -- bash -c "PGPASSWORD='${DB_PASS}' pg_restore -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -F c -v /tmp/restore.dump"; then
  echo -e "${RED}❌ Database restore failed${NC}"
  exit 1
fi

# Clean up
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
kubectl -n apps exec "$PSQL_POD" -- rm -f /tmp/restore.dump /tmp/cleanup.sql

echo -e "\n${GREEN}✅ Database restore completed successfully!${NC}"
