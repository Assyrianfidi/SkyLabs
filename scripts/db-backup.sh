#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    --dir)
      BACKUP_DIR="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>] [--dir <backup-directory>]"
      echo "  --env  Environment (staging or production), default: staging"
      echo "  --dir  Directory to store backups, default: ./backups"
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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

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

# Generate backup filename
BACKUP_FILE="${BACKUP_DIR}/${ENV}_${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_ZIP="${BACKUP_FILE}.gz"

echo -e "${YELLOW}📦 Creating database backup...${NC}"
echo -e "  Database: ${DB_NAME}"
echo -e "  Host: ${DB_HOST}:${DB_PORT}"

# Find a pod with psql installed
PSQL_POD=$(kubectl -n apps get pods -l app=skylabs -o jsonpath='{.items[0].metadata.name}')

if [ -z "$PSQL_POD" ]; then
  echo -e "${RED}❌ No running pods found for skylabs app${NC}"
  exit 1
fi

# Create backup using pg_dump inside the pod
echo -e "${YELLOW}💾 Running pg_dump...${NC}"
if ! kubectl -n apps exec "$PSQL_POD" -- bash -c "PGPASSWORD='${DB_PASS}' pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -F c -b -v -f /tmp/backup.dump" 2>/dev/null; then
  echo -e "${RED}❌ Database backup failed${NC}"
  exit 1
fi

# Copy backup file from pod to local
echo -e "${YELLOW}📤 Downloading backup...${NC}"
if ! kubectl -n apps cp "${PSQL_POD}:/tmp/backup.dump" "${BACKUP_FILE}"; then
  echo -e "${RED}❌ Failed to download backup from pod${NC}"
  exit 1
fi

# Compress the backup
echo -e "${YELLOW}🗜  Compressing backup...${NC}"
gzip -f "${BACKUP_FILE}"

# Clean up backup in the pod
kubectl -n apps exec "$PSQL_POD" -- rm -f /tmp/backup.dump

# Verify the backup
if [ -f "${BACKUP_ZIP}" ]; then
  BACKUP_SIZE=$(du -h "${BACKUP_ZIP}" | cut -f1)
  echo -e "\n${GREEN}✅ Backup created successfully!${NC}"
  echo -e "  File: ${BACKUP_ZIP}"
  echo -e "  Size: ${BACKUP_SIZE}"
  
  # Keep only the last 5 backups
  echo -e "\n${YELLOW}🧹 Cleaning up old backups...${NC}"
  (cd "$BACKUP_DIR" && ls -t ${ENV}_${DB_NAME}_*.sql.gz | tail -n +6 | xargs rm -f --)
  echo -e "✅ Kept the 5 most recent backups"
else
  echo -e "${RED}❌ Backup file not found${NC}"
  exit 1
fi

echo -e "\n${GREEN}✨ Database backup completed successfully!${NC}"
