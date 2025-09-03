-- ============================================================================
-- PARKING GARAGE DATABASE CONSTRAINTS AND BUSINESS RULES MIGRATION
-- ============================================================================
-- This migration adds comprehensive business logic constraints to ensure data integrity
-- Date: 2025-09-03
-- Purpose: Add CHECK constraints, unique constraints, triggers, and indexes

-- ============================================================================
-- 1. CHECK CONSTRAINTS FOR BUSINESS LOGIC VALIDATION
-- ============================================================================

-- Parking Session Constraints
-- Ensure endTime is after startTime when both are present
CREATE TRIGGER check_parking_session_time_range
BEFORE INSERT ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'End time must be after start time')
    WHERE NEW.endTime IS NOT NULL AND NEW.startTime IS NOT NULL 
    AND datetime(NEW.endTime) <= datetime(NEW.startTime);
END;

CREATE TRIGGER check_parking_session_time_range_update
BEFORE UPDATE ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'End time must be after start time')
    WHERE NEW.endTime IS NOT NULL AND NEW.startTime IS NOT NULL 
    AND datetime(NEW.endTime) <= datetime(NEW.startTime);
END;

-- Duration must be positive
CREATE TRIGGER check_parking_session_positive_duration
BEFORE INSERT ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Session duration must be positive')
    WHERE NEW.duration IS NOT NULL AND NEW.duration <= 0;
END;

CREATE TRIGGER check_parking_session_positive_duration_update
BEFORE UPDATE ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Session duration must be positive')
    WHERE NEW.duration IS NOT NULL AND NEW.duration <= 0;
END;

-- Hourly rate must be positive
CREATE TRIGGER check_parking_session_positive_hourly_rate
BEFORE INSERT ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Hourly rate must be positive')
    WHERE NEW.hourlyRate <= 0;
END;

CREATE TRIGGER check_parking_session_positive_hourly_rate_update
BEFORE UPDATE ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Hourly rate must be positive')
    WHERE NEW.hourlyRate <= 0;
END;

-- Total amount must be non-negative
CREATE TRIGGER check_parking_session_non_negative_total_amount
BEFORE INSERT ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Total amount must be non-negative')
    WHERE NEW.totalAmount < 0;
END;

CREATE TRIGGER check_parking_session_non_negative_total_amount_update
BEFORE UPDATE ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Total amount must be non-negative')
    WHERE NEW.totalAmount < 0;
END;

-- Amount paid must be non-negative
CREATE TRIGGER check_parking_session_non_negative_amount_paid
BEFORE INSERT ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Amount paid must be non-negative')
    WHERE NEW.amountPaid < 0;
END;

CREATE TRIGGER check_parking_session_non_negative_amount_paid_update
BEFORE UPDATE ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Amount paid must be non-negative')
    WHERE NEW.amountPaid < 0;
END;

-- ============================================================================
-- Payment Constraints
-- ============================================================================

-- Payment amount must be positive
CREATE TRIGGER check_payment_positive_amount
BEFORE INSERT ON payments
BEGIN
    SELECT RAISE(ABORT, 'Payment amount must be positive')
    WHERE NEW.amount <= 0;
END;

CREATE TRIGGER check_payment_positive_amount_update
BEFORE UPDATE ON payments
BEGIN
    SELECT RAISE(ABORT, 'Payment amount must be positive')
    WHERE NEW.amount <= 0;
END;

-- Refund amount must be non-negative
CREATE TRIGGER check_payment_non_negative_refund_amount
BEFORE INSERT ON payments
BEGIN
    SELECT RAISE(ABORT, 'Refund amount must be non-negative')
    WHERE NEW.refundAmount IS NOT NULL AND NEW.refundAmount < 0;
END;

CREATE TRIGGER check_payment_non_negative_refund_amount_update
BEFORE UPDATE ON payments
BEGIN
    SELECT RAISE(ABORT, 'Refund amount must be non-negative')
    WHERE NEW.refundAmount IS NOT NULL AND NEW.refundAmount < 0;
END;

-- ============================================================================
-- Parking Spot Constraints
-- ============================================================================

