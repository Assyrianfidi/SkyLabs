#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
DOMAIN=""
BUCKET_NAME=""
REGION="nyc3"
PROVIDER="digitalocean"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    --domain)
      DOMAIN="$2"
      shift # past argument
      shift # past value
      ;;
    --bucket)
      BUCKET_NAME="$2"
      shift # past argument
      shift # past value
      ;;
    --region)
      REGION="$2"
      shift # past argument
      shift # past value
      ;;
    --provider)
      PROVIDER="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>] [--domain <domain>] [--bucket <bucket-name>] [--region <region>] [--provider <aws|digitalocean|gcp>]"
      echo "  --env      Environment (staging or production), default: staging"
      echo "  --domain   Domain name for the CDN (required)"
      echo "  --bucket   Name of the storage bucket (default: <domain>-assets-<env>)"
      echo "  --region   Cloud provider region (default: nyc3)"
      echo "  --provider Cloud provider (aws, digitalocean, gcp), default: digitalocean"
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

# Validate domain
if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Error: Domain is required. Use --domain flag${NC}"
  exit 1
fi

# Set default bucket name if not provided
if [ -z "$BUCKET_NAME" ]; then
  BUCKET_NAME="${DOMAIN//./-}-assets-${ENV}"
fi

# Validate provider
if [[ "$PROVIDER" != "aws" && "$PROVIDER" != "digitalocean" && "$PROVIDER" != "gcp" ]]; then
  echo -e "${RED}Error: Provider must be 'aws', 'digitalocean', or 'gcp'${NC}"
  exit 1
fi

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Install required tools
install_tools() {
  if ! command_exists doctl && [ "$PROVIDER" == "digitalocean" ]; then
    echo -e "${YELLOW}Installing DigitalOcean CLI...${NC}"
    curl -sL https://github.com/digitalocean/doctl/releases/download/v1.66.0/doctl-1.66.0-linux-amd64.tar.gz | tar -xzv
    sudo mv doctl /usr/local/bin/
  fi

  if ! command_exists aws && [ "$PROVIDER" == "aws" ]; then
    echo -e "${YELLOW}Installing AWS CLI...${NC}"
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
  fi

  if ! command_exists gcloud && [ "$PROVIDER" == "gcp" ]; then
    echo -e "${YELLOW}Installing Google Cloud SDK...${NC}"
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    sudo apt-get install apt-transport-https ca-certificates gnupg
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
    sudo apt-get update && sudo apt-get install google-cloud-sdk
  fi
}

# Setup CDN based on provider
setup_cdn() {
  case "$PROVIDER" in
    "digitalocean")
      setup_digitalocean_cdn
      ;;
    "aws")
      setup_aws_cdn
      ;;
    "gcp")
      setup_gcp_cdn
      ;;
  esac
}

# Setup DigitalOcean Spaces CDN
setup_digitalocean_cdn() {
  echo -e "${YELLOW}🚀 Setting up DigitalOcean Spaces CDN...${NC}"
  
  # Check if doctl is authenticated
  if ! doctl account get &> /dev/null; then
    echo -e "${YELLOW}⚠️  doctl not authenticated. Please run 'doctl auth init'${NC}"
    exit 1
  fi

  # Create the space if it doesn't exist
  if ! doctl spaces list | grep -q "$BUCKET_NAME"; then
    echo -e "${YELLOW}📦 Creating Space: $BUCKET_NAME in $REGION...${NC}"
    doctl spaces create "$BUCKET_NAME" --region "$REGION"
  else
    echo -e "${YELLOW}ℹ️  Space $BUCKET_NAME already exists${NC}"
  fi

  # Set bucket policy to public
  echo -e "${YELLOW}🔒 Setting bucket policy to public...${NC}"
  cat > /tmp/policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

  doctl spaces acl set --access-type public-read "$BUCKET_NAME"
  
  # Create CNAME record for the CDN
  CDN_ENDPOINT="${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com"
  echo -e "${YELLOW}🌐 CDN Endpoint: $CDN_ENDPOINT${NC}"
  
  # Create a script to upload assets
  create_upload_script "s3" "${BUCKET_NAME}" "${REGION}.digitaloceanspaces.com"
}

