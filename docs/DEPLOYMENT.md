# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Parking Garage Management System to production environments. The system includes automated deployment scripts, database setup, monitoring, and maintenance procedures.

## Prerequisites

### System Requirements

**Minimum Production Requirements:**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **CPU**: 2 cores, 2.4GHz
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB available space (10GB for system, 10GB for database growth)
- **Network**: Stable internet connection, ports 80/443 available

**Software Dependencies:**
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: Latest stable version
- **PM2**: Process manager (installed via npm)
- **Nginx**: Reverse proxy (optional but recommended)
- **Certbot**: SSL certificates (for HTTPS)

### Pre-deployment Checklist

- [ ] Server meets minimum requirements
- [ ] Domain name configured (optional)
- [ ] SSL certificate available (recommended)
- [ ] Firewall rules configured
- [ ] Backup storage available
- [ ] Monitoring tools configured

## Automated Deployment

### Quick Deployment (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/your-org/ParkingGarage.git
cd ParkingGarage

# 2. Run automated deployment
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The automated script will:
- Install dependencies
- Configure environment
- Initialize database
- Start services
- Setup monitoring
- Configure backup procedures

### Manual Deployment

#### Step 1: Environment Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional)
sudo apt install nginx -y

# Create application user
sudo useradd -m -s /bin/bash parkinggarage
sudo usermod -aG sudo parkinggarage
```

#### Step 2: Application Setup

```bash
# Switch to application user
sudo su - parkinggarage

# Clone repository
git clone https://github.com/your-org/ParkingGarage.git
cd ParkingGarage

# Install dependencies
npm ci --production

# Create data directories
mkdir -p data logs backups

# Set permissions
chmod 755 data logs backups
```

#### Step 3: Database Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Initialize database
npx prisma generate
npx prisma db push
npx prisma db seed

# Verify database setup
node scripts/health-check.js database
```

#### Step 4: Production Environment

Create `/home/parkinggarage/ParkingGarage/.env`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL="file:/home/parkinggarage/ParkingGarage/data/parkinggarage.db"

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (optional)
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=your-sendgrid-api-key

# Monitoring
HEALTH_CHECK_INTERVAL=30000
ENABLE_METRICS=true
METRICS_PORT=9090
```

#### Step 5: Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
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
EOF

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 6: Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/parkinggarage`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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

    # Static files (if serving frontend)
    location / {
        try_files $uri $uri/ @fallback;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location @fallback {
        proxy_pass http://localhost:3000;
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
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/parkinggarage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 7: SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Deployment Scripts

### Main Deployment Script

Create `scripts/deploy.sh`:

```bash
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
apt install -y curl wget git nginx sqlite3

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
cp scripts/nginx.conf /etc/nginx/sites-available/parkinggarage
ln -sf /etc/nginx/sites-available/parkinggarage /etc/nginx/sites-enabled/

# Remove default Nginx site
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Setup backup cron job
log "Setting up automated backups..."
(crontab -u $USER -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh") | crontab -u $USER -

# Setup health check monitoring
log "Setting up health monitoring..."
(crontab -u $USER -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/scripts/health-check.sh") | crontab -u $USER -

# Set file permissions
chown -R $USER:$USER $APP_DIR
chmod +x $APP_DIR/scripts/*.sh

# Final health check
log "Running health check..."
sleep 5
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "✅ Deployment successful! Application is running."
    log "🌐 Access your application at: http://$(hostname -I | awk '{print $1}'):3000"
else
    error "❌ Deployment failed! Application health check failed."
fi

log "🎉 Deployment completed!"
log "📝 Next steps:"
log "   1. Edit $APP_DIR/.env with your configuration"
log "   2. Configure domain name in Nginx"
log "   3. Set up SSL certificate with certbot"
log "   4. Review logs: pm2 logs parkinggarage"

exit 0
```

Make script executable:
```bash
chmod +x scripts/deploy.sh
```

## Database Deployment

### Production Database Setup

```bash
# Create production database directory
sudo mkdir -p /var/lib/parkinggarage
sudo chown parkinggarage:parkinggarage /var/lib/parkinggarage
sudo chmod 755 /var/lib/parkinggarage

# Initialize production database
cd /home/parkinggarage/ParkingGarage
DATABASE_URL="file:/var/lib/parkinggarage/parkinggarage.db" npx prisma db push
DATABASE_URL="file:/var/lib/parkinggarage/parkinggarage.db" npx prisma db seed

# Update environment
echo 'DATABASE_URL="file:/var/lib/parkinggarage/parkinggarage.db"' >> .env
```

### Database Migration Process

```bash
#!/bin/bash
# scripts/migrate.sh

set -e

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

DB_PATH="/var/lib/parkinggarage/parkinggarage.db"
BACKUP_DIR="/var/backups/parkinggarage"

# Create backup before migration
log "Creating pre-migration backup..."
mkdir -p $BACKUP_DIR
cp $DB_PATH "$BACKUP_DIR/pre-migration-$(date +%Y%m%d_%H%M%S).db"

# Run migrations
log "Running database migrations..."
npx prisma migrate deploy

# Verify migration
log "Verifying database integrity..."
if npx prisma db execute --stdin <<< "PRAGMA integrity_check;" | grep -q "ok"; then
    log "✅ Migration completed successfully"
else
    log "❌ Migration failed integrity check"
    exit 1
fi

log "Migration process completed"
```

## Monitoring and Health Checks

### Automated Health Monitoring

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

# Configuration
APP_URL="http://localhost:3000"
HEALTH_ENDPOINT="/health"
LOG_FILE="/home/parkinggarage/ParkingGarage/logs/health.log"
ALERT_EMAIL="admin@yourdomain.com"
MAX_RESPONSE_TIME=5 # seconds

# Functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" $ALERT_EMAIL 2>/dev/null || true
}

# Health checks
check_api_health() {
    local response_time
    local http_status
    
    response_time=$(curl -w "%{time_total}" -s -o /dev/null $APP_URL$HEALTH_ENDPOINT --max-time $MAX_RESPONSE_TIME || echo "timeout")
    http_status=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL$HEALTH_ENDPOINT --max-time $MAX_RESPONSE_TIME || echo "000")
    
    if [ "$http_status" = "200" ] && [ "$response_time" != "timeout" ]; then
        log "✅ API Health: OK (${response_time}s)"
        return 0
    else
        log "❌ API Health: FAILED (HTTP: $http_status, Time: ${response_time}s)"
        send_alert "API Health Check Failed" "HTTP Status: $http_status\nResponse Time: ${response_time}s"
        return 1
    fi
}