-- Spot dimensions must be positive if specified
CREATE TRIGGER check_parking_spot_positive_dimensions
BEFORE INSERT ON parking_spots
BEGIN
    SELECT RAISE(ABORT, 'Spot dimensions must be positive')
    WHERE (NEW.width IS NOT NULL AND NEW.width <= 0) 
       OR (NEW.length IS NOT NULL AND NEW.length <= 0) 
       OR (NEW.height IS NOT NULL AND NEW.height <= 0);
END;

CREATE TRIGGER check_parking_spot_positive_dimensions_update
BEFORE UPDATE ON parking_spots
BEGIN
    SELECT RAISE(ABORT, 'Spot dimensions must be positive')
    WHERE (NEW.width IS NOT NULL AND NEW.width <= 0) 
       OR (NEW.length IS NOT NULL AND NEW.length <= 0) 
       OR (NEW.height IS NOT NULL AND NEW.height <= 0);
END;

-- ============================================================================
-- Garage and Floor Constraints
-- ============================================================================

-- Total floors must be positive
CREATE TRIGGER check_garage_positive_total_floors
BEFORE INSERT ON garages
BEGIN
    SELECT RAISE(ABORT, 'Total floors must be positive')
    WHERE NEW.totalFloors <= 0;
END;

CREATE TRIGGER check_garage_positive_total_floors_update
BEFORE UPDATE ON garages
BEGIN
    SELECT RAISE(ABORT, 'Total floors must be positive')
    WHERE NEW.totalFloors <= 0;
END;

-- Total spots must be non-negative
CREATE TRIGGER check_garage_non_negative_total_spots
BEFORE INSERT ON garages
BEGIN
    SELECT RAISE(ABORT, 'Total spots must be non-negative')
    WHERE NEW.totalSpots < 0;
END;

CREATE TRIGGER check_garage_non_negative_total_spots_update
BEFORE UPDATE ON garages
BEGIN
    SELECT RAISE(ABORT, 'Total spots must be non-negative')
    WHERE NEW.totalSpots < 0;
END;

-- Floor number must be positive
CREATE TRIGGER check_floor_positive_floor_number
BEFORE INSERT ON floors
BEGIN
    SELECT RAISE(ABORT, 'Floor number must be positive')
    WHERE NEW.floorNumber <= 0;
END;

CREATE TRIGGER check_floor_positive_floor_number_update
BEFORE UPDATE ON floors
BEGIN
    SELECT RAISE(ABORT, 'Floor number must be positive')
    WHERE NEW.floorNumber <= 0;
END;

-- Floor total spots must be non-negative
CREATE TRIGGER check_floor_non_negative_total_spots
BEFORE INSERT ON floors
BEGIN
    SELECT RAISE(ABORT, 'Floor total spots must be non-negative')
    WHERE NEW.totalSpots < 0;
END;

CREATE TRIGGER check_floor_non_negative_total_spots_update
BEFORE UPDATE ON floors
BEGIN
    SELECT RAISE(ABORT, 'Floor total spots must be non-negative')
    WHERE NEW.totalSpots < 0;
END;

-- ============================================================================
-- 2. BUSINESS LOGIC ENFORCEMENT TRIGGERS
-- ============================================================================

-- Prevent overlapping parking sessions for the same vehicle
CREATE TRIGGER check_no_overlapping_vehicle_sessions
BEFORE INSERT ON parking_sessions
WHEN NEW.status = 'ACTIVE'
BEGIN
    SELECT RAISE(ABORT, 'Vehicle already has an active parking session')
    WHERE EXISTS (
        SELECT 1 FROM parking_sessions ps
        WHERE ps.vehicleId = NEW.vehicleId 
        AND ps.status = 'ACTIVE'
        AND ps.id != NEW.id
    );
END;

-- Prevent double-booking of parking spots
CREATE TRIGGER check_no_double_booking_spots
BEFORE INSERT ON parking_sessions
WHEN NEW.status = 'ACTIVE'
BEGIN
    SELECT RAISE(ABORT, 'Parking spot is already occupied')
    WHERE EXISTS (
        SELECT 1 FROM parking_sessions ps
        WHERE ps.spotId = NEW.spotId 
        AND ps.status = 'ACTIVE'
        AND ps.id != NEW.id
    );
