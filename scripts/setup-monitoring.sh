#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
GRAFANA_ADMIN_PASSWORD=""
SLACK_WEBHOOK_URL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift # past argument
      shift # past value
      ;;
    --grafana-password)
      GRAFANA_ADMIN_PASSWORD="$2"
      shift # past argument
      shift # past value
      ;;
    --slack-webhook)
      SLACK_WEBHOOK_URL="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      echo "Usage: $0 [--env <environment>] [--grafana-password <password>] [--slack-webhook <url>]"
      echo "  --env             Environment (staging or production), default: staging"
      echo "  --grafana-password Grafana admin password (required)"
      echo "  --slack-webhook   Slack webhook URL for alerts (optional)"
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

# Validate Grafana password
if [ -z "$GRAFANA_ADMIN_PASSWORD" ]; then
  echo -e "${YELLOW}Warning: Grafana admin password not provided. Using default password 'admin'${NC}"
  GRAFANA_ADMIN_PASSWORD="admin"
fi

# Set Kubernetes context based on environment
KUBE_CONTEXT="do-${ENV}-cluster"
if ! kubectl config use-context "$KUBE_CONTEXT" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Context $KUBE_CONTEXT not found, using current context${NC}"
fi

# Create monitoring namespace if it doesn't exist
echo -e "${YELLOW}📦 Creating monitoring namespace...${NC}"
kubectl get namespace monitoring &> /dev/null || kubectl create namespace monitoring

# Add Prometheus Community Helm repository
echo -e "${YELLOW}📦 Adding Prometheus Community Helm repository...${NC}"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create values file for kube-prometheus-stack
VALUES_FILE="/tmp/kube-prometheus-stack-values.yaml"
cat > "$VALUES_FILE" << EOF
grafana:
  adminPassword: "$GRAFANA_ADMIN_PASSWORD"
  persistence:
    enabled: true
    size: 10Gi
  ingress:
    enabled: true
    annotations:
      kubernetes.io/ingress.class: nginx
      cert-manager.io/cluster-issuer: letsencrypt-prod
    hosts:
      - monitoring.${ENV}.example.com
    tls:
      - secretName: grafana-tls
        hosts:
          - monitoring.${ENV}.example.com

prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: do-block-storage
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

alertmanager:
  config:
    global:
      resolve_timeout: 5m
    route:
      group_by: ['alertname']
      group_wait: 10s
      group_interval: 5m
      repeat_interval: 3h
      receiver: 'slack'
    receivers:
    - name: 'null'
    - name: 'slack'
      slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
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
EOF

# Install kube-prometheus-stack
echo -e "${YELLOW}🚀 Installing kube-prometheus-stack...${NC}"
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --version 41.7.1 \
  --values "$VALUES_FILE"

# Install Loki for logs
echo -e "${YELLOW}📝 Installing Loki for logs...${NC}"
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=10Gi \
  --set loki.persistence.storageClassName=do-block-storage