check_database_health() {
    local db_path="/var/lib/parkinggarage/parkinggarage.db"
    
    if [ -f "$db_path" ] && sqlite3 "$db_path" "PRAGMA integrity_check;" | grep -q "ok"; then
        log "✅ Database Health: OK"
        return 0
    else
        log "❌ Database Health: FAILED"
        send_alert "Database Health Check Failed" "Database integrity check failed or file missing"
        return 1
    fi
}

check_disk_space() {
    local disk_usage
    disk_usage=$(df /var/lib/parkinggarage | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        log "✅ Disk Space: OK (${disk_usage}% used)"
        return 0
    else
        log "❌ Disk Space: WARNING (${disk_usage}% used)"
        if [ "$disk_usage" -gt 90 ]; then
            send_alert "Critical Disk Space Warning" "Disk usage: ${disk_usage}%"
        fi
        return 1
    fi
}

check_pm2_status() {
    if pm2 list | grep -q "parkinggarage.*online"; then
        log "✅ PM2 Process: OK"
        return 0
    else
        log "❌ PM2 Process: FAILED"
        send_alert "PM2 Process Check Failed" "Application process is not running"
        # Attempt restart
        pm2 restart parkinggarage
        return 1
    fi
}

# Main health check execution
main() {
    log "Starting health check..."
    
    local checks_passed=0
    local total_checks=4
    
    check_api_health && ((checks_passed++))
    check_database_health && ((checks_passed++))
    check_disk_space && ((checks_passed++))
    check_pm2_status && ((checks_passed++))
    
    log "Health check completed: $checks_passed/$total_checks checks passed"
    
    if [ $checks_passed -eq $total_checks ]; then
        exit 0
    else
        exit 1
    fi
}

# Run health check
main
```

### System Monitoring Dashboard

Create `scripts/system-status.sh`:

```bash
#!/bin/bash

# System information
echo "🖥️  System Information"
echo "===================="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Application status
echo "🚀 Application Status"
echo "===================="
pm2 list
echo ""

# Database status
echo "💾 Database Status"
echo "=================="
DB_PATH="/var/lib/parkinggarage/parkinggarage.db"
if [ -f "$DB_PATH" ]; then
    DB_SIZE=$(ls -lh "$DB_PATH" | awk '{print $5}')
    echo "Database file size: $DB_SIZE"
    echo "Database integrity: $(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")"
else
    echo "❌ Database file not found"
fi
echo ""

# Memory usage
echo "🧠 Memory Usage"
echo "==============="
free -h
echo ""

# Disk space
echo "💽 Disk Usage"
echo "============="
df -h
echo ""

# Network status
echo "🌐 Network Status"
echo "================="
netstat -tlnp | grep :3000
echo ""

