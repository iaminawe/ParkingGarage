# Database Migration Guide

## Overview

This guide provides comprehensive instructions for migrating the Parking Garage Management System from in-memory storage to SQLite with Prisma ORM. It covers data migration, system upgrade procedures, rollback strategies, and troubleshooting.

## Migration Overview

### What's Changing
- **From**: In-memory Maps and objects (data lost on restart)
- **To**: SQLite database with Prisma ORM (persistent storage)
- **Benefits**: Data persistence, better performance, type safety, production readiness

### Migration Components
1. **Database Schema Creation** - Prisma schema and tables
2. **Data Migration** - Transfer existing data to database
3. **API Updates** - Database-backed endpoints
4. **Repository Pattern** - Type-safe database operations
5. **Transaction Support** - ACID compliance

## Pre-Migration Checklist

### System Requirements
- [ ] Node.js v18.0.0 or higher
- [ ] npm v8.0.0 or higher  
- [ ] Sufficient disk space (minimum 1GB recommended)
- [ ] Database backup location configured
- [ ] Application downtime window planned

### Backup Existing Data
```bash
# Create snapshot of current in-memory data
curl http://localhost:3000/api/export > data-snapshot-$(date +%Y%m%d_%H%M%S).json

# Backup current application state
cp -r . ../parkinggarage-backup-$(date +%Y%m%d_%H%M%S)
```

### Dependencies Installation
```bash
# Install Prisma dependencies (if not already installed)
npm install @prisma/client prisma

# Install development dependencies
npm install -D prisma @types/node
```

## Migration Process

### Step 1: Schema Setup

```bash
# 1. Initialize Prisma (if not done)
npx prisma init

# 2. Apply database schema
npx prisma db push

# 3. Generate Prisma client
npx prisma generate

# Verify schema creation
npx prisma studio
# Opens browser interface at http://localhost:5555
```

### Step 2: Data Migration Script

Create `scripts/migrate-data.js`:

```javascript
#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Configuration
const DATA_EXPORT_URL = 'http://localhost:3000/api/export';
const MIGRATION_LOG = 'logs/migration.log';

// Logging utility
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // Write to log file
  fs.appendFileSync(MIGRATION_LOG, logMessage + '\\n');
}

// Export existing data from in-memory store
async function exportExistingData() {
  log('Exporting existing data from in-memory store...');
  
  try {
    const axios = require('axios');
    const response = await axios.get(DATA_EXPORT_URL);
    
    // Save exported data
    const exportFile = `data/export-${Date.now()}.json`;
    fs.writeFileSync(exportFile, JSON.stringify(response.data, null, 2));
    
    log(`Data exported to: ${exportFile}`);
    return response.data;
  } catch (error) {
    log(`Error exporting data: ${error.message}`);
    throw error;
  }
}

// Migrate vehicles to database
async function migrateVehicles(vehicles) {
  log(`Migrating ${vehicles.length} vehicles...`);
  
  for (const vehicle of vehicles) {
    try {
      await prisma.vehicle.create({
        data: {
          licensePlate: vehicle.licensePlate,
          vehicleType: vehicle.vehicleType || 'STANDARD',
          rateType: vehicle.rateType || 'HOURLY',
          spotId: vehicle.spotId,
          ownerId: vehicle.ownerId,
          ownerName: vehicle.ownerName,
          ownerEmail: vehicle.ownerEmail,
          ownerPhone: vehicle.ownerPhone,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          checkInTime: vehicle.checkInTime ? new Date(vehicle.checkInTime) : new Date(),
          checkOutTime: vehicle.checkOutTime ? new Date(vehicle.checkOutTime) : null,
          isPaid: vehicle.isPaid || false,
          hourlyRate: vehicle.hourlyRate || 5.0,
          totalAmount: vehicle.totalAmount || 0.0,
          amountPaid: vehicle.amountPaid || 0.0,
          notes: vehicle.notes
        }
      });
      
      log(`✅ Migrated vehicle: ${vehicle.licensePlate}`);
    } catch (error) {
      log(`❌ Failed to migrate vehicle ${vehicle.licensePlate}: ${error.message}`);
    }
  }
}

// Migrate parking spots to database
async function migrateParkingSpots(spots) {
  log(`Migrating ${spots.length} parking spots...`);
  
  for (const spot of spots) {
    try {
      await prisma.parkingSpot.create({
        data: {
          spotNumber: spot.spotNumber || spot.id,
          level: spot.level || 1,
          section: spot.section || spot.bay,
          spotType: spot.spotType || 'STANDARD',
          status: spot.status || 'AVAILABLE',
          isActive: spot.isActive !== false,
          width: spot.width,
          length: spot.length,
          height: spot.height
        }
      });
      
      log(`✅ Migrated spot: ${spot.spotNumber || spot.id}`);
    } catch (error) {
      log(`❌ Failed to migrate spot ${spot.spotNumber || spot.id}: ${error.message}`);
    }
  }
}

// Create parking sessions from vehicle history
async function createParkingSessions(vehicles) {
  log('Creating parking sessions from vehicle history...');
  
  for (const vehicle of vehicles) {
    if (vehicle.spotId && vehicle.checkInTime) {
      try {
        // Find corresponding vehicle and spot in database
        const dbVehicle = await prisma.vehicle.findUnique({
          where: { licensePlate: vehicle.licensePlate }
        });
        
        const dbSpot = await prisma.parkingSpot.findUnique({
          where: { spotNumber: vehicle.spotId }
        });
        
        if (dbVehicle && dbSpot) {
          await prisma.parkingSession.create({
            data: {
              vehicleId: dbVehicle.id,
              spotId: dbSpot.id,
              startTime: new Date(vehicle.checkInTime),
              endTime: vehicle.checkOutTime ? new Date(vehicle.checkOutTime) : null,
              duration: vehicle.duration,
              hourlyRate: vehicle.hourlyRate || 5.0,
              totalAmount: vehicle.totalAmount || 0.0,
              amountPaid: vehicle.amountPaid || 0.0,
              isPaid: vehicle.isPaid || false,
              status: vehicle.checkOutTime ? 'COMPLETED' : 'ACTIVE',
              notes: vehicle.notes
            }
          });
          
          log(`✅ Created session for vehicle: ${vehicle.licensePlate}`);
        }
      } catch (error) {
        log(`❌ Failed to create session for ${vehicle.licensePlate}: ${error.message}`);
      }
    }
  }
}

// Create or update garage configuration
async function migrateGarageConfig(garageData) {
  log('Migrating garage configuration...');
  
  try {
    const garage = await prisma.garage.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        name: garageData.name || 'Downtown Parking Garage',
        address: garageData.address,
        city: garageData.city,
        state: garageData.state,
        zipCode: garageData.zipCode,
        totalSpots: garageData.totalSpots || 500,
        availableSpots: garageData.availableSpots || 500,
        hourlyRate: garageData.hourlyRate || 5.0,
        isActive: true,
        openTime: garageData.openTime || '06:00',
        closeTime: garageData.closeTime || '23:00',
        timezone: garageData.timezone || 'UTC'
      },
      update: {
        name: garageData.name || 'Downtown Parking Garage',
        totalSpots: garageData.totalSpots || 500,
        availableSpots: garageData.availableSpots || 500,
        hourlyRate: garageData.hourlyRate || 5.0
      }
    });
    
    log(`✅ Migrated garage configuration: ${garage.name}`);
  } catch (error) {
    log(`❌ Failed to migrate garage config: ${error.message}`);
  }
}

// Main migration function
async function runMigration() {
  log('Starting database migration process...');
  
  try {
    // Ensure log directory exists
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    // Export existing data
    const exportedData = await exportExistingData();
    
    // Begin migration
    log('Beginning database migration...');
    
    // Migrate data in order (spots first, then vehicles, then sessions)
    if (exportedData.spots) {
      await migrateParkingSpots(exportedData.spots);
    }
    
    if (exportedData.vehicles) {
      await migrateVehicles(exportedData.vehicles);
      // Create sessions after vehicles are migrated
      await createParkingSessions(exportedData.vehicles);
    }
    
    if (exportedData.garage) {
      await migrateGarageConfig(exportedData.garage);
    }
    
    // Verify migration
    const vehicleCount = await prisma.vehicle.count();
    const spotCount = await prisma.parkingSpot.count();
    const sessionCount = await prisma.parkingSession.count();
    
    log('Migration completed successfully!');
    log(`Migrated: ${vehicleCount} vehicles, ${spotCount} spots, ${sessionCount} sessions`);
    
    // Create migration completion marker
    fs.writeFileSync('.migration-complete', new Date().toISOString());
    
  } catch (error) {
    log(`Migration failed: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
