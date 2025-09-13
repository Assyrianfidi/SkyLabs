#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build the application
echo "🔨 Building application..."
npm run build

# Create necessary directories
mkdir -p logs

# Restart the application using PM2
echo "🔄 Restarting application..."
npm run restart:prod

echo "✅ Deployment completed successfully!"
echo "📊 Check application status with: npm run status:prod"
echo "📝 View logs with: npm run logs:prod"
