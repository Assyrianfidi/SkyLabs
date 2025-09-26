#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
NAMESPACE="cache"
REDIS_PASSWORD=""
REDIS_MASTER_NODES=1
REDIS_REPLICA_NODES=1
REDIS_VERSION="6.2.6"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    --namespace)
      NAMESPACE="$2"
      shift # past argument
      shift # past value
      ;;
    --password)
      REDIS_PASSWORD="$2"
      shift # past argument
      shift # past value
      ;;
    --master-nodes)
      REDIS_MASTER_NODES="$2"
      shift # past argument
      shift # past value
      ;;
    --replica-nodes)
      REDIS_REPLICA_NODES="$2"
      shift # past argument
      shift # past value
      ;;
    --version)
      REDIS_VERSION="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>] [--namespace <namespace>] [--password <password>] [--master-nodes <count>] [--replica-nodes <count>] [--version <version>]"
      echo "  --env           Environment (staging or production), default: staging"
      echo "  --namespace     Kubernetes namespace, default: cache"
      echo "  --password      Redis password (auto-generated if not provided)"
      echo "  --master-nodes  Number of Redis master nodes, default: 1"
      echo "  --replica-nodes Number of Redis replica nodes per master, default: 1"
      echo "  --version       Redis version, default: 6.2.6"
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

# Generate a random password if not provided
if [ -z "$REDIS_PASSWORD" ]; then
  REDIS_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
  echo -e "${YELLOW}🔑 Generated Redis password: $REDIS_PASSWORD${NC}"
fi

# Set Kubernetes context based on environment
KUBE_CONTEXT="do-${ENV}-cluster"
if ! kubectl config use-context "$KUBE_CONTEXT" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Context $KUBE_CONTEXT not found, using current context${NC}"
fi

# Create namespace if it doesn't exist
echo -e "${YELLOW}📦 Creating namespace: $NAMESPACE...${NC}"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Add Bitnami Helm repository
echo -e "${YELLOW}📦 Adding Bitnami Helm repository...${NC}"
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create Redis values file
REDIS_VALUES="/tmp/redis-values-${ENV}.yaml"
cat > "$REDIS_VALUES" << EOF
## Global Docker image parameters
## Please, note that this will override the image parameters, including dependencies
##
image:
  registry: docker.io
  repository: bitnami/redis
  tag: ${REDIS_VERSION}
  ## Specify a imagePullPolicy
  ## Defaults to 'Always' if image tag is 'latest', else set to 'IfNotPresent'
  ## ref: https://kubernetes.io/docs/user-guide/images/#pre-pulling-images
  ##
  pullPolicy: IfNotPresent
  ## Optionally specify an array of imagePullSecrets.
  ## Secrets must be manually created in the namespace.
  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
  ##
  # pullSecrets:
  #   - myRegistryKeySecretName

## String to partially override redis.fullname template (will maintain the release name)
##
nameOverride: ""

## String to fully override redis.fullname template
##
fullnameOverride: ""

## Kubernetes Cluster Domain
##
clusterDomain: cluster.local

## Use password authentication
##
usePassword: true
## Redis password (both master and replica)
## Defaults to a random 10-character alphanumeric string if not set
##
password: "$REDIS_PASSWORD"

## Mount secrets as files instead of environment variables
##
usePasswordFile: false

## Configuration file for Redis
## Defaults to loading configuration from the URL https://raw.githubusercontent.com/bitnami/bitnami-docker-redis/master/6.2/debian-10/rootfs/opt/bitnami/redis/mounted-etc/redis.conf
##
config:
  ## Append only mode
  appendonly: "yes"
  ## Save DB on disk
  save: "900 1 300 10 60 10000"
  ## Max memory policy
  maxmemory-policy: allkeys-lru
  ## Max memory
  maxmemory: 512mb

## Redis Master parameters
##
master:
  ## Redis Master pod count (deployment mode)
  ##
  count: ${REDIS_MASTER_NODES}
  ## Redis Master pod resource requests and limits
  ## ref: https://kubernetes.io/docs/user-guide/compute-resources/
  ##
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m
  ## Configure extra options for Redis Master containers
  ##
  extraFlags:
    - --maxmemory 256mb
    - --maxmemory-policy allkeys-lru
  ## Redis Master pod/node affinity/taint
  ## ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity
  ##
  affinity: {}
  ## Node labels for pod assignment
  ## ref: https://kubernetes.io/docs/user-guide/node-selection/
  ##
  nodeSelector: {}
  ## Tolerations for pod assignment
  ## ref: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/
  ##
  tolerations: []
  ## Redis Master pod priorityClassName
  ##
  priorityClassName: ""
  ## Redis Master pod annotations
  ##
  podAnnotations: {}
  ## Redis Master pod labels
  ##
  podLabels: {}
  ## Redis Master pod security context
  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
  ##
  podSecurityContext:
    fsGroup: 1001
  ## Redis Master container security context
  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
  ##
  containerSecurityContext:
    runAsUser: 1001

