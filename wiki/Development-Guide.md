# Development Guide

## Prerequisites

### Required Software
- Node.js 18+ and npm 9+
- SQLite 3
- Prisma CLI
- Git
- VS Code or preferred IDE

### Optional Software
- Redis 6+ (for caching - optional)
- Docker & Docker Compose (for Redis)

### Recommended Tools
- Postman or Insomnia (API testing)
- SQLite Browser or DBeaver (Database management)
- Redis Commander (Redis GUI, if using Redis)
- Prisma Studio (Database GUI)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ParkingGarage.git
cd ParkingGarage
```

### 2. Install Dependencies
```bash
npm install

# Install Prisma CLI globally (optional)
npm install -g prisma
```

### 3. Environment Configuration
Create `.env` file in root directory:
```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL="file:./parking_garage.db"

# Redis (Optional - for caching)
REDIS_URL="redis://localhost:6379"
CACHE_TTL=3600

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Performance
ENABLE_QUERY_OPTIMIZATION=true
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_THRESHOLD_MS=1000

# Security
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Development
HOT_RELOAD=true
DEBUG=app:*
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Create and seed database
npx prisma db push

# Seed development data (optional)
npm run db:seed

# View database in Prisma Studio
npx prisma studio
```

### 5. Start Development Server
```bash
# Start main application
npm run dev

# Or start with different configurations
npm run start:dev    # Development mode
npm run start:debug  # Debug mode
npm run start:test   # Test environment
```

### 6. Optional: Start Redis (for caching)
```bash
# Using Docker
docker run -d --name redis-parking -p 6379:6379 redis:alpine

# Using Docker Compose
docker-compose up -d redis
```

## Project Structure

```
ParkingGarage/
├── src/                    # Source code
│   ├── app.ts             # Express application setup
│   ├── server.ts          # Server entry point
│   ├── controllers/       # Request handlers
│   │   ├── sessionsController.ts
│   │   ├── vehicleController.ts
│   │   ├── spotController.ts
│   │   └── garageController.ts
│   ├── routes/           # API route definitions
│   │   ├── sessions.ts
│   │   ├── vehicles.ts
│   │   ├── spots.ts
│   │   └── garage.ts
│   ├── services/         # Business logic
│   │   ├── sessionsService.ts
│   │   ├── vehicleService.ts
│   │   ├── spotService.ts
│   │   ├── CacheService.ts
│   │   └── QueryOptimizer.ts
│   ├── repositories/     # Data access layer
│   │   ├── sessionsRepository.ts
│   │   ├── vehicleRepository.ts
│   │   ├── spotRepository.ts
│   │   └── garageRepository.ts
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── performance.middleware.ts
│   │   └── validation/
│   ├── models/          # Data models and types
│   │   ├── Vehicle.ts
│   │   ├── spot.ts
│   │   └── garage.ts
│   ├── types/           # TypeScript definitions
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── express.d.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   ├── performanceMetrics.ts
│   │   └── validators.ts
│   └── config/          # Configuration
│       └── database.config.ts
├── prisma/              # Prisma configuration
│   └── schema.prisma    # Database schema
├── tests/               # Test suites
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── database/       # Database tests
│   ├── performance/    # Performance tests
│   ├── factories/      # Test data factories
│   └── helpers/        # Test helpers
├── docs/               # Documentation
├── logs/               # Application logs
└── .claude-flow/       # Claude Flow configuration
```

## Development Workflow

### 1. Feature Development

#### Using TDD Approach
```bash
# 1. Write failing test
npm run test:watch

# 2. Implement feature
# 3. Make test pass
# 4. Refactor code
# 5. Run full test suite
npm test
```

#### Database Changes with Prisma
```bash
# 1. Modify schema.prisma
# 2. Generate migration
npx prisma db push

# 3. Generate new client
npx prisma generate

# 4. Update TypeScript types
npm run build
```

### 2. Code Style Guidelines

#### TypeScript/JavaScript
```typescript
// Use TypeScript interfaces for type safety
interface CreateVehicleRequest {
  licensePlate: string;
  vehicleType: VehicleType;
  ownerName?: string;
  ownerEmail?: string;
}

// Use async/await for asynchronous operations
const createVehicle = async (data: CreateVehicleRequest): Promise<Vehicle> => {
  try {
    // Validate input
    const validatedData = await validateVehicleData(data);
    
    // Check for duplicates
    const existing = await vehicleRepository.findByLicensePlate(data.licensePlate);
    if (existing) {
      throw new ValidationError('Vehicle already registered');
    }
    
    // Create vehicle
    const vehicle = await vehicleRepository.create(validatedData);
    
    // Log creation
    logger.info('Vehicle created', { vehicleId: vehicle.id, licensePlate: vehicle.licensePlate });
    
    return vehicle;
  } catch (error) {
    logger.error('Vehicle creation failed', { error: error.message, data });
    throw error;
  }
};
```

#### Prisma Schema Conventions
```prisma
// Use descriptive model names
model Vehicle {
  id                String      @id @default(cuid())
  licensePlate      String      @unique
  vehicleType       VehicleType @default(STANDARD)
  
  // Relations use descriptive names
  sessions          ParkingSession[]
  spot              ParkingSpot?    @relation(fields: [spotId], references: [id])
  
  // Performance indexes for common queries
  @@index([licensePlate])
  @@index([spotId])
  @@index([vehicleType, checkInTime])
  
  // Use snake_case for database table names
  @@map("vehicles")
}
```

### 3. API Development

#### Controller Pattern
```typescript
// controllers/vehicleController.ts
import { Request, Response, NextFunction } from 'express';
import { vehicleService } from '../services';
import { CreateVehicleRequest } from '../types';

export const createVehicle = async (
  req: Request<{}, {}, CreateVehicleRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const vehicle = await vehicleService.createVehicle(req.body);
    
    res.status(201).json({
      success: true,
      data: { vehicle },
      message: 'Vehicle registered successfully'
    });
  } catch (error) {
    next(error); // Handled by error middleware
  }
};
```

#### Service Pattern
```typescript
// services/vehicleService.ts
import { prisma } from '../config/database';
import { CacheService } from './CacheService';
import { QueryOptimizer } from './QueryOptimizer';

class VehicleService {
  private cache = new CacheService();
  private optimizer = new QueryOptimizer();

  async findByLicensePlate(licensePlate: string): Promise<Vehicle | null> {
    // Try cache first
    const cached = await this.cache.get(`vehicle:${licensePlate}`);
    if (cached) return cached;

    // Database query with optimization
    const vehicle = await this.optimizer.optimizeQuery(() =>
      prisma.vehicle.findUnique({
        where: { licensePlate },
        include: {
          sessions: {
            where: { status: 'ACTIVE' },
            take: 1
          }
        }
      })
    );

    // Cache result
    if (vehicle) {
      await this.cache.set(`vehicle:${licensePlate}`, vehicle, 3600);
    }

    return vehicle;
  }
}
```

### 4. Database Development

#### Repository Pattern
```typescript
// repositories/vehicleRepository.ts
import { prisma } from '../config/database';
import { Prisma, Vehicle } from '@prisma/client';

export class VehicleRepository {
  async create(data: Prisma.VehicleCreateInput): Promise<Vehicle> {
    return prisma.vehicle.create({
      data,
      include: {
        spot: true,
        sessions: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });
  }

  async findWithActiveSession(licensePlate: string): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({
      where: { licensePlate },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          include: { spot: true }
        }
      }
    });
  }

  async updatePaymentStatus(id: string, isPaid: boolean): Promise<Vehicle> {
    return prisma.vehicle.update({
      where: { id },
      data: { isPaid, updatedAt: new Date() }
    });
  }
}
```

### 5. Testing

#### Unit Test Example
```typescript
// tests/unit/services/vehicleService.test.ts
import { VehicleService } from '../../../src/services/vehicleService';
import { vehicleRepository } from '../../../src/repositories';
import { VehicleFactory } from '../../factories';

jest.mock('../../../src/repositories');

describe('VehicleService', () => {
  let vehicleService: VehicleService;
  
  beforeEach(() => {
    vehicleService = new VehicleService();
    jest.clearAllMocks();
  });

  describe('createVehicle', () => {
    it('should create vehicle with valid data', async () => {
      // Arrange
      const vehicleData = VehicleFactory.build();
      const expectedVehicle = VehicleFactory.build({ ...vehicleData, id: 'test-id' });
      
      (vehicleRepository.create as jest.Mock).mockResolvedValue(expectedVehicle);
      
      // Act
      const result = await vehicleService.createVehicle(vehicleData);
      
      // Assert
      expect(result).toEqual(expectedVehicle);
      expect(vehicleRepository.create).toHaveBeenCalledWith(vehicleData);
    });
  });
});
```

#### Integration Test Example
```typescript
// tests/integration/api-database-integration.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { VehicleFactory } from '../factories';

describe('Vehicle API Integration', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.vehicle.deleteMany();
    await prisma.parkingSpot.deleteMany();
  });

  describe('POST /api/vehicles', () => {
    it('should create vehicle and return 201', async () => {
      // Arrange
      const vehicleData = VehicleFactory.build();
      
      // Act
      const response = await request(app)
        .post('/api/vehicles')
        .send(vehicleData)
        .expect(201);
      
      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicle).toMatchObject({
        licensePlate: vehicleData.licensePlate,
        vehicleType: vehicleData.vehicleType
      });
      
      // Verify in database
      const dbVehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: vehicleData.licensePlate }
      });
      expect(dbVehicle).toBeTruthy();
    });
  });
});
```

### 6. Performance Optimization

#### Using CacheService
```typescript
// Implement caching in services
const getCachedGarageStats = async (): Promise<GarageStats> => {
  const cacheKey = 'garage:stats';
  
  let stats = await cacheService.get(cacheKey);
  if (!stats) {
    stats = await calculateGarageStats();
    await cacheService.set(cacheKey, stats, 300); // 5 minutes TTL
  }
  
  return stats;
};
```

#### Using QueryOptimizer
```typescript
// Optimize database queries
const getVehicleHistory = async (licensePlate: string) => {
  return queryOptimizer.optimizeQuery(
    () => prisma.vehicle.findUnique({
      where: { licensePlate },
      include: {
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: { spot: true }
        }
      }
    }),
    { operationName: 'getVehicleHistory' }
  );
};
```

## Common Development Tasks

### Adding a New API Endpoint
1. **Define route** in appropriate route file
2. **Create controller method** with proper typing
3. **Implement service logic** with error handling
4. **Add repository methods** if needed
5. **Write unit and integration tests**
6. **Update API documentation**

### Adding Database Fields
1. **Update Prisma schema** in `prisma/schema.prisma`
2. **Run database migration**: `npx prisma db push`
3. **Regenerate Prisma client**: `npx prisma generate`
4. **Update TypeScript types** and interfaces
5. **Update repository methods** as needed
6. **Write tests** for new functionality

### Performance Optimization
1. **Identify bottlenecks** using performance middleware
2. **Add database indexes** for slow queries
3. **Implement caching** for expensive operations
4. **Optimize Prisma queries** with select/include
5. **Monitor with performance metrics**

## Debugging

### VS Code Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug App",
      "program": "${workspaceFolder}/src/server.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal",
      "restart": true,
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

### Debug Commands
```bash
# Start with debugging
npm run start:debug

# View database
npx prisma studio

# Check logs
tail -f logs/app.log

# Performance monitoring
npm run perf:monitor
```

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:database
npm run test:performance

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with specific pattern
npm test -- --testNamePattern="Vehicle"
```

## Troubleshooting

### Common Issues

#### Prisma Client Out of Sync
```bash
# Regenerate client
npx prisma generate

# Reset database (development only)
npx prisma db push --force-reset
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Change port in .env
PORT=3001
```

#### Database Lock Issues
```bash
# Check for active connections
npx prisma studio

# Restart development server
npm run dev
```

#### Performance Issues
```bash
# Check slow queries
tail -f logs/app.log | grep "SLOW_QUERY"

# Monitor performance
npm run perf:monitor

# Clear cache
npm run cache:clear
```

## Environment Variables Reference

```env
# Required
NODE_ENV=development|production|test
PORT=3000
DATABASE_URL="file:./parking_garage.db"

# Optional
REDIS_URL="redis://localhost:6379"
LOG_LEVEL=debug|info|warn|error
CACHE_TTL=3600
ENABLE_QUERY_OPTIMIZATION=true
ENABLE_PERFORMANCE_MONITORING=true
```

---

*For API documentation, see [API Documentation](API-Documentation.md)*
*For deployment instructions, see [Deployment Guide](Deployment-Guide.md)*
*For performance optimization, see [Performance Guide](Performance-Guide.md)*