# Setup AWS CloudFront CDN
setup_aws_cdn() {
  echo -e "${YELLOW}🚀 Setting up AWS CloudFront CDN...${NC}"
  
  # Create S3 bucket
  if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo -e "${YELLOW}📦 Creating S3 bucket: $BUCKET_NAME in $REGION...${NC}"
    aws s3api create-bucket \
      --bucket "$BUCKET_NAME" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  else
    echo -e "${YELLOW}ℹ️  S3 bucket $BUCKET_NAME already exists${NC}"
  fi

  # Set bucket policy to public
  echo -e "${YELLOW}🔒 Setting bucket policy to public...${NC}"
  cat > /tmp/policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

  aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy file:///tmp/policy.json

  # Enable static website hosting
  aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document error.html
  
  # Create CloudFront distribution
  echo -e "${YELLOW}☁️  Creating CloudFront distribution...${NC}"
  DISTRIBUTION_CONFIG="\
  {
    \"CallerReference\": \"$BUCKET_NAME-$(date +%s)\",
    \"Aliases\": {\"Quantity\": 1, \"Items\": [\"cdn.$DOMAIN\"]},
    \"DefaultRootObject\": \"index.html\",
    \"Origins\": {\"Quantity\": 1, \"Items\": [{\"Id\":\"S3-$BUCKET_NAME\",\"DomainName\":\"$BUCKET_NAME.s3.$REGION.amazonaws.com\",\"S3OriginConfig\":{\"OriginAccessIdentity\":\"\"}}]},
    \"DefaultCacheBehavior\": {\"TargetOriginId\":\"S3-$BUCKET_NAME\",\"ViewerProtocolPolicy\":\"redirect-to-https\",\"AllowedMethods\":{\"Quantity\":2,\"Items\":[\"HEAD\",\"GET\"],\"CachedMethods\":{\"Quantity\":2,\"Items\":[\"HEAD\",\"GET\"]}},\"ForwardedValues\":{\"QueryString\":false,\"Cookies\":{\"Forward\":\"none\"},\"Headers\":{\"Quantity\":0}},\"MinTTL\":0},
    \"Comment\":\"CDN for $DOMAIN ($ENV)\",
    \"Enabled\":true
  }"
  
  DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config "$DISTRIBUTION_CONFIG" --query 'Distribution.Id' --output text)
  
  # Create a script to upload assets
  create_upload_script "s3" "${BUCKET_NAME}" "s3.${REGION}.amazonaws.com"
  
  echo -e "${GREEN}✅ AWS CloudFront CDN setup complete!${NC}"
  echo -e "\nNext steps:"
  echo "1. Create a CNAME record for cdn.$DOMAIN pointing to $DISTRIBUTION_ID.cloudfront.net"
  echo "2. Run the upload script: ./upload-assets.sh"
}

