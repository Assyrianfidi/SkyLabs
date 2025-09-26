#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_tool() {
  if ! command -v $1 &> /dev/null; then
    echo "Error: $1 is not installed"
    exit 1
  fi
}

# Check for required environment variables
check_env_var() {
  if [ -z "${!1}" ]; then
    echo "Error: $1 is not set"
    exit 1
  fi
}

echo -e "${YELLOW}🚀 Setting up Kubernetes environment...${NC}"

# Check for required tools
check_tool kubectl
check_tool helm
check_tool doctl
check_tool jq

# Check for required environment variables
REQUIRED_VARS=(
  "DIGITALOCEAN_ACCESS_TOKEN"
  "DIGITALOCEAN_CLUSTER_NAME"
  "DIGITALOCEAN_REGION"
  "DIGITALOCEAN_NODE_SIZE"
  "DIGITALOCEAN_MIN_NODES"
  "DIGITALOCEAN_MAX_NODES"
  "GITHUB_USERNAME"
  "GITHUB_TOKEN"
  "DOCKER_USERNAME"
  "DOCKER_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
  check_env_var "$var"
done

# Authenticate with DigitalOcean
echo -e "${YELLOW}🔑 Authenticating with DigitalOcean...${NC}"
doctl auth init --access-token "$DIGITALOCEAN_ACCESS_TOKEN"

echo -e "${YELLOW}🔍 Checking for existing cluster...${NC}"
if doctl kubernetes cluster get "$DIGITALOCEAN_CLUSTER_NAME" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Cluster already exists, skipping creation${NC}"
else
  # Create the Kubernetes cluster
  echo -e "${YELLOW}🚀 Creating Kubernetes cluster...${NC}"
  doctl kubernetes cluster create "$DIGITALOCEAN_CLUSTER_NAME" \
    --region "$DIGITALOCEAN_REGION" \
    --node-pool "name=worker-pool;size=$DIGITALOCEAN_NODE_SIZE;count=$DIGITALOCEAN_MIN_NODES;auto-scale=true;min-nodes=$DIGITALOCEAN_MIN_NODES;max-nodes=$DIGITALOCEAN_MAX_NODES;tag=worker" \
    --version "1.24.4-do.0" \
    --auto-upgrade \
    --maintenance-window "sunday=12:00"
  
  echo -e "${GREEN}✅ Kubernetes cluster created successfully!${NC}"
fi

# Configure kubectl
echo -e "${YELLOW}🔧 Configuring kubectl...${NC}"
doctl kubernetes cluster kubeconfig save "$DIGITALOCEAN_CLUSTER_NAME"

# Verify cluster access
echo -e "${YELLOW}🔍 Verifying cluster access...${NC}"
kubectl cluster-info

# Create namespaces
echo -e "${YELLOW}📦 Creating namespaces...${NC}"
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: apps
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
---
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    cert-manager.io/disable-validation: "true"
EOF

# Install cert-manager
echo -e "${YELLOW}📝 Installing cert-manager...${NC}"
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.9.1 \
  --set installCRDs=true \
  --set prometheus.enabled=false \
  --set webhook.timeoutSeconds=30

# Create Let's Encrypt ClusterIssuer
echo -e "${YELLOW}🔒 Creating Let's Encrypt ClusterIssuer...${NC}"
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
  namespace: cert-manager
spec:
  acme:
    email: admin@${DOMAIN:-example.com}
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Install ingress-nginx
echo -e "${YELLOW}🌐 Installing ingress-nginx...${NC}"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.publishService.enabled=true \
  --set controller.metrics.enabled=true \
  --set controller.service.annotations."service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol"=false \
  --set controller.service.annotations."service.beta.kubernetes.io/do-loadbalancer-hostname"="${DOMAIN:-example.com}"

# Install Prometheus Stack
echo -e "${YELLOW}📊 Installing Prometheus Stack...${NC}"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values infrastructure/monitoring-values.yaml \
  --set grafana.adminPassword="${GRAFANA_ADMIN_PASSWORD:-admin}" \
  --set prometheus.prometheusSpec.retention="30d"

# Create Docker registry secret
echo -e "${YELLOW}🐳 Creating Docker registry secret...${NC}"
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username="$DOCKER_USERNAME" \
  --docker-password="$DOCKER_PASSWORD" \
  --namespace=apps \
  --dry-run=client -o yaml | kubectl apply -f -

# Create GitHub secret for image pull
echo -e "${YELLOW}🔑 Creating GitHub secret...${NC}"
kubectl create secret generic github-token \
  --from-literal=username="$GITHUB_USERNAME" \
  --from-literal=password="$GITHUB_TOKEN" \
  --namespace=apps \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ Kubernetes setup completed successfully!${NC}"
echo -e "\nNext steps:"
echo "1. Deploy your application with: kubectl apply -f k8s/"
echo "2. Access the dashboard with: kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80"
echo "3. Login with admin/${GRAFANA_ADMIN_PASSWORD:-admin}"
