# Development Guide

## Prerequisites

### Required Software
- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose
- Git
- VS Code or preferred IDE

### Recommended Tools
- Postman or Insomnia (API testing)
- pgAdmin or DBeaver (Database management)
- Redis Commander (Redis GUI)
- K9s (Kubernetes management)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ParkingGarage.git
cd ParkingGarage
```

### 2. Install Dependencies
```bash
npm install
npm run install:all  # Install dependencies for all services
```

### 3. Environment Configuration
Create `.env` file in root directory:
```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parking_garage
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@parkinggarage.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# AWS (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=parking-garage-assets

# Monitoring
SENTRY_DSN=
LOG_LEVEL=debug
```

### 4. Database Setup
```bash
# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 5. Start Development Server
```bash
# Start all services
npm run dev

# Or start specific services
npm run dev:auth
npm run dev:parking
npm run dev:payment
```

## Project Structure

```
ParkingGarage/
├── src/
│   ├── services/          # Microservices
│   │   ├── auth/          # Authentication service
│   │   ├── parking/       # Parking management
│   │   ├── payment/       # Payment processing
│   │   ├── reservation/   # Reservation system
│   │   ├── analytics/     # Analytics service
│   │   └── notification/  # Notifications
│   ├── shared/            # Shared utilities
│   │   ├── database/      # Database configurations
│   │   ├── middleware/    # Common middleware
│   │   ├── utils/         # Utility functions
│   │   ├── validators/    # Input validators
│   │   └── constants/     # Constants
│   ├── gateway/           # API Gateway
│   └── workers/           # Background jobs
├── database/
│   ├── migrations/        # Database migrations
│   ├── seeds/            # Seed data
│   └── schemas/          # SQL schemas
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── .claude/              # CCPM configuration
├── wiki/                 # GitHub wiki pages
└── docker/               # Docker configurations
```

## Development Workflow

### 1. Feature Development

#### Using CCPM (Recommended)
```bash
# Start working on an issue
/pm:issue-start 123

# Create an epic for larger features
/pm:epic-start "Payment Integration"

# Check status
/pm:status
```

#### Using Claude Flow for Parallel Development
```bash
# Initialize swarm for feature development
npx claude-flow sparc tdd "implement user authentication"

# Run specific development mode
npx claude-flow sparc run architect "design payment system"
```

### 2. Code Style Guidelines

#### JavaScript/TypeScript
```javascript
// Use ES6+ features
const processPayment = async ({ amount, currency, paymentMethod }) => {
  try {
    // Validate input
    validatePaymentInput({ amount, currency });
    
    // Process payment
    const result = await stripeClient.charges.create({
      amount: amount * 100, // Convert to cents
      currency,
      source: paymentMethod,
    });
    
    // Log transaction
    await logTransaction(result);
    
    return {
      success: true,
      transactionId: result.id,
    };
  } catch (error) {
    logger.error('Payment processing failed:', error);
    throw new PaymentError(error.message);
  }
};
```

#### SQL Naming Conventions
```sql
-- Tables: plural, snake_case
CREATE TABLE parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_number VARCHAR(10) NOT NULL,
  level_id UUID REFERENCES levels(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes: idx_table_columns
CREATE INDEX idx_parking_spots_level_id ON parking_spots(level_id);

-- Foreign keys: fk_table_reference
ALTER TABLE parking_spots 
  ADD CONSTRAINT fk_parking_spots_level 
  FOREIGN KEY (level_id) REFERENCES levels(id);
```

### 3. API Development

#### Route Structure
```javascript
// routes/spots.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateSpotInput } = require('../validators/spot');
const spotController = require('../controllers/spotController');

// Public routes
router.get('/', spotController.getAllSpots);
router.get('/:id', spotController.getSpotById);

// Protected routes
router.use(authenticate);
router.post('/', authorize('admin'), validateSpotInput, spotController.createSpot);
router.put('/:id', authorize('admin'), validateSpotInput, spotController.updateSpot);
router.delete('/:id', authorize('admin'), spotController.deleteSpot);

module.exports = router;
```

#### Controller Pattern
```javascript
// controllers/spotController.js
const spotService = require('../services/spotService');
const { successResponse, errorResponse } = require('../utils/response');

exports.getAllSpots = async (req, res) => {
  try {
    const { level, zone, status } = req.query;
    const spots = await spotService.findSpots({ level, zone, status });
    
    return successResponse(res, {
      spots,
      total: spots.length,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
```

### 4. Database Development

#### Migration Example
```javascript
// migrations/001_create_parking_spots.js
exports.up = async (knex) => {
  await knex.schema.createTable('parking_spots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('spot_number', 10).notNullable();
    table.uuid('level_id').references('id').inTable('levels');
    table.enum('type', ['regular', 'handicap', 'ev', 'premium']).defaultTo('regular');
    table.enum('status', ['available', 'occupied', 'reserved', 'maintenance']).defaultTo('available');
    table.decimal('hourly_rate', 10, 2);
    table.decimal('daily_rate', 10, 2);
    table.timestamps(true, true);
    
    table.index(['level_id', 'status']);
    table.unique(['level_id', 'spot_number']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('parking_spots');
};
```

### 5. Testing

#### Unit Test Example
```javascript
// tests/unit/services/spotService.test.js
const spotService = require('../../../src/services/spotService');
const spotRepository = require('../../../src/repositories/spotRepository');

jest.mock('../../../src/repositories/spotRepository');

describe('SpotService', () => {
  describe('findAvailableSpots', () => {
    it('should return available spots for given criteria', async () => {
      // Arrange
      const mockSpots = [
        { id: '1', status: 'available', level: 1 },
        { id: '2', status: 'available', level: 1 },
      ];
      spotRepository.findByStatus.mockResolvedValue(mockSpots);
      
      // Act
      const result = await spotService.findAvailableSpots({ level: 1 });
      
      // Assert
      expect(result).toHaveLength(2);
      expect(spotRepository.findByStatus).toHaveBeenCalledWith('available', { level: 1 });
    });
  });
});
```

#### Integration Test Example
```javascript
// tests/integration/api/spots.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { setupDatabase, teardownDatabase } = require('../../helpers/database');

describe('Spots API', () => {
  beforeAll(async () => {
    await setupDatabase();
  });
  
  afterAll(async () => {
    await teardownDatabase();
  });
  
  describe('GET /api/v1/spots', () => {
    it('should return all spots', async () => {
      const response = await request(app)
        .get('/api/v1/spots')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.spots).toBeDefined();
      expect(Array.isArray(response.body.data.spots)).toBe(true);
    });
  });
});
```

### 6. Debugging

#### VS Code Launch Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Auth Service",
      "program": "${workspaceFolder}/src/services/auth/index.js",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229,
      "restart": true
    }
  ]
}
```

#### Debug Commands
```bash
# Start with debugging
npm run dev:debug

# Inspect database
npm run db:console

# Check logs
npm run logs:auth
npm run logs:parking
```

## Common Development Tasks

### Adding a New Endpoint
1. Define route in `routes/`
2. Create controller method
3. Implement service logic
4. Add repository methods
5. Write tests
6. Update API documentation

### Database Changes
1. Create migration file
2. Run migration locally
3. Update models
4. Update seed data if needed
5. Test rollback

### Adding a New Service
1. Create service directory
2. Setup Express app
3. Configure database connection
4. Add to docker-compose
5. Update gateway routing
6. Add monitoring

## Performance Guidelines

### Database Optimization
- Use indexes for frequently queried columns
- Implement pagination for list endpoints
- Use database views for complex queries
- Enable query caching
- Monitor slow queries

### API Optimization
- Implement response caching
- Use compression middleware
- Optimize payload size
- Implement field filtering
- Use batch operations

### Code Optimization
- Avoid N+1 queries
- Use async/await properly
- Implement connection pooling
- Cache expensive computations
- Profile and optimize hot paths

## Security Best Practices

### Input Validation
```javascript
const Joi = require('joi');

const spotSchema = Joi.object({
  spotNumber: Joi.string().alphanum().max(10).required(),
  level: Joi.number().integer().min(1).max(10).required(),
  type: Joi.string().valid('regular', 'handicap', 'ev', 'premium').required(),
  hourlyRate: Joi.number().positive().max(100).required(),
});

const validateSpotInput = (req, res, next) => {
  const { error } = spotSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};
```

### Authentication
- Use secure JWT secrets
- Implement token refresh
- Add rate limiting
- Log authentication attempts
- Implement account lockout

### Data Protection
- Sanitize user input
- Use parameterized queries
- Encrypt sensitive data
- Implement CORS properly
- Use HTTPS in production

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check connection string
echo $DB_HOST
echo $DB_PORT

# Test connection
psql -h localhost -U postgres -d parking_garage
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### Migration Failed
```bash
# Rollback migration
npm run db:rollback

# Check migration status
npm run db:status

# Run specific migration
npm run db:migrate:up 001_create_users.js
```

## Resources

### Documentation
- [API Documentation](API-Documentation.md)
- [Architecture Guide](Architecture.md)
- [Testing Strategy](Testing-Strategy.md)

### External Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Support Channels
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and discussions
- Slack: Real-time team communication

---

*For deployment instructions, see [Deployment Guide](Deployment-Guide.md)*
*For contribution guidelines, see [Contributing](Contributing.md)*