/**
 * Sessions Repository
 * 
 * Data access layer for parking session operations.
 * Handles CRUD operations and data persistence for parking sessions.
 * 
 * @module SessionsRepository
 */

import MemoryStore = require('../storage/memoryStore');
import { ParkingSession } from '../types/api';

export interface StoredSession {
  id: any;
  vehicleId?: any;
  licensePlate?: any;
  vehicleType?: any;
  vehicleMake?: any;
  vehicleModel?: any;
  vehicleColor?: any;
  spotId?: any;
  floor?: number;
  bay?: number;
  spotNumber?: number;
  garageId?: any;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: any;
  updatedAt: any;
  endTime?: any;
  expectedEndTime?: any;
  duration?: number; // in minutes
  cost?: number;
  rateType?: any;
  endReason?: any;
  notes?: any;
  tags?: any[];
  metadata?: Record<string, any>;
}

export class SessionsRepository {
  private store: MemoryStore;

  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Find all sessions
   */
  async findAll(): Promise<ParkingSession[]> {
    try {
      const sessions: ParkingSession[] = [];
      
      // Convert stored sessions to API format
      for (const [id, storedSession] of this.store.sessions.entries()) {
        sessions.push(this.mapStoredSessionToApi(storedSession));
      }

      return sessions;
    } catch (error) {
      console.error('SessionsRepository.findAll error:', error);
      throw new Error('Failed to retrieve sessions from storage');
    }
  }

  /**
   * Find session by ID
   */
  async findById(sessionId: any): Promise<ParkingSession | null> {
    try {
      const storedSession = this.store.sessions.get(sessionId);
      
      if (!storedSession) {
        return null;
      }

      return this.mapStoredSessionToApi(storedSession);
    } catch (error) {
      console.error('SessionsRepository.findById error:', error);
      throw new Error('Failed to retrieve session from storage');
    }
  }

  /**
   * Find sessions by vehicle ID
   */
  async findByVehicleId(vehicleId: any): Promise<ParkingSession[]> {
    try {
      const sessions: ParkingSession[] = [];
      
      for (const [id, storedSession] of this.store.sessions.entries()) {
        if (storedSession.vehicleId === vehicleId) {
          sessions.push(this.mapStoredSessionToApi(storedSession));
        }
      }

      return sessions;
    } catch (error) {
      console.error('SessionsRepository.findByVehicleId error:', error);
      throw new Error('Failed to retrieve sessions by vehicle ID');
    }
  }

  /**
   * Find sessions by license plate
   */
  async findByLicensePlate(licensePlate: any): Promise<ParkingSession[]> {
    try {
      const sessions: ParkingSession[] = [];
      
      for (const [id, storedSession] of this.store.sessions.entries()) {
        if (storedSession.licensePlate?.toLowerCase() === licensePlate.toLowerCase()) {
          sessions.push(this.mapStoredSessionToApi(storedSession));
        }
      }

      return sessions;
    } catch (error) {
      console.error('SessionsRepository.findByLicensePlate error:', error);
      throw new Error('Failed to retrieve sessions by license plate');
    }
  }

  /**
   * Find active sessions
   */
  async findActiveSessions(): Promise<ParkingSession[]> {
    try {
      const sessions: ParkingSession[] = [];
      
      for (const [id, storedSession] of this.store.sessions.entries()) {
        if (storedSession.status === 'active') {
          sessions.push(this.mapStoredSessionToApi(storedSession));
        }
      }

      return sessions;
    } catch (error) {
      console.error('SessionsRepository.findActiveSessions error:', error);
      throw new Error('Failed to retrieve active sessions');
    }
  }