```

### Step 3: Application Update

```bash
# 1. Update application code to use Prisma repositories
# (This is already done in the current codebase)

# 2. Update environment configuration
echo 'DATABASE_URL="file:./data/parkinggarage.db"' >> .env

# 3. Build updated application
npm run build

# 4. Test database connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('✅ Database connected')).catch(e => console.error('❌', e));
"
```

## Automated Migration Script

Create `scripts/full-migration.sh`:

```bash
#!/bin/bash
set -e

# Configuration
APP_NAME="parkinggarage"
BACKUP_DIR="./migration-backups"
LOG_FILE="logs/migration.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    echo "[ERROR] $1" >> $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> $LOG_FILE
}

# Pre-migration checks
log "Starting migration process..."

# Check if application is running
if ! pgrep -f "node.*server" > /dev/null; then
    error "Application is not running. Please start the application first."
fi

# Create backup directory
mkdir -p $BACKUP_DIR logs

# Create application backup
log "Creating application backup..."
tar -czf "$BACKUP_DIR/app-backup-$(date +%Y%m%d_%H%M%S).tar.gz" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs \
    --exclude=.git \
    .

# Export current data
log "Exporting current data..."
if ! curl -f http://localhost:3000/api/export > "$BACKUP_DIR/data-export-$(date +%Y%m%d_%H%M%S).json"; then
    warning "Could not export data. Continuing with migration..."
fi

# Stop application gracefully
log "Stopping application..."
if command -v pm2 &> /dev/null && pm2 list | grep -q $APP_NAME; then
    pm2 stop $APP_NAME
    USING_PM2=true
else
    # Find and stop Node.js process
    pkill -f "node.*server" || true
    USING_PM2=false
fi

# Wait for graceful shutdown
sleep 3

# Database setup
log "Setting up database..."

# Generate Prisma client
npx prisma generate

# Apply database schema
npx prisma db push

# Seed initial data if no existing data to migrate
if [ ! -f "$BACKUP_DIR/data-export-$(date +%Y%m%d)*.json" ]; then
    log "Seeding initial data..."
    npx prisma db seed
fi

# Run data migration
log "Running data migration..."
node scripts/migrate-data.js

# Build application
log "Building application..."
npm run build

# Update environment for database
if ! grep -q "DATABASE_URL" .env; then
    echo 'DATABASE_URL="file:./data/parkinggarage.db"' >> .env
fi

# Start application
log "Starting application..."
if [ "$USING_PM2" = true ]; then
    pm2 start $APP_NAME
else
    npm start &
fi

# Wait for application startup
sleep 10

# Verify migration success
log "Verifying migration..."
RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $RETRIES ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "✅ Application health check passed"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        warning "Health check failed, attempt $RETRY_COUNT/$RETRIES"
        sleep 5
    fi
done

if [ $RETRY_COUNT -eq $RETRIES ]; then
    error "Application health check failed after migration"
fi

