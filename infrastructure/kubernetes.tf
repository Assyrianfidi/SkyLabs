# Create a Kubernetes cluster
resource "digitalocean_kubernetes_cluster" "skylabs" {
  name    = "skylabs-${var.environment}"
  region  = var.region
  version = data.digitalocean_kubernetes_versions.stable.latest_version
  
  # This node pool is for system workloads
  node_pool {
    name       = "system-pool"
    size       = var.k8s_node_size
    node_count = var.k8s_min_nodes
    
    # Add taints and labels for system workloads
    taint {
      key    = "CriticalAddonsOnly"
      value  = "true"
      effect = "NoSchedule"
    }
    
    labels = {
      "node-role.kubernetes.io/system" = "true"
    }
  }
  
  # This node pool is for application workloads
  node_pool {
    name       = "app-pool"
    size       = var.k8s_node_size
    node_count = var.environment == "production" ? var.k8s_min_nodes * 2 : var.k8s_min_nodes
    
    # Enable auto-scaling in production
    dynamic "auto_scale" {
      for_each = var.environment == "production" ? [1] : []
      content {
        min_nodes = var.k8s_min_nodes
        max_nodes = var.k8s_max_nodes
      }
    }
    
    labels = {
      "node-role.kubernetes.io/app" = "true"
    }
  }
  
  # Enable monitoring
  maintenance_policy {
    day        = "sunday"
    start_time = "04:00"
  }
  
  # Enable auto-upgrade for the cluster
  auto_upgrade = true
}

# Configure kubectl
provider "kubernetes" {
  host  = digitalocean_kubernetes_cluster.skylabs.endpoint
  token = digitalocean_kubernetes_cluster.skylabs.kube_config[0].token
  cluster_ca_certificate = base64decode(
    digitalocean_kubernetes_cluster.skylabs.kube_config[0].cluster_ca_certificate
  )
}

# Create namespaces
resource "kubernetes_namespace" "apps" {
  metadata {
    name = "apps"
  }
}

resource "kubernetes_namespace" "monitoring" {
  count = var.enable_monitoring ? 1 : 0
  
  metadata {
    name = "monitoring"
  }
}

# Create a secret for the database connection
resource "kubernetes_secret" "database" {
  metadata {
    name      = "database-credentials"
    namespace = kubernetes_namespace.apps.metadata[0].name
  }
  
  data = {
    DATABASE_URL = "postgres://${var.database_username}:${var.database_password}@${var.database_host}:${var.database_port}/${var.database_name}?sslmode=require"
  }
  
  type = "Opaque"
}

# Create a secret for application environment variables
resource "kubernetes_secret" "app_env" {
  metadata {
    name      = "app-environment"
    namespace = kubernetes_namespace.apps.metadata[0].name
  }
  
  data = {
    NODE_ENV           = var.environment
    SESSION_SECRET     = var.session_secret
    RECAPTCHA_SITE_KEY = var.recaptcha_site_key
    # Add other environment variables as needed
  }
  
  type = "Opaque"
}

# Deploy the application using Helm
resource "helm_release" "skylabs" {
  name       = "skylabs"
  namespace  = kubernetes_namespace.apps.metadata[0].name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "node"
  version    = "15.2.4"
  
  set {
    name  = "image.repository"
    value = "${var.docker_registry}/skylabs"
  }
  
  set {
    name  = "image.tag"
    value = var.app_version
  }
  
  set {
    name  = "replicaCount"
    value = var.environment == "production" ? 3 : 1
  }
  
  # Configure environment variables from secrets
  dynamic "set" {
    for_each = {
      for k, v in kubernetes_secret.app_env.data : k => v
      if k != "NODE_ENV" # Skip NODE_ENV as it's set differently
    }
    
    content {
      name  = "env.${set.key}"
      value = set.value
    }
  }
  
  # Configure database connection
  set {
    name  = "env.DATABASE_URL"
    value = kubernetes_secret.database.data["DATABASE_URL"]
  }
  
  # Configure resources
  set {
    name  = "resources.requests.cpu"
    value = "100m"
  }
  
  set {
    name  = "resources.requests.memory"
    value = "256Mi"
  }
  
  set {
    name  = "resources.limits.cpu"
    value = "500m"
  }
  
  set {
    name  = "resources.limits.memory"
    value = "1Gi"
  }
  
  # Configure liveness and readiness probes
  set {
    name  = "livenessProbe.enabled"
    value = "true"
  }
  
  set {
    name  = "livenessProbe.initialDelaySeconds"
    value = "30"
  }
  
  set {
    name  = "readinessProbe.enabled"
    value = "true"
  }
  
  set {
    name  = "readinessProbe.initialDelaySeconds"
    value = "5"
  }
  
  # Configure autoscaling
  dynamic "set" {
    for_each = var.environment == "production" ? [1] : []
    
    content {
      name  = "autoscaling.enabled"
      value = "true"
    }
  }
  
  dynamic "set" {
    for_each = var.environment == "production" ? [1] : []
    
    content {
      name  = "autoscaling.minReplicas"
      value = "2"
    }
  }
  
  dynamic "set" {
    for_each = var.environment == "production" ? [1] : []
    
    content {
      name  = "autoscaling.maxReplicas"
      value = "10"
    }
  }
  
  dynamic "set" {
    for_each = var.environment == "production" ? [1] : []
    
    content {
      name  = "autoscaling.targetCPUUtilizationPercentage"
      value = "80"
    }
  }
  
  # Configure ingress
  set {
    name  = "ingress.enabled"
    value = "true"
  }
  
  set {
    name  = "ingress.hostname"
    value = var.environment == "production" ? var.domain : "${var.environment}.${var.domain}"
  }
  
  set {
    name  = "ingress.annotations.cert-manager\.io/cluster-issuer"
    value = "letsencrypt-prod"
  }
  
  set {
    name  = "ingress.tls[0].hosts[0]"
    value = var.environment == "production" ? var.domain : "${var.environment}.${var.domain}"
  }
  
  set {
    name  = "ingress.tls[0].secretName"
    value = "skylabs-tls"
  }
  
  depends_on = [
    kubernetes_namespace.apps,
    kubernetes_secret.database,
    kubernetes_secret.app_env
  ]
}

# Deploy monitoring stack if enabled
resource "helm_release" "monitoring" {
  count = var.enable_monitoring ? 1 : 0
  
  name       = "monitoring"
  namespace  = kubernetes_namespace.monitoring[0].metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "35.5.1"
  
  values = [
    file("${path.module}/monitoring-values.yaml")
  ]
  
  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }
  
  set {
    name  = "prometheus.prometheusSpec.retention"
    value = "30d"
  }
  
  depends_on = [
    kubernetes_namespace.monitoring
  ]
}

# Create an Ingress for Grafana
resource "kubernetes_ingress_v1" "grafana" {
  count = var.enable_monitoring ? 1 : 0
  
  metadata {
    name      = "grafana"
    namespace = kubernetes_namespace.monitoring[0].metadata[0].name
    
    annotations = {
      "kubernetes.io/ingress.class"               = "nginx"
      "cert-manager.io/cluster-issuer"            = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
      "nginx.ingress.kubernetes.io/ssl-redirect"  = "true"
    }
  }
  
  spec {
    rule {
      host = var.environment == "production" ? "monitor.${var.domain}" : "${var.environment}-monitor.${var.domain}"
      
      http {
        path {
          path = "/"
          
          backend {
            service {
              name = "monitoring-grafana"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
    
    tls {
      hosts = [
        var.environment == "production" ? "monitor.${var.domain}" : "${var.environment}-monitor.${var.domain}"
      ]
      secret_name = "grafana-tls"
    }
  }
  
  depends_on = [
    helm_release.monitoring
  ]
}