END;

-- Auto-update parking spot status when session starts
CREATE TRIGGER auto_update_spot_status_on_session_start
AFTER INSERT ON parking_sessions
WHEN NEW.status = 'ACTIVE'
BEGIN
    UPDATE parking_spots 
    SET status = 'OCCUPIED', updatedAt = datetime('now')
    WHERE id = NEW.spotId;
END;

-- Auto-update parking spot status when session ends
CREATE TRIGGER auto_update_spot_status_on_session_end
AFTER UPDATE OF status ON parking_sessions
WHEN OLD.status = 'ACTIVE' AND NEW.status IN ('COMPLETED', 'CANCELLED')
BEGIN
    UPDATE parking_spots 
    SET status = 'AVAILABLE', updatedAt = datetime('now')
    WHERE id = NEW.spotId
    AND NOT EXISTS (
        SELECT 1 FROM parking_sessions ps
        WHERE ps.spotId = NEW.spotId 
        AND ps.status = 'ACTIVE'
        AND ps.id != NEW.id
    );
END;

-- Validate vehicle type and spot type compatibility
CREATE TRIGGER check_vehicle_spot_type_compatibility
BEFORE INSERT ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Vehicle type not compatible with spot type')
    WHERE NOT EXISTS (
        SELECT 1 FROM parking_spots ps, vehicles v
        WHERE ps.id = NEW.spotId 
        AND v.id = NEW.vehicleId
        AND (
            -- Standard vehicles can park in standard, oversized spots
            (v.vehicleType = 'STANDARD' AND ps.spotType IN ('STANDARD', 'OVERSIZED')) OR
            -- Compact vehicles can park in any non-handicap spot
            (v.vehicleType = 'COMPACT' AND ps.spotType IN ('COMPACT', 'STANDARD', 'OVERSIZED')) OR
            -- Oversized vehicles can only park in oversized spots
            (v.vehicleType = 'OVERSIZED' AND ps.spotType = 'OVERSIZED') OR
            -- Electric vehicles can park in electric or standard spots
            (v.vehicleType = 'ELECTRIC' AND ps.spotType IN ('ELECTRIC', 'STANDARD', 'OVERSIZED')) OR
            -- Motorcycles can park in motorcycle or compact spots
            (v.vehicleType = 'MOTORCYCLE' AND ps.spotType IN ('MOTORCYCLE', 'COMPACT')) OR
            -- Handicap vehicles can park in handicap or standard spots
            (v.vehicleType = 'HANDICAP' AND ps.spotType IN ('HANDICAP', 'STANDARD', 'OVERSIZED'))
        )
    );
END;

-- Prevent checkout without checkin (endTime without startTime)
CREATE TRIGGER check_no_checkout_without_checkin
BEFORE UPDATE ON parking_sessions
BEGIN
    SELECT RAISE(ABORT, 'Cannot set end time without start time')
    WHERE NEW.endTime IS NOT NULL AND NEW.startTime IS NULL;
END;

-- Validate payment matches calculated amount (with tolerance for rounding)
CREATE TRIGGER validate_payment_amount_matches_session
BEFORE UPDATE OF isPaid ON parking_sessions
WHEN NEW.isPaid = 1
BEGIN
    SELECT RAISE(ABORT, 'Payment amount does not match calculated session cost')
    WHERE ABS(NEW.amountPaid - NEW.totalAmount) > 0.01;
END;

-- ============================================================================
-- 3. DATA INTEGRITY AND REFERENTIAL CONSTRAINTS
-- ============================================================================

-- Ensure payment session exists if sessionId is provided
CREATE TRIGGER check_payment_session_exists
BEFORE INSERT ON payments
WHEN NEW.sessionId IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Referenced parking session does not exist')
    WHERE NOT EXISTS (
        SELECT 1 FROM parking_sessions 
        WHERE id = NEW.sessionId
    );
END;

-- Ensure payment vehicle exists if vehicleId is provided
CREATE TRIGGER check_payment_vehicle_exists
BEFORE INSERT ON payments
WHEN NEW.vehicleId IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Referenced vehicle does not exist')
    WHERE NOT EXISTS (
        SELECT 1 FROM vehicles 
        WHERE id = NEW.vehicleId
    );
