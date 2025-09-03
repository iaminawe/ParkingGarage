// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';

// Disable email service in tests
process.env.EMAIL_ENABLED = 'false';
process.env.EMAIL_PROVIDER = 'mock';

// Mock authentication tokens
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Cache configuration for tests
process.env.CACHE_ENABLED = 'false';
process.env.REDIS_URL = 'redis://localhost:6379';

// Logging configuration for tests
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Payment service mock configuration
process.env.PAYMENT_ENABLED = 'false';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_stripe_key';

// Notification service configuration
process.env.NOTIFICATION_ENABLED = 'false';

// Security configuration for tests
process.env.BCRYPT_ROUNDS = '4'; // Faster bcrypt for tests
process.env.PASSWORD_RESET_TOKEN_EXPIRY = '300'; // 5 minutes for tests

// Analytics and monitoring
process.env.ANALYTICS_ENABLED = 'false';
process.env.METRICS_ENABLED = 'false';

// Rate limiting
process.env.RATE_LIMIT_ENABLED = 'false';

// CORS configuration
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';

module.exports = {};