# Recent logs
echo "📋 Recent Logs (Last 10 lines)"
echo "==============================="
tail -n 10 /home/parkinggarage/ParkingGarage/logs/combined.log 2>/dev/null || echo "No logs found"
```

## Backup and Recovery

### Automated Backup System

Create `scripts/backup.sh`:

```bash
#!/bin/bash

set -e

# Configuration
BACKUP_DIR="/var/backups/parkinggarage"
SOURCE_DB="/var/lib/parkinggarage/parkinggarage.db"
RETENTION_DAYS=30
REMOTE_BACKUP_ENABLED=false
S3_BUCKET="your-backup-bucket"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/parkinggarage_$TIMESTAMP.db"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Create database backup
log "Creating database backup..."
if [ -f "$SOURCE_DB" ]; then
    cp "$SOURCE_DB" "$BACKUP_FILE"
    
    # Verify backup integrity
    if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
        log "✅ Backup created successfully: $(basename $BACKUP_FILE)"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        BACKUP_FILE="$BACKUP_FILE.gz"
        log "Backup compressed: $(basename $BACKUP_FILE)"
        
        # Remote backup (if enabled)
        if [ "$REMOTE_BACKUP_ENABLED" = true ] && command -v aws &> /dev/null; then
            log "Uploading to S3..."
            aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/database/" --storage-class STANDARD_IA
            log "✅ Remote backup completed"
        fi
        
    else
        log "❌ Backup integrity check failed"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    log "❌ Source database not found: $SOURCE_DB"
    exit 1
fi

# Cleanup old backups
log "Cleaning up old backups..."
find $BACKUP_DIR -name "parkinggarage_*.db.gz" -mtime +$RETENTION_DAYS -delete
OLD_COUNT=$(find $BACKUP_DIR -name "parkinggarage_*.db.gz" -mtime +$RETENTION_DAYS | wc -l)
if [ $OLD_COUNT -gt 0 ]; then
    log "Removed $OLD_COUNT old backup(s)"
fi

# Backup summary
TOTAL_BACKUPS=$(ls -1 $BACKUP_DIR/parkinggarage_*.db.gz 2>/dev/null | wc -l)
BACKUP_SIZE=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
log "Backup completed. Total backups: $TOTAL_BACKUPS, Total size: $BACKUP_SIZE"
```

### Recovery Procedures

Create `scripts/restore.sh`:

```bash
#!/bin/bash

set -e

# Usage function
usage() {
    echo "Usage: $0 <backup_file>"
    echo "       $0 --list                    # List available backups"
    echo "       $0 --latest                  # Restore from latest backup"
    echo ""
    echo "Examples:"
    echo "  $0 /var/backups/parkinggarage/parkinggarage_20240902_120000.db.gz"
    echo "  $0 --latest"
    echo "  $0 --list"
    exit 1
}

# Configuration
BACKUP_DIR="/var/backups/parkinggarage"
TARGET_DB="/var/lib/parkinggarage/parkinggarage.db"
SERVICE_NAME="parkinggarage"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# List available backups
list_backups() {
    echo "Available backups:"
    ls -la $BACKUP_DIR/parkinggarage_*.db.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' | column -t || echo "No backups found"
}

# Get latest backup
get_latest_backup() {
    ls -t $BACKUP_DIR/parkinggarage_*.db.gz 2>/dev/null | head -n1 || echo ""
}

# Restore database
restore_database() {
    local backup_file="$1"
    local temp_file="/tmp/restore_$(date +%s).db"
    
    if [ ! -f "$backup_file" ]; then
        log "❌ Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Starting restore process..."
    log "Backup file: $backup_file"
    
    # Stop application
    log "Stopping application..."
    pm2 stop $SERVICE_NAME || true
    
    # Create current database backup
    if [ -f "$TARGET_DB" ]; then
        log "Creating safety backup of current database..."
        cp "$TARGET_DB" "$TARGET_DB.pre-restore.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Extract and restore backup
    log "Extracting backup..."
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" > "$temp_file"
    else
        cp "$backup_file" "$temp_file"
    fi
    
    # Verify restored database
    log "Verifying database integrity..."
    if sqlite3 "$temp_file" "PRAGMA integrity_check;" | grep -q "ok"; then
        log "✅ Database integrity verified"
        
        # Replace current database
        mv "$temp_file" "$TARGET_DB"
        chown parkinggarage:parkinggarage "$TARGET_DB"
        chmod 644 "$TARGET_DB"
        
        # Start application
        log "Starting application..."
        pm2 start $SERVICE_NAME
        
        # Wait for startup
        sleep 5
        
        # Verify application health
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log "✅ Restore completed successfully"
            log "Application is running and healthy"
        else
            log "⚠️  Restore completed but application health check failed"
            log "Check application logs: pm2 logs $SERVICE_NAME"
        fi
        
    else
        log "❌ Database integrity check failed"
        rm -f "$temp_file"
        
        # Restart application with original database
        pm2 start $SERVICE_NAME || true
        exit 1
    fi
}

# Main script logic
case "${1:-}" in
    --list)
        list_backups
        ;;
    --latest)
        LATEST_BACKUP=$(get_latest_backup)
        if [ -n "$LATEST_BACKUP" ]; then
            log "Using latest backup: $(basename $LATEST_BACKUP)"
            restore_database "$LATEST_BACKUP"
        else
            log "❌ No backups found"
            exit 1
        fi
        ;;
    "")
        usage
        ;;
    *)
        if [ ! -f "$1" ]; then
            log "❌ File not found: $1"
            exit 1
        fi
        restore_database "$1"
        ;;
esac
```

## SSL Configuration

### Automated SSL Setup

Create `scripts/setup-ssl.sh`:

```bash
#!/bin/bash

set -e

DOMAIN="$1"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain.com>"
    exit 1
fi

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Install Certbot
log "Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
log "Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup auto-renewal
log "Setting up automatic renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Test renewal process
log "Testing renewal process..."
certbot renew --dry-run

log "✅ SSL certificate setup completed for $DOMAIN"
```

## Container Deployment (Docker)

### Docker Configuration

Create `Dockerfile`:

```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S parkinggarage -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy other necessary files
COPY --chown=parkinggarage:nodejs scripts ./scripts
COPY --chown=parkinggarage:nodejs .env.example ./

# Create data directory
RUN mkdir -p data logs && \
    chown -R parkinggarage:nodejs data logs

# Set proper permissions
RUN chmod +x scripts/*.sh

# Switch to non-root user
USER parkinggarage

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node scripts/health-check.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/src/server.js"]
```

### Docker Compose Configuration

Update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: parkinggarage-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/parkinggarage.db
      - PORT=3000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/app/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      - backup

  nginx:
    image: nginx:alpine
    container_name: parkinggarage-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - app
    restart: unless-stopped

  backup:
    build: .
    container_name: parkinggarage-backup
    command: ["/bin/sh", "-c", "while true; do sleep 86400; /app/scripts/backup.sh; done"]
    volumes:
      - ./data:/app/data:ro
      - ./backups:/app/backups
    restart: unless-stopped

  monitoring:
    image: prom/node-exporter
    container_name: parkinggarage-monitoring
    ports:
      - "9100:9100"
    restart: unless-stopped

volumes:
  app_data:
  app_logs:
  app_backups:

networks:
  default:
    driver: bridge
```

## Troubleshooting

### Common Deployment Issues

#### 1. Permission Errors
```bash
# Fix file permissions
sudo chown -R parkinggarage:parkinggarage /home/parkinggarage/ParkingGarage
sudo chmod +x /home/parkinggarage/ParkingGarage/scripts/*.sh
```

#### 2. Database Connection Issues
```bash
# Check database file
ls -la data/parkinggarage.db

# Test database connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('✅ Database connected')).catch(e => console.error('❌ Database error:', e));
"
```

#### 3. Port Already in Use
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

#### 4. PM2 Issues
```bash
# Reset PM2
pm2 kill
pm2 start ecosystem.config.js

# Check PM2 status
pm2 status
pm2 logs parkinggarage
```

#### 5. Memory Issues
```bash
# Check memory usage
free -h

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Log Analysis

```bash
# Application logs
pm2 logs parkinggarage

# Nginx logs
sudo tail -f /var/log/nginx/parkinggarage.error.log

# System logs
journalctl -u nginx -f

# Database logs
tail -f logs/database.log
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Analyze database performance
ANALYZE;
PRAGMA optimize;

-- Check query performance
EXPLAIN QUERY PLAN SELECT * FROM vehicles WHERE licensePlate = ?;
```

#### 2. Application Optimization
```bash
# Monitor performance
pm2 monit

# CPU and memory profiling
node --inspect dist/src/server.js
```

## Security Checklist

- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key authentication only
- [ ] Regular security updates scheduled
- [ ] Application running as non-root user
- [ ] Database files have proper permissions
- [ ] SSL certificate configured and auto-renewing
- [ ] Rate limiting configured
- [ ] Security headers configured in Nginx
- [ ] Backup files encrypted (if stored remotely)
- [ ] Log rotation configured
- [ ] Monitoring and alerting set up

## Maintenance Procedures

### Daily Tasks (Automated)
- Health checks every 5 minutes
- Log rotation
- Backup creation

### Weekly Tasks
- Security updates
- Certificate renewal check
- Performance review
- Log analysis

### Monthly Tasks
- Full system backup
- Capacity planning review
- Security audit
- Performance optimization

This deployment guide provides a comprehensive foundation for production deployment with automated scripts, monitoring, backup procedures, and troubleshooting guidance.