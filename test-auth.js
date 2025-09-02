// Simple authentication test script
require('dotenv').config();

const express = require('express');
const authRoutes = require('./src/routes/auth').default;

const app = express();

// Basic middleware
app.use(express.json());
app.use('/api/auth', authRoutes);

const PORT = 3001;

// Start test server
app.listen(PORT, () => {
  console.log(`Auth test server running on http://localhost:${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down auth test server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down auth test server');
  process.exit(0);
});