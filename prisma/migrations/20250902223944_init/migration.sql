/*
  Warnings:

  - You are about to drop the `spots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `bays` on the `floors` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `floors` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `floors` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `floors` table. All the data in the column will be lost.
  - You are about to drop the column `spotsPerBay` on the `floors` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `garages` table. All the data in the column will be lost.
  - You are about to drop the column `checkInTime` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutTime` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `endReason` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expectedEndTime` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `garageId` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `rateType` on the `parking_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `garageId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayResponse` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `refundDate` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `refundReason` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `ticketId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `fineAmount` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `issuedBy` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDueDate` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleId` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `violationTime` on the `tickets` table. All the data in the column will be lost.
  - Added the required column `floorNumber` to the `floors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehiclePlate` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "spots_garageId_spotNumber_key";

-- DropIndex
DROP INDEX "spots_currentVehicleId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "spots";
PRAGMA foreign_keys=on;

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
    "emailVerificationExpires" DATETIME,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "lastLoginAt" DATETIME,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" DATETIME,
    "twoFactorSecret" TEXT,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorBackupCodes" TEXT,
    "lastPasswordChange" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false,
    "securityQuestionHash" TEXT,
    "securityAnswerHash" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "phoneNumber" TEXT,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerificationToken" TEXT,
    "phoneVerificationExpires" DATETIME,
    "googleId" TEXT,
    "githubId" TEXT,
    "profileImageUrl" TEXT,
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
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "geoLocation" TEXT,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionType" TEXT NOT NULL DEFAULT 'WEB',
    "csrfToken" TEXT,
    "revokedReason" TEXT,
    "revokedAt" DATETIME,
    "isSecure" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_sessions_deviceFingerprint_fkey" FOREIGN KEY ("deviceFingerprint") REFERENCES "user_devices" ("fingerprint") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "name" TEXT,
    "deviceType" TEXT NOT NULL,
    "browser" TEXT,
    "operatingSystem" TEXT,
    "ipAddress" TEXT,
    "geoLocation" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notificationSettings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "attemptType" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "geoLocation" TEXT,
    "userAgent" TEXT,
    "failureReason" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "riskScore" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "login_history_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "user_devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "security_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "riskLevel" TEXT,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parking_spots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotNumber" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "section" TEXT,
    "spotType" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "width" REAL,
    "length" REAL,
    "height" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "parking_spots_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "ticketId" TEXT,
    "transactionType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transactions_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "variables" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'en',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "security_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "environmentSpecific" BOOLEAN NOT NULL DEFAULT false,
    "lastModifiedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_floors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "description" TEXT,
    "totalSpots" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "floors_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_floors" ("createdAt", "garageId", "id", "isActive", "updatedAt") SELECT "createdAt", "garageId", "id", "isActive", "updatedAt" FROM "floors";
DROP TABLE "floors";
ALTER TABLE "new_floors" RENAME TO "floors";
CREATE UNIQUE INDEX "floors_garageId_floorNumber_key" ON "floors"("garageId", "floorNumber");
CREATE TABLE "new_garages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalFloors" INTEGER NOT NULL DEFAULT 1,
    "totalSpots" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "operatingHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_garages" ("createdAt", "description", "id", "isActive", "name", "operatingHours", "totalFloors", "totalSpots", "updatedAt") SELECT "createdAt", "description", "id", "isActive", "name", "operatingHours", "totalFloors", "totalSpots", "updatedAt" FROM "garages";
DROP TABLE "garages";
ALTER TABLE "new_garages" RENAME TO "garages";
CREATE UNIQUE INDEX "garages_name_key" ON "garages"("name");
CREATE TABLE "new_parking_sessions" (
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
INSERT INTO "new_parking_sessions" ("createdAt", "hourlyRate", "id", "isPaid", "notes", "spotId", "status", "totalAmount", "updatedAt", "vehicleId") SELECT "createdAt", coalesce("hourlyRate", 5.0) AS "hourlyRate", "id", "isPaid", "notes", "spotId", "status", "totalAmount", "updatedAt", "vehicleId" FROM "parking_sessions";
DROP TABLE "parking_sessions";
ALTER TABLE "new_parking_sessions" RENAME TO "parking_sessions";
CREATE INDEX "parking_sessions_vehicleId_idx" ON "parking_sessions"("vehicleId");
CREATE INDEX "parking_sessions_spotId_idx" ON "parking_sessions"("spotId");
CREATE INDEX "parking_sessions_startTime_idx" ON "parking_sessions"("startTime");
CREATE INDEX "parking_sessions_endTime_idx" ON "parking_sessions"("endTime");
CREATE INDEX "parking_sessions_status_idx" ON "parking_sessions"("status");
CREATE INDEX "parking_sessions_isPaid_idx" ON "parking_sessions"("isPaid");
CREATE INDEX "parking_sessions_paymentTime_idx" ON "parking_sessions"("paymentTime");
CREATE INDEX "parking_sessions_startTime_endTime_idx" ON "parking_sessions"("startTime", "endTime");
CREATE INDEX "parking_sessions_status_isPaid_idx" ON "parking_sessions"("status", "isPaid");
CREATE INDEX "parking_sessions_vehicleId_startTime_idx" ON "parking_sessions"("vehicleId", "startTime");
CREATE INDEX "parking_sessions_spotId_startTime_idx" ON "parking_sessions"("spotId", "startTime");
CREATE INDEX "parking_sessions_paymentTime_totalAmount_idx" ON "parking_sessions"("paymentTime", "totalAmount");
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentNumber" TEXT NOT NULL,
    "sessionId" TEXT,
    "vehicleId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentType" TEXT NOT NULL DEFAULT 'PARKING',
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "failureReason" TEXT,
    "refundAmount" REAL DEFAULT 0,
    "refundedAt" DATETIME,
    "notes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "parking_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "createdAt", "currency", "deletedAt", "id", "paymentDate", "paymentNumber", "processedAt", "refundAmount", "sessionId", "status", "transactionId", "updatedAt", "vehicleId") SELECT "amount", "createdAt", "currency", "deletedAt", "id", "paymentDate", "paymentNumber", "processedAt", "refundAmount", "sessionId", "status", "transactionId", "updatedAt", "vehicleId" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");
CREATE INDEX "payments_paymentNumber_idx" ON "payments"("paymentNumber");
CREATE INDEX "payments_sessionId_idx" ON "payments"("sessionId");
CREATE INDEX "payments_vehicleId_idx" ON "payments"("vehicleId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_paymentType_idx" ON "payments"("paymentType");
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");
CREATE INDEX "payments_processedAt_idx" ON "payments"("processedAt");
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");
CREATE TABLE "new_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "spotNumber" TEXT,
    "entryTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" DATETIME,
    "duration" INTEGER,
    "baseAmount" REAL NOT NULL DEFAULT 0.0,
    "additionalFees" REAL NOT NULL DEFAULT 0.0,
    "totalAmount" REAL NOT NULL DEFAULT 0.0,
    "paidAmount" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "lostTicketFee" REAL NOT NULL DEFAULT 0.0,
    "isLostTicket" BOOLEAN NOT NULL DEFAULT false,
    "qrCode" TEXT,
    "barcodeData" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tickets_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tickets" ("createdAt", "garageId", "id", "status", "ticketNumber", "updatedAt") SELECT "createdAt", "garageId", "id", "status", "ticketNumber", "updatedAt" FROM "tickets";
DROP TABLE "tickets";
ALTER TABLE "new_tickets" RENAME TO "tickets";
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "tickets"("ticketNumber");
CREATE INDEX "tickets_garageId_idx" ON "tickets"("garageId");
CREATE INDEX "tickets_ticketNumber_idx" ON "tickets"("ticketNumber");
CREATE INDEX "tickets_vehiclePlate_idx" ON "tickets"("vehiclePlate");
CREATE INDEX "tickets_status_idx" ON "tickets"("status");
CREATE INDEX "tickets_paymentStatus_idx" ON "tickets"("paymentStatus");
CREATE INDEX "tickets_entryTime_idx" ON "tickets"("entryTime");
CREATE INDEX "tickets_exitTime_idx" ON "tickets"("exitTime");
CREATE INDEX "tickets_isLostTicket_idx" ON "tickets"("isLostTicket");
CREATE TABLE "new_vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licensePlate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'STANDARD',
    "rateType" TEXT NOT NULL DEFAULT 'HOURLY',
    "status" TEXT NOT NULL DEFAULT 'PARKED',
    "spotId" TEXT,
    "currentSpotId" TEXT,
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
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicles_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "parking_spots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vehicles_currentSpotId_fkey" FOREIGN KEY ("currentSpotId") REFERENCES "parking_spots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vehicles_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_vehicles" ("color", "createdAt", "currentSpotId", "deletedAt", "id", "licensePlate", "make", "model", "ownerEmail", "ownerName", "ownerPhone", "status", "updatedAt", "vehicleType", "year") SELECT "color", "createdAt", "currentSpotId", "deletedAt", "id", "licensePlate", "make", "model", "ownerEmail", "ownerName", "ownerPhone", "status", "updatedAt", "vehicleType", "year" FROM "vehicles";
DROP TABLE "vehicles";
ALTER TABLE "new_vehicles" RENAME TO "vehicles";
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");
CREATE INDEX "vehicles_licensePlate_idx" ON "vehicles"("licensePlate");
CREATE INDEX "vehicles_spotId_idx" ON "vehicles"("spotId");
CREATE INDEX "vehicles_ownerId_idx" ON "vehicles"("ownerId");
CREATE INDEX "vehicles_vehicleType_idx" ON "vehicles"("vehicleType");
CREATE INDEX "vehicles_checkInTime_idx" ON "vehicles"("checkInTime");
CREATE INDEX "vehicles_isPaid_idx" ON "vehicles"("isPaid");
CREATE INDEX "vehicles_createdAt_idx" ON "vehicles"("createdAt");
CREATE INDEX "vehicles_spotId_isPaid_idx" ON "vehicles"("spotId", "isPaid");
CREATE INDEX "vehicles_vehicleType_checkInTime_idx" ON "vehicles"("vehicleType", "checkInTime");
CREATE INDEX "vehicles_ownerId_checkInTime_idx" ON "vehicles"("ownerId", "checkInTime");
CREATE INDEX "vehicles_checkInTime_checkOutTime_idx" ON "vehicles"("checkInTime", "checkOutTime");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");

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
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_githubId_idx" ON "users"("githubId");

-- CreateIndex
CREATE INDEX "users_emailVerificationToken_idx" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "users_passwordResetToken_idx" ON "users"("passwordResetToken");

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

-- CreateIndex
CREATE INDEX "user_sessions_deviceFingerprint_idx" ON "user_sessions"("deviceFingerprint");

-- CreateIndex
CREATE INDEX "user_sessions_ipAddress_idx" ON "user_sessions"("ipAddress");

-- CreateIndex
CREATE INDEX "user_sessions_lastActivityAt_idx" ON "user_sessions"("lastActivityAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_isRevoked_expiresAt_idx" ON "user_sessions"("userId", "isRevoked", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_fingerprint_key" ON "user_devices"("fingerprint");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_devices_fingerprint_idx" ON "user_devices"("fingerprint");

-- CreateIndex
CREATE INDEX "user_devices_isTrusted_idx" ON "user_devices"("isTrusted");

-- CreateIndex
CREATE INDEX "user_devices_isActive_idx" ON "user_devices"("isActive");

-- CreateIndex
CREATE INDEX "user_devices_lastSeenAt_idx" ON "user_devices"("lastSeenAt");

-- CreateIndex
CREATE INDEX "user_devices_userId_isActive_idx" ON "user_devices"("userId", "isActive");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_attemptType_idx" ON "login_history"("attemptType");

-- CreateIndex
CREATE INDEX "login_history_ipAddress_idx" ON "login_history"("ipAddress");

-- CreateIndex
CREATE INDEX "login_history_isSuspicious_idx" ON "login_history"("isSuspicious");

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "login_history"("createdAt");

-- CreateIndex
CREATE INDEX "login_history_userId_createdAt_idx" ON "login_history"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "login_history_ipAddress_createdAt_idx" ON "login_history"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "login_history_attemptType_createdAt_idx" ON "login_history"("attemptType", "createdAt");

-- CreateIndex
CREATE INDEX "security_audit_logs_userId_idx" ON "security_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "security_audit_logs_action_idx" ON "security_audit_logs"("action");

-- CreateIndex
CREATE INDEX "security_audit_logs_category_idx" ON "security_audit_logs"("category");

-- CreateIndex
CREATE INDEX "security_audit_logs_severity_idx" ON "security_audit_logs"("severity");

-- CreateIndex
CREATE INDEX "security_audit_logs_createdAt_idx" ON "security_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "security_audit_logs_isAnomaly_idx" ON "security_audit_logs"("isAnomaly");

-- CreateIndex
CREATE INDEX "security_audit_logs_riskLevel_idx" ON "security_audit_logs"("riskLevel");

-- CreateIndex
CREATE INDEX "security_audit_logs_userId_createdAt_idx" ON "security_audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "security_audit_logs_action_createdAt_idx" ON "security_audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "security_audit_logs_severity_createdAt_idx" ON "security_audit_logs"("severity", "createdAt");

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
CREATE INDEX "parking_spots_floorId_idx" ON "parking_spots"("floorId");

-- CreateIndex
CREATE INDEX "parking_spots_status_spotType_idx" ON "parking_spots"("status", "spotType");

-- CreateIndex
CREATE INDEX "parking_spots_level_section_idx" ON "parking_spots"("level", "section");

-- CreateIndex
CREATE INDEX "parking_spots_spotType_isActive_idx" ON "parking_spots"("spotType", "isActive");

-- CreateIndex
CREATE INDEX "transactions_garageId_idx" ON "transactions"("garageId");

-- CreateIndex
CREATE INDEX "transactions_ticketId_idx" ON "transactions"("ticketId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_transactionType_idx" ON "transactions"("transactionType");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_processedAt_idx" ON "transactions"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");

-- CreateIndex
CREATE INDEX "email_templates_name_idx" ON "email_templates"("name");

-- CreateIndex
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");

-- CreateIndex
CREATE INDEX "email_templates_language_idx" ON "email_templates"("language");

-- CreateIndex
CREATE UNIQUE INDEX "security_settings_key_key" ON "security_settings"("key");

-- CreateIndex
CREATE INDEX "security_settings_key_idx" ON "security_settings"("key");

-- CreateIndex
CREATE INDEX "security_settings_category_idx" ON "security_settings"("category");

-- CreateIndex
CREATE INDEX "security_settings_environmentSpecific_idx" ON "security_settings"("environmentSpecific");
