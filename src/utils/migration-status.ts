/**
 * Migration Status Tracking System
 *
 * Provides utilities for tracking migration progress, storing checkpoints,
 * and managing migration state for resumable operations.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MigrationCheckpoint {
  id: string;
  step: string;
  timestamp: Date;
  data: {
    totalRecords: number;
    processedRecords: number;
    currentTable: string;
    lastProcessedId?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface MigrationStatus {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  error?: string;
  checkpoints: MigrationCheckpoint[];
  backupPath?: string;
  totalSteps: number;
  completedSteps: number;
}

export class MigrationStatusTracker {
  private statusFile: string;
  private checkpointsDir: string;

  constructor(migrationId?: string) {
    const baseDir = path.join(process.cwd(), '.migration');
    this.statusFile = path.join(baseDir, `status-${migrationId || 'default'}.json`);
    this.checkpointsDir = path.join(baseDir, 'checkpoints');

    // Ensure directories exist
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.checkpointsDir)) {
      fs.mkdirSync(this.checkpointsDir, { recursive: true });
    }
  }

  /**
   * Initialize a new migration status
   */
  async initializeMigration(
    id: string,
    totalSteps: number,
    backupPath?: string
  ): Promise<MigrationStatus> {
    const status: MigrationStatus = {
      id,
      status: 'pending',
      startTime: new Date(),
      checkpoints: [],
      totalSteps,
      completedSteps: 0,
      backupPath,
    };

    await this.saveStatus(status);
    return status;
  }

  /**
   * Update migration status
   */
  async updateStatus(status: Partial<MigrationStatus> & { id: string }): Promise<MigrationStatus> {
    const currentStatus = await this.getStatus();
    const updatedStatus: MigrationStatus = {
      ...currentStatus,
      ...status,
      endTime:
        status.status === 'completed' || status.status === 'failed'
          ? new Date()
          : currentStatus.endTime,
    };

    await this.saveStatus(updatedStatus);
    return updatedStatus;
  }

  /**
   * Create a checkpoint
   */
  async createCheckpoint(
    step: string,
    data: MigrationCheckpoint['data'],
    metadata?: Record<string, unknown>
  ): Promise<MigrationCheckpoint> {
    const checkpoint: MigrationCheckpoint = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      step,
      timestamp: new Date(),
      data,
      metadata,
    };

    // Save checkpoint to file
    const checkpointFile = path.join(this.checkpointsDir, `${checkpoint.id}.json`);
    await fs.promises.writeFile(checkpointFile, JSON.stringify(checkpoint, null, 2));

    // Update status with new checkpoint
    const status = await this.getStatus();
    status.checkpoints.push(checkpoint);
    await this.saveStatus(status);

    return checkpoint;
  }

  /**
   * Get current migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    try {
      const data = await fs.promises.readFile(this.statusFile, 'utf8');
      const status = JSON.parse(data);

      // Convert date strings back to Date objects
      status.startTime = new Date(status.startTime);
      if (status.endTime) {
        status.endTime = new Date(status.endTime);
      }
      status.checkpoints = status.checkpoints.map((cp: any) => ({
        ...cp,
        timestamp: new Date(cp.timestamp),
      }));

      return status;
    } catch (error) {
      throw new Error(
        `Failed to read migration status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get last checkpoint for resuming migration
   */
  async getLastCheckpoint(): Promise<MigrationCheckpoint | null> {
    const status = await this.getStatus();
    const lastCheckpoint = status.checkpoints.length > 0 ? status.checkpoints[status.checkpoints.length - 1] : undefined;
    return lastCheckpoint || null;
  }

  /**
   * Check if migration can be resumed
   */
  async canResume(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.status === 'in_progress' && status.checkpoints.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clean up migration files
   */
  async cleanup(): Promise<void> {
    try {
      // Remove status file
      if (fs.existsSync(this.statusFile)) {
        await fs.promises.unlink(this.statusFile);
      }

      // Remove checkpoint files
      const status = await this.getStatus();
      for (const checkpoint of status.checkpoints) {
        const checkpointFile = path.join(this.checkpointsDir, `${checkpoint.id}.json`);
        if (fs.existsSync(checkpointFile)) {
          await fs.promises.unlink(checkpointFile);
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to cleanup migration files: ${error}`);
    }
  }

  /**
   * Save status to file
   */
  private async saveStatus(status: MigrationStatus): Promise<void> {
    await fs.promises.writeFile(this.statusFile, JSON.stringify(status, null, 2));
  }

  /**
   * Get migration progress percentage
   */
  async getProgress(): Promise<{ percentage: number; currentStep: string; details: string }> {
    const status = await this.getStatus();
    const percentage = Math.round((status.completedSteps / status.totalSteps) * 100);

    const lastCheckpoint = status.checkpoints[status.checkpoints.length - 1];
    const currentStep = lastCheckpoint ? lastCheckpoint.step : 'Not started';

    let details = `${status.completedSteps}/${status.totalSteps} steps completed`;
    if (lastCheckpoint && lastCheckpoint.data.totalRecords > 0) {
      const recordProgress = Math.round(
        (lastCheckpoint.data.processedRecords / lastCheckpoint.data.totalRecords) * 100
      );
      details += ` | Current table: ${lastCheckpoint.data.currentTable} (${recordProgress}%)`;
    }

    return { percentage, currentStep, details };
  }
}
