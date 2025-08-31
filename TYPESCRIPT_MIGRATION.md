# TypeScript Migration Guide for Parking Garage API

This guide helps you migrate the existing JavaScript codebase to TypeScript gradually and systematically.

## 🚀 Current Setup Status

✅ **Completed Setup:**
- TypeScript and all @types packages installed
- Comprehensive tsconfig.json with strict type checking
- TypeScript-compatible ESLint configuration
- Jest configured with ts-jest for TypeScript support
- Prettier configured for TypeScript formatting
- Build configurations for development and production
- Updated npm scripts for TypeScript workflow

## 📋 Available Scripts

### TypeScript Workflow
```bash
# Type checking (no output files)
npm run type-check
npm run type-check:watch

# Build TypeScript to JavaScript
npm run build
npm run build:watch

# Clean build directory
npm run clean

# Development with TypeScript
npm run dev        # Uses ts-node for .ts files
npm run dev:js     # Uses nodemon for .js files

# Production
npm run start      # Runs compiled JavaScript from dist/
```

### Development Tools
```bash
# Linting (supports both .js and .ts)
npm run lint
npm run lint:fix

# Formatting (supports both .js and .ts)
npm run format
npm run format:check

# Testing (supports both .js and .ts)
npm run test
npm run test:watch
npm run test:coverage
```

## 🔧 Migration Strategy

### Phase 1: Foundation Setup ✅ COMPLETE
- [x] Install TypeScript dependencies
- [x] Configure tsconfig.json with strict settings
- [x] Update build tools (ESLint, Prettier, Jest)
- [x] Create build configurations

### Phase 2: Type Definitions (Next Step)
Create TypeScript interfaces and types:

```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// src/types/garage.ts
export interface GarageConfig {
  name: string;
  floors: FloorConfig[];
  rates: RateConfig;
  spotTypes: SpotTypeConfig;
}

// src/types/spot.ts
export interface ParkingSpot {
  id: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: SpotType;
  status: SpotStatus;
  features: SpotFeature[];
  createdAt: string;
  updatedAt: string;
}
```

### Phase 3: Gradual Migration
Migrate files one by one, starting with:

1. **Models** (src/models/*.js → *.ts)
   - `garage.js` → `garage.ts`
   - `spot.js` → `spot.ts` 
   - `vehicle.js` → `vehicle.ts`

2. **Utilities** (src/utils/*.js → *.ts)
   - `validators.js` → `validators.ts`
   - `timeCalculator.js` → `timeCalculator.ts`
   - `pagination.js` → `pagination.ts`

3. **Services** (src/services/*.js → *.ts)
   - `garageService.js` → `garageService.ts`
   - `spotService.js` → `spotService.ts`
   - etc.

4. **Controllers** (src/controllers/*.js → *.ts)
5. **Routes** (src/routes/*.js → *.ts)
6. **Main files** (src/app.js → app.ts, src/server.js → server.ts)

## 🎯 Migration Best Practices

### 1. File-by-File Migration
```bash
# Rename .js to .ts
mv src/models/spot.js src/models/spot.ts

# Add types gradually
npm run type-check  # Check for type errors

# Fix type errors one at a time
npm run lint:fix    # Auto-fix what's possible
```

### 2. Type Safety Levels
Start with basic types and gradually increase strictness:

```typescript
// Level 1: Basic types
function calculateFee(hours: number): number {
  return hours * 5.0;
}

// Level 2: Object types
interface Vehicle {
  licensePlate: string;
  spotId: string;
  checkInTime: string;
}

// Level 3: Generic types
class Repository<T> {
  private items: Map<string, T> = new Map();
  
  findById(id: string): T | undefined {
    return this.items.get(id);
  }
}
```

### 3. Common Migration Patterns

#### Express Request/Response Types
```typescript
import { Request, Response, NextFunction } from 'express';

interface CustomRequest extends Request {
  user?: UserProfile;
}

export const getGarage = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Implementation
  } catch (error) {
    next(error);
  }
};
```

#### Repository Pattern with Types
```typescript
interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

class BaseRepository<T extends Entity> {
  protected items: Map<string, T> = new Map();
  
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    // Implementation
  }
  
  findById(id: string): T | null {
    return this.items.get(id) || null;
  }
}
```

### 4. Error Handling with Types
```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Type-safe error responses
type ErrorResponse = {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
};
```

## 🔍 Current Type Issues to Address

The type checker found these issues that need attention during migration:

1. **Unused imports and declarations** - Clean up during migration
2. **Missing type definitions** - Add proper interfaces
3. **Undefined object access** - Add null checks and proper typing
4. **Incompatible type assignments** - Align data structures

## 🛠 Development Workflow

### During Migration
1. **Start type checking in watch mode:**
   ```bash
   npm run type-check:watch
   ```

2. **Work on one file at a time:**
   ```bash
   # Rename file
   mv src/utils/validators.js src/utils/validators.ts
   
   # Add basic types
   # Fix type errors shown in watch mode
   # Test the changes
   npm test
   ```

3. **Commit frequently:**
   ```bash
   git add src/utils/validators.ts
   git commit -m "feat: migrate validators.js to TypeScript"
   ```

### Building for Production
```bash
# Clean build
npm run clean

# Type check first
npm run type-check

# Build if no type errors
npm run build

# Test the compiled output
npm run start
```

## 🎯 Migration Checklist

- [ ] Phase 1: Foundation ✅ (Complete)
- [ ] Phase 2: Create type definitions in src/types/
- [ ] Phase 3: Migrate utilities (src/utils/)
- [ ] Phase 4: Migrate models (src/models/)
- [ ] Phase 5: Migrate repositories (src/repositories/)
- [ ] Phase 6: Migrate services (src/services/)
- [ ] Phase 7: Migrate controllers (src/controllers/)
- [ ] Phase 8: Migrate routes (src/routes/)
- [ ] Phase 9: Migrate main files (app.js, server.js)
- [ ] Phase 10: Migrate tests to TypeScript
- [ ] Phase 11: Final cleanup and optimization

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript with Node.js](https://nodejs.dev/learn/nodejs-with-typescript)
- [Express with TypeScript](https://blog.logrocket.com/how-to-set-up-node-typescript-express/)
- [Jest with TypeScript](https://jestjs.io/docs/getting-started#using-typescript)

## 🎉 Benefits After Migration

- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Enhanced autocomplete and refactoring
- **Self-Documenting Code**: Types serve as documentation
- **Easier Refactoring**: TypeScript helps identify breaking changes
- **Improved Developer Experience**: Better debugging and navigation
- **Future-Proof**: Better maintainability and scalability

---

**Next Steps:** Begin Phase 2 by creating type definitions in `src/types/` directory.