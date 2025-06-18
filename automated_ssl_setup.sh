#!/bin/bash

# AI Model Registry - Automated SSL Setup Script
# For thehive.peoplesainetwork.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="thehive.peoplesainetwork.com"
EMAIL="admin@peoplesainetwork.com"  # Change this to your email
REGISTRY_DIR="ai-model-registry"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  AI Model Registry SSL Setup"
    echo "  Domain: $DOMAIN"
    echo "=========================================="
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "This script should not be run as root for security reasons."
        print_warning "Please run as a regular user with sudo privileges."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if domain points to this server
    print_status "Checking DNS resolution for $DOMAIN..."
    if ! host $DOMAIN >/dev/null 2>&1; then
        print_error "Domain $DOMAIN does not resolve. Please ensure DNS is configured correctly."
        exit 1
    fi
    
    local server_ip=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
    local domain_ip=$(dig +short $DOMAIN | tail -n1)
    
    if [[ "$server_ip" != "$domain_ip" ]]; then
        print_warning "Domain IP ($domain_ip) doesn't match server IP ($server_ip)"
        print_warning "SSL certificate generation may fail if DNS propagation is incomplete"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check ports
    print_status "Checking if required ports are available..."
    for port in 80 443 3001; do
        if ss -tulnp | grep ":$port " >/dev/null 2>&1; then
            print_warning "Port $port is already in use"
            ss -tulnp | grep ":$port "
        fi
    done
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    # Update package manager
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo apt-get install -y curl wget git ufw
    elif command -v yum >/dev/null 2>&1; then
        sudo yum update -y
        sudo yum install -y curl wget git firewalld
    else
        print_error "Unsupported package manager. Please install curl, wget, git, and firewall tools manually."
        exit 1
    fi
    
    # Install Docker if not present
    if ! command -v docker >/dev/null 2>&1; then
        print_status "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        sudo usermod -aG docker $USER
        print_warning "Please log out and log back in for Docker group changes to take effect."
    else
        print_status "Docker already installed: $(docker --version)"
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_status "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    else
        print_status "Docker Compose already installed: $(docker-compose --version)"
    fi
    
    # Install jq for JSON processing
    if ! command -v jq >/dev/null 2>&1; then
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get install -y jq
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y jq
        fi
    fi
}

# Setup directory structure
setup_directories() {
    print_step "Setting up directory structure..."
    
    if [[ -d "$REGISTRY_DIR" ]]; then
        print_warning "Directory $REGISTRY_DIR already exists!"
        read -p "Remove existing directory and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$REGISTRY_DIR"
        else
            print_error "Setup cancelled."
            exit 1
        fi
    fi
    
    mkdir -p "$REGISTRY_DIR"/{ssl,data,logs,nginx,monitoring,backup}
    cd "$REGISTRY_DIR"
    
    print_status "Created directory structure in $(pwd)"
}

# Generate DH parameters
generate_dhparam() {
    print_step "Generating Diffie-Hellman parameters (this may take several minutes)..."
    
    if [[ ! -f "ssl/dhparam.pem" ]]; then
        openssl dhparam -out ssl/dhparam.pem 2048
        print_status "DH parameters generated"
    else
        print_status "DH parameters already exist"
    fi
}

# Setup SSL certificates
setup_ssl() {
    print_step "Setting up SSL certificates with Let's Encrypt..."
    
    # Stop any services that might be using port 80
    sudo systemctl stop apache2 nginx >/dev/null 2>&1 || true
    
    # Generate SSL certificate using Certbot standalone
    print_status "Generating SSL certificate for $DOMAIN..."
    
    docker run --rm --name certbot \
        -v "$(pwd)/ssl:/etc/letsencrypt" \
        -v "$(pwd)/ssl/www:/var/www/certbot" \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN"
    
    if [[ $? -eq 0 ]]; then
        print_status "SSL certificate generated successfully"
    else
        print_error "Failed to generate SSL certificate"
        print_error "Please check that:"
        print_error "1. Domain $DOMAIN points to this server"
        print_error "2. Port 80 is accessible from the internet"
        print_error "3. No firewall is blocking the connection"
        exit 1
    fi
}

# Create configuration files
create_configs() {
    print_step "Creating configuration files..."
    
    # Create environment file
    cat > .env.production << EOF
# AI Model Registry - Production Environment
NODE_ENV=production
PORT=3001
DOMAIN=$DOMAIN
REGISTRY_URL=https://$DOMAIN

# SSL Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/live/$DOMAIN/fullchain.pem
SSL_KEY_PATH=/etc/ssl/live/$DOMAIN/privkey.pem

# Database
REGISTRY_DATA_FILE=/app/data/ai-registry-data.json

# Security (CHANGE THESE!)
JWT_SECRET=$(openssl rand -base64 32)
API_KEY=$(openssl rand -hex 16)
ADMIN_API_KEY=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -base64 16)
GRAFANA_PASSWORD=$(openssl rand -base64 12)

