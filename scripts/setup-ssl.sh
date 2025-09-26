#!/bin/bash
set -e

# Check if domain is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <domain> [email]"
  echo "Example: $0 skylabs.dev admin@skylabs.dev"
  exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}
CERT_DIR="./certs"

# Create certificates directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
  echo "Installing certbot..."
  sudo apt-get update
  sudo apt-get install -y certbot
fi

# Generate SSL certificate
sudo certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --domain "$DOMAIN" \
  --domain "www.$DOMAIN" \
  --cert-path "$CERT_DIR" \
  --key-path "$CERT_DIR" \
  --fullchain-path "$CERT_DIR" \
  --config-dir "$CERT_DIR/letsencrypt" \
  --work-dir "$CERT_DIR/letsencrypt/work" \
  --logs-dir "$CERT_DIR/letsencrypt/logs"

# Generate strong Diffie-Hellman parameters
if [ ! -f "$CERT_DIR/dhparam.pem" ]; then
  echo "Generating Diffie-Hellman parameters (this may take a while)..."
  openssl dhparam -out "$CERT_DIR/dhparam.pem" 4096
fi

# Set proper permissions
sudo chown -R $USER:$USER "$CERT_DIR"
chmod 755 "$CERT_DIR"
chmod 600 "$CERT_DIR"/*.pem

# Create symlinks for nginx
mkdir -p "./nginx/conf.d/ssl"
ln -sf "$PWD/$CERT_DIR/fullchain.pem" "./nginx/conf.d/ssl/$DOMAIN-fullchain.pem"
ln -sf "$PWD/$CERT_DIR/privkey.pem" "./nginx/conf.d/ssl/$DOMAIN-privkey.pem"
ln -sf "$PWD/$CERT_DIR/dhparam.pem" "./nginx/conf.d/ssl/dhparam.pem"

echo ""
echo "✅ SSL certificates have been generated and configured!"
echo "Certificates are located in: $CERT_DIR/"
echo ""
echo "To renew certificates automatically, add this to your crontab:"
echo "0 0 1 * * $PWD/scripts/renew-ssl.sh $DOMAIN"
