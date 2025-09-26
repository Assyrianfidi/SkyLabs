#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
TAG="latest"
DOMAIN=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    --tag)
      TAG="$2"
      shift # past argument
      shift # past value
      ;;
    --domain)
      DOMAIN="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>] [--tag <image-tag>] [--domain <domain>]"
      echo "  --env     Environment (staging or production), default: staging"
      echo "  --tag     Docker image tag, default: latest"
      echo "  --domain  Domain name for the application, required"
      exit 0
      ;;
    *)    # unknown option
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check for required environment variables
check_env_var() {
  if [ -z "${!1}" ]; then
    echo "Error: $1 is not set"
    exit 1
  fi
}

# Check for required tools
check_tool() {
  if ! command -v $1 &> /dev/null; then
    echo "Error: $1 is not installed"
    exit 1
  fi
}

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "Error: Environment must be either 'staging' or 'production'"
  exit 1
fi

# Check for required domain
if [ -z "$DOMAIN" ]; then
  echo "Error: Domain is required. Use --domain flag"
  exit 1
fi

echo -e "${YELLOW}🚀 Deploying SkyLabs to ${ENV} environment...${NC}"

# Check for required tools
check_tool kubectl
check_tool envsubst

# Check for required environment variables
REQUIRED_VARS=(
  "DOCKER_USERNAME"
  "DATABASE_URL_BASE64"
  "SESSION_SECRET_BASE64"
  "RECAPTCHA_SITE_KEY_BASE64"
  "RECAPTCHA_SECRET_KEY_BASE64"
)

for var in "${REQUIRED_VARS[@]}"; do
  check_env_var "$var"
done

# Set Kubernetes context based on environment
KUBE_CONTEXT="do-${ENV}-cluster"
if ! kubectl config use-context "$KUBE_CONTEXT" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Context $KUBE_CONTEXT not found, using current context${NC}"
fi

# Create namespace if it doesn't exist
kubectl get namespace apps &> /dev/null || kubectl create namespace apps

# Deploy resources
echo -e "${YELLOW}📦 Applying Kubernetes manifests...${NC}"

# Export variables for envsubst
export DOCKER_USERNAME

# Process and apply each manifest
for file in k8s/*.yaml; do
  echo -e "${YELLOW}📄 Processing $file...${NC}"
  envsubst < "$file" | kubectl apply -f -
done

# Wait for deployment to complete
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
kubectl -n apps rollout status deployment/skylabs --timeout=300s

# Get the service URL
SERVICE_URL=$(kubectl -n apps get ingress skylabs -o jsonpath='{.spec.rules[0].host}')
echo -e "\n${GREEN}✅ Deployment successful!${NC}"
echo -e "\n🌐 Application URL: https://${SERVICE_URL}"
echo -e "📊 Monitoring: https://monitoring.${DOMAIN} (if configured)"

# Show pod status
echo -e "\n📊 Pod status:"
kubectl -n apps get pods -l app=skylabs

# Show service status
echo -e "\n🌐 Service status:"
kubectl -n apps get service skylabs

# Show ingress status
echo -e "\n🔗 Ingress status:"
kubectl -n apps get ingress skylabs
