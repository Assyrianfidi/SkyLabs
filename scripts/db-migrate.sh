#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
COMMAND="migrate" # Default to running migrations

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    --command)
      COMMAND="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>] [--command <migrate|rollback|seed>]"
      echo "  --env     Environment (staging or production), default: staging"
      echo "  --command Command to run (migrate, rollback, seed), default: migrate"
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
  echo "Error: Environment must be either 'staging' or 'production'"
  exit 1
fi

# Validate command
if [[ "$COMMAND" != "migrate" && "$COMMAND" != "rollback" && "$COMMAND" != "seed" ]]; then
  echo "Error: Command must be 'migrate', 'rollback', or 'seed'"
  exit 1
fi

echo -e "${YELLOW}🚀 Running database ${COMMAND} for ${ENV} environment...${NC}"

# Set Kubernetes context based on environment
KUBE_CONTEXT="do-${ENV}-cluster"
if ! kubectl config use-context "$KUBE_CONTEXT" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Context $KUBE_CONTEXT not found, using current context${NC}"
fi

# Get the name of a running pod
POD_NAME=$(kubectl -n apps get pods -l app=skylabs -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo -e "${YELLOW}❌ No running pods found for skylabs app${NC}"
  exit 1
fi

# Run the appropriate command
echo -e "${YELLOW}🔧 Running ${COMMAND} on pod ${POD_NAME}...${NC}"

case "$COMMAND" in
  "migrate")
    kubectl -n apps exec "$POD_NAME" -- npm run db:migrate
    ;;
  "rollback")
    kubectl -n apps exec "$POD_NAME" -- npm run db:rollback
    ;;
  "seed")
    kubectl -n apps exec "$POD_NAME" -- npm run db:seed
    ;;
esac

echo -e "\n${GREEN}✅ Database ${COMMAND} completed successfully!${NC}"
