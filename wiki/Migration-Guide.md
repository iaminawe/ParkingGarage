# Migration Scripts & Data Transfer Guide

This guide covers the comprehensive migration system for transferring data from the in-memory MemoryStore to SQLite database using Prisma.

## Overview

The migration system provides:
- ✅ Safe data migration with backup/restore capabilities
- ✅ Resumable migrations with checkpoint system
- ✅ Comprehensive data validation and integrity checking
- ✅ Rollback procedures for error recovery
- ✅ Seed data generation for development/testing
- ✅ Batch processing for large datasets
- ✅ Progress tracking and status reporting

## Quick Start

### 1. Basic Migration
```bash
# Run the complete migration process
npm run db:migrate-data

# Validate data integrity only (no migration)
npm run db:validate

# Create manual backup
npm run db:backup
```

### 2. Migration with Options
```bash
# Dry run (preview without changes)
npm run db:migrate-data -- --dry-run

# Resume from checkpoint
npm run db:migrate-data -- --resume

# Skip backup creation
npm run db:migrate-data -- --skip-backup

# Custom batch size
npm run db:migrate-data -- --batch-size=200
```

### 3. Rollback Operations
```bash
# Interactive rollback
npm run db:rollback

# Confirm rollback non-interactively
npm run db:rollback -- --confirm

# Rollback with specific backup
npm run db:rollback -- --backup-id=migration-1234567890

# Emergency rollback
npm run db:rollback -- --emergency --confirm
```

## Migration Process

### Phase 1: Pre-Migration
1. **Status Initialization**: Creates migration tracking record
2. **Backup Creation**: Backs up MemoryStore data and existing SQLite database
3. **Validation**: Validates source data integrity
4. **Space Check**: Verifies sufficient disk space

### Phase 2: Schema Setup
1. **Database Migration**: Applies Prisma schema migrations
2. **Index Creation**: Creates necessary database indexes
3. **Constraint Setup**: Configures foreign key constraints

### Phase 3: Data Migration
1. **Garage Configuration**: Migrates garage settings and configuration
2. **Parking Spots**: Transfers spot definitions with proper type mapping
3. **Vehicles**: Migrates vehicle records with owner information
4. **Parking Sessions**: Transfers session history with relationships
5. **Tickets & Payments**: Migrates violation and payment records

### Phase 4: Post-Migration
1. **Data Validation**: Comprehensive integrity checking
2. **Relationship Verification**: Ensures foreign key consistency
3. **Statistics Generation**: Creates migration summary report
4. **Cleanup**: Removes temporary files and closes connections

## File Structure

```
scripts/
├── migrate-data.ts         # Main migration script
├── rollback-migration.ts   # Rollback and recovery script
src/utils/
├── migration-status.ts     # Status tracking and checkpoints
├── data-backup.ts         # Backup and restore utilities
├── data-validation.ts     # Data integrity validation
prisma/
├── seed.ts               # Development data seeding
├── schema.prisma         # Database schema definition
tests/
├── migration.test.ts     # Comprehensive migration tests
docs/
├── MIGRATION_GUIDE.md    # This guide
```

