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

# Main health check execution
main() {
    log "Starting health check..."
    
    local checks_passed=0
    local total_checks=2
    
    check_api_health && ((checks_passed++))
    check_database_health && ((checks_passed++))
    
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

## Related Documentation

- **[Database Schema](Database-Schema.md)** - Database setup and configuration
- **[Performance](Performance-Load-Testing.md)** - Performance optimization for production
- **[Migration Guide](Migration-Guide.md)** - Data migration procedures
- **[Quick Start](Quick-Start.md)** - Getting started with development setup