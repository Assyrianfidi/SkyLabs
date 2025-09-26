#!/bin/bash
set -e

ENV=${1:-staging}
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
SERVICE_NAME="skylabs-$ENV"
NETWORK_NAME="skylabs-network"

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "❌ Error: Environment must be either 'staging' or 'production'"
  exit 1
fi

# Load environment variables
if [ -f ".env.$ENV" ]; then
  export $(grep -v '^#' .env.$ENV | xargs)
elif [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check for required variables
for var in DOCKERHUB_USERNAME DOCKERHUB_TOKEN; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set"
    exit 1
  done
done

echo "🚀 Deploying to $ENV environment..."

# Login to Docker Hub
echo "🔑 Logging in to Docker Hub..."
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

# Build and push the image
IMAGE_TAG="${DOCKERHUB_USERNAME}/skylabs:${ENV}-$(git rev-parse --short HEAD)"
LATEST_TAG="${DOCKERHUB_USERNAME}/skylabs:${ENV}-latest"

echo "🏗  Building Docker image..."
docker build -t "$IMAGE_TAG" -t "$LATEST_TAG" -f Dockerfile.prod .

echo "📤 Pushing image to Docker Hub..."
docker push "$IMAGE_TAG"
docker push "$LATEST_TAG"

# Deploy to the target environment
echo "🚀 Deploying to $ENV..."

# Create network if it doesn't exist
if ! docker network inspect "$NETWORK_NAME" &> /dev/null; then
  echo "🌐 Creating Docker network $NETWORK_NAME..."
  docker network create "$NETWORK_NAME"
fi

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^$SERVICE_NAME$"; then
  echo "🛑 Stopping and removing existing $SERVICE_NAME container..."
  docker stop "$SERVICE_NAME" || true
  docker rm "$SERVICE_NAME" || true
fi

# Run the new container
echo "🚀 Starting $SERVICE_NAME..."
docker run -d \
  --name "$SERVICE_NAME" \
  --network "$NETWORK_NAME" \
  -p 3000:3000 \
  --restart unless-stopped \
  -e NODE_ENV="$ENV" \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SESSION_SECRET="$SESSION_SECRET" \
  -e RECAPTCHA_SITE_KEY="$RECAPTCHA_SITE_KEY" \
  -e RECAPTCHA_SECRET_KEY="$RECAPTCHA_SECRET_KEY" \
  "$IMAGE_TAG"

# Clean up old images
echo "🧹 Cleaning up old images..."
docker image prune -f -a --filter "until=24h"

echo ""
echo "✅ Deployment to $ENV completed successfully!"
