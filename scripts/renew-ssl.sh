#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <domain>"
  echo "Example: $0 skylabs.dev"
  exit 1
fi

DOMAIN=$1
CERT_DIR="./certs"

# Renew the certificate
echo "Renewing SSL certificate for $DOMAIN..."
sudo certbot renew \
  --cert-name "$DOMAIN" \
  --deploy-hook "systemctl reload nginx" \
  --config-dir "$CERT_DIR/letsencrypt" \
  --work-dir "$CERT_DIR/letsencrypt/work" \
  --logs-dir "$CERT_DIR/letsencrypt/logs"

# Update symlinks
echo "Updating certificate symlinks..."
ln -sf "$CERT_DIR/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/fullchain.pem"
ln -sf "$CERT_DIR/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/privkey.pem"

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

echo "✅ SSL certificate renewal complete!"
