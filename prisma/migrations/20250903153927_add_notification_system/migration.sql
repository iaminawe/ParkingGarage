-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "conditions" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "garageId" TEXT,
    "spotTypes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pricing_rules_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "minAmount" REAL,
    "maxDiscount" REAL,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableSpotTypes" TEXT,
    "membershipTiersOnly" TEXT,
    "garageId" TEXT,
    "createdBy" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "discount_codes_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "discount_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discount_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discountCodeId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "vehicleId" TEXT,
    "spotId" TEXT,
    "originalAmount" REAL NOT NULL,
    "discountAmount" REAL NOT NULL,
    "finalAmount" REAL NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "discount_usage_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "discount_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "discount_usage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "parking_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "discount_usage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "discount_usage_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "parking_spots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "membership_benefits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "priorityBooking" BOOLEAN NOT NULL DEFAULT false,
    "extendedGracePeriod" INTEGER NOT NULL DEFAULT 5,
    "freeHours" REAL NOT NULL DEFAULT 0,
    "specialRates" TEXT,
    "features" TEXT,
    "maxReservations" INTEGER,
    "advanceBookingDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "discount" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER,
    "garageId" TEXT,
    "applicableSpots" TEXT,
    "targetAudience" TEXT,
    "createdBy" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "promotions_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "promotions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "promotion_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "vehicleId" TEXT,
    "spotId" TEXT,
    "savings" REAL NOT NULL,
    "metadata" TEXT,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promotion_usage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "promotion_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "promotion_usage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "parking_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "promotion_usage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "promotion_usage_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "parking_spots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "surge_zones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "floors" TEXT NOT NULL,
    "spotTypes" TEXT NOT NULL,
    "currentMultiplier" REAL NOT NULL DEFAULT 1.0,
    "maxMultiplier" REAL NOT NULL DEFAULT 3.0,
    "occupancyThreshold" REAL NOT NULL DEFAULT 0.8,
    "peakHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "garageId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "surge_zones_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "demand_forecasts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hour" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "expectedOccupancy" REAL NOT NULL,
    "surgeMultiplier" REAL NOT NULL DEFAULT 1.0,
    "confidence" REAL NOT NULL,
    "spotType" TEXT,
    "garageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "demand_forecasts_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pricing_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "vehicleId" TEXT,
    "spotId" TEXT,
    "garageId" TEXT,
    "ruleId" TEXT,
    "discountCodeId" TEXT,
    "promotionId" TEXT,
    "surgeZoneId" TEXT,
    "baseRate" REAL NOT NULL,
    "surgeMultiplier" REAL NOT NULL DEFAULT 1.0,
    "surgeRate" REAL NOT NULL,
    "membershipDiscount" REAL NOT NULL DEFAULT 0,
    "discountCodeDiscount" REAL NOT NULL DEFAULT 0,
    "promotionDiscount" REAL NOT NULL DEFAULT 0,
    "finalRate" REAL NOT NULL,
    "estimatedAmount" REAL,
    "actualAmount" REAL,
    "spotType" TEXT,
    "spotFeatures" TEXT,
    "rateType" TEXT,
    "membershipTier" TEXT,
    "duration" INTEGER,
    "checkInTime" DATETIME NOT NULL,
    "checkOutTime" DATETIME,
    "calculationData" TEXT,
    "appliedRules" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pricing_history_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "parking_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pricing_history_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pricing_history_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "parking_spots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pricing_history_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pricing_history_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "pricing_rules" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pricing_history_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pricing_history_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pricing_history_surgeZoneId_fkey" FOREIGN KEY ("surgeZoneId") REFERENCES "surge_zones" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "readAt" DATETIME,
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduleAt" DATETIME,
    "expiresAt" DATETIME,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'en',
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "frequency" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "categories" TEXT,
    "metadata" TEXT,
    "doNotDisturbUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,
    "error" TEXT,
    "retryAttempt" INTEGER,
    "processingTime" INTEGER,
    "externalId" TEXT,
    "metadata" TEXT,
    CONSTRAINT "notification_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "pricing_rules_type_idx" ON "pricing_rules"("type");

-- CreateIndex
CREATE INDEX "pricing_rules_isActive_idx" ON "pricing_rules"("isActive");

-- CreateIndex
CREATE INDEX "pricing_rules_priority_idx" ON "pricing_rules"("priority");