# Install Promtail for log collection
echo -e "${YELLOW}📝 Configuring Promtail for log collection...${NC}
cat > /tmp/promtail-values.yaml << EOF
config:
  server:
    http_listen_port: 3101
  clients:
    - url: http://loki:3100/loki/api/v1/push
  scrape_configs:
    - job_name: system
      static_configs:
        - targets:
            - localhost
          labels:
            job: varlogs
            __path__: /var/log/*log
      pipeline_stages:
        - docker: {}

    - job_name: kubernetes-pods
      kubernetes_sd_configs:
        - role: pod
      pipeline_stages:
        - docker: {}
      relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: keep
          regex: .*
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: replace
          target_label: __path__
          regex: /var/log/pods/\$(.+?)/\*\*.log
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: replace
          target_label: __path__
          regex: /var/log/pods/\$(.+?)/\*\*.log
          replacement: /var/log/pods/\$1/*.log
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: replace
          target_label: job
          regex: .*
          replacement: kubernetes-pods

    - job_name: kubernetes-pods-json
      kubernetes_sd_configs:
        - role: pod
      pipeline_stages:
        - json:
            expressions:
              log: log
              stream: stream
              time: time
        - timestamp:
            source: time
            format: RFC3339Nano
        - labels:
            stream:
        - output:
            source: log
      relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: keep
          regex: .*
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: replace
          target_label: __path__
          regex: /var/log/pods/\$(.+?)/\*\*.log
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: replace
          target_label: __path__
          regex: /var/log/pods/\$(.+?)/\*\*.log
          replacement: /var/log/pods/\$1/*.log
        - source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_maps]
          action: replace
          target_label: job
          regex: .*
          replacement: kubernetes-pods-json
EOF

helm upgrade --install promtail grafana/promtail \
  --namespace monitoring \
  --values /tmp/promtail-values.yaml

# Configure Grafana datasources and dashboards
echo -e "${YELLOW}📊 Configuring Grafana...${NC}"
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |-
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus-operated:9090
      access: proxy
      isDefault: true
    - name: Loki
      type: loki
      url: http://loki:3100
      access: proxy
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  node-exporter.json: |
    {
      "annotations": {
        "list": [
          {
            "builtIn": 1,
            "datasource": "-- Grafana --",
            "enable": true,
            "hide": true,
            "iconColor": "rgba(0, 211, 255, 1)",
            "name": "Annotations & Alerts",
            "type": "dashboard"
          }
        ]
      },
      "editable": true,
      "gnetId": 1860,
      "graphTooltip": 0,
      "id": 1,
      "links": [],
      "panels": [
        {
          "cacheTimeout": null,
          "colorBackground": false,
          "colorValue": false,
          "colors": [
            "#299c46",
            "rgba(237, 129, 40, 0.89)",
            "#d44a3a"
          ],
          "datasource": "Prometheus",
          "format": "none",
          "gauge": {
            "maxValue": 100,
            "minValue": 0,
            "show": true,
            "thresholdLabels": false,
            "thresholdMarkers": true
          },
          "gridPos": {
            "h": 4,
            "w": 6,
            "x": 0,
            "y": 0
          },
          "id": 1,
          "interval": null,
          "links": [],
          "mappingType": 1,
          "mappingTypes": [
            {
              "name": "value to text",
              "value": 1
            },
            {
              "name": "range to text",
              "value": 2
            }
          ],
          "maxDataPoints": 100,
          "nullPointMode": "connected",
          "nullText": null,
          "postfix": "",
          "postfixFontSize": "50%",
          "prefix": "",
          "prefixFontSize": "50%",
          "rangeMaps": [
            {
              "from": "null",
              "text": "N/A",
              "to": "null"
            }
          ],
          "sparkline": {
            "fillColor": "rgba(31, 118, 189, 0.18)",
            "full": false,
            "lineColor": "rgb(31, 120, 193)",
            "show": true
          },
          "tableColumn": "",
          "targets": [
            {
              "expr": "sum(rate(node_cpu_seconds_total{mode!=\"idle\",mode!=\"iowait\",mode!=\"guest\",mode!=\"guest_nice\"}[5m])) by (instance) / count(node_cpu_seconds_total{mode=\"system\"}) by (instance) * 100",
              "format": "time_series",
              "intervalFactor": 1,
              "refId": "A",
              "step": 240
            }
          ],
          "thresholds": "70,80",
          "title": "CPU Usage",
          "type": "singlestat",
          "valueFontSize": "80%",
          "valueMaps": [
            {
              "op": "=",
              "text": "N/A",
              "value": "null"
            }
          ],
          "valueName": "avg"
        }
      ],
      "refresh": "10s",
      "schemaVersion": 18,
      "style": "dark",
      "tags": [],
      "templating": {
        "list": []
      },
      "time": {
        "from": "now-6h",
        "to": "now"
      },
      "timepicker": {
        "refresh_intervals": ["5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"],
        "time_options": ["5m", "15m", "1h", "6h", "12h", "24h", "2d", "7d", "30d"]
      },
      "timezone": "browser",
      "title": "Node Exporter Full",
      "uid": "node-exporter-full",
      "version": 22
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provider
  namespace: monitoring
data:
  provider.yaml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      editable: true
      options:
        path: /etc/grafana/provisioning/dashboards
        foldersFromFilesStructure: true
EOF

# Create a script to port-forward to Grafana
echo -e "${YELLOW}📝 Creating port-forwarding script...${NC}"
cat > scripts/port-forward-grafana.sh << 'EOF'
#!/bin/bash
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
EOF
chmod +x scripts/port-forward-grafana.sh

echo -e "\n${GREEN}✅ Monitoring setup completed successfully!${NC}"
echo -e "\nTo access Grafana, run:"
echo -e "  ${YELLOW}./scripts/port-forward-grafana.sh${NC}"
echo -e "\nThen open http://localhost:3000 in your browser"
echo -e "\nGrafana credentials:"
echo -e "  Username: ${YELLOW}admin${NC}"
echo -e "  Password: ${YELLOW}${GRAFANA_ADMIN_PASSWORD}${NC}"