## Redis Replicas parameters
##
replica:
  ## Redis Replicas pod count (deployment mode)
  ##
  replicaCount: ${REDIS_REPLICA_NODES}
  ## Redis Replicas pod resource requests and limits
  ## ref: https://kubernetes.io/docs/user-guide/compute-resources/
  ##
  resources:
    requests:
      memory: 128Mi
      cpu: 50m
    limits:
      memory: 256Mi
      cpu: 200m
  ## Configure extra options for Redis Replicas containers
  ##
  extraFlags:
    - --maxmemory 128mb
    - --maxmemory-policy allkeys-lru
  ## Redis Replicas pod/node affinity/taint
  ## ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity
  ##
  affinity: {}
  ## Node labels for pod assignment
  ## ref: https://kubernetes.io/docs/user-guide/node-selection/
  ##
  nodeSelector: {}
  ## Tolerations for pod assignment
  ## ref: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/
  ##
  tolerations: []
  ## Redis Replicas pod priorityClassName
  ##
  priorityClassName: ""
  ## Redis Replicas pod annotations
  ##
  podAnnotations: {}
  ## Redis Replicas pod labels
  ##
  podLabels: {}
  ## Redis Replicas pod security context
  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
  ##
  podSecurityContext:
    fsGroup: 1001
  ## Redis Replicas container security context
  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
  ##
  containerSecurityContext:
    runAsUser: 1001

## Redis service configuration
##
service:
  ## Redis service type
  ##
  type: ClusterIP
  ## Redis service port
  ##
  port: 6379
  ## Redis service port name
  ##
  portName: redis
  ## Redis service node port (only for NodePort service type)
  ##
  nodePort: ""
  ## Redis service cluster IP (only for LoadBalancer service type)
  ##
  loadBalancerIP: ""
  ## Redis service external traffic policy
  ## ref: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/#preserving-the-client-source-ip
  ##
  externalTrafficPolicy: Cluster
  ## Redis service load balancer source ranges
  ## e.g.:
  ##   - 10.0.0.0/8
  ##
  loadBalancerSourceRanges: []
  ## Redis service annotations
  ##
  annotations: {}
  ## Redis service session affinity
  ## ref: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/#ServiceSpec
  ##
  sessionAffinity: None
  ## Redis service session affinity config
  ## ref: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/#SessionAffinityConfig
  ##
  sessionAffinityConfig: {}

## Redis metrics configuration
##
metrics:
  ## Enable Prometheus metrics
  ##
  enabled: true
  ## Prometheus Exporter image
  ##
  image:
    registry: docker.io
    repository: bitnami/redis-exporter
    tag: 1.35.1
    ## Specify a imagePullPolicy
    ## Defaults to 'Always' if image tag is 'latest', else set to 'IfNotPresent'
    ## ref: https://kubernetes.io/docs/user-guide/images/#pre-pulling-images
    ##
    pullPolicy: IfNotPresent
  ## Prometheus Exporter pod resource requests and limits
  ## ref: https://kubernetes.io/docs/user-guide/compute-resources/
  ##
  resources: {}
  ## Prometheus Exporter pod/node affinity/taint
  ## ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity
  ##
  affinity: {}
  ## Node labels for pod assignment
  ## ref: https://kubernetes.io/docs/user-guide/node-selection/
  ##
  nodeSelector: {}
  ## Tolerations for pod assignment
  ## ref: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/
  ##
  tolerations: []
  ## Prometheus Exporter pod priorityClassName
  ##
  priorityClassName: ""
  ## Prometheus Exporter pod annotations
  ##
  podAnnotations: {}
  ## Prometheus Exporter pod labels
  ##
  podLabels: {}
  ## Prometheus Exporter pod security context
  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
  ##
  podSecurityContext: {}
  ## Prometheus Exporter container security context
  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
  ##
  containerSecurityContext: {}
  ## Prometheus Exporter service type
  ##
  service:
    type: ClusterIP
    port: 9121
    annotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "9121"

## Redis pod disruption budget
##
pdb:
  ## Specifies whether a pod disruption budget should be created
  ##
  create: true
  ## Min available pods (only used if pdb.create=true)
  ##
  minAvailable: 1
  ## Max unavailable pods (only used if pdb.create=true and pdb.minAvailable is not set)
  ##
  maxUnavailable: 1

## Redis pod security context
## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
##
podSecurityContext:
  fsGroup: 1001

## Redis container security context
## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
##
containerSecurityContext:
  runAsUser: 1001
  runAsNonRoot: true
  readOnlyRootFilesystem: false
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL

## Redis pod/node affinity/taint
## ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity
##
affinity: {}