## Migration Options

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--resume` | Resume from last checkpoint | false |
| `--validate-only` | Run validation without migration | false |
| `--dry-run` | Preview changes without executing | false |
| `--batch-size=N` | Records per batch | 100 |
| `--skip-backup` | Skip backup creation | false |
| `--id=<string>` | Custom migration ID | auto-generated |

### Rollback Options

| Option | Description | Default |
|--------|-------------|---------|
| `--confirm` | Skip confirmation prompt | false |
| `--backup-id=<id>` | Specific backup to restore | latest |
| `--preserve-new-data` | Keep new data during rollback | false |
| `--emergency` | Emergency rollback mode | false |
| `--skip-validation` | Skip post-rollback validation | false |

## Data Mapping

### Type Conversions

| MemoryStore | Prisma Schema | Notes |
|-------------|---------------|-------|
| `'standard'` | `'STANDARD'` | Vehicle/Spot types |
| `'compact'` | `'COMPACT'` | Case normalization |
| `'available'` | `'AVAILABLE'` | Status enums |
| `'active'` | `'ACTIVE'` | State mapping |

### Field Transformations

- **License Plates**: Normalized to uppercase
- **Dates**: Converted to ISO format
- **JSON Fields**: Stringified for database storage
- **Relations**: ID mapping and validation
- **Features**: Array to JSON string conversion

## Checkpoint System

Migrations create checkpoints for resumability:

```typescript
{
  id: "checkpoint-12345",
  step: "migrate-vehicles",
  timestamp: "2024-01-15T10:30:00Z",
  data: {
    totalRecords: 1000,
    processedRecords: 750,
    currentTable: "vehicles",
    lastProcessedId: "VEH-750"
  }
}
```

### Resume Process
1. Checks for existing checkpoints
2. Validates checkpoint integrity
3. Resumes from last successful step
4. Continues with remaining data

## Backup System

### Backup Contents
- **MemoryStore Collections**: All Map and Set data
- **SQLite Database**: Complete database file
- **WAL/SHM Files**: Transaction log files
- **Metadata**: Backup information and checksums

### Backup Structure
```
.migration/backups/migration-1234567890/
├── backup-metadata.json
├── memorystore-spots.json
├── memorystore-vehicles.json
├── memorystore-sessions.json
├── memorystore-garageConfig.json
├── sqlite-dev.db
├── sqlite-dev.db-wal
└── sqlite-dev.db-shm
```

## Validation System

### Pre-Migration Validation
- Source data format checking
- Required field validation
- Relationship consistency
- Duplicate detection

### Post-Migration Validation
- Record count verification
- Field value comparison
- Relationship integrity
- Data type consistency

### Validation Report
```typescript
{
  success: true,
  errors: [],
  statistics: {
    totalRecords: 1500,
    validRecords: 1500,
    invalidRecords: 0,
    missingRecords: 0
  },
  tableResults: {
    vehicles: { memoryCount: 500, sqliteCount: 500, matched: 500 },
    spots: { memoryCount: 1000, sqliteCount: 1000, matched: 1000 }
  }
}
```

## Error Handling

### Common Issues

1. **Foreign Key Violations**
   - Cause: Missing related records
   - Solution: Ensure all dependencies exist
   - Prevention: Run pre-migration validation

2. **Duplicate Key Errors**
   - Cause: Conflicting unique constraints
   - Solution: Clean duplicate data before migration
   - Prevention: Use `skipDuplicates: true` option

3. **Disk Space Issues**
   - Cause: Insufficient storage for backup/migration
   - Solution: Free up space or use external storage
   - Prevention: Check available space before migration

4. **Timeout Errors**
   - Cause: Large dataset processing
   - Solution: Reduce batch size, increase timeout
   - Prevention: Use appropriate batch sizing

### Recovery Procedures

1. **Automatic Rollback**: Failed migrations trigger automatic rollback
2. **Manual Rollback**: Use rollback command with specific backup
3. **Emergency Recovery**: Minimal dependency rollback for critical failures
4. **Partial Recovery**: Resume from last successful checkpoint

## Performance Optimization

### Batch Processing
- Default batch size: 100 records
- Recommended for large datasets: 50-200 records
- Memory usage scales with batch size

### Database Optimization
- Disable foreign key checks during migration
- Use transactions for batch operations
- Create indexes after data migration

### Progress Monitoring
```bash
# Monitor migration progress
tail -f .migration/status-<id>.json

# Check system resources
ps aux | grep node
df -h  # Disk space
free -h  # Memory usage
```

## Development Data Seeding

### Seed Sizes
- **Small**: 1 garage, 150 spots, 30 vehicles, 20 sessions
- **Medium**: 2 garages, 1000 spots, 200 vehicles, 150 sessions  
- **Large**: 5 garages, 8000 spots, 2000 vehicles, 1500 sessions

### Seed Commands
```bash
# Default medium seed
npm run db:seed

# Specific size with options
npm run db:seed -- --size=large --clear

# Environment-specific seeding
npm run db:seed -- --env=staging --size=medium

# Skip certain data types
npm run db:seed -- --no-sessions --no-payments
```

## Testing

### Test Categories
- Unit tests for individual components
- Integration tests for full migration flow
- Performance tests for large datasets
- Error recovery and rollback tests

### Running Tests
```bash
# All migration tests
npm test tests/migration.test.ts

