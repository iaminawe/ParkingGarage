# Quick Start Guide

## Overview

Get up and running with the Parking Garage Management System in under 10 minutes. This guide covers the essential setup steps for new developers joining the project.

## System Status: Production Ready ✅

- **194/194 tests passing** (100% success rate)
- **TypeScript-first** architecture with strict typing
- **SQLite database** with Prisma ORM
- **Production-ready performance** (178+ operations/second)

## Prerequisites

### Required Software
- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** (latest stable version)
- **Code Editor** (VS Code recommended)

### Optional Tools
- **SQLite Browser** for database inspection
- **Postman/Insomnia** for API testing
- **Docker** for containerized development

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space

## Quick Setup (5 Minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/ParkingGarage.git
cd ParkingGarage

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

### 2. Database Setup

```bash
# Initialize database
npx prisma db push

# Seed with sample data
npx prisma db seed

# Verify database
npx prisma studio
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your preferred editor
# The default values work for local development
```

### 4. Start Development Server

```bash
# Start the application
npm run dev

# Or with hot reload
npm run dev:watch
```

### 5. Verify Installation

Open your browser and test these endpoints:

- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api-docs
- **Enhanced API Interface**: http://127.0.0.1:9000/api-test.html

## Development Workflow

### Daily Development Commands

```bash
# Start development with hot reload
npm run dev

# Run tests (recommended before commits)
npm test

# Check code formatting
npm run lint

# Fix formatting issues
npm run lint:fix

# Build for production
npm run build
```

### Database Operations

```bash
# View database in browser
npx prisma studio

# Reset database (development only)
npx prisma migrate reset

# Generate new migration
npx prisma migrate dev --name "your-change-description"

# Apply migrations (production)
npx prisma migrate deploy
```

## API Testing

### Quick API Tests

```bash
# Check system health
curl http://localhost:3000/health

# Check garage configuration
curl http://localhost:3000/api/garage

# Get available parking spots
curl http://localhost:3000/api/spots/available

# Check-in a vehicle (POST request)
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "TEST123", "vehicleType": "standard"}'
```

### Using the Enhanced API Interface

1. **Start the server**: `npm run dev`
2. **Open browser**: http://127.0.0.1:9000/api-test.html
3. **Test endpoints** with the interactive interface
4. **View real-time logs** and responses

## Project Structure

```
ParkingGarage/
├── src/                     # Source code
│   ├── controllers/         # API endpoint handlers
│   ├── services/            # Business logic
│   ├── repositories/        # Database access layer
│   ├── models/              # Data models and types
│   ├── middleware/          # Express middleware
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript type definitions
├── tests/                   # Test files
├── prisma/                  # Database schema and migrations
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── wiki/                    # GitHub wiki content
```

### Key Files to Know

- **`src/server.ts`** - Main application entry point
- **`prisma/schema.prisma`** - Database schema definition
- **`src/controllers/VehicleController.ts`** - Main API endpoints
- **`src/services/ParkingService.ts`** - Core business logic
- **`tests/`** - Comprehensive test suite (194 tests)

## Common Development Tasks

### Adding a New API Endpoint

1. **Add route** in `src/routes/`
2. **Create controller method** in `src/controllers/`
3. **Add service logic** in `src/services/`
4. **Write tests** in `tests/`
5. **Update API documentation**

### Modifying the Database Schema

1. **Edit** `prisma/schema.prisma`
2. **Generate migration** with `npx prisma migrate dev`
3. **Update TypeScript types** (auto-generated)
4. **Update repositories** if needed
5. **Run tests** to ensure compatibility

### Adding Business Logic

1. **Create service method** in appropriate service file
2. **Add input validation** and error handling
3. **Write unit tests** for the new logic
4. **Update integration tests** if needed
5. **Document the new functionality**

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- vehicle.test.ts

# Run tests with coverage
npm run test:coverage

# Run only integration tests
npm test -- --testNamePattern="Integration"

# Run tests in watch mode
npm test -- --watch
```

### Test Categories

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing  
- **Performance Tests**: Load and performance validation
- **Database Tests**: Data persistence and integrity

### Writing New Tests

```typescript
// Example test structure
describe('Vehicle Service', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup
  });

  test('should create a new vehicle', async () => {
    // Arrange
    const vehicleData = { licensePlate: 'TEST123' };
    
    // Act
    const result = await vehicleService.create(vehicleData);
    
    // Assert
    expect(result.licensePlate).toBe('TEST123');
  });
});
```

## Debugging

### Common Issues and Solutions

#### 1. Port Already in Use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

#### 2. Database Connection Issues
```bash
# Check if database file exists
ls -la data/

# Regenerate database
npx prisma db push --force-reset
npx prisma db seed
```

#### 3. TypeScript Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Check TypeScript issues
npm run type-check

# Fix formatting
npm run lint:fix
```

#### 4. Test Failures
```bash
# Run specific failing test
npm test -- --testNamePattern="failing-test-name"

# Update test snapshots if needed
npm test -- --updateSnapshot

# Clear Jest cache
npx jest --clearCache
```

### Debugging Tools

- **VS Code Debugger**: Built-in debugging with breakpoints
- **Node.js Inspector**: `node --inspect` for advanced debugging
- **Prisma Studio**: Visual database browser
- **Console Logging**: Strategic console.log statements
- **Network Tab**: Browser dev tools for API inspection

## Performance Tips

### Development Performance

- **Use hot reload** with `npm run dev:watch`
- **Run targeted tests** instead of full suite during development
- **Use Prisma Studio** instead of command-line database queries
- **Enable TypeScript incremental compilation**

### Code Quality

- **Run linter** before committing: `npm run lint`
- **Write tests** for new functionality
- **Use TypeScript strictly** - no `any` types
- **Follow existing code patterns** and conventions
- **Document complex logic** with comments

## Getting Help

### Documentation Resources

- **[Complete API Documentation](API-Documentation.md)** - All endpoints and examples
- **[Database Schema](Database-Schema.md)** - Database structure and relationships
- **[State Management](State-Management.md)** - Architecture overview
- **[Development Guide](Development-Guide.md)** - Detailed development instructions

### Community Support

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Team Chat**: Internal communication channels
- **Code Reviews**: Learn from team feedback

### Troubleshooting Checklist

When encountering issues, check:

- [ ] **Node.js version** is 18.0.0 or higher
- [ ] **Dependencies installed** with `npm install`
- [ ] **Prisma client generated** with `npx prisma generate`
- [ ] **Database initialized** with `npx prisma db push`
- [ ] **Environment variables** are properly set
- [ ] **Port 3000** is available
- [ ] **Tests passing** with `npm test`

## Next Steps

Once you're up and running:

1. **Explore the codebase** - Read through the main service files
2. **Run the test suite** - Understand how testing works
3. **Try the API** - Use Postman or the enhanced interface
4. **Read the architecture docs** - Understand the system design
5. **Make a small change** - Add a simple feature or fix
6. **Join team discussions** - Participate in code reviews

## Development Environment Variations

### Using Docker (Optional)

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Using Different Databases

The system is optimized for SQLite but can be configured for other databases:

```bash
# PostgreSQL (requires additional setup)
DATABASE_URL="postgresql://user:password@localhost:5432/parking_garage"

# MySQL (requires additional setup)  
DATABASE_URL="mysql://user:password@localhost:3306/parking_garage"
```

### VS Code Configuration

Recommended VS Code extensions:

- **TypeScript Importer** - Auto-import organization
- **Prisma** - Schema syntax highlighting
- **Jest** - Test runner integration
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **REST Client** - API testing

## Production Considerations

When preparing for production deployment:

- **Review [Deployment Guide](Deployment-Guide.md)** for production setup
- **Run [Performance Tests](Performance-Load-Testing.md)** to validate performance
- **Check [Security Guidelines](Security-Features.md)** for security best practices
- **Follow [Migration Guide](Migration-Guide.md)** for database migrations

---

Welcome to the team! This production-ready system is designed for both ease of development and operational excellence. The comprehensive test coverage and TypeScript integration provide confidence for rapid development and reliable deployments.