## Node labels for pod assignment
## ref: https://kubernetes.io/docs/user-guide/node-selection/
##
nodeSelector: {}

## Tolerations for pod assignment
## ref: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/
##
tolerations: []

## Redis pod priority class name
##
priorityClassName: ""

## Redis pod annotations
##
podAnnotations: {}

## Redis pod labels
##
podLabels: {}

## Redis pod update strategy
## ref: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#update-strategies
##
updateStrategy:
  type: RollingUpdate

## Redis pod disruption budget
## ref: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
##
podDisruptionBudget: {}

## Redis pod termination grace period (in seconds)
##
terminationGracePeriodSeconds: 30

## Redis pod topology spread constraints
## ref: https://kubernetes.io/docs/concepts/workloads/pods/pod-topology-spread-constraints/
##
topologySpreadConstraints: []

## Redis pod security policy
## ref: https://kubernetes.io/docs/concepts/policy/pod-security-policy/
##
podSecurityPolicy:
  ## Specifies whether a pod security policy should be created
  ##
  create: false

## Redis service account
## ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
##
serviceAccount:
  ## Specifies whether a service account should be created
  ##
  create: true
  ## The name of the service account to use.
  ## If not set and create is true, a name is generated using the fullname template
  ##
  name: ""
  ## Annotations for the service account
  ##
  annotations: {}

## Redis RBAC configuration
## ref: https://kubernetes.io/docs/admin/authorization/rbac/
##
rbac:
  ## Specifies whether RBAC resources should be created
  ##
  create: true
  ## Specifies whether RBAC resources should be created for the metrics exporter
  ##
  createMetricsExporter: true

## Redis network policy
## ref: https://kubernetes.io/docs/concepts/services-networking/network-policies/
##
networkPolicy:
  ## Specifies whether a NetworkPolicy should be created
  ##
  enabled: false
  ## The Policy model to apply. When set to false, only pods with the correct
  ## client label will have network access to the port Redis is listening
  ## on. When true, Redis will accept connections from any source
  ## (with the correct destination port).
  ##
  allowExternal: true
  ## Additional rules to be added to the NetworkPolicy
  ##
  additionalRules: []

## Redis pod security context
## ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
##
securityContext:
  enabled: true
  fsGroup: 1001
  runAsUser: 1001
  runAsNonRoot: true
  readOnlyRootFilesystem: false
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL

## Redis pod liveness and readiness probes
## ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/
##
livenessProbe:
  enabled: true
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 5

readinessProbe:
  enabled: true
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 1
  successThreshold: 1
  failureThreshold: 5

## Redis pod lifecycle hooks
## ref: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
##
lifecycle: {}

## Redis pod termination message policy
## ref: https://kubernetes.io/docs/tasks/debug-application-cluster/determine-reason-pod-failure/#writing-and-reading-a-termination-message
##
terminationMessagePolicy: File

## Redis pod topology spread constraints
## ref: https://kubernetes.io/docs/concepts/workloads/pods/pod-topology-spread-constraints/
##
topologySpreadConstraints: []

## Redis pod volume mounts
##
volumeMounts: []

## Redis pod volumes
##
volumes: []

## Redis pod init containers
##
initContainers: []

## Redis pod sidecar containers
##
sidecarContainers: []

## Redis pod extra containers
##
extraContainers: []

## Redis pod extra volumes
##
extraVolumes: []

## Redis pod extra volume mounts
##
extraVolumeMounts: []

## Redis pod extra ports
##
extraPorts: []

## Redis pod extra environment variables
##
extraEnv: []

## Redis pod extra environment variables from configmaps and secrets
##
extraEnvFrom: []

## Redis pod extra pod spec
##
extraPodSpec: {}

## Redis pod extra container spec
##
extraContainerSpec: {}

## Redis pod extra init container spec
##
extraInitContainerSpec: {}

## Redis pod extra sidecar container spec
##
extraSidecarContainerSpec: {}

## Redis pod extra volume spec
##
extraVolumeSpec: {}

## Redis pod extra volume mount spec
##
extraVolumeMountSpec: {}

## Redis pod extra port spec
##
extraPortSpec: {}

## Redis pod extra env var spec
##
extraEnvSpec: {}

## Redis pod extra env from spec
##
extraEnvFromSpec: {}

## Redis pod extra pod spec
##
extraPodSpecSpec: {}

## Redis pod extra container spec
##
extraContainerSpecSpec: {}

## Redis pod extra init container spec
##
extraInitContainerSpecSpec: {}

## Redis pod extra sidecar container spec
##
extraSidecarContainerSpecSpec: {}

## Redis pod extra volume spec
##
extraVolumeSpecSpec: {}

## Redis pod extra volume mount spec
##
extraVolumeMountSpecSpec: {}

## Redis pod extra port spec
##
extraPortSpecSpec: {}

## Redis pod extra env var spec
##
extraEnvSpecSpec: {}

## Redis pod extra env from spec
##
extraEnvFromSpecSpec: {}

## Redis pod extra pod spec
##
extraPodSpecSpecSpec: {}

## Redis pod extra container spec
##
extraContainerSpecSpecSpec: {}

## Redis pod extra init container spec
##
extraInitContainerSpecSpecSpec: {}

## Redis pod extra sidecar container spec
##
extraSidecarContainerSpecSpecSpec: {}

## Redis pod extra volume spec
##
extraVolumeSpecSpecSpec: {}

## Redis pod extra volume mount spec
##
extraVolumeMountSpecSpecSpec: {}

## Redis pod extra port spec
##
extraPortSpecSpecSpec: {}

## Redis pod extra env var spec
##
extraEnvSpecSpecSpec: {}

## Redis pod extra env from spec
##
extraEnvFromSpecSpecSpec: {}

## Redis pod extra pod spec
##
extraPodSpecSpecSpecSpec: {}

## Redis pod extra container spec
##
extraContainerSpecSpecSpecSpec: {}

## Redis pod extra init container spec
##
extraInitContainerSpecSpecSpecSpec: {}

## Redis pod extra sidecar container spec
##
extraSidecarContainerSpecSpecSpecSpec: {}

## Redis pod extra volume spec
##
extraVolumeSpecSpecSpecSpec: {}

## Redis pod extra volume mount spec
##
extraVolumeMountSpecSpecSpecSpec: {}

## Redis pod extra port spec
##
extraPortSpecSpecSpecSpec: {}

## Redis pod extra env var spec
##
extraEnvSpecSpecSpecSpec: {}

## Redis pod extra env from spec
##
extraEnvFromSpecSpecSpecSpec: {}

## Redis pod extra pod spec
##
extraPodSpecSpecSpecSpecSpec: {}

## Redis pod extra container spec
##
extraContainerSpecSpecSpecSpecSpec: {}

## Redis pod extra init container spec
##
extraInitContainerSpecSpecSpecSpecSpec: {}

## Redis pod extra sidecar container spec
##
extraSidecarContainerSpecSpecSpecSpecSpec: {}

## Redis pod extra volume spec
##
extraVolumeSpecSpecSpecSpecSpec: {}

## Redis pod extra volume mount spec
##
extraVolumeMountSpecSpecSpecSpecSpec: {}

## Redis pod extra port spec
##
extraPortSpecSpecSpecSpecSpec: {}

## Redis pod extra env var spec
##
extraEnvSpecSpecSpecSpecSpec: {}

## Redis pod extra env from spec
##
extraEnvFromSpecSpecSpecSpecSpec: {}
EOF

# Install Redis
echo -e "${YELLOW}🚀 Installing Redis...${NC}"
helm upgrade --install redis bitnami/redis \
  --namespace "$NAMESPACE" \
  --version "16.5.6" \
  --values "$REDIS_VALUES"

# Create a secret with Redis connection details
kubectl create secret generic redis-connection \
  --namespace "$NAMESPACE" \
  --from-literal=REDIS_HOST=redis-master.${NAMESPACE}.svc.cluster.local \
  --from-literal=REDIS_PORT=6379 \
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
  --dry-run=client -o yaml | \
  kubectl apply -f -

# Create a script to connect to Redis
echo -e "${YELLOW}📝 Creating Redis connection script...${NC}"
cat > connect-redis.sh << EOF
#!/bin/bash
kubectl run -it --rm --restart=Never redis-cli \
  --namespace "$NAMESPACE" \
  --image docker.io/bitnami/redis:${REDIS_VERSION} \
  --env="REDIS_PASSWORD=$REDIS_PASSWORD" \
  -- redis-cli -h redis-master.${NAMESPACE}.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD"
EOF
chmod +x connect-redis.sh

echo -e "\n${GREEN}✅ Redis setup completed successfully!${NC}"
echo -e "\nRedis Connection Details:"
echo -e "  Host: ${YELLOW}redis-master.${NAMESPACE}.svc.cluster.local${NC}"
echo -e "  Port: ${YELLOW}6379${NC}"
echo -e "  Password: ${YELLOW}${REDIS_PASSWORD}${NC}"
echo -e "  Namespace: ${YELLOW}${NAMESPACE}${NC}"
echo -e "\nTo connect to Redis, run: ${YELLOW}./connect-redis.sh${NC}"
echo -e "\nTo use Redis in your application, add these environment variables:"
echo -e "  REDIS_HOST=redis-master.${NAMESPACE}.svc.cluster.local"
echo -e "  REDIS_PORT=6379"
echo -e "  REDIS_PASSWORD=${REDIS_PASSWORD}"

# Clean up
echo -e "\n${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -f "$REDIS_VALUES"
