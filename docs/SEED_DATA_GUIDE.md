# Enhanced Database Seed System Guide

## Overview

The Parking Garage application includes a sophisticated database seeding system that generates comprehensive, realistic test data for development, testing, and analytics. This system creates over 67,000 records across multiple entity types with proper relationships and realistic patterns.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Data Generation Details](#data-generation-details)
- [Usage Examples](#usage-examples)
- [Analytics Insights](#analytics-insights)
- [Troubleshooting](#troubleshooting)

## Features

### 🎯 **Realistic Data Patterns**
- **Time-based distributions**: Business hours bias, weekend patterns, historical data
- **Seasonal variations**: Configurable historical data spanning months or years
- **User behavior modeling**: Realistic login patterns, session durations, payment behaviors

### 👥 **Comprehensive User Management**
- **Authentication data**: Users with hashed passwords, 2FA settings, verification tokens
- **Device tracking**: Browser fingerprints, IP addresses, geo-locations
- **Security audit trails**: Login attempts, risk scores, suspicious activity detection
- **Session management**: Web/mobile/API sessions with proper expiration

### 🏗️ **Advanced Infrastructure Modeling**
- **Multi-garage scenarios**: 1-15 garages with varying characteristics
- **Floor management**: Up to 15 floors per garage with realistic layouts
- **Smart spot distribution**: Proper mix of Standard (57%), Compact (20%), Electric (10%), etc.
- **Dynamic occupancy**: Realistic occupancy patterns across different spot types

### 🚗 **Intelligent Vehicle & Session Management**
- **Vehicle-spot matching**: EVs prefer electric spots, oversized vehicles need appropriate spaces
- **Realistic pricing**: Dynamic rates based on spot type and garage location
- **Payment patterns**: Multiple payment methods with realistic success rates
- **Business operations**: Tickets, violations, refunds, and financial transactions

## Quick Start

### Basic Usage

```bash
# Generate medium-sized dataset (default)
npm run db:seed

# Generate small dataset for development
npm run db:seed -- --size=small --clear

# Generate large dataset with historical data
npm run db:seed -- --size=large --clear --historical
```

### Advanced Configuration

```bash
# Analytics dataset with 2 years of historical data
npm run db:seed -- --size=analytics --historical-months=24 --clear

# Custom configuration without user audit data
npm run db:seed -- --size=medium --no-audit --clear

# Development setup without payment processing
npm run db:seed -- --size=small --no-payments --clear
```

## Configuration Options

### Size Configurations

| Size | Garages | Floors | Spots | Vehicles | Sessions | Users | Records |
|------|---------|--------|-------|----------|----------|-------|---------|
| **small** | 1 | 3 | 150 | 30 | 100 | 25 | ~728 |
| **medium** | 3 | 15 | 1,500 | 500 | 2,000 | 200 | ~7,000 |
| **large** | 5 | 40 | 6,000 | 3,000 | 15,000 | 1,500 | ~67,000 |
| **extra-large** | 10 | 120 | 24,000 | 15,000 | 100,000 | 8,000 | ~400,000 |
| **analytics** | 15 | 225 | 56,250 | 50,000 | 500,000 | 25,000 | ~1,500,000 |

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--size=<SIZE>` | Dataset size (small/medium/large/extra-large/analytics) | `medium` |
| `--env=<ENV>` | Environment (development/staging/production/test) | `development` |
| `--clear` | Clear existing data before seeding | `false` |
| `--historical` | Generate historical data | `false` |
| `--historical-months=<N>` | Number of months of historical data | `6` |
| `--no-users` | Skip user generation | `false` |
| `--no-sessions` | Skip parking session generation | `false` |
| `--no-payments` | Skip payment generation | `false` |
| `--no-audit` | Skip security audit data generation | `false` |

## Data Generation Details

### User Management System

#### Users (25-25,000)
- **Roles**: Admin, Manager, Operator, User with realistic distribution
- **Authentication**: Bcrypt hashed passwords, 2FA settings (20% enabled)
- **Verification**: Email/phone verification status with tokens
- **Localization**: Multiple languages and timezones

#### User Devices (28-50,000)
- **Device Types**: Desktop (40%), Mobile (35%), Tablet (25%)
- **Browser Data**: Chrome, Safari, Firefox, Edge with OS information
- **Security**: Fingerprinting, trusted device status, IP tracking
- **Geo-location**: 30 major US cities with realistic distribution

#### Security Audit Logs (50-100,000)
- **Actions**: Login, logout, password changes, 2FA events, profile updates
- **Risk Assessment**: Automated risk scoring (0.0-1.0) for security events
- **Anomaly Detection**: 8% of events marked as potential anomalies
- **Compliance**: Full audit trail for security compliance requirements

### Parking Infrastructure

#### Garages (1-15)
- **Naming**: Realistic names (Downtown Central, Airport Long-term, etc.)
- **Operating Hours**: Configurable with timezone support
- **Capacity**: 300-500+ spots per garage with varying floor counts
- **Characteristics**: Premium locations have higher rates

#### Floors (3-225)
- **Layout**: Ground floor + numbered levels with descriptive names
- **Capacity**: 100-250 spots per floor with realistic bay organization
- **Status**: 98% active floors with maintenance considerations

#### Parking Spots (150-56,250)
- **Type Distribution**:
  - Standard: 57% (most common)
  - Compact: 20% (small vehicles)
  - Electric: 10% (EV charging)
  - Handicap: 5% (ADA compliant)
  - Oversized: 5% (trucks, RVs)
  - Motorcycle: 3% (two-wheelers)
- **Status Distribution**:
  - Available: 65%
  - Occupied: 25%
  - Reserved: 5%
  - Maintenance: 3%
  - Out of Order: 2%
- **Physical Dimensions**: Realistic width/length/height based on type

### Vehicle & Session Management

#### Vehicles (30-50,000)
- **Make/Model**: 10+ manufacturers with realistic model associations
- **Type Matching**: EVs (Tesla, Prius, Leaf), Compact (Civic, Corolla), etc.
- **Owner Relationships**: 60% owned by registered users, 40% guest parking
- **Registration**: License plates, years (2010-2023), colors, contact info

#### Parking Sessions (100-500,000)
- **Time Patterns**:
  - Business hours bias: 80% between 7 AM - 7 PM
  - Weekend reduction: 40% fewer sessions on weekends
  - Duration distribution: 30min-2hr (30%), 2-6hr (40%), 6-11hr (30%)
- **Vehicle-Spot Matching**:
  - EVs prefer electric spots but can use standard
  - Oversized vehicles require oversized spots
  - Motorcycles can use any spot type
- **Status Distribution**:
  - Completed: 85%
  - Active: 10% (today's sessions)
  - Expired: 3%
  - Cancelled: 2%
- **Payment Integration**: Realistic payment timing and success rates

### Business Operations

#### Dynamic Pricing System
- **Base Rates**:
  - Handicap: $3.00/hr (discounted)
  - Motorcycle: $3.00/hr
  - Compact: $4.00/hr
  - Standard: $5.00/hr
  - Oversized: $7.00/hr
  - Electric: $8.00/hr (premium)
- **Location Multipliers**:
  - Airport/Downtown: 1.5x
  - Medical/University: 1.2x
  - Shopping/Standard: 1.0x

#### Tickets & Violations (8-8,000)
- **Violation Types**: Overstay, no payment, expired meter, invalid spot
- **Fine Structure**: $25-200 based on violation severity
- **Status Tracking**: Issued, paid, disputed, overdue with payment due dates
- **QR Codes**: Digital ticket tracking with barcode data

#### Payments & Transactions (108-508,000)
- **Payment Methods**:
  - Credit Card: 40%
  - Debit Card: 25%
  - Mobile Pay: 20%
  - App Payment: 10%
  - Cash: 5%
- **Transaction Types**: Parking fees, penalties, refunds, monthly passes
- **Success Rates**: 90% completed, 7% pending, 3% failed
- **Financial Tracking**: Full transaction history with references

## Usage Examples

### Development Setup
```bash
# Quick development setup with minimal data
npm run db:seed -- --size=small --clear
# Result: ~728 records, perfect for local development
```

### Testing Environment
```bash
# Medium dataset for comprehensive testing
npm run db:seed -- --size=medium --clear --historical
# Result: ~7,000 records with 3 months of historical data
```

### Performance Testing
```bash
# Large dataset to test application performance
npm run db:seed -- --size=large --clear --historical
# Result: ~67,000 records with 6 months of data
```

### Analytics Development
```bash
# Full analytics dataset with 2 years of data
npm run db:seed -- --size=analytics --historical-months=24 --clear
# Result: ~1.5M records for comprehensive analytics testing
```

### Custom Scenarios
```bash
# User management focus (no parking operations)
npm run db:seed -- --size=medium --no-sessions --no-payments --clear

# Payment system testing (minimal infrastructure)
npm run db:seed -- --size=small --clear

# Security audit testing
npm run db:seed -- --size=medium --clear --no-sessions
```

## Analytics Insights

The seed system provides built-in analytics insights after generation:

### Key Metrics
- **Occupancy Rate**: Percentage of total spot usage over time
- **Sessions per Spot**: Average utilization per parking space
- **Payment Rate**: Ratio of payments to sessions (includes multiple payments)
- **Revenue Potential**: Based on realistic pricing and usage patterns

### Sample Output
```
📈 Enhanced Seed Summary:
   Users: 1500
   User Sessions: 2000
   Login History: 8000
   Audit Logs: 3000

   Parking Infrastructure:
   Garages: 5
   Floors: 40
   Spots: 6000
   Vehicles: 3000

   Business Operations:
   Parking Sessions: 13285
   Tickets: 200
   Payments: 15200
   Transactions: 15400

   Total records: 67630

   Analytics Insights:
   Estimated occupancy rate: 22%
   Avg sessions per spot: 2.21
   Payment rate: 1.14
```

### Data Quality Features
- **Referential Integrity**: All foreign keys properly maintained
- **Realistic Distributions**: Based on actual parking industry data
- **Time Consistency**: Proper chronological ordering of events
- **Business Logic**: Enforced rules (e.g., can't pay before parking)

## Troubleshooting

### Common Issues

#### Out of Memory
```bash
# For large datasets, increase Node.js memory
node --max-old-space-size=4096 node_modules/.bin/ts-node prisma/seed.ts --size=analytics
```

#### Database Locks
```bash
# Clear existing connections
npm run db:reset
npm run db:seed -- --size=small --clear
```

#### Unique Constraint Violations
The system handles this automatically, but if you encounter issues:
```bash
# Always use --clear for fresh start
npm run db:seed -- --clear --size=medium
```

### Performance Tips

1. **Start Small**: Use `--size=small` for initial development
2. **Use --clear**: Always clear data when changing configurations
3. **Historical Data**: Only use `--historical` when needed for analytics
4. **Selective Generation**: Use `--no-*` flags to skip unnecessary data types

### Data Validation

After seeding, verify data integrity:

```sql
-- Check referential integrity
SELECT COUNT(*) as orphaned_sessions 
FROM parking_sessions ps 
LEFT JOIN vehicles v ON ps.vehicleId = v.id 
WHERE v.id IS NULL;

-- Verify spot occupancy
SELECT status, COUNT(*) as count 
FROM parking_spots 
GROUP BY status;

-- Check payment consistency  
SELECT isPaid, COUNT(*) as sessions 
FROM parking_sessions 
GROUP BY isPaid;
```

## Advanced Configuration

### Custom Seed Profiles

Create custom configurations by modifying `prisma/seed.ts`:

```typescript
// Add custom size configuration
const customConfig = {
  garages: 2,
  floorsPerGarage: 4,
  spotsPerFloor: 75,
  vehicles: 100,
  sessions: 500,
  // ... other settings
};
```

### Environment-Specific Settings

```bash
# Production-safe seeding (minimal data)
npm run db:seed -- --env=production --size=small --no-audit

# Staging with full features
npm run db:seed -- --env=staging --size=medium --historical

# Test environment with specific focus
npm run db:seed -- --env=test --size=small --no-users
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Seed Test Database
  run: |
    npm run db:migrate
    npm run db:seed -- --size=small --clear --env=test
```

### Docker Integration

```dockerfile
# In your Dockerfile
RUN npm run db:seed -- --size=small --clear --env=production
```

## Contributing

To extend the seed system:

1. **Add New Entities**: Extend the `DatabaseSeeder` class
2. **Modify Distributions**: Update percentage allocations in generator methods
3. **Add Relationships**: Ensure proper foreign key references
4. **Test Changes**: Always test with `--size=small` first

## Database Inspection with Prisma Studio

After seeding your database, you can visually inspect and manage the generated data using Prisma Studio:

### Starting Prisma Studio

```bash
# Start Prisma Studio (opens in browser)
npm run db:studio

# Alternative: Direct command
npx prisma studio

# Custom port (if 5555 is busy)
npx prisma studio --port 5556
```

Prisma Studio will open at `http://localhost:5555` and provides:

### Features Available in Prisma Studio
- **Visual Data Browser**: Navigate through all your seeded data
- **Table Relationships**: Click through foreign key relationships
- **Data Filtering**: Search and filter records across all tables
- **Record Editing**: Modify individual records (be careful with seeded data!)
- **Query Builder**: Build complex queries visually
- **Data Export**: Export filtered data to CSV

### Recommended Workflow

1. **Seed your database**:
   ```bash
   npm run db:seed -- --size=medium --clear
   ```

2. **Start Prisma Studio**:
   ```bash
   npm run db:studio
   ```

3. **Explore the data**:
   - Browse `users` table to see authentication data
   - Check `parkingSpots` for spot distribution
   - View `parkingSessions` for realistic time patterns
   - Examine `payments` for transaction data

### Useful Prisma Studio Tips

- **Relationship Navigation**: Click on foreign key values to jump to related records
- **Bulk Operations**: Select multiple records for batch operations
- **Column Sorting**: Click column headers to sort data
- **Advanced Filters**: Use the filter panel for complex queries
- **Table Stats**: View record counts and data types

### Security Note
**Never run Prisma Studio in production!** It provides full database access and should only be used in development environments.

## Related Documentation

- [Database Schema Guide](./DATABASE.md)
- [API Documentation](./API.md)
- [Performance Testing](./PERFORMANCE.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

*Last Updated: September 3, 2025*
*Version: 2.0.0*
