# Secrets Management Guide

This guide covers secure generation, storage, rotation, and management of production secrets for the Parking Garage application.

## 🔐 Overview

The application uses multiple layers of secrets for security:
- **JWT Secrets**: For authentication token signing
- **Database Encryption Keys**: For encrypting sensitive data at rest
- **Session Secrets**: For session management and CSRF protection
- **API Keys**: For external service integration
- **Webhook Secrets**: For validating incoming webhooks

## 🛠️ Quick Start

### Generate New Secrets

```bash
# Generate all production secrets
node scripts/security/generate-secrets.js

# Generate specific secret type
node scripts/security/generate-secrets.js --format json
```

### Rotate Existing Secrets

```bash
# Rotate specific secret
node scripts/security/rotate-secrets.js --secret JWT_SECRET

# Rotate all secrets
node scripts/security/rotate-secrets.js --all

# Audit secret strength
node scripts/security/rotate-secrets.js --audit
```

## 📋 Secret Types and Requirements

### JWT Secrets
- **Purpose**: Sign and verify authentication tokens
- **Requirements**: 64+ characters, high entropy, complex charset
- **Rotation**: Every 90 days or on suspected compromise

```bash
JWT_SECRET=<64-char-complex-string>
JWT_REFRESH_SECRET=<64-char-complex-string>
```

### Session & CSRF Protection
- **Purpose**: Secure session management and prevent CSRF attacks
- **Requirements**: 64+ characters in production
- **Rotation**: Every 180 days

```bash
SESSION_SECRET=<64-char-complex-string>
CSRF_SECRET=<64-char-complex-string>
```

### Database Encryption
- **Purpose**: Encrypt sensitive data before database storage
- **Requirements**: 256-bit key (64 hex characters)
- **Rotation**: Every 365 days with data re-encryption

```bash
DATABASE_ENCRYPTION_KEY=<64-char-hex-string>
```

### External Service Keys
- **Purpose**: Authenticate with third-party services
- **Format**: Service-specific (varies by provider)
- **Rotation**: Per service policy

```bash
SENDGRID_API_KEY=<sendgrid-format-key>
PAYMENT_API_KEY=pk_live_<stripe-format-key>
WEBHOOK_SECRET=<32-char-base64url-string>
```

## 🔄 Rotation Policy

### Mandatory Rotation Schedule

| Secret Type | Rotation Frequency | Priority |
|-------------|-------------------|----------|
| JWT_SECRET | 90 days | Critical |
| JWT_REFRESH_SECRET | 90 days | Critical |
| DATABASE_ENCRYPTION_KEY | 365 days | Critical |
| SESSION_SECRET | 180 days | High |
| CSRF_SECRET | 180 days | High |
| API Keys | Per vendor policy | Medium |

### Emergency Rotation

Immediately rotate secrets if:
- Security breach suspected
- Employee with access leaves
- Secrets accidentally exposed (logs, commits, etc.)
- Compliance audit requirement

```bash
# Emergency rotation
node scripts/security/rotate-secrets.js --all --backup
```

## 🏭 Production Deployment

### Environment Setup

1. **Never commit production secrets to version control**
2. **Use secure environment variable injection**
3. **Validate all secrets before deployment**

```bash
# Production validation
node scripts/security/rotate-secrets.js --audit --env .env.production
```

### Deployment Checklist

- [ ] All secrets generated with proper entropy
- [ ] No default or example values in production
- [ ] Secrets validated against strength requirements  
- [ ] Backup created before deployment
- [ ] Environment variables properly injected
- [ ] Application starts without validation errors

### Secure Storage Options

#### Option 1: Container Orchestration Secrets
```bash
# Kubernetes
kubectl create secret generic app-secrets \
  --from-env-file=.env.production

# Docker Swarm  
docker secret create jwt_secret jwt_secret.txt
```

#### Option 2: Cloud Provider Secret Managers
```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name parking-garage/prod/jwt-secret \
  --secret-string "your-secret-here"

# Azure Key Vault
az keyvault secret set \
  --vault-name parking-garage-vault \
  --name jwt-secret \
  --value "your-secret-here"

# Google Secret Manager
gcloud secrets create jwt-secret \
  --data-file=jwt_secret.txt
```