# Setup Google Cloud CDN
setup_gcp_cdn() {
  echo -e "${YELLOW}🚀 Setting up Google Cloud CDN...${NC}"
  
  # Check if gcloud is authenticated
  if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' &> /dev/null; then
    echo -e "${YELLOW}⚠️  gcloud not authenticated. Please run 'gcloud auth login'${NC}"
    exit 1
  fi

  # Set the project
  read -p "Enter your GCP project ID: " GCP_PROJECT
  gcloud config set project "$GCP_PROJECT"
  
  # Create the bucket
  echo -e "${YELLOW}📦 Creating Google Cloud Storage bucket: $BUCKET_NAME...${NC}"
  gsutil mb -l "$REGION" "gs://$BUCKET_NAME/"
  
  # Set bucket policy to public
  echo -e "${YELLOW}🔒 Setting bucket policy to public...${NC}"
  gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME"
  gsutil defacl set public-read "gs://$BUCKET_NAME"
  
  # Create a load balancer and CDN
  echo -e "${YELLOW}☁️  Creating Cloud CDN...${NC}"
  
  # Create a backend bucket
  gcloud compute backend-buckets create "${BUCKET_NAME}-backend" \
    --gcs-bucket-name="$BUCKET_NAME" \
    --enable-cdn
  
  # Create a URL map
  gcloud compute url-maps create "${BUCKET_NAME}-cdn" \
    --default-backend-bucket="${BUCKET_NAME}-backend"
  
  # Create a target HTTP proxy
  gcloud compute target-http-proxies create "${BUCKET_NAME}-http-proxy" \
    --url-map "${BUCKET_NAME}-cdn"
  
  # Create a global forwarding rule
  gcloud compute forwarding-rules create "${BUCKET_NAME}-http-rule" \
    --target-http-proxy "${BUCKET_NAME}-http-proxy" \
    --global \
    --ports 80
  
  # Get the IP address
  IP_ADDRESS=$(gcloud compute forwarding-rules describe "${BUCKET_NAME}-http-rule" --global --format='value(IPAddress)')
  
  # Create a script to upload assets
  create_upload_script "gs" "${BUCKET_NAME}" "storage.googleapis.com"
  
  echo -e "${GREEN}✅ Google Cloud CDN setup complete!${NC}"
  echo -e "\nNext steps:"
  echo "1. Create a DNS A record for cdn.$DOMAIN pointing to $IP_ADDRESS"
  echo "2. Run the upload script: ./upload-assets.sh"
}

# Create a script to upload assets to the CDN
create_upload_script() {
  local PROTOCOL=$1
  local BUCKET=$2
  local ENDPOINT=$3
  
  cat > upload-assets.sh << EOF
#!/bin/bash
set -e

echo "Uploading static assets to ${PROTOCOL}://${BUCKET}.${ENDPOINT}..."

# Upload with cache control for different file types
find ./dist -type f -not -name "*.html" -not -name "*.json" | while read file; do
  if [[ "$file" == *.js ]] || [[ "$file" == *.css ]] || [[ "$file" == *.svg ]]; then
    # Long cache for hashed assets
    ${PROTOCOL}cmd -m cp -z js,css,svg "$file" "${PROTOCOL}://${BUCKET}.${ENDPOINT}/"
    ${PROTOCOL}cmd setmeta "${PROTOCOL}://${BUCKET}.${ENDPOINT}/${file#./dist/}" "Cache-Control:public, max-age=31536000, immutable"
  else
    # Shorter cache for other assets
    ${PROTOCOL}cmd cp "$file" "${PROTOCOL}://${BUCKET}.${ENDPOINT}/"
    ${PROTOCOL}cmd setmeta "${PROTOCOL}://${BUCKET}.${ENDPOINT}/${file#./dist/}" "Cache-Control:public, max-age=86400"
  fi
done

# Upload HTML files with no-cache
find ./dist -type f \( -name "*.html" -o -name "*.json" \) | while read file; do
  ${PROTOCOL}cmd cp "$file" "${PROTOCOL}://${BUCKET}.${ENDPOINT}/"
  ${PROTOCOL}cmd setmeta "${PROTOCOL}://${BUCKET}.${ENDPOINT}/${file#./dist/}" "Cache-Control:no-cache, no-store, must-revalidate"
done

echo "Upload complete!"
echo "CDN URL: ${PROTOCOL}://${BUCKET}.${ENDPOINT}"
EOF

  chmod +x upload-assets.sh
  echo -e "${GREEN}✅ Created upload script: ./upload-assets.sh${NC}"
}

# Main execution
install_tools
setup_cdn

echo -e "\n${GREEN}✅ CDN setup completed successfully!${NC}"
echo -e "\nTo upload your assets, run:"
echo -e "  ${YELLOW}./upload-assets.sh${NC}"
echo -e "\nThen update your application to use the CDN URLs."
