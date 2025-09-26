#!/bin/bash
set -e

# Default values
ENV="staging"
TAG=""

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
    *)
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

# If no tag is provided, get the previous tag from git
if [ -z "$TAG" ]; then
  echo "No tag specified. Finding previous tag..."
  TAG=$(git describe --abbrev=0 --tags `git rev-list --tags --skip=1 --max-count=1` 2>/dev/null || true)
  
  if [ -z "$TAG" ]; then
    echo "Error: No previous tag found"
    exit 1
  fi
  
  echo "Found previous tag: $TAG"
  read -p "Do you want to rollback to $TAG? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 0
  fi
fi

# Rollback deployment
echo "Rolling back $ENV to tag: $TAG"

# Stop and remove existing container
docker stop skylabs-$ENV || true
docker rm skylabs-$ENV || true

# Pull and run the previous version
docker pull $DOCKERHUB_USERNAME/skylabs:$TAG
docker run -d \
  --name skylabs-$ENV \
  -p 3000:3000 \
  -e NODE_ENV=$ENV \
  -e DATABASE_URL=$(if [ "$ENV" = "production" ]; then echo "$PRODUCTION_DATABASE_URL"; else echo "$STAGING_DATABASE_URL"; fi) \
  $DOCKERHUB_USERNAME/skylabs:$TAG

echo "Successfully rolled back $ENV to $TAG"
echo "Application is now running at: http://localhost:3000"