# Verify database connectivity
log "Testing database operations..."
VEHICLE_COUNT=$(curl -s http://localhost:3000/api/vehicles | jq length 2>/dev/null || echo "0")
SPOT_COUNT=$(curl -s http://localhost:3000/api/spots | jq length 2>/dev/null || echo "0")

log "Migration verification:"
log "- Vehicles in database: $VEHICLE_COUNT"
log "- Parking spots in database: $SPOT_COUNT"

# Create migration completion marker
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > .migration-complete

log "🎉 Migration completed successfully!"
log "📊 Database is now persistent and ready for production"
log "📝 Migration logs: $LOG_FILE"
log "💾 Backups available in: $BACKUP_DIR"

# Cleanup instructions
log ""
log "Next steps:"
log "1. Test all application functionality"
log "2. Monitor application logs for any issues"
log "3. Schedule regular database backups"
log "4. Consider removing old backup files after verification"

exit 0
```

Make the script executable:
```bash
chmod +x scripts/full-migration.sh
```

## Rollback Procedures

### Emergency Rollback Script

Create `scripts/rollback-migration.sh`:

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="./migration-backups"
APP_NAME="parkinggarage"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1"
    exit 1
}

# Check if migration was completed
if [ ! -f ".migration-complete" ]; then
    error "No migration found to rollback"
fi

# Get latest backup
LATEST_BACKUP=$(ls -t $BACKUP_DIR/app-backup-*.tar.gz | head -n1)

if [ -z "$LATEST_BACKUP" ]; then
    error "No backup found for rollback"
fi

log "Starting rollback process..."
log "Using backup: $(basename $LATEST_BACKUP)"

# Stop application
log "Stopping application..."
if command -v pm2 &> /dev/null && pm2 list | grep -q $APP_NAME; then
    pm2 stop $APP_NAME || true
    pm2 delete $APP_NAME || true
else
    pkill -f "node.*server" || true
fi

# Create safety backup of current state
log "Creating safety backup of current state..."
tar -czf "$BACKUP_DIR/pre-rollback-$(date +%Y%m%d_%H%M%S).tar.gz" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs \
    --exclude=.git \
    .

# Remove database and migration markers
log "Cleaning up database..."
rm -f data/parkinggarage.db*
rm -f .migration-complete

# Restore from backup
log "Restoring application from backup..."
tar -xzf "$LATEST_BACKUP"

# Reinstall dependencies
log "Reinstalling dependencies..."
npm ci

# Rebuild application
log "Rebuilding application..."
npm run build

# Restore original environment
log "Restoring environment configuration..."
if grep -q "DATABASE_URL" .env; then
    sed -i '/DATABASE_URL/d' .env
fi

# Start application
log "Starting application..."
npm start &

# Wait and verify
sleep 10

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "✅ Rollback completed successfully"
    log "Application is running with in-memory storage"
else
    error "❌ Rollback failed - application not responding"
fi
```

### Manual Rollback Steps

If automated rollback fails:

1. **Stop Application**
   ```bash
   pm2 stop parkinggarage
   # or
   pkill -f "node.*server"
   ```

2. **Remove Database Files**
   ```bash
   rm -f data/parkinggarage.db*
   rm -f .migration-complete
   ```

3. **Restore Code from Git**
   ```bash
   git checkout HEAD~1  # or specific commit before migration
   npm ci
   npm run build
   ```

4. **Remove Database Configuration**
   ```bash
   sed -i '/DATABASE_URL/d' .env
   ```

5. **Start Application**
   ```bash
   npm start
   ```

## Data Validation

### Validation Script

Create `scripts/validate-migration.js`:

```javascript
#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function validateMigration() {
  console.log('🔍 Validating migration...');
  
  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connectivity: OK');
    
    // Check data counts
    const vehicleCount = await prisma.vehicle.count();
    const spotCount = await prisma.parkingSpot.count();
    const sessionCount = await prisma.parkingSession.count();
    const garageCount = await prisma.garage.count();
    
    console.log('📊 Data validation:');
    console.log(`   Vehicles: ${vehicleCount}`);
    console.log(`   Spots: ${spotCount}`);
    console.log(`   Sessions: ${sessionCount}`);
    console.log(`   Garages: ${garageCount}`);
    
    // Test API endpoints
    console.log('\\n🌐 Testing API endpoints:');
    
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log(`✅ Health check: ${healthResponse.status}`);
    
    const vehiclesResponse = await axios.get('http://localhost:3000/api/vehicles');
    console.log(`✅ Vehicles endpoint: ${vehiclesResponse.status} (${vehiclesResponse.data.data?.length || 0} records)`);
    
    const spotsResponse = await axios.get('http://localhost:3000/api/spots');
    console.log(`✅ Spots endpoint: ${spotsResponse.status} (${spotsResponse.data.data?.length || 0} records)`);
    
    // Test database operations
    console.log('\\n🔧 Testing database operations:');
    
    // Test read operation
    const sampleVehicle = await prisma.vehicle.findFirst();
    if (sampleVehicle) {
      console.log(`✅ Read operation: Found vehicle ${sampleVehicle.licensePlate}`);
    } else {
      console.log('ℹ️  Read operation: No vehicles found (expected for fresh migration)');
    }
    
    // Test write operation
    const testVehicle = await prisma.vehicle.create({
      data: {
        licensePlate: 'TEST-MIGRATION',
        vehicleType: 'STANDARD',
        checkInTime: new Date()
      }
    });
    console.log(`✅ Write operation: Created test vehicle ${testVehicle.licensePlate}`);
    
    // Clean up test data
    await prisma.vehicle.delete({
      where: { id: testVehicle.id }
    });
    console.log('✅ Delete operation: Removed test vehicle');
    
    console.log('\\n🎉 Migration validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration validation failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
if (require.main === module) {
  validateMigration();
}

module.exports = { validateMigration };
```

## Troubleshooting Migration Issues

### Common Problems and Solutions

#### 1. Migration Script Fails
```bash
# Check logs
tail -f logs/migration.log

# Verify Prisma client generation
npx prisma generate

# Test database connection
node -e "console.log(require('@prisma/client'))"
```

#### 2. Data Export Fails
```bash
# Manual data export
curl http://localhost:3000/api/export > manual-export.json

# Check if endpoints exist
curl http://localhost:3000/api/vehicles
curl http://localhost:3000/api/spots
```

#### 3. Database Schema Issues
```bash
# Reset and recreate schema
npx prisma db push --force-reset

# Check schema status
npx prisma migrate status
```

#### 4. Application Won't Start After Migration
```bash
# Check environment variables
grep DATABASE_URL .env

# Verify database file exists
ls -la data/parkinggarage.db

# Check application logs
pm2 logs parkinggarage
```

#### 5. Performance Issues
```bash
# Analyze database
sqlite3 data/parkinggarage.db "PRAGMA integrity_check;"
sqlite3 data/parkinggarage.db "ANALYZE;"

# Optimize database
sqlite3 data/parkinggarage.db "VACUUM;"
```

### Recovery Strategies

#### If Migration Partially Completes
1. **Assess the situation**
   ```bash
   # Check what was migrated
   sqlite3 data/parkinggarage.db ".tables"
   sqlite3 data/parkinggarage.db "SELECT COUNT(*) FROM vehicles;"
   ```

2. **Complete the migration**
   ```bash
   # Continue from where it left off
   node scripts/migrate-data.js --continue
   ```

3. **Or start fresh**
   ```bash
   # Reset and start over
   rm -f data/parkinggarage.db
   ./scripts/full-migration.sh
   ```

#### If Data is Corrupted
1. **Restore from backup**
   ```bash
   ./scripts/rollback-migration.sh
   ```

2. **Fix corruption and retry**
   ```bash
   sqlite3 data/parkinggarage.db "PRAGMA integrity_check;"
   # If corrupted, restore from backup and retry
   ```

## Post-Migration Tasks

### 1. Performance Optimization
```bash
# Analyze and optimize database
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$executeRaw\`ANALYZE;\`.then(() => console.log('Database analyzed'));
"
```

### 2. Backup Setup
```bash
# Setup automated backups
crontab -e
# Add: 0 2 * * * /path/to/scripts/backup.sh
```

### 3. Monitoring Setup
```bash
# Enable health monitoring
crontab -e
# Add: */5 * * * * /path/to/scripts/health-check.sh
```

### 4. Documentation Update
- Update API documentation with database-backed endpoints
- Update deployment procedures
- Update backup and recovery procedures

## Migration Verification Checklist

- [ ] Database file created successfully
- [ ] All tables created with proper schema
- [ ] Data migrated without loss
- [ ] Application starts without errors
- [ ] API endpoints respond correctly
- [ ] Health checks pass
- [ ] Performance is acceptable
- [ ] Backup procedures work
- [ ] Rollback procedures tested
- [ ] Documentation updated

## Best Practices

### Before Migration
1. **Test on staging environment first**
2. **Notify users of planned downtime**
3. **Prepare rollback plan**
4. **Ensure sufficient disk space**
5. **Verify backup systems**

### During Migration
1. **Monitor progress closely**
2. **Keep detailed logs**
3. **Don't skip validation steps**
4. **Have rollback ready if needed**

### After Migration
1. **Monitor application performance**
2. **Verify data integrity**
3. **Update monitoring systems**
4. **Train team on new procedures**
5. **Schedule regular backups**

This migration guide provides comprehensive instructions for safely transitioning from in-memory storage to a persistent SQLite database with full rollback capabilities and validation procedures.