  /**
   * Create a new session
   */
  async create(sessionData: Partial<StoredSession>): Promise<ParkingSession> {
    try {
      const id = sessionData.id || this.generateSessionId();
      const now = new Date().toISOString();
      
      const storedSession: StoredSession = {
        id,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        ...sessionData,
        // Override with generated values
        // updatedAt is already set above
      };

      // Store in memory
      this.store.sessions.set(id, storedSession);

      // Update session counters
      this.updateSessionCounters(storedSession, 'create');

      return this.mapStoredSessionToApi(storedSession);
    } catch (error) {
      console.error('SessionsRepository.create error:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Update an existing session
   */
  async update(sessionId: any, updates: Partial<StoredSession>): Promise<ParkingSession> {
    try {
      const existingSession = this.store.sessions.get(sessionId);
      
      if (!existingSession) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }

      const updatedSession: StoredSession = {
        ...existingSession,
        ...updates,
        id: sessionId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };

      // Store updated session
      this.store.sessions.set(sessionId, updatedSession);

      // Update session counters if status changed
      if (updates.status && updates.status !== existingSession.status) {
        this.updateSessionCounters(existingSession, 'delete');
        this.updateSessionCounters(updatedSession, 'create');
      }

      return this.mapStoredSessionToApi(updatedSession);
    } catch (error) {
      console.error('SessionsRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async delete(sessionId: any): Promise<boolean> {
    try {
      const existingSession = this.store.sessions.get(sessionId);
      
      if (!existingSession) {
        return false;
      }

      // Remove from storage
      const deleted = this.store.sessions.delete(sessionId);

      if (deleted) {
        // Update session counters
        this.updateSessionCounters(existingSession, 'delete');
      }

      return deleted;
    } catch (error) {
      console.error('SessionsRepository.delete error:', error);
      throw new Error('Failed to delete session');
    }
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  }> {
    try {
      let total = 0;
      let active = 0;
      let completed = 0;
      let cancelled = 0;

      for (const [id, session] of this.store.sessions.entries()) {
        total++;
        switch (session.status) {
          case 'active':
            active++;
            break;
          case 'completed':
            completed++;
            break;
          case 'cancelled':
            cancelled++;
            break;
        }
      }

      return { total, active, completed, cancelled };
    } catch (error) {
      console.error('SessionsRepository.getStats error:', error);
      throw new Error('Failed to get session statistics');
    }
  }

  /**
   * Clear all sessions (for testing/development)
   */
  async clear(): Promise<void> {
    try {
      this.store.sessions.clear();
      // Reset any session-related counters in garage config
      this.resetSessionCounters();
    } catch (error) {
      console.error('SessionsRepository.clear error:', error);
      throw new Error('Failed to clear sessions');
    }
  }

  // Private helper methods

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): any {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `SES-${timestamp}-${random.toUpperCase()}`;
  }

  /**
   * Map stored session to API format
   */
  private mapStoredSessionToApi(stored: StoredSession): ParkingSession {
    return {
      id: stored.id,
      vehicleId: stored.vehicleId,
      licensePlate: stored.licensePlate,
      vehicleType: stored.vehicleType as any,
      vehicleMake: stored.vehicleMake,
      vehicleModel: stored.vehicleModel,
      vehicleColor: stored.vehicleColor,
      spotId: stored.spotId,
      floor: stored.floor,
      bay: stored.bay,
      spotNumber: stored.spotNumber?.toString(),
      garageId: stored.garageId,
      status: stored.status as any,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      endTime: stored.endTime,
      expectedEndTime: stored.expectedEndTime,
      duration: stored.duration,
      cost: stored.cost,
      rateType: stored.rateType,
      endReason: stored.endReason,
      notes: stored.notes,
      tags: stored.tags,
      metadata: stored.metadata
    };
  }

  /**
   * Update session counters in garage configuration
   */
  private updateSessionCounters(session: StoredSession, operation: 'create' | 'delete'): void {
    try {
      // This would update counters in garage configuration if needed
      // For now, we'll skip this as it's not critical for basic functionality
    } catch (error) {
      console.error('Failed to update session counters:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Reset session counters
   */
  private resetSessionCounters(): void {
    try {
      // Reset any session-related counters in garage config
      // For now, we'll skip this as it's not critical for basic functionality
    } catch (error) {
      console.error('Failed to reset session counters:', error);
      // Don't throw - this is not critical
    }
  }
}