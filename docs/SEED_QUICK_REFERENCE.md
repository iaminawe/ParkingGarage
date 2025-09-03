# Database Seeding Quick Reference

## 🚀 Common Commands

```bash
# Development setup (minimal data)
npm run db:seed -- --size=small --clear

# Testing with historical data
npm run db:seed -- --size=medium --clear --historical

# Performance testing (large dataset)
npm run db:seed -- --size=large --clear --historical

# Analytics dataset (production-scale)
npm run db:seed -- --size=analytics --historical-months=24 --clear
```

## 📏 Size Reference

| Size | Users | Spots | Sessions | Records | Time |
|------|-------|-------|----------|---------|------|
| **small** | 25 | 150 | 100 | ~728 | 30s |
| **medium** | 200 | 1,500 | 2,000 | ~7,000 | 2m |
| **large** | 1,500 | 6,000 | 15,000 | ~67,000 | 10m |
| **extra-large** | 8,000 | 24,000 | 100,000 | ~400,000 | 45m |
| **analytics** | 25,000 | 56,250 | 500,000 | ~1,500,000 | 3h+ |

## 🎛️ Configuration Flags

### Size Options
- `--size=small` - Development
- `--size=medium` - Testing
- `--size=large` - Performance testing
- `--size=extra-large` - Load testing
- `--size=analytics` - Business intelligence

### Data Control
- `--clear` - Clear existing data first
- `--historical` - Generate historical patterns
- `--historical-months=N` - Months of history (default: 6)
- `--no-users` - Skip user generation
- `--no-sessions` - Skip parking sessions
- `--no-payments` - Skip payment data
- `--no-audit` - Skip security logs

### Environment
- `--env=development` - Default
- `--env=staging` - Staging environment
- `--env=production` - Minimal production data
- `--env=test` - CI/CD optimized

## 🎯 Use Cases

### Local Development
```bash
npm run db:seed -- --size=small --clear
# Fast generation, minimal data for feature development
```

### Feature Testing
```bash
npm run db:seed -- --size=medium --clear
# Comprehensive data for testing all features
```

### Performance Testing
```bash
npm run db:seed -- --size=large --clear --historical
# Realistic load with historical patterns
```

### Analytics Development
```bash
npm run db:seed -- --size=analytics --historical-months=12 --clear
# Full dataset for BI and reporting features
```

### CI/CD Pipeline
```bash
npm run db:seed -- --size=small --env=test --clear
# Fast, reliable data for automated tests
```

### User Management Testing
```bash
npm run db:seed -- --size=medium --no-sessions --no-payments --clear
# Focus on authentication and user features
```

### Payment System Testing
```bash
npm run db:seed -- --size=small --clear
# Minimal infrastructure, full payment flow
```

## 📊 Data Distribution

### Parking Spots
- Standard: 57%
- Compact: 20%
- Electric: 10%
- Handicap: 5%
- Oversized: 5%
- Motorcycle: 3%

### Spot Status
- Available: 65%
- Occupied: 25%
- Reserved: 5%
- Maintenance: 3%
- Out of Order: 2%

### Session Status
- Completed: 85%
- Active: 10%
- Expired: 3%
- Cancelled: 2%

### Time Patterns
- Business Hours (7AM-7PM): 80%
- Off Hours: 20%
- Weekend Reduction: 40%

## 🔧 Troubleshooting

### Memory Issues
```bash
node --max-old-space-size=4096 node_modules/.bin/ts-node prisma/seed.ts --size=analytics
```

### Database Locks
```bash
npm run db:reset
npm run db:seed -- --size=small --clear
```

### Slow Performance
- Start with `--size=small`
- Use selective flags (`--no-*`)
- Avoid `--historical` for speed

## 📈 Output Metrics

After seeding, you'll see:
- **Total Records**: Complete count across all entities
- **Occupancy Rate**: Realistic parking utilization
- **Sessions per Spot**: Average utilization efficiency
- **Payment Rate**: Financial transaction ratio

## 🔍 Data Inspection with Prisma Studio

### Start Prisma Studio
```bash
# Visual database browser (opens at localhost:5555)
npm run db:studio

# Alternative
npx prisma studio

# Custom port
npx prisma studio --port 5556
```

### Workflow
```bash
# 1. Seed database
npm run db:seed -- --size=medium --clear

# 2. Open visual inspector
npm run db:studio

# 3. Browse seeded data at http://localhost:5555
```

### What to Inspect
- **users**: Authentication data, roles, 2FA settings
- **parkingSpots**: Spot types and distribution
- **parkingSessions**: Time patterns and duration
- **payments**: Transaction data and methods
- **securityAuditLog**: Security events and risks

## 🔗 Integration

### package.json Scripts
```json
{
  "scripts": {
    "dev:seed": "npm run db:seed -- --size=small --clear",
    "dev:studio": "npm run db:studio",
    "test:seed": "npm run db:seed -- --size=medium --env=test --clear",
    "perf:seed": "npm run db:seed -- --size=large --historical --clear"
  }
}
```

### GitHub Actions
```yaml
- run: npm run db:seed -- --size=small --env=test --clear
```

### Docker
```dockerfile
RUN npm run db:seed -- --size=small --env=production --clear
```

---

*For complete documentation, see [SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md)*
