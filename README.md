# Parking Garage Management API

A RESTful API for managing parking garage operations built with Node.js and Express.

## Features

- 🚀 Express.js web framework
- 🔒 Security middleware (Helmet, CORS, Rate limiting)
- 📝 Comprehensive error handling
- 🏥 Health check endpoint
- 🌍 Environment-based configuration
- 📊 Request logging
- 🧪 Testing setup with Jest
- 🎯 Code quality tools (ESLint, Prettier)

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

## API Endpoints

### Health Check
- `GET /health` - Returns server health status

### API Info
- `GET /api` - Returns API information and available endpoints

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

## License

MIT License - see LICENSE file for details