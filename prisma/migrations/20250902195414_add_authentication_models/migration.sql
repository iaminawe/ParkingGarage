-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licensePlate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'STANDARD',
    "rateType" TEXT NOT NULL DEFAULT 'HOURLY',
    "spotId" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "ownerEmail" TEXT,
    "ownerPhone" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "checkInTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutTime" DATETIME,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" REAL NOT NULL DEFAULT 5.0,
    "totalAmount" REAL NOT NULL DEFAULT 0.0,
    "amountPaid" REAL NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicles_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "parking_spots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vehicles_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parking_spots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotNumber" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "section" TEXT,
    "spotType" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "width" REAL,
    "length" REAL,
    "height" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parking_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "hourlyRate" REAL NOT NULL DEFAULT 5.0,
    "totalAmount" REAL NOT NULL DEFAULT 0.0,
    "amountPaid" REAL NOT NULL DEFAULT 0.0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "paymentTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "parking_sessions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parking_sessions_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "parking_spots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "garages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "totalSpots" INTEGER NOT NULL DEFAULT 0,
    "availableSpots" INTEGER NOT NULL DEFAULT 0,
    "hourlyRate" REAL NOT NULL DEFAULT 5.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT,
    "closeTime" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "lastLoginAt" DATETIME,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" DATETIME,
    "twoFactorSecret" TEXT,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "refreshExpiresAt" DATETIME,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE INDEX "vehicles_licensePlate_idx" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE INDEX "vehicles_spotId_idx" ON "vehicles"("spotId");

-- CreateIndex
CREATE INDEX "vehicles_ownerId_idx" ON "vehicles"("ownerId");

-- CreateIndex
CREATE INDEX "vehicles_vehicleType_idx" ON "vehicles"("vehicleType");

-- CreateIndex
CREATE INDEX "vehicles_checkInTime_idx" ON "vehicles"("checkInTime");

-- CreateIndex
CREATE INDEX "vehicles_isPaid_idx" ON "vehicles"("isPaid");

-- CreateIndex
CREATE INDEX "vehicles_createdAt_idx" ON "vehicles"("createdAt");

-- CreateIndex
CREATE INDEX "vehicles_spotId_isPaid_idx" ON "vehicles"("spotId", "isPaid");

-- CreateIndex
CREATE INDEX "vehicles_vehicleType_checkInTime_idx" ON "vehicles"("vehicleType", "checkInTime");

-- CreateIndex
CREATE INDEX "vehicles_ownerId_checkInTime_idx" ON "vehicles"("ownerId", "checkInTime");

-- CreateIndex
CREATE INDEX "vehicles_checkInTime_checkOutTime_idx" ON "vehicles"("checkInTime", "checkOutTime");

-- CreateIndex
CREATE UNIQUE INDEX "parking_spots_spotNumber_key" ON "parking_spots"("spotNumber");

-- CreateIndex
CREATE INDEX "parking_spots_spotNumber_idx" ON "parking_spots"("spotNumber");

-- CreateIndex
CREATE INDEX "parking_spots_status_idx" ON "parking_spots"("status");

-- CreateIndex
CREATE INDEX "parking_spots_spotType_idx" ON "parking_spots"("spotType");

-- CreateIndex
CREATE INDEX "parking_spots_level_idx" ON "parking_spots"("level");

-- CreateIndex
CREATE INDEX "parking_spots_isActive_idx" ON "parking_spots"("isActive");

-- CreateIndex
CREATE INDEX "parking_spots_status_spotType_idx" ON "parking_spots"("status", "spotType");

-- CreateIndex
CREATE INDEX "parking_spots_level_section_idx" ON "parking_spots"("level", "section");

-- CreateIndex
CREATE INDEX "parking_spots_spotType_isActive_idx" ON "parking_spots"("spotType", "isActive");

-- CreateIndex
CREATE INDEX "parking_sessions_vehicleId_idx" ON "parking_sessions"("vehicleId");

-- CreateIndex
CREATE INDEX "parking_sessions_spotId_idx" ON "parking_sessions"("spotId");

-- CreateIndex
CREATE INDEX "parking_sessions_startTime_idx" ON "parking_sessions"("startTime");

-- CreateIndex
CREATE INDEX "parking_sessions_endTime_idx" ON "parking_sessions"("endTime");

-- CreateIndex
CREATE INDEX "parking_sessions_status_idx" ON "parking_sessions"("status");

-- CreateIndex
CREATE INDEX "parking_sessions_isPaid_idx" ON "parking_sessions"("isPaid");

-- CreateIndex
CREATE INDEX "parking_sessions_paymentTime_idx" ON "parking_sessions"("paymentTime");

-- CreateIndex
CREATE INDEX "parking_sessions_startTime_endTime_idx" ON "parking_sessions"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "parking_sessions_status_isPaid_idx" ON "parking_sessions"("status", "isPaid");

-- CreateIndex
CREATE INDEX "parking_sessions_vehicleId_startTime_idx" ON "parking_sessions"("vehicleId", "startTime");

-- CreateIndex
CREATE INDEX "parking_sessions_spotId_startTime_idx" ON "parking_sessions"("spotId", "startTime");

-- CreateIndex
CREATE INDEX "parking_sessions_paymentTime_totalAmount_idx" ON "parking_sessions"("paymentTime", "totalAmount");

-- CreateIndex
CREATE INDEX "garages_isActive_idx" ON "garages"("isActive");

-- CreateIndex
CREATE INDEX "garages_city_state_idx" ON "garages"("city", "state");

-- CreateIndex
CREATE INDEX "garages_totalSpots_availableSpots_idx" ON "garages"("totalSpots", "availableSpots");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "users_loginAttempts_lockoutUntil_idx" ON "users"("loginAttempts", "lockoutUntil");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshToken_key" ON "user_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_refreshToken_idx" ON "user_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "user_sessions_isRevoked_idx" ON "user_sessions"("isRevoked");