#### Option 3: HashiCorp Vault
```bash
# Write secret to Vault
vault kv put secret/parking-garage/prod \
  JWT_SECRET="your-secret-here" \
  DATABASE_ENCRYPTION_KEY="your-key-here"
```

## 🔍 Monitoring and Auditing

### Secret Health Monitoring

```bash
# Check secret strength
node scripts/security/rotate-secrets.js --audit

# View rotation history
node scripts/security/rotate-secrets.js --history

# Clean old backups
node scripts/security/rotate-secrets.js --clean-backups
```

### Audit Log Analysis

```bash
# Check for weak secrets
grep -i "password\|secret\|key" logs/app.log | grep -i "weak\|default\|example"

# Monitor failed authentications
grep "authentication failed" logs/security.log
```

### Compliance Reporting

The rotation utility maintains an audit trail:
- Rotation timestamps
- Secret type and version
- Backup file locations  
- Hash verification of old/new values

## 🚨 Incident Response

### Suspected Secret Compromise

1. **Immediate Response** (< 15 minutes)
   ```bash
   # Rotate all secrets immediately
   node scripts/security/rotate-secrets.js --all
   
   # Invalidate all active sessions
   # (Application-specific - clear Redis/database sessions)
   ```

2. **Assessment** (< 1 hour)
   - Identify scope of exposure
   - Check logs for unauthorized access
   - Notify relevant stakeholders

3. **Recovery** (< 4 hours)
   - Deploy new secrets to all environments
   - Verify application functionality
   - Monitor for abnormal activity

4. **Post-Incident** (< 24 hours)
   - Document incident timeline
   - Update security procedures
   - Conduct lessons learned review

### Secret Exposure in Code

```bash
# If secrets were committed to Git
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.production' \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remove from remote history
git push origin --force --all
git push origin --force --tags
```

## 🛡️ Security Best Practices

### Development Environment

```bash
# Use separate secrets for dev/staging/production
cp .env.example .env
# Fill in development values - never copy production secrets!
```

### Secret Generation

```bash
# Always use cryptographically secure generation
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Verify entropy
node scripts/security/generate-secrets.js --format json | jq -r '.JWT_SECRET' | wc -c
```

### Storage Security

1. **Encrypt at Rest**: Use encrypted storage for secret backups
2. **Access Control**: Limit who can view/modify secrets
3. **Audit Trail**: Log all secret access and modifications
4. **Separation**: Different secrets for each environment

### Network Security

```bash
# Use TLS for all secret transmission
# Verify certificate in production
openssl s_client -connect your-app.com:443 -servername your-app.com
```

## 📚 Reference

### Secret Strength Requirements

| Environment | Min Length | Character Set | Entropy |
|-------------|------------|---------------|---------|
| Development | 32 chars | Alphanumeric | Medium |
| Staging | 48 chars | Complex | High |
| Production | 64 chars | Complex | Maximum |

### Validation Rules

```javascript
// JWT secrets: 64+ chars, complex charset
/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{64,}$/

// Database keys: 64 hex chars (256-bit)
/^[a-fA-F0-9]{64}$/

// API keys: Service-specific format
/^pk_live_[A-Za-z0-9]{48}$/ // Stripe example
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Weak secret error | Using default/example values | Generate new secrets |
| Length validation | Secret too short for environment | Use longer secrets |
| Format validation | Wrong character set/format | Check secret type requirements |
| Rotation failure | File permissions/backup issues | Check script permissions |

## 🔗 Related Documentation

- [Environment Configuration](../ENVIRONMENT.md)
- [Security Architecture](../SECURITY.md) 
- [Deployment Guide](../DEPLOYMENT.md)
- [Incident Response Plan](../INCIDENT_RESPONSE.md)

## 🆘 Support

For security issues or questions:
- **Security Team**: security@company.com
- **On-call**: +1-xxx-xxx-xxxx
- **Documentation**: Internal security wiki
- **Training**: Security awareness portal

Remember: **When in doubt, rotate the secrets!** It's better to be safe than sorry.