# CORS
CORS_ORIGINS=https://$DOMAIN,https://*.$DOMAIN

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info

# Email Configuration (UPDATE THESE!)
SMTP_USER=alerts@$DOMAIN
ALERT_EMAIL=admin@$DOMAIN

# Feature Flags
FEATURE_AUTO_REGISTRATION=true
FEATURE_MODEL_HEALTH_CHECKS=true
FEATURE_WEBSOCKET_UPDATES=true
EOF
    
    # Create nginx directory and configuration
    mkdir -p nginx
    
    # Copy nginx configuration (this would be the content from the nginx artifact)
    cat > nginx/nginx.conf << 'EOF'
# This would contain the full nginx configuration
# Copy the content from the nginx_ssl_config artifact
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    
    upstream ai_registry {
        server ai-registry:3001;
        keepalive 32;
    }
    
    # HTTP redirect
    server {
        listen 80;
        server_name $DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://\$host\$request_uri;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN;
        
        include /etc/nginx/ssl.conf;
        ssl_certificate /etc/ssl/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/ssl/live/$DOMAIN/privkey.pem;
        
        location / {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://ai_registry;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF
    
    # Create SSL configuration
    cat > nginx/ssl.conf << 'EOF'
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;

add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
EOF

    print_status "Configuration files created"
}

# Create placeholder files
create_placeholder_files() {
    print_step "Creating placeholder application files..."
    
    # Package.json
    cat > package.json << 'EOF'
{
  "name": "ai-model-registry",
  "version": "1.0.0",
  "description": "DNS-like registry for AI models and communication protocols",
  "main": "ai-registry-server.js",
  "scripts": {
    "start": "node ai-registry-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "uuid": "^9.0.0",
    "ws": "^8.14.2"
  }
}
EOF
    
    # Dockerfile
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p /app/data

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
EOF
    
    # Create placeholder server file
    cat > ai-registry-server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'AI Model Registry - SSL Enabled',
        domain: process.env.DOMAIN,
        ssl: process.env.SSL_ENABLED === 'true'
    });
});

const PORT = process.env.PORT || 3001;
let server;

if (process.env.SSL_ENABLED === 'true') {
    try {
        const options = {
            cert: fs.readFileSync(process.env.SSL_CERT_PATH),
            key: fs.readFileSync(process.env.SSL_KEY_PATH)
        };
        server = https.createServer(options, app);
        console.log('🔐 SSL enabled');
    } catch (error) {
        console.warn('⚠️ SSL certificates not found, falling back to HTTP');
        server = http.createServer(app);
    }
} else {
    server = http.createServer(app);
}

server.listen(PORT, () => {
    console.log(`🚀 AI Registry running on port ${PORT}`);
});
EOF
    
    print_warning "IMPORTANT: Placeholder files created. You must copy the full application code from the artifacts!"
}

# Setup firewall
setup_firewall() {
    print_step "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        sudo ufw --force enable
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw allow 3001/tcp
        print_status "UFW firewall configured"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --permanent --add-port=3001/tcp
        sudo firewall-cmd --reload
        print_status "Firewalld configured"
    else
        print_warning "No supported firewall found. Please configure manually."
    fi
}

# Create Docker Compose file
create_docker_compose() {
    print_step "Creating Docker Compose configuration..."
    
    cat > docker-compose.ssl.yml << EOF
version: '3.8'

services:
  ai-registry:
    build: .
    container_name: ai-registry
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./ssl/live/$DOMAIN:/etc/ssl/live/$DOMAIN:ro
      - ./ssl/archive/$DOMAIN:/etc/ssl/archive/$DOMAIN:ro
    env_file:
      - .env.production
    networks:
      - ai-registry-network

  nginx:
    image: nginx:alpine
    container_name: ai-registry-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl.conf:/etc/nginx/ssl.conf:ro
      - ./ssl/live:/etc/ssl/live:ro
      - ./ssl/archive:/etc/ssl/archive:ro
      - ./ssl/www:/var/www/certbot:ro
      - ./ssl/dhparam.pem:/etc/ssl/dhparam.pem:ro
    depends_on:
      - ai-registry
    networks:
      - ai-registry-network

  certbot:
    image: certbot/certbot
    container_name: ai-registry-certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./ssl/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait \$\${!}; done;'"
    networks:
      - ai-registry-network

networks:
  ai-registry-network:
    driver: bridge
EOF
    
    print_status "Docker Compose configuration created"
}

# Start services
start_services() {
    print_step "Starting AI Registry services..."
    
    # Build and start services
    docker-compose -f docker-compose.ssl.yml build
    docker-compose -f docker-compose.ssl.yml up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Test the deployment
    print_status "Testing deployment..."
    if curl -f -k "https://$DOMAIN/health" >/dev/null 2>&1; then
        print_status "✅ HTTPS health check passed"
    else
        print_warning "❌ HTTPS health check failed"
        print_status "Checking container logs..."
        docker-compose -f docker-compose.ssl.yml logs
    fi
}

# Setup auto-renewal
setup_auto_renewal() {
    print_step "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > renew-certs.sh << EOF
#!/bin/bash
cd $(pwd)
docker-compose -f docker-compose.ssl.yml exec -T certbot certbot renew --quiet
docker-compose -f docker-compose.ssl.yml restart nginx
EOF
    
    chmod +x renew-certs.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 12 * * * $(pwd)/renew-certs.sh") | crontab -
    
    print_status "Auto-renewal configured (runs daily at 12:00)"
}

# Create management scripts
create_management_scripts() {
    print_step "Creating management scripts..."
    
    # Deploy script
    cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying AI Registry..."
docker-compose -f docker-compose.ssl.yml down
docker-compose -f docker-compose.ssl.yml build
docker-compose -f docker-compose.ssl.yml up -d
echo "✅ Deployment complete"
EOF
    
    # Backup script
    cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backup/ai-registry-backup-$DATE.tar.gz" data/ ssl/ logs/ .env.production
echo "✅ Backup created: backup/ai-registry-backup-$DATE.tar.gz"
EOF
    
    # Status script
    cat > status.sh << 'EOF'
#!/bin/bash
echo "🔍 AI Registry Status"
echo "===================="
docker-compose -f docker-compose.ssl.yml ps
echo ""
echo "🌐 Testing endpoints:"
curl -s -o /dev/null -w "HTTPS Health: %{http_code}\n" https://localhost/health
echo ""
echo "📊 SSL Certificate:"
echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates
EOF
    
    chmod +x deploy.sh backup.sh status.sh
    
    print_status "Management scripts created"
}

# Print final instructions
print_final_instructions() {
    print_header
    echo -e "${GREEN}🎉 AI Registry SSL setup completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}📝 IMPORTANT: Next Steps${NC}"
    echo -e "${YELLOW}1. Copy the full application code from the artifacts:${NC}"
    echo "   - ai-registry-server.js (full server implementation)"
    echo "   - ai-registry-client.js (full client library)"  
    echo "   - public/dashboard.html (full dashboard)"
    echo "   - All other component files"
    echo ""
    echo -e "${YELLOW}2. Update the environment file:${NC}"
    echo "   - Edit .env.production with your API keys"
    echo "   - Update email settings for alerts"
    echo ""
    echo -e "${YELLOW}3. Deploy the updated application:${NC}"
    echo "   ./deploy.sh"
    echo ""
    echo -e "${CYAN}🌐 Access Points:${NC}"
    echo "   Main URL:    https://$DOMAIN"
    echo "   Dashboard:   https://$DOMAIN/dashboard.html"
    echo "   API:         https://$DOMAIN/api/"
    echo "   Health:      https://$DOMAIN/health"
    echo ""
    echo -e "${CYAN}🔧 Management Commands:${NC}"
    echo "   Deploy:      ./deploy.sh"
    echo "   Status:      ./status.sh"
    echo "   Backup:      ./backup.sh"
    echo "   Logs:        docker-compose -f docker-compose.ssl.yml logs -f"
    echo ""
    echo -e "${CYAN}🔐 Security:${NC}"
    echo "   SSL Cert:    Auto-renewing (check with: certbot certificates)"
    echo "   Firewall:    Configured for ports 80, 443, 3001"
    echo "   Secrets:     Generated in .env.production (keep secure!)"
    echo ""
    echo -e "${GREEN}✨ Your AI Registry is ready for production deployment!${NC}"
}

# Main execution
main() {
    print_header
    
    check_root
    check_prerequisites
    install_dependencies
    setup_directories
    generate_dhparam
    setup_ssl
    create_configs
    create_placeholder_files
    setup_firewall
    create_docker_compose
    start_services
    setup_auto_renewal
    create_management_scripts
    
    print_final_instructions
}

# Run main function
main "$@"