# Specific test suites
npm test -- --testNamePattern="Migration Status"
npm test -- --testNamePattern="Data Validation"
npm test -- --testNamePattern="Rollback"
```

## Monitoring and Logging

### Log Locations
- Migration logs: `.migration/logs/`
- Status files: `.migration/status-<id>.json`
- Checkpoint data: `.migration/checkpoints/`

### Status Monitoring
```typescript
// Get migration progress
const statusTracker = new MigrationStatusTracker(migrationId);
const progress = await statusTracker.getProgress();
console.log(`${progress.percentage}% complete`);
```

## Best Practices

### Before Migration
1. **Create Full Backup**: Always backup before migration
2. **Validate Data**: Run validation checks
3. **Test Environment**: Test migration on staging data
4. **Resource Check**: Ensure sufficient disk space and memory
5. **Downtime Planning**: Schedule during low-usage periods

### During Migration
1. **Monitor Progress**: Watch logs and status files
2. **Resource Monitoring**: Check system resources
3. **Avoid Interruption**: Don't stop process mid-migration
4. **Keep Backups**: Maintain multiple backup copies

### After Migration
1. **Validate Results**: Run comprehensive validation
2. **Performance Test**: Verify application performance
3. **Monitor Closely**: Watch for any issues
4. **Keep Backups**: Maintain migration backups
5. **Document Changes**: Record any customizations

## Troubleshooting

### Common Commands
```bash
# Check migration status
cat .migration/status-<id>.json | jq .

# List available backups
ls -la .migration/backups/

# Emergency stop and rollback
npm run db:rollback -- --emergency --confirm

# Manual validation
npm run db:validate

# Clear migration state
rm -rf .migration/
```

### Support Information
- Migration logs contain detailed error information
- Checkpoint files enable precise resume points
- Backup metadata includes restoration instructions
- Test suite covers edge cases and error scenarios

## Migration Checklist

### Pre-Migration
- [ ] Application is in maintenance mode
- [ ] Current data is backed up
- [ ] Migration script is tested
- [ ] Disk space is verified (3x data size minimum)
- [ ] Database connections are available
- [ ] Team is notified of maintenance window

### Post-Migration
- [ ] Data validation passes
- [ ] Application functions correctly
- [ ] Performance is acceptable
- [ ] Backup files are secured
- [ ] Migration status is documented
- [ ] Application is returned to normal operation

## Example Migration Scenarios

### Scenario 1: Small Development Database
```bash
# Quick migration for development
npm run db:migrate-data --batch-size=50 --skip-backup

# Expected duration: 2-5 minutes
# Memory usage: ~100MB
# Disk space: ~50MB
```

### Scenario 2: Production System with 10,000 Records
```bash
# Production-safe migration with full backup
npm run db:backup
npm run db:migrate-data --batch-size=100 --id=prod-migration-2024

# Expected duration: 15-30 minutes
# Memory usage: ~300MB
# Disk space: ~500MB
```

### Scenario 3: Large Enterprise Deployment
```bash
# Enterprise migration with custom settings
npm run db:migrate-data --batch-size=200 --resume --id=enterprise-migration

# Expected duration: 1-2 hours
# Memory usage: ~800MB
# Disk space: ~2GB
```

## Integration with CI/CD

### Automated Migration Pipeline

```yaml
# .github/workflows/migration.yml
name: Database Migration
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migration
        run: npm run db:migrate-data -- --batch-size=100
        env:
          NODE_ENV: ${{ github.event.inputs.environment }}
      
      - name: Validate migration
        run: npm run db:validate
      
      - name: Notify on failure
        if: failure()
        run: npm run db:rollback -- --emergency --confirm
```

## Related Documentation

- **[Database Schema](Database-Schema.md)** - Understanding the target schema
- **[State Management](State-Management.md)** - State architecture overview
- **[Deployment Guide](Deployment-Guide.md)** - Production deployment procedures
- **[Performance](Performance-Load-Testing.md)** - Post-migration performance testing

---

For additional support or questions about the migration system, refer to the test files in `tests/migration.test.ts` for comprehensive usage examples.