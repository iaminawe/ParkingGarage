# Docker Deployment Guide

This document provides comprehensive instructions for deploying the ParkingGarage application using Docker in both development and production environments.

## 🏗️ Architecture Overview

### Production Architecture
- **Multi-stage Dockerfile** for optimized image size and security
- **Nginx reverse proxy** with SSL termination and rate limiting
- **Redis cache** for session storage and caching
- **Automated backups** with S3 integration
- **Health monitoring** and metrics collection
- **Resource limits** and security constraints

### Development Architecture
- **Hot reload** with volume mounting
- **Debug port** exposure for Node.js debugging
- **SQLite Web UI** for database inspection
- **MailHog** for email testing
- **Simplified nginx** configuration
- **No SSL** requirements

## 🚀 Quick Start

### Production Deployment

1. **Prepare Environment**
   ```bash
   # Copy and configure environment
   cp .env.production.template .env.production
   # Edit .env.production with your actual values
   ```

2. **Build and Deploy**
   ```bash
   # Build and start services
   docker-compose up -d --build
   
   # Check service status
   docker-compose ps
   
   # View logs
   docker-compose logs -f app
   ```

### Development Setup

1. **Start Development Environment**
   ```bash
   # Start development services
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   
   # View application logs
   docker-compose logs -f app
   ```

2. **Access Services**
   - **API**: http://localhost:3000
   - **API Docs**: http://localhost:3000/docs
   - **SQLite Web**: http://localhost:8080
   - **MailHog**: http://localhost:8025

## 📋 Prerequisites

### System Requirements
- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **Memory**: 2GB minimum (4GB recommended)
- **Storage**: 10GB minimum for production

### Required Environment Variables

#### Production (Required)
```bash
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-super-secure-session-secret-here
REDIS_PASSWORD=your-redis-password-here
```

#### Optional Configuration
```bash
# Application
APP_PORT=3000
LOG_LEVEL=info
VERSION=1.0.0

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
ENABLE_METRICS=true

# Backup
BACKUP_SCHEDULE="0 2 * * *"
S3_BACKUP_ENABLED=false
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET=your-backup-bucket

# SSL
SSL_CERT_PATH=./ssl
NGINX_HOST=yourdomain.com
```

## 🔧 Service Configuration

### Application Service (app)
- **Base Image**: node:18-alpine
- **Build**: Multi-stage with security optimizations
- **Port**: 3000
- **Health Check**: `/api/v1/health` endpoint
- **Security**: Non-root user, minimal privileges
- **Resource Limits**: 2 CPU cores, 1GB memory

### Nginx Reverse Proxy
- **Base Image**: nginx:1.25-alpine
- **Features**:
  - SSL termination
  - Rate limiting (API: 10 req/s, General: 5 req/s)
  - Gzip compression
  - Security headers
  - Static file serving
- **Ports**: 80 (HTTP), 443 (HTTPS)

### Redis Cache
- **Base Image**: redis:7-alpine
- **Features**:
  - Persistence enabled
  - Memory limit: 256MB
  - Password protection
  - LRU eviction policy
- **Port**: 6379

### Backup Service
- **Schedule**: 2:00 AM daily (configurable)
- **Features**:
  - SQLite database backup
  - Application logs backup
  - S3 upload support
  - Retention policy (30 days)
  - Integrity verification

### Monitoring Service
- **Base Image**: prom/node-exporter
- **Features**:
  - System metrics collection
  - Prometheus compatible
  - Resource usage monitoring
- **Port**: 9100

## 🔒 Security Features

### Container Security
- **Non-root user** execution
- **Read-only filesystem** where possible
- **No new privileges** flag
- **Minimal base images** (Alpine Linux)
- **Security updates** in base layers

### Network Security
- **Custom bridge network** with subnet isolation
- **Internal service communication**
- **Rate limiting** on external endpoints
- **Security headers** in Nginx

### Secret Management
- **Environment variable injection**
- **No secrets in images**
- **Secure defaults**
- **Required secret validation**

## 📊 Monitoring & Logging

### Health Checks
All services include comprehensive health checks:
- **Application**: HTTP endpoint check
- **Nginx**: Service availability check  
- **Redis**: Connection test
- **Database**: Integrity verification

### Logging
- **Structured logging** with JSON format
- **Log rotation** (10MB per file, 3 files)
- **Centralized collection** via Docker logging driver
- **Different log levels** for dev/prod

### Metrics
- **Node Exporter** for system metrics
- **Application metrics** via custom endpoints
- **Performance monitoring** integration
- **Resource usage tracking**

## 🔧 Maintenance Operations

### Backup Operations
```bash
# Manual backup
docker-compose exec backup /app/scripts/backup.sh

# Backup verification
docker-compose exec backup /app/scripts/backup.sh --verify /app/backups/backup_file.tar.gz

# View backup statistics
docker-compose exec backup /app/scripts/backup.sh --stats
```

### Database Operations
```bash
# Database shell
docker-compose exec app sqlite3 /app/data/parkinggarage.db

# Database migrations
docker-compose exec app npm run db:migrate

# Reset database
docker-compose exec app npm run db:migrate:reset
```

### Log Management
```bash
# View application logs
docker-compose logs -f app

# View nginx logs
docker-compose logs -f nginx

# View all logs
docker-compose logs -f
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs app

# Check resource usage
docker stats
```

#### 2. Database Connection Issues
```bash
# Check database file permissions
docker-compose exec app ls -la /app/data/

# Verify database integrity
docker-compose exec app sqlite3 /app/data/parkinggarage.db "PRAGMA integrity_check;"
```

#### 3. Nginx Configuration Issues
```bash
# Test nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx configuration
docker-compose exec nginx nginx -s reload
```

#### 4. SSL Certificate Issues
```bash
# Check certificate files
ls -la ssl/

# Verify certificate validity
openssl x509 -in ssl/server.crt -text -noout
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Run inside SQLite
PRAGMA optimize;
VACUUM;
ANALYZE;
```

#### 2. Memory Usage
```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Adjust resource limits in docker-compose.yml
```

#### 3. Disk Usage
```bash
# Clean up Docker resources
docker system prune -a

# Remove unused volumes
docker volume prune
```

## 🚢 Deployment Strategies

### Rolling Updates
```bash
# Update application with zero downtime
docker-compose build app
docker-compose up -d --no-deps app
```

### Blue-Green Deployment
```bash
# Create new environment
docker-compose -p parkinggarage-green up -d

# Switch traffic (update load balancer)
# Remove old environment
docker-compose -p parkinggarage-blue down
```

### Scaling
```bash
# Scale application instances
docker-compose up -d --scale app=3

# Update nginx upstream configuration
# for load balancing
```

## 📝 Environment Files

### .env.production.template
Complete production environment template with all required and optional variables.

### .env.development (auto-generated)
Development environment with secure defaults and debugging enabled.

## 🔗 Related Documentation
- [API Documentation](./API.md)
- [Database Schema](./DATABASE.md)
- [Security Guide](./SECURITY.md)
- [Development Guide](./DEVELOPMENT.md)