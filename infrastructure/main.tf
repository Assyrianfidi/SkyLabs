terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.0.0"
}

# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = var.do_token
}

# Configure the Cloudflare Provider
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Create a new SSH key
resource "digitalocean_ssh_key" "default" {
  name       = "skylabs-${var.environment}-key"
  public_key = file(var.ssh_public_key_path)
}

# Create a new Droplet
resource "digitalocean_droplet" "app" {
  image    = "ubuntu-20-04-x64"
  name     = "skylabs-${var.environment}"
  region   = var.region
  size     = var.droplet_size
  ssh_keys = [digitalocean_ssh_key.default.fingerprint]
  
  connection {
    type        = "ssh"
    user        = "root"
    host        = self.ipv4_address
    private_key = file(var.ssh_private_key_path)
  }
  
  # Install Docker and Docker Compose
  provisioner "remote-exec" {
    inline = [
      "apt-get update",
      "apt-get install -y apt-transport-https ca-certificates curl software-properties-common",
      "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -",
      "add-apt-repository \"deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\"",
      "apt-get update",
      "apt-get install -y docker-ce docker-ce-cli containerd.io",
      "curl -L \"https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose",
      "chmod +x /usr/local/bin/docker-compose"
    ]
  }
}

# Create a new database cluster
resource "digitalocean_database_cluster" "postgres" {
  name       = "skylabs-${var.environment}-db"
  engine     = "pg"
  version    = "14"
  size       = var.db_size
  region     = var.region
  node_count = 1
  
  # Only create production database with high availability
  count = var.environment == "production" ? 1 : 0
}

# Create a firewall
resource "digitalocean_firewall" "web" {
  name = "skylabs-${var.environment}-firewall"
  
  droplet_ids = [digitalocean_droplet.app.id]
  
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0"]
  }
  
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0"]
  }
  
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0"]
  }
  
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0"]
  }
  
  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0"]
  }
}

# Create DNS records in Cloudflare
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "production" ? "@" : var.environment
  value   = digitalocean_droplet.app.ipv4_address
  type    = "A"
  ttl     = 300
  proxied = true
}

# Create a www CNAME record for production
resource "cloudflare_record" "www" {
  count   = var.environment == "production" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = "@"
  type    = "CNAME"
  ttl     = 300
  proxied = true
}

# Output the IP address
output "ip_address" {
  value = digitalocean_droplet.app.ipv4_address
}

# Output the database connection string
output "database_connection_string" {
  value = var.environment == "production" ? "postgres://${digitalocean_database_cluster.postgres[0].user}:${digitalocean_database_cluster.postgres[0].password}@${digitalocean_database_cluster.postgres[0].host}:${digitalocean_database_cluster.postgres[0].port}/${digitalocean_database_cluster.postgres[0].database}?sslmode=require" : null
}