-- CreateIndex
CREATE INDEX "pricing_rules_validFrom_validUntil_idx" ON "pricing_rules"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "pricing_rules_garageId_isActive_idx" ON "pricing_rules"("garageId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_code_idx" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_isActive_idx" ON "discount_codes"("isActive");

-- CreateIndex
CREATE INDEX "discount_codes_validFrom_validUntil_idx" ON "discount_codes"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "discount_codes_type_idx" ON "discount_codes"("type");

-- CreateIndex
CREATE INDEX "discount_codes_garageId_idx" ON "discount_codes"("garageId");

-- CreateIndex
CREATE INDEX "discount_codes_usedCount_usageLimit_idx" ON "discount_codes"("usedCount", "usageLimit");

-- CreateIndex
CREATE INDEX "discount_usage_discountCodeId_idx" ON "discount_usage"("discountCodeId");

-- CreateIndex
CREATE INDEX "discount_usage_userId_idx" ON "discount_usage"("userId");

-- CreateIndex
CREATE INDEX "discount_usage_sessionId_idx" ON "discount_usage"("sessionId");

-- CreateIndex
CREATE INDEX "discount_usage_usedAt_idx" ON "discount_usage"("usedAt");

-- CreateIndex
CREATE INDEX "discount_usage_discountCodeId_userId_idx" ON "discount_usage"("discountCodeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_benefits_tier_key" ON "membership_benefits"("tier");

-- CreateIndex
CREATE INDEX "membership_benefits_tier_idx" ON "membership_benefits"("tier");

-- CreateIndex
CREATE INDEX "membership_benefits_isActive_idx" ON "membership_benefits"("isActive");

-- CreateIndex
CREATE INDEX "membership_benefits_sortOrder_idx" ON "membership_benefits"("sortOrder");

-- CreateIndex
CREATE INDEX "promotions_isActive_idx" ON "promotions"("isActive");

-- CreateIndex
CREATE INDEX "promotions_startDate_endDate_idx" ON "promotions"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "promotions_type_idx" ON "promotions"("type");

-- CreateIndex
CREATE INDEX "promotions_priority_idx" ON "promotions"("priority");

-- CreateIndex
CREATE INDEX "promotions_garageId_idx" ON "promotions"("garageId");

-- CreateIndex
CREATE INDEX "promotions_usedCount_usageLimit_idx" ON "promotions"("usedCount", "usageLimit");

-- CreateIndex
CREATE INDEX "promotion_usage_promotionId_idx" ON "promotion_usage"("promotionId");

-- CreateIndex
CREATE INDEX "promotion_usage_userId_idx" ON "promotion_usage"("userId");

-- CreateIndex
CREATE INDEX "promotion_usage_sessionId_idx" ON "promotion_usage"("sessionId");

-- CreateIndex
CREATE INDEX "promotion_usage_usedAt_idx" ON "promotion_usage"("usedAt");

-- CreateIndex
CREATE INDEX "promotion_usage_promotionId_userId_idx" ON "promotion_usage"("promotionId", "userId");

-- CreateIndex
CREATE INDEX "surge_zones_isActive_idx" ON "surge_zones"("isActive");

-- CreateIndex
CREATE INDEX "surge_zones_garageId_idx" ON "surge_zones"("garageId");

-- CreateIndex
CREATE INDEX "surge_zones_currentMultiplier_idx" ON "surge_zones"("currentMultiplier");

-- CreateIndex
CREATE INDEX "surge_zones_occupancyThreshold_idx" ON "surge_zones"("occupancyThreshold");

-- CreateIndex
CREATE INDEX "demand_forecasts_hour_dayOfWeek_idx" ON "demand_forecasts"("hour", "dayOfWeek");

-- CreateIndex
CREATE INDEX "demand_forecasts_spotType_idx" ON "demand_forecasts"("spotType");

-- CreateIndex
CREATE INDEX "demand_forecasts_garageId_idx" ON "demand_forecasts"("garageId");

-- CreateIndex
CREATE INDEX "demand_forecasts_isActive_idx" ON "demand_forecasts"("isActive");

-- CreateIndex
CREATE INDEX "demand_forecasts_expectedOccupancy_idx" ON "demand_forecasts"("expectedOccupancy");

-- CreateIndex
CREATE UNIQUE INDEX "demand_forecasts_hour_dayOfWeek_spotType_garageId_key" ON "demand_forecasts"("hour", "dayOfWeek", "spotType", "garageId");

-- CreateIndex
CREATE INDEX "pricing_history_sessionId_idx" ON "pricing_history"("sessionId");

-- CreateIndex
CREATE INDEX "pricing_history_vehicleId_idx" ON "pricing_history"("vehicleId");

-- CreateIndex
CREATE INDEX "pricing_history_spotId_idx" ON "pricing_history"("spotId");

-- CreateIndex
CREATE INDEX "pricing_history_garageId_idx" ON "pricing_history"("garageId");

-- CreateIndex
CREATE INDEX "pricing_history_checkInTime_idx" ON "pricing_history"("checkInTime");

-- CreateIndex
CREATE INDEX "pricing_history_spotType_idx" ON "pricing_history"("spotType");

-- CreateIndex
CREATE INDEX "pricing_history_membershipTier_idx" ON "pricing_history"("membershipTier");

-- CreateIndex
CREATE INDEX "pricing_history_ruleId_idx" ON "pricing_history"("ruleId");

-- CreateIndex
CREATE INDEX "pricing_history_discountCodeId_idx" ON "pricing_history"("discountCodeId");

-- CreateIndex
CREATE INDEX "pricing_history_createdAt_idx" ON "pricing_history"("createdAt");

-- CreateIndex
CREATE INDEX "pricing_history_checkInTime_spotType_idx" ON "pricing_history"("checkInTime", "spotType");

-- CreateIndex
CREATE INDEX "pricing_history_garageId_checkInTime_idx" ON "pricing_history"("garageId", "checkInTime");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_sentAt_idx" ON "notifications"("sentAt");

-- CreateIndex
CREATE INDEX "notifications_scheduleAt_idx" ON "notifications"("scheduleAt");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_channel_idx" ON "notifications"("userId", "channel");

-- CreateIndex
CREATE INDEX "notifications_type_channel_idx" ON "notifications"("type", "channel");

-- CreateIndex
CREATE INDEX "notifications_status_retryCount_idx" ON "notifications"("status", "retryCount");

-- CreateIndex
CREATE INDEX "notifications_scheduleAt_status_idx" ON "notifications"("scheduleAt", "status");

-- CreateIndex
CREATE INDEX "notifications_channel_priority_status_idx" ON "notifications"("channel", "priority", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_name_key" ON "notification_templates"("name");

-- CreateIndex
CREATE INDEX "notification_templates_name_idx" ON "notification_templates"("name");

-- CreateIndex
CREATE INDEX "notification_templates_type_idx" ON "notification_templates"("type");

-- CreateIndex
CREATE INDEX "notification_templates_channel_idx" ON "notification_templates"("channel");

-- CreateIndex
CREATE INDEX "notification_templates_isActive_idx" ON "notification_templates"("isActive");

-- CreateIndex
CREATE INDEX "notification_templates_language_idx" ON "notification_templates"("language");

-- CreateIndex
CREATE INDEX "notification_templates_type_channel_idx" ON "notification_templates"("type", "channel");

-- CreateIndex
CREATE INDEX "notification_templates_type_channel_language_idx" ON "notification_templates"("type", "channel", "language");

-- CreateIndex
CREATE INDEX "notification_templates_isActive_type_channel_idx" ON "notification_templates"("isActive", "type", "channel");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_channel_idx" ON "notification_preferences"("channel");

-- CreateIndex
CREATE INDEX "notification_preferences_enabled_idx" ON "notification_preferences"("enabled");

-- CreateIndex
CREATE INDEX "notification_preferences_frequency_idx" ON "notification_preferences"("frequency");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_enabled_idx" ON "notification_preferences"("userId", "enabled");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_channel_enabled_idx" ON "notification_preferences"("userId", "channel", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_channel_key" ON "notification_preferences"("userId", "channel");

-- CreateIndex
CREATE INDEX "notification_logs_notificationId_idx" ON "notification_logs"("notificationId");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_timestamp_idx" ON "notification_logs"("timestamp");

-- CreateIndex
CREATE INDEX "notification_logs_notificationId_timestamp_idx" ON "notification_logs"("notificationId", "timestamp");

-- CreateIndex
CREATE INDEX "notification_logs_status_timestamp_idx" ON "notification_logs"("status", "timestamp");

-- CreateIndex
CREATE INDEX "notification_logs_retryAttempt_timestamp_idx" ON "notification_logs"("retryAttempt", "timestamp");
