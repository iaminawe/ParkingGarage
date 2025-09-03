# Enhanced Database Seeding

## 🎯 Quick Start

The Parking Garage application includes a sophisticated database seeding system that generates comprehensive, realistic test data for development, testing, and analytics.

### Basic Commands

```bash
# Quick development setup
npm run db:seed -- --size=small --clear

# Full testing environment  
npm run db:seed -- --size=large --clear --historical

# Analytics dataset (1.5M+ records)
npm run db:seed -- --size=analytics --historical-months=24 --clear
```

## 📊 Dataset Sizes

| Size | Records | Use Case | Generation Time |
|------|---------|----------|-----------------|
| **Small** | ~728 | Local development | 30 seconds |
| **Medium** | ~7,000 | Feature testing | 2 minutes |
| **Large** | ~67,000 | Performance testing | 10 minutes |
| **Extra-Large** | ~400,000 | Load testing | 45 minutes |
| **Analytics** | ~1,500,000 | Business intelligence | 3+ hours |

## 🔧 Configuration Options

### Command Line Flags

- `--size=<SIZE>` - Dataset size (small/medium/large/extra-large/analytics)
- `--clear` - Clear existing data before seeding
- `--historical` - Generate historical data patterns
- `--historical-months=<N>` - Number of months of historical data
- `--no-users` - Skip user account generation
- `--no-sessions` - Skip parking session generation  
- `--no-payments` - Skip payment data generation
- `--no-audit` - Skip security audit logs

### Environment Settings

- `--env=development` - Development mode (default)
- `--env=staging` - Staging environment
- `--env=production` - Production-safe minimal data
- `--env=test` - Test environment optimized

## 🏗️ Generated Data Structure

### User Management System
- **Users**: 25-25,000 with authentication data
- **User Sessions**: Web/mobile/API sessions with security tracking
- **Security Audits**: Login attempts, risk scores, anomaly detection
- **Device Tracking**: Browser fingerprints, IP addresses, geo-locations

### Parking Infrastructure  
- **Garages**: 1-15 with realistic names and operating hours
- **Floors**: 3-225 with proper layout organization
- **Parking Spots**: 150-56,250 with intelligent type distribution:
  - Standard: 57%
  - Compact: 20% 
  - Electric: 10%
  - Handicap: 5%
  - Oversized: 5%
  - Motorcycle: 3%

### Business Operations
- **Vehicles**: Realistic make/model combinations with owner relationships
- **Parking Sessions**: Time-based patterns with business hours bias
- **Payments**: Multiple methods with realistic success rates
- **Tickets**: Violations with proper fine structures
- **Transactions**: Complete financial audit trail

## ⚡ Smart Features

### Realistic Patterns
- **Time Distribution**: 80% of sessions during business hours (7 AM - 7 PM)
- **Weekend Reduction**: 40% fewer sessions on weekends
- **Seasonal Variations**: Historical data spanning configurable months
- **Duration Modeling**: Realistic parking duration distributions

### Vehicle-Spot Matching
- EVs prefer electric spots but can use standard
- Oversized vehicles require appropriate spaces
- Motorcycles can use any spot type
- Handicap vehicles get priority access

### Dynamic Pricing
- **Base Rates**: $3-8/hour based on spot type
- **Location Multipliers**: Airport/Downtown (1.5x), Medical/University (1.2x)
- **Time-Based**: Realistic rate adjustments

## 📈 Analytics Insights

After generation, the system provides analytics:

```
📈 Enhanced Seed Summary:
   Total records: 67,630

   Analytics Insights:
   Estimated occupancy rate: 22%
   Avg sessions per spot: 2.21
   Payment rate: 1.14
```

### Business Intelligence Features
- **Occupancy Analysis**: Real-time and historical patterns
- **Revenue Tracking**: Comprehensive financial metrics
- **User Behavior**: Login patterns and security insights
- **Operational Metrics**: Spot utilization and efficiency data

## 🔍 Data Inspection

### Prisma Studio - Visual Database Browser

After seeding, inspect your data visually:

```bash
# 1. Seed your database
npm run db:seed -- --size=medium --clear

# 2. Start Prisma Studio (opens at localhost:5555)
npm run db:studio

# 3. Browse tables, relationships, and data patterns
```

**Key Tables to Explore:**
- `users` - Authentication data and user roles
- `parkingSpots` - Spot distribution and types
- `parkingSessions` - Time patterns and durations
- `payments` - Transaction methods and status
- `securityAuditLog` - Security events and risk scores

**Studio Features:**
- Visual relationship navigation
- Advanced filtering and searching
- Data export capabilities
- Real-time data editing (development only!)

## 🔍 Use Cases

### Development
```bash
npm run db:seed -- --size=small --clear
npm run db:studio  # Inspect the generated data
# Perfect for local development and debugging
```

### Testing
```bash  
npm run db:seed -- --size=medium --historical --clear
npm run db:studio  # Verify test data patterns
# Comprehensive testing with historical patterns
```

### Performance Testing
```bash
npm run db:seed -- --size=large --clear
npm run db:studio  # Monitor data distribution
# Test application performance with realistic load
```

### Analytics Development
```bash
npm run db:seed -- --size=analytics --historical-months=12 --clear  
npm run db:studio  # Explore business intelligence data
# Full dataset for BI and reporting features
```

### CI/CD Integration
```bash
npm run db:seed -- --size=small --env=test --clear
# Automated testing in continuous integration
```

## 🛠️ Troubleshooting

### Common Issues

**Out of Memory**
```bash
node --max-old-space-size=4096 node_modules/.bin/ts-node prisma/seed.ts --size=analytics
```

**Database Locks**
```bash
npm run db:reset
npm run db:seed -- --size=small --clear
```

**Slow Generation**
- Start with `--size=small` for testing
- Use `--no-*` flags to skip unnecessary data types
- Consider `--no-historical` for faster generation

### Performance Tips

1. **Progressive Sizing**: Start small, scale up as needed
2. **Selective Generation**: Use flags to generate only required data
3. **Clear Data**: Always use `--clear` when changing configurations
4. **Monitor Resources**: Large datasets require significant memory/time

## 🔗 Integration Examples

### GitHub Actions
```yaml
- name: Setup Test Database
  run: |
    npm run db:migrate
    npm run db:seed -- --size=small --env=test --clear
```

### Docker
```dockerfile
RUN npm run db:seed -- --size=small --env=production --clear
```

### Development Scripts
```json
{
  "scripts": {
    "dev:seed": "npm run db:seed -- --size=small --clear",
    "test:seed": "npm run db:seed -- --size=medium --env=test --clear", 
    "analytics:seed": "npm run db:seed -- --size=analytics --historical-months=12 --clear"
  }
}
```

## 📚 Related Pages

- [[Database Schema|Database-Schema]]
- [[API Documentation|API-Reference]]
- [[Performance Testing|Performance-Guide]]
- [[Development Setup|Getting-Started]]

## 🏷️ Tags

`database` `seeding` `test-data` `development` `analytics` `performance`

---

*This wiki page documents the enhanced database seeding system. For detailed technical documentation, see [SEED_DATA_GUIDE.md](../docs/SEED_DATA_GUIDE.md).*
