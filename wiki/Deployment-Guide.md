# Deployment Guide

## Overview

This guide covers deployment procedures for the Parking Garage Management System across development, staging, and production environments using Docker, Kubernetes, and CI/CD pipelines.

## Deployment Environments

### Development
- **URL**: http://localhost:3000
- **Purpose**: Local development and testing
- **Deploy**: Manual or hot-reload
- **Database**: Local PostgreSQL

### Staging
- **URL**: https://staging.parkinggarage.com
- **Purpose**: Pre-production testing
- **Deploy**: Automatic on develop branch
- **Database**: Staging RDS instance

### Production
- **URL**: https://api.parkinggarage.com
- **Purpose**: Live system
- **Deploy**: Manual approval required
- **Database**: Production RDS with read replicas

## Prerequisites

### Required Tools
- Docker 20+
- Kubernetes 1.25+
- kubectl
- Helm 3+
- AWS CLI (for AWS deployment)
- Terraform (for infrastructure)

### Access Requirements
- GitHub repository access
- Docker Hub account
- Cloud provider account (AWS/GCP/Azure)
- Domain name and SSL certificates

## Docker Deployment

### Building Docker Images

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
USER node

CMD ["node", "src/index.js"]
```

### Build Commands
```bash
# Build image
docker build -t parkinggarage/api:latest .

# Tag for versioning
docker tag parkinggarage/api:latest parkinggarage/api:v1.0.0

# Push to registry
docker push parkinggarage/api:v1.0.0
```

### Docker Compose (Development)
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: parking_garage
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/parking_garage
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
```

## Kubernetes Deployment

### Namespace Configuration
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: parking-garage
```

### Deployment Configuration
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parking-api
  namespace: parking-garage
spec:
  replicas: 3
  selector:
    matchLabels:
      app: parking-api
  template:
    metadata:
      labels:
        app: parking-api
    spec:
      containers:
      - name: api
        image: parkinggarage/api:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: parking-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: parking-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service Configuration
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: parking-api-service
  namespace: parking-garage
spec:
  selector:
    app: parking-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: parking-api-ingress
  namespace: parking-garage
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.parkinggarage.com
    secretName: parking-api-tls
  rules:
  - host: api.parkinggarage.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: parking-api-service
            port:
              number: 80
```

### Secrets Management
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: parking-secrets
  namespace: parking-garage
type: Opaque
stringData:
  database-url: "postgresql://user:pass@host:5432/db"
  redis-url: "redis://redis:6379"
  jwt-secret: "your-jwt-secret"
  stripe-key: "sk_live_..."
```

### Helm Chart
```yaml
# helm/values.yaml
replicaCount: 3

image:
  repository: parkinggarage/api
  tag: v1.0.0
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  host: api.parkinggarage.com
  tls:
    enabled: true

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

postgresql:
  enabled: true
  auth:
    database: parking_garage
    username: postgres

redis:
  enabled: true
  auth:
    enabled: false
```

### Deployment Commands
```bash
# Apply configurations
kubectl apply -f k8s/

# Deploy with Helm
helm install parking-garage ./helm

# Update deployment
kubectl set image deployment/parking-api api=parkinggarage/api:v1.0.1 -n parking-garage

# Scale deployment
kubectl scale deployment parking-api --replicas=5 -n parking-garage

# Check status
kubectl get pods -n parking-garage
kubectl get services -n parking-garage
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm ci
          npm run test
          npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: |
            parkinggarage/api:latest
            parkinggarage/api:${{ github.ref_name }}
          cache-from: type=registry,ref=parkinggarage/api:buildcache
          cache-to: type=registry,ref=parkinggarage/api:buildcache,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        uses: azure/k8s-deploy@v4
        with:
          namespace: parking-garage-staging
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: |
            parkinggarage/api:${{ github.ref_name }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        uses: azure/k8s-deploy@v4
        with:
          namespace: parking-garage
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: |
            parkinggarage/api:${{ github.ref_name }}
      
      - name: Verify Deployment
        run: |
          kubectl rollout status deployment/parking-api -n parking-garage
          kubectl get pods -n parking-garage
```

## Infrastructure as Code

### Terraform Configuration
```hcl
# terraform/main.tf
provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "parking-garage-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "parking-garage-cluster"
  cluster_version = "1.27"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 3
      
      instance_types = ["t3.medium"]
    }
  }
}

# RDS Database
resource "aws_db_instance" "postgres" {
  identifier = "parking-garage-db"
  
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.r6g.large"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  db_name  = "parking_garage"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = true
  deletion_protection    = true
  skip_final_snapshot    = false
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "parking-garage-cache"
  engine              = "redis"
  node_type           = "cache.r6g.large"
  num_cache_nodes     = 1
  parameter_group_name = "default.redis7"
  engine_version      = "7.0"
  port                = 6379
}
```

## Deployment Procedures

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Secrets updated
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared

### Deployment Steps

#### 1. Database Migration
```bash
# Run migrations
kubectl exec -it deploy/parking-api -n parking-garage -- npm run db:migrate

# Verify migration
kubectl exec -it deploy/parking-api -n parking-garage -- npm run db:status
```

#### 2. Deploy Application
```bash
# Deploy new version
kubectl set image deployment/parking-api api=parkinggarage/api:v1.0.1 -n parking-garage

# Monitor rollout
kubectl rollout status deployment/parking-api -n parking-garage

# Verify pods
kubectl get pods -n parking-garage
```

#### 3. Health Checks
```bash
# Check application health
curl https://api.parkinggarage.com/health

# Check metrics
curl https://api.parkinggarage.com/metrics

# Run smoke tests
npm run test:smoke
```

### Rollback Procedure
```bash
# Immediate rollback
kubectl rollout undo deployment/parking-api -n parking-garage

# Rollback to specific revision
kubectl rollout undo deployment/parking-api --to-revision=2 -n parking-garage

# Verify rollback
kubectl rollout status deployment/parking-api -n parking-garage
```

## Monitoring & Alerts

### Prometheus Configuration
```yaml
# prometheus/values.yaml
serverFiles:
  prometheus.yml:
    scrape_configs:
      - job_name: parking-api
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - parking-garage
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: parking-api
```

### Grafana Dashboards
- Application metrics
- Database performance
- API response times
- Error rates
- Business metrics

### Alert Rules
```yaml
# alerts/rules.yaml
groups:
  - name: parking-api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: High error rate detected
          
      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 1
        for: 10m
        annotations:
          summary: High response time detected
```

## Security Considerations

### SSL/TLS Configuration
- Use Let's Encrypt for certificates
- Enable HTTPS redirect
- Configure HSTS headers
- Implement certificate pinning

### Network Security
- Configure security groups
- Implement network policies
- Use private subnets
- Enable VPC flow logs

### Secrets Management
- Use Kubernetes secrets
- Rotate secrets regularly
- Use external secret managers (AWS Secrets Manager)
- Audit secret access

## Performance Optimization

### CDN Configuration
```yaml
# cloudfront.yaml
Distribution:
  Enabled: true
  Origins:
    - DomainName: api.parkinggarage.com
      Id: API
      CustomOriginConfig:
        HTTPPort: 80
        HTTPSPort: 443
        OriginProtocolPolicy: https-only
  DefaultCacheBehavior:
    TargetOriginId: API
    ViewerProtocolPolicy: redirect-to-https
    CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
```

### Database Optimization
- Configure connection pooling
- Set up read replicas
- Implement query caching
- Regular vacuum and analyze

## Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod events
kubectl describe pod <pod-name> -n parking-garage

# Check logs
kubectl logs <pod-name> -n parking-garage

# Check resource limits
kubectl top pods -n parking-garage
```

#### Database Connection Issues
```bash
# Test connection from pod
kubectl exec -it <pod-name> -n parking-garage -- psql $DATABASE_URL

# Check secrets
kubectl get secret parking-secrets -n parking-garage -o yaml
```

#### High Memory Usage
```bash
# Check memory usage
kubectl top pods -n parking-garage

# Increase limits if needed
kubectl edit deployment parking-api -n parking-garage
```

## Disaster Recovery

### Backup Procedures
```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql s3://parking-garage-backups/
```

### Recovery Procedures
```bash
# Restore database
psql $DATABASE_URL < backup_20250831.sql

# Restore application
kubectl apply -f k8s/
```

---

*For development setup, see [Development Guide](Development-Guide.md)*
*For contribution guidelines, see [Contributing](Contributing.md)*