END;

-- ============================================================================
-- 4. ADVANCED BUSINESS RULES
-- ============================================================================

-- Auto-calculate session duration on end time update
CREATE TRIGGER auto_calculate_session_duration
AFTER UPDATE OF endTime ON parking_sessions
WHEN NEW.endTime IS NOT NULL AND NEW.startTime IS NOT NULL
BEGIN
    UPDATE parking_sessions 
    SET duration = CAST((julianday(NEW.endTime) - julianday(NEW.startTime)) * 24 * 60 AS INTEGER),
        updatedAt = datetime('now')
    WHERE id = NEW.id;
END;

-- Auto-calculate total amount based on duration and hourly rate
CREATE TRIGGER auto_calculate_total_amount
AFTER UPDATE OF duration, hourlyRate ON parking_sessions
WHEN NEW.duration IS NOT NULL AND NEW.hourlyRate IS NOT NULL
BEGIN
    UPDATE parking_sessions 
    SET totalAmount = ROUND((NEW.duration / 60.0) * NEW.hourlyRate, 2),
        updatedAt = datetime('now')
    WHERE id = NEW.id;
END;

-- Update vehicle status based on session status
CREATE TRIGGER sync_vehicle_status_with_session
AFTER UPDATE OF status ON parking_sessions
BEGIN
    UPDATE vehicles 
    SET status = CASE 
        WHEN NEW.status = 'ACTIVE' THEN 'PARKED'
        WHEN NEW.status = 'COMPLETED' THEN 'DEPARTED'
        WHEN NEW.status = 'CANCELLED' THEN 'INACTIVE'
        ELSE 'INACTIVE'
    END,
    updatedAt = datetime('now')
    WHERE id = NEW.vehicleId;
END;

-- ============================================================================
-- 5. PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Indexes for constraint validation queries
CREATE INDEX IF NOT EXISTS idx_parking_sessions_vehicle_status_time 
ON parking_sessions(vehicleId, status, startTime);

CREATE INDEX IF NOT EXISTS idx_parking_sessions_spot_status_time 
ON parking_sessions(spotId, status, startTime);

CREATE INDEX IF NOT EXISTS idx_parking_spots_status_type_active 
ON parking_spots(status, spotType, isActive);

CREATE INDEX IF NOT EXISTS idx_vehicles_type_status 
ON vehicles(vehicleType, status);

CREATE INDEX IF NOT EXISTS idx_payments_session_status_amount 
ON payments(sessionId, status, amount);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id 
ON payments(transactionId) WHERE transactionId IS NOT NULL;

-- Composite indexes for business logic queries
CREATE INDEX IF NOT EXISTS idx_parking_sessions_active_lookup 
ON parking_sessions(status, vehicleId, spotId) 
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_parking_spots_available_lookup 
ON parking_spots(status, spotType, isActive) 
WHERE status = 'AVAILABLE' AND isActive = 1;

-- Date range indexes for reporting
CREATE INDEX IF NOT EXISTS idx_parking_sessions_date_range 
ON parking_sessions(startTime, endTime, status);

CREATE INDEX IF NOT EXISTS idx_payments_date_range 
ON payments(paymentDate, status, amount);

-- ============================================================================
-- 6. UNIQUE BUSINESS CONSTRAINTS
-- ============================================================================

-- Unique constraint for active parking sessions per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_vehicle_session 
ON parking_sessions(vehicleId) 
WHERE status = 'ACTIVE';

-- Unique constraint for active parking sessions per spot
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_spot_session 
ON parking_sessions(spotId) 
WHERE status = 'ACTIVE';

-- Unique constraint for external transaction IDs (non-null only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_payment_transaction_id 
ON payments(transactionId) 
WHERE transactionId IS NOT NULL;

-- Unique constraint for external payment references (non-null only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_transaction_payment_reference 
ON transactions(paymentReference) 
WHERE paymentReference IS NOT NULL;

-- ============================================================================
-- Migration completed successfully
-- ============================================================================