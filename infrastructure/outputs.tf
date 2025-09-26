output "app_ip_address" {
  description = "The IP address of the deployed application"
  value       = digitalocean_droplet.app.ipv4_address
}

output "app_url" {
  description = "The URL of the deployed application"
  value       = "https://${var.environment == "production" ? var.domain : "${var.environment}.${var.domain}"}"
}

output "database_host" {
  description = "The database host"
  value       = var.environment == "production" ? digitalocean_database_cluster.postgres[0].host : null
}

output "database_port" {
  description = "The database port"
  value       = var.environment == "production" ? digitalocean_database_cluster.postgres[0].port : null
}

output "database_name" {
  description = "The database name"
  value       = var.environment == "production" ? digitalocean_database_cluster.postgres[0].database : null
}

output "database_user" {
  description = "The database username"
  value       = var.environment == "production" ? digitalocean_database_cluster.postgres[0].user : null
  sensitive   = true
}

output "database_password" {
  description = "The database password"
  value       = var.environment == "production" ? digitalocean_database_cluster.postgres[0].password : null
  sensitive   = true
}

output "ssh_connection_command" {
  description = "Command to SSH into the server"
  value       = "ssh root@${digitalocean_droplet.app.ipv4_address}"
}

output "deployment_instructions" {
  description = "Instructions for deploying the application"
  value       = <<-EOT
    To deploy the application, run the following commands:

    1. SSH into the server:
       ssh root@${digitalocean_droplet.app.ipv4_address}

    2. Clone the repository:
       git clone https://github.com/your-username/skylabs.git
       cd skylabs

    3. Copy the environment file:
       cp .env.${var.environment} .env
       # Edit with your values
       nano .env

    4. Start the services:
       docker-compose -f docker-compose.prod.yml up -d

    5. Set up the database:
       docker-compose -f docker-compose.prod.yml exec app npm run db:migrate
       docker-compose -f docker-compose.prod.yml exec app npm run db:seed

    Your application will be available at: https://${var.environment == "production" ? var.domain : "${var.environment}.${var.domain}"}
  EOT
}

output "monitoring_instructions" {
  description = "Instructions for accessing monitoring"
  value       = var.enable_monitoring ? <<-EOT
    Monitoring is enabled. Access the following services:

    - Grafana: https://${var.environment == "production" ? "monitor.${var.domain}" : "${var.environment}-monitor.${var.domain}"}
      Default credentials: admin / admin (change this immediately)

    - Prometheus: https://${var.environment == "production" ? "prometheus.${var.domain}" : "${var.environment}-prometheus.${var.domain}"}
  EOT : "Monitoring is not enabled for this environment."
}
