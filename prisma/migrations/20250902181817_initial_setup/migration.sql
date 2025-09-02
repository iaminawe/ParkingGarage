-- CreateTable
CREATE TABLE "garages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalFloors" INTEGER NOT NULL DEFAULT 1,
    "totalSpots" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "operatingHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "bays" INTEGER NOT NULL DEFAULT 1,
    "spotsPerBay" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "floors_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "spots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "floorId" TEXT,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "bay" INTEGER NOT NULL DEFAULT 1,
    "spotNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "features" TEXT NOT NULL DEFAULT '[]',
    "currentVehicleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "spots_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "spots_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "spots_currentVehicleId_fkey" FOREIGN KEY ("currentVehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licensePlate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'STANDARD',
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "year" INTEGER,
    "ownerName" TEXT,
    "ownerEmail" TEXT,
    "ownerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentSpotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "parking_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rateType" TEXT NOT NULL DEFAULT 'HOURLY',
    "checkInTime" DATETIME NOT NULL,
    "checkOutTime" DATETIME,
    "expectedEndTime" DATETIME,
    "durationMinutes" INTEGER,
    "hourlyRate" REAL,
    "totalAmount" REAL NOT NULL DEFAULT 0.0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" TEXT,
    "endReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "parking_sessions_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parking_sessions_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parking_sessions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "sessionId" TEXT,
    "ticketNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OVERSTAY',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "description" TEXT NOT NULL,
    "violationTime" DATETIME NOT NULL,
    "location" TEXT,
    "fineAmount" REAL NOT NULL DEFAULT 0.0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentDueDate" DATETIME,
    "issuedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "tickets_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "parking_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garageId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "sessionId" TEXT,
    "ticketId" TEXT,
    "paymentNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PARKING',
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "transactionId" TEXT,
    "gatewayResponse" TEXT,
    "paymentDate" DATETIME NOT NULL,
    "processedAt" DATETIME,
    "refundAmount" REAL NOT NULL DEFAULT 0.0,
    "refundDate" DATETIME,
    "refundReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "payments_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "parking_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "garages_name_key" ON "garages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "floors_garageId_number_key" ON "floors"("garageId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "spots_currentVehicleId_key" ON "spots"("currentVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "spots_garageId_spotNumber_key" ON "spots"("garageId", "spotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_currentSpotId_key" ON "vehicles"("currentSpotId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");
