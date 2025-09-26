#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
ALERTMANAGER_NAMESPACE="monitoring"
ALERTMANAGER_POD=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>]"
      echo "  --env  Environment (staging or production), default: staging"
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

# Set Kubernetes context based on environment
KUBE_CONTEXT="do-${ENV}-cluster"
if ! kubectl config use-context "$KUBE_CONTEXT" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Context $KUBE_CONTEXT not found, using current context${NC}"
fi

# Get Alertmanager pod name
echo -e "${YELLOW}🔍 Finding Alertmanager pod...${NC}"
ALERTMANAGER_POD=$(kubectl get pods -n $ALERTMANAGER_NAMESPACE -l "app=alertmanager" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || true)

if [ -z "$ALERTMANAGER_POD" ]; then
  echo -e "${RED}❌ Alertmanager pod not found in namespace $ALERTMANAGER_NAMESPACE${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found Alertmanager pod: $ALERTMANAGER_POD${NC}"

# Create a temporary directory for alert configurations
echo -e "${YELLOW}📝 Creating alert configurations...${NC}"
TMP_DIR=$(mktemp -d)
ALERT_CONFIG_FILE="$TMP_DIR/alertmanager-config.yaml"

# Create Alertmanager configuration
cat > "$ALERT_CONFIG_FILE" << 'EOL'
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h
  receiver: 'slack'
  routes:
  - match:
      alertname: Watchdog
    receiver: 'null'
  - match:
      severity: warning
    receiver: 'slack-warning'
  - match:
      severity: critical
    receiver: 'slack-critical'

receivers:
- name: 'null'
- name: 'slack'
  slack_configs:
  - channel: '#alerts'
    send_resolved: true
    title: |-
      [{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
    text: |-
      *Alert:* {{ .CommonLabels.alertname }}
      *Severity:* {{ .CommonLabels.severity }}
      *Description:* {{ .CommonAnnotations.description }}
      *Graph:* <{{ .GeneratorURL }}|:chart_with_upwards_trend:>
      *Details:*
      {{ range .Alerts }}
        *Alert:* {{ .Labels.alertname }}
        *Summary:* {{ .Annotations.summary }}
        *Description:* {{ .Annotations.description }}
        *Runbook:* {{ .Annotations.runbook_url }}
      {{ end }}

- name: 'slack-warning'
  slack_configs:
  - channel: '#alerts-warning'
    send_resolved: true
    title: |-
      [{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
    text: |-
      *Alert:* {{ .CommonLabels.alertname }}
      *Severity:* {{ .CommonLabels.severity }}
      *Description:* {{ .CommonAnnotations.description }}
      *Graph:* <{{ .GeneratorURL }}|:chart_with_upwards_trend:>
      *Details:*
      {{ range .Alerts }}
        *Alert:* {{ .Labels.alertname }}
        *Summary:* {{ .Annotations.summary }}
        *Description:* {{ .Annotations.description }}
        *Runbook:* {{ .Annotations.runbook_url }}
      {{ end }}

- name: 'slack-critical'
  slack_configs:
  - channel: '#alerts-critical'
    send_resolved: true
    title: |-
      [{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
    text: |-
      *Alert:* {{ .CommonLabels.alertname }}
      *Severity:* {{ .CommonLabels.severity }}
      *Description:* {{ .CommonAnnotations.description }}
      *Graph:* <{{ .GeneratorURL }}|:chart_with_upwards_trend:>
      *Details:*
      {{ range .Alerts }}
        *Alert:* {{ .Labels.alertname }}
        *Summary:* {{ .Annotations.summary }}
        *Description:* {{ .Annotations.description }}
        *Runbook:* {{ .Annotations.runbook_url }}
      {{ end }}
EOL

# Create Prometheus alert rules
echo -e "${YELLOW}📝 Creating Prometheus alert rules...${NC}"
ALERT_RULES_FILE="$TMP_DIR/alert-rules.yaml"

cat > "$ALERT_RULES_FILE" << 'EOL'
groups:
- name: node.rules
  rules:
  - alert: NodeDown
    expr: up{job="node-exporter"} == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Node {{ $labels.instance }} is down"
      description: "{{ $labels.instance }} has been down for more than 5 minutes."
      runbook_url: "https://github.com/prometheus/node_exporter/tree/master/docs/alerting-rules"

  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage on {{ $labels.instance }}"
      description: "{{ $labels.instance }} memory usage is {{ $value }}%"

  - alert: HighCPUUsage
    expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100 > 90
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage on {{ $labels.instance }}"
      description: "{{ $labels.instance }} CPU usage is {{ $value }}%"

  - alert: HighDiskUsage
    expr: 100 - (node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"} * 100 / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) > 90
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "High disk usage on {{ $labels.instance }}"
      description: "{{ $labels.instance }} disk usage is {{ $value }}%"

- name: kubernetes.rules
  rules:
  - alert: KubePodCrashLooping
    expr: rate(kube_pod_container_status_restarts_total[5m]) * 60 * 5 > 0
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.pod }} is restarting frequently"
      description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} is restarting frequently ({{ $value }} times in the last 5 minutes)"

  - alert: KubePodNotReady
    expr: sum by (namespace, pod) (kube_pod_status_phase{phase=~"Pending|Unknown"}) > 0
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.pod }} is not ready"
      description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} has been in a non-ready state for more than 15 minutes"

- name: application.rules
  rules:
  - alert: HighRequestLatency
    expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le) > 1
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "High request latency on {{ $labels.instance }}"
      description: "{{ $labels.instance }} has high request latency ({{ $value }}s)"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 15m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on {{ $labels.instance }}"
      description: "{{ $labels.instance }} has high error rate ({{ $value }}%)"
EOL

# Apply Alertmanager configuration
echo -e "${YELLOW}🚀 Applying Alertmanager configuration...${NC}"
kubectl create configmap alertmanager-config \
  --from-file=alertmanager.yml="$ALERT_CONFIG_FILE" \
  --dry-run=client -o yaml | \
  kubectl apply -n $ALERTMANAGER_NAMESPACE -f -

# Apply Prometheus alert rules
echo -e "${YELLOW}🚀 Applying Prometheus alert rules...${NC}"
kubectl create configmap prometheus-alert-rules \
  --from-file=alert-rules.yml="$ALERT_RULES_FILE" \
  --dry-run=client -o yaml | \
  kubectl apply -n $ALERTMANAGER_NAMESPACE -f -

# Restart Alertmanager to apply changes
echo -e "${YELLOW}🔄 Restarting Alertmanager...${NC}"
kubectl rollout restart statefulset -n $ALERTMANAGER_NAMESPACE alertmanager-monitoring-kube-prometheus-alertmanager

# Restart Prometheus to apply alert rules
echo -e "${YELLOW}🔄 Restarting Prometheus...${NC}"
kubectl rollout restart statefulset -n $ALERTMANAGER_NAMESPACE prometheus-monitoring-kube-prometheus-prometheus

# Clean up
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -rf "$TMP_DIR"

echo -e "\n${GREEN}✅ Alerting setup completed successfully!${NC}"
echo -e "\nTo verify the configuration, you can port-forward to Alertmanager and Prometheus:"
echo -e "  kubectl -n $ALERTMANAGER_NAMESPACE port-forward svc/alertmanager-operated 9093:9093"
echo -e "  kubectl -n $ALERTMANAGER_NAMESPACE port-forward svc/prometheus-operated 9090:9090"
echo -e "\nThen visit:"
echo -e "  - Alertmanager: http://localhost:9093"
echo -e "  - Prometheus: http://localhost:9090/alerts"
