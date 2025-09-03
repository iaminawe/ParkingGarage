# ==============================================================================
# Multi-stage Production Dockerfile for ParkingGarage Application
# ==============================================================================

# Stage 1: Dependencies - Install all dependencies with cache optimization
FROM node:18-alpine AS dependencies

# Install security updates and required system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini && \
    rm -rf /var/cache/apk/*

# Create app directory with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S parkinggarage -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including devDependencies for build stage)
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Stage 2: Build - Compile TypeScript and prepare production assets
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies including dev dependencies for build
RUN npm ci --include=dev --no-audit --no-fund

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Build the application
RUN npm run build && \
    npm run db:generate && \
    npm prune --production --no-audit --no-fund && \
    npm cache clean --force

# Stage 3: Production - Create minimal production image
FROM node:18-alpine AS production

# Install production system dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini \
    sqlite && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S parkinggarage -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p data logs backups uploads temp && \
    chown -R parkinggarage:nodejs /app && \
    chmod -R 755 /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=parkinggarage:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=parkinggarage:nodejs /app/dist ./dist
COPY --from=builder --chown=parkinggarage:nodejs /app/prisma ./prisma

# Copy production configuration files
COPY --chown=parkinggarage:nodejs package*.json ./

# Copy additional runtime files
COPY --chown=parkinggarage:nodejs scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh 2>/dev/null || true

# Set up environment variables with secure defaults
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=512" \
    UV_THREADPOOL_SIZE=16 \
    # Security headers
    HELMET_ENABLED=true \
    RATE_LIMITING_ENABLED=true \
    # Performance optimizations
    NODE_MAX_CONCURRENCY=10 \
    # Graceful shutdown
    SHUTDOWN_TIMEOUT=30000

# Expose port (non-root port)
EXPOSE 3000

# Create health check endpoint validation script
COPY --chown=parkinggarage:nodejs <<EOF /app/healthcheck.js
const http = require('http');
const options = {
  hostname: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 3000,
  path: '/api/v1/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    console.error(\`Health check failed with status: \${res.statusCode}\`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.error('Health check error:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timeout');
  req.destroy();
  process.exit(1);
});

req.end();
EOF

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node /app/healthcheck.js || exit 1

# Switch to non-root user for security
USER parkinggarage:nodejs

# Set up signal handling for graceful shutdown
STOPSIGNAL SIGTERM

# Use tini as PID 1 for proper signal handling and zombie reaping
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application with process monitoring
CMD ["dumb-init", "node", "--enable-source-maps", "dist/src/server.js"]

# ==============================================================================
# Build Arguments and Labels for metadata
# ==============================================================================
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL maintainer="Parking Garage Team" \
      org.opencontainers.image.title="ParkingGarage API" \
      org.opencontainers.image.description="Production-ready RESTful API for parking garage management" \
      org.opencontainers.image.version=${VERSION} \
      org.opencontainers.image.created=${BUILD_DATE} \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.vendor="Parking Garage Management System" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/parking-garage/api"