#!/bin/bash
set -e

echo "🚀 Starting Parking Garage Deployment..."

# Configuration
APP_DIR="/opt/parkinggarage"
USER="parkinggarage"
REPO_URL="https://github.com/your-org/ParkingGarage.git"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root or with sudo"
fi

# System dependencies
log "Installing system dependencies..."
apt update && apt upgrade -y
apt install -y curl wget git nginx sqlite3 ufw

# Install Node.js 18
log "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
log "Node.js version: $node_version"

# Install PM2
log "Installing PM2..."
npm install -g pm2

# Create application user
if ! id "$USER" &>/dev/null; then
    log "Creating application user: $USER"
    useradd -m -s /bin/bash $USER
    usermod -aG www-data $USER
fi

# Create application directory
log "Setting up application directory..."
mkdir -p $APP_DIR
chown -R $USER:$USER $APP_DIR

# Switch to application user for application setup
sudo -u $USER bash << EOF
set -e

cd $APP_DIR

# Clone or update repository
if [ -d ".git" ]; then
    log "Updating existing repository..."
    git fetch origin
    git reset --hard origin/$BRANCH
else
    log "Cloning repository..."
    git clone -b $BRANCH $REPO_URL .
fi

# Install dependencies
log "Installing dependencies..."
npm ci --production

# Create necessary directories
mkdir -p data logs backups

# Generate Prisma client
log "Setting up database..."
npx prisma generate

# Set up environment if not exists
if [ ! -f .env ]; then
    log "Creating environment file..."
    cp .env.example .env
    
    # Generate JWT secret
    JWT_SECRET=\$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    sed -i "s/your-super-secure-jwt-secret-minimum-32-characters/\$JWT_SECRET/g" .env
    
    warning "Please edit .env file with your specific configuration"
fi

# Initialize database
if [ ! -f data/parkinggarage.db ]; then
    log "Initializing database..."
    npx prisma db push
    npx prisma db seed
else
    log "Database exists, running migrations..."
    npx prisma migrate deploy
fi

# Build application
log "Building application..."
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'PMCONFIG'
module.exports = {
  apps: [{
    name: 'parkinggarage',
    script: 'dist/src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
PMCONFIG

# PM2 setup
if pm2 list | grep -q "parkinggarage"; then
    log "Restarting PM2 application..."
    pm2 restart parkinggarage
else
    log "Starting PM2 application..."
    pm2 start ecosystem.config.js
    pm2 save
fi
EOF

# Setup PM2 startup script
log "Setting up PM2 startup..."
sudo -u $USER pm2 startup | grep -E "^sudo" | bash

# Nginx configuration
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/parkinggarage << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
        proxy_read_timeout 5s;
        proxy_connect_timeout 5s;
    }

    # Static files
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Security
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Logging
    access_log /var/log/nginx/parkinggarage.access.log;
    error_log /var/log/nginx/parkinggarage.error.log;
}
NGINXCONF

# Enable the site
ln -sf /etc/nginx/sites-available/parkinggarage /etc/nginx/sites-enabled/

# Remove default Nginx site
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Setup firewall
log "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

# Setup backup cron job
log "Setting up automated backups..."
sudo -u $USER crontab -l 2>/dev/null > /tmp/crontab_backup || touch /tmp/crontab_backup
echo "0 2 * * * $APP_DIR/scripts/backup.sh" >> /tmp/crontab_backup
sudo -u $USER crontab /tmp/crontab_backup
rm /tmp/crontab_backup

# Setup health check monitoring
log "Setting up health monitoring..."
sudo -u $USER crontab -l 2>/dev/null > /tmp/crontab_health || touch /tmp/crontab_health
echo "*/5 * * * * $APP_DIR/scripts/health-check.sh" >> /tmp/crontab_health
sudo -u $USER crontab /tmp/crontab_health
rm /tmp/crontab_health

# Set file permissions
chown -R $USER:$USER $APP_DIR
chmod +x $APP_DIR/scripts/*.sh

# Enable and start nginx
systemctl enable nginx
systemctl start nginx

# Final health check
log "Running health check..."
sleep 5
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "✅ Deployment successful! Application is running."
    log "🌐 Access your application at: http://$(hostname -I | awk '{print $1}')"
else
    error "❌ Deployment failed! Application health check failed."
fi

log "🎉 Deployment completed!"
log "📝 Next steps:"
log "   1. Edit $APP_DIR/.env with your configuration"
log "   2. Configure domain name in Nginx if needed"
log "   3. Set up SSL certificate with: sudo certbot --nginx"
log "   4. Review logs: pm2 logs parkinggarage"
log "   5. Test backup system: $APP_DIR/scripts/backup.sh"

exit 0