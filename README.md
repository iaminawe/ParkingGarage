# Parking Garage Management API

A comprehensive RESTful API for managing modern parking garage operations, featuring real-time spot monitoring, automated payment processing, reservation systems, and advanced analytics.

## 📚 Documentation

Full documentation is available in our [GitHub Wiki](https://github.com/iaminawe/ParkingGarage/wiki):

- **[Project Overview](https://github.com/iaminawe/ParkingGarage/wiki/Project-Overview)** - Vision, business model, and roadmap
- **[API Documentation](https://github.com/iaminawe/ParkingGarage/wiki/API-Documentation)** - Complete API reference with examples
- **[System Architecture](https://github.com/iaminawe/ParkingGarage/wiki/Architecture)** - Microservices design and infrastructure
- **[Development Guide](https://github.com/iaminawe/ParkingGarage/wiki/Development-Guide)** - Setup instructions and best practices
- **[Testing Strategy](https://github.com/iaminawe/ParkingGarage/wiki/Testing-Strategy)** - Testing approach and coverage
- **[Deployment Guide](https://github.com/iaminawe/ParkingGarage/wiki/Deployment-Guide)** - Docker, Kubernetes, and CI/CD
- **[Contributing Guidelines](https://github.com/iaminawe/ParkingGarage/wiki/Contributing)** - How to contribute
- **[AI Agent Usage](https://github.com/iaminawe/ParkingGarage/wiki/AI-Agent-Usage)** - CCPM and Claude Flow integration

## 🎯 What This API Does

The Parking Garage Management API provides a complete backend solution for parking facility operations:

### Core Capabilities
- **Spot Management**: Real-time tracking of parking spot availability across multiple levels and zones
- **Reservation System**: Advance booking with QR code generation for guaranteed spots
- **Payment Processing**: Integrated payment gateway supporting multiple payment methods
- **Access Control**: License plate recognition and RFID-based entry/exit management
- **Dynamic Pricing**: Demand-based pricing with early bird discounts and peak hour rates
- **Analytics Dashboard**: Comprehensive reporting on occupancy, revenue, and usage patterns
- **Multi-Facility Support**: Manage multiple parking garages from a single API

### Key Features

- 🚗 **Real-time Availability** - Live parking spot status updates
- 💳 **Automated Payments** - Seamless payment on exit with multiple options
- 📱 **Mobile Integration** - Full mobile app support with push notifications
- 🎫 **QR Code Tickets** - Digital parking tickets with QR codes
- 📊 **Business Intelligence** - Advanced analytics and reporting
- 🔒 **Secure Access** - JWT authentication and role-based permissions
- ⚡ **High Performance** - Optimized for speed with Redis caching
- 🌍 **Scalable Architecture** - Microservices design for growth

## Getting Started

### Prerequisites

- Node.js v18.0.0 or higher
- npm v8.0.0 or higher

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🔌 API Overview

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.parkinggarage.com/v1
```

### Authentication
All protected endpoints require JWT authentication:
```
Authorization: Bearer <your-jwt-token>
```

### Core API Endpoints

#### 🔐 Authentication
- `POST /auth/register` - Register new user account
- `POST /auth/login` - Authenticate and receive JWT token
- `POST /auth/refresh` - Refresh expired token
- `POST /auth/logout` - Invalidate current token

#### 🅿️ Parking Spots
- `GET /spots` - List all parking spots with filters
- `GET /spots/:id` - Get specific spot details
- `POST /spots` - Create new spot (admin)
- `PUT /spots/:id` - Update spot information (admin)
- `DELETE /spots/:id` - Remove spot (admin)

#### 📅 Reservations
- `POST /reservations` - Create new reservation
- `GET /reservations` - List user's reservations
- `GET /reservations/:id` - Get reservation details
- `PUT /reservations/:id` - Modify reservation
- `DELETE /reservations/:id` - Cancel reservation

#### 🚗 Parking Sessions
- `POST /sessions/check-in` - Start parking session
- `POST /sessions/check-out` - End session and process payment
- `GET /sessions/active` - Get active sessions
- `GET /sessions/:id` - Get session details

#### 💰 Payments
- `POST /payments/methods` - Add payment method
- `GET /payments/methods` - List payment methods
- `DELETE /payments/methods/:id` - Remove payment method
- `POST /payments/process` - Process payment
- `GET /payments/history` - Payment history

#### 📊 Analytics
- `GET /analytics/occupancy` - Occupancy statistics
- `GET /analytics/revenue` - Revenue reports
- `GET /analytics/usage` - Usage patterns
- `GET /analytics/predictions` - AI-powered predictions

#### 🏥 System
- `GET /health` - System health check
- `GET /api` - API information and endpoints

### Response Format
```json
{
  "success": true,
  "data": { },
  "timestamp": "2025-08-31T10:30:00Z"
}
```

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "SPOT_UNAVAILABLE",
    "message": "The requested parking spot is not available",
    "details": { }
  }
}
```

### Rate Limiting
- Default: 1000 requests/hour
- Premium: 10000 requests/hour
- Enterprise: Unlimited

📖 **Full API documentation with examples**: [API Documentation Wiki](https://github.com/iaminawe/ParkingGarage/wiki/API-Documentation)

## Project Structure

```
├── src/
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── app.js          # Express app configuration
│   └── server.js       # Server startup
├── tests/              # Test files
├── docs/               # Documentation
├── .env.example        # Environment variables template
├── .eslintrc.json      # ESLint configuration
├── .prettierrc         # Prettier configuration
└── package.json        # Project dependencies and scripts
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - CORS allowed origins

## Error Handling

The API includes comprehensive error handling:

- Operational errors return appropriate HTTP status codes
- Development environment shows detailed error information
- Production environment returns user-friendly error messages
- All errors are logged for debugging

## Security Features

- Helmet.js for setting security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes per IP)
- Request size limits
- Input validation and sanitization

## Development

### Code Style

This project uses ESLint and Prettier for code quality and formatting. The configuration follows JavaScript standard practices with some customizations for Node.js development.

### Testing

Tests are written using Jest and Supertest. Run tests with:

```bash
npm test
```

## 🚀 Quick Start Example

```javascript
// Example: Find and reserve a parking spot
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function parkingExample() {
  try {
    // 1. Authenticate
    const { data: auth } = await axios.post(`${API_BASE}/auth/login`, {
      email: 'user@example.com',
      password: 'password123'
    });
    
    const token = auth.data.token;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    // 2. Find available spots
    const { data: spots } = await axios.get(`${API_BASE}/spots?status=available&level=1`, config);
    console.log(`Found ${spots.data.spots.length} available spots`);
    
    // 3. Create reservation
    const { data: reservation } = await axios.post(`${API_BASE}/reservations`, {
      spotId: spots.data.spots[0].spotId,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      vehicleInfo: {
        licensePlate: 'ABC123',
        make: 'Toyota',
        model: 'Camry'
      }
    }, config);
    
    console.log(`Reservation created: ${reservation.data.confirmationCode}`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](https://github.com/iaminawe/ParkingGarage/wiki/Contributing) for details on:
- Code of conduct
- Development process
- Pull request procedures
- Coding standards

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- 📖 **Documentation**: [GitHub Wiki](https://github.com/iaminawe/ParkingGarage/wiki)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/iaminawe/ParkingGarage/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/iaminawe/ParkingGarage/discussions)
- 📧 **Email**: support@parkinggarage.com

## 🛠️ Built With

- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Express.js](https://expressjs.com/)** - Web framework
- **[PostgreSQL](https://www.postgresql.org/)** - Primary database
- **[Redis](https://redis.io/)** - Caching and sessions
- **[JWT](https://jwt.io/)** - Authentication
- **[Stripe](https://stripe.com/)** - Payment processing
- **[Docker](https://www.docker.com/)** - Containerization
- **[Kubernetes](https://kubernetes.io/)** - Orchestration

## 🏆 Project Status

- **Current Phase**: Initial Development
- **Version**: 1.0.0
- **Coverage**: Building towards 90% test coverage
- **API Stability**: Alpha (breaking changes possible)

---

<div align="center">
  <strong>🚗 Making Parking Simple, Smart, and Seamless 🚗</strong>
  <br>
  <sub>Built with ❤️ by the Parking Garage Team</sub>
</div>