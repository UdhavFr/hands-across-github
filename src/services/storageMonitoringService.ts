/**
 * Storage Operation Monitoring Service
 * 
 * Tracks upload/download success rates, storage quota monitoring,
 * and performance metrics collection for storage operations.
 */

import { ENV_CONFIG } from '../config/environment';

export interface StorageMetrics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalDownloads: number;
  successfulDownloads: number;
  failedDownloads: number;
  averageUploadTime: number;
  averageDownloadTime: number;
  totalBytesUploaded: number;
  totalBytesDownloaded: number;
  lastUpdated: string;
}

export interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
  bucketUsage: Record<string, number>;
  lastChecked: string;
}

export interface PerformanceMetric {
  operation: 'upload' | 'download' | 'delete';
  bucket: string;
  fileSize: number;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: string;
  userId?: string;
}

export interface StorageAlert {
  id: string;
  type: 'quota_warning' | 'quota_critical' | 'performance_degradation' | 'high_error_rate';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

/**
 * Storage Monitoring Service
 */
export class StorageMonitoringService {
  private static readonly STORAGE_KEY_PREFIX = 'storage_monitoring_';
  private static readonly MAX_METRICS_HISTORY = 1000;
  private static readonly QUOTA_WARNING_THRESHOLD = 0.8; // 80%
  private static readonly QUOTA_CRITICAL_THRESHOLD = 0.95; // 95%
  private static readonly ERROR_RATE_THRESHOLD = 0.1; // 10%

  /**
   * Records a storage operation metric
   */
  static recordOperation(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    try {
      const fullMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date().toISOString(),
      };

      // Store individual metric
      this.storeMetric(fullMetric);

      // Update aggregated metrics
      this.updateAggregatedMetrics(fullMetric);

      // Check for alerts
      this.checkForAlerts();

      // Log in development
      if (ENV_CONFIG.mode === 'development') {
        console.log('Storage operation recorded:', fullMetric);
      }
    } catch (error) {
      console.error('Failed to record storage operation:', error);
    }
  }

  /**
   * Gets current storage metrics
   */
  static getStorageMetrics(): StorageMetrics {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}metrics`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to get storage metrics:', error);
    }

    // Return default metrics
    return {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalDownloads: 0,
      successfulDownloads: 0,
      failedDownloads: 0,
      averageUploadTime: 0,
      averageDownloadTime: 0,
      totalBytesUploaded: 0,
      totalBytesDownloaded: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Gets storage quota information (simulated - would integrate with actual storage API)
   */
  static async getStorageQuota(): Promise<StorageQuota> {
    try {
      // In a real implementation, this would call the storage provider's API
      // For now, we'll simulate quota information
      const bucketUsage = await this.getBucketUsage();
      const totalUsed = Object.values(bucketUsage).reduce((sum, usage) => sum + usage, 0);
      
      // Simulate a 10GB total quota
      const totalQuota = 10 * 1024 * 1024 * 1024; // 10GB in bytes
      
      return {
        used: totalUsed,
        total: totalQuota,
        percentage: totalUsed / totalQuota,
        bucketUsage,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      throw error;
    }
  }

  /**
   * Gets performance metrics for a specific time period
   */
  static getPerformanceMetrics(
    startDate: Date,
    endDate: Date,
    bucket?: string
  ): PerformanceMetric[] {
    try {
      const allMetrics = this.getAllMetrics();
      
      return allMetrics.filter(metric => {
        const metricDate = new Date(metric.timestamp);
        const inDateRange = metricDate >= startDate && metricDate <= endDate;
        const matchesBucket = !bucket || metric.bucket === bucket;
        
        return inDateRange && matchesBucket;
      });
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  /**
   * Gets current alerts
   */
  static getActiveAlerts(): StorageAlert[] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}alerts`);
      if (stored) {
        const alerts: StorageAlert[] = JSON.parse(stored);
        return alerts.filter(alert => !alert.resolved);
      }
    } catch (error) {
      console.error('Failed to get active alerts:', error);
    }
    
    return [];
  }

  /**
   * Resolves an alert
   */
  static resolveAlert(alertId: string): void {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}alerts`);
      if (stored) {
        const alerts: StorageAlert[] = JSON.parse(stored);
        const alertIndex = alerts.findIndex(alert => alert.id === alertId);
        
        if (alertIndex !== -1) {
          alerts[alertIndex].resolved = true;
          localStorage.setItem(`${this.STORAGE_KEY_PREFIX}alerts`, JSON.stringify(alerts));
        }
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }

  /**
   * Gets success rate for operations
   */
  static getSuccessRate(operation?: 'upload' | 'download', bucket?: string): number {
    try {
      const metrics = this.getStorageMetrics();
      
      if (operation === 'upload') {
        const total = metrics.totalUploads;
        return total > 0 ? metrics.successfulUploads / total : 1;
      }
      
      if (operation === 'download') {
        const total = metrics.totalDownloads;
        return total > 0 ? metrics.successfulDownloads / total : 1;
      }
      
      // Overall success rate
      const totalOps = metrics.totalUploads + metrics.totalDownloads;
      const successfulOps = metrics.successfulUploads + metrics.successfulDownloads;
      
      return totalOps > 0 ? successfulOps / totalOps : 1;
    } catch (error) {
      console.error('Failed to calculate success rate:', error);
      return 0;
    }
  }

  /**
   * Clears all monitoring data
   */
  static clearMonitoringData(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.STORAGE_KEY_PREFIX)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear monitoring data:', error);
    }
  }

  /**
   * Exports monitoring data for analysis
   */
  static exportMonitoringData(): {
    metrics: StorageMetrics;
    performanceHistory: PerformanceMetric[];
    alerts: StorageAlert[];
  } {
    return {
      metrics: this.getStorageMetrics(),
      performanceHistory: this.getAllMetrics(),
      alerts: this.getAllAlerts(),
    };
  }

  /**
   * Private helper methods
   */
  private static storeMetric(metric: PerformanceMetric): void {
    try {
      const metrics = this.getAllMetrics();
      metrics.push(metric);
      
      // Keep only the most recent metrics
      if (metrics.length > this.MAX_METRICS_HISTORY) {
        metrics.splice(0, metrics.length - this.MAX_METRICS_HISTORY);
      }
      
      localStorage.setItem(
        `${this.STORAGE_KEY_PREFIX}performance`,
        JSON.stringify(metrics)
      );
    } catch (error) {
      console.error('Failed to store metric:', error);
    }
  }

  private static updateAggregatedMetrics(metric: PerformanceMetric): void {
    try {
      const current = this.getStorageMetrics();
      
      if (metric.operation === 'upload') {
        current.totalUploads++;
        current.totalBytesUploaded += metric.fileSize;
        
        if (metric.success) {
          current.successfulUploads++;
          // Update average upload time
          const totalTime = current.averageUploadTime * (current.successfulUploads - 1) + metric.duration;
          current.averageUploadTime = totalTime / current.successfulUploads;
        } else {
          current.failedUploads++;
        }
      } else if (metric.operation === 'download') {
        current.totalDownloads++;
        current.totalBytesDownloaded += metric.fileSize;
        
        if (metric.success) {
          current.successfulDownloads++;
          // Update average download time
          const totalTime = current.averageDownloadTime * (current.successfulDownloads - 1) + metric.duration;
          current.averageDownloadTime = totalTime / current.successfulDownloads;
        } else {
          current.failedDownloads++;
        }
      }
      
      current.lastUpdated = new Date().toISOString();
      
      localStorage.setItem(
        `${this.STORAGE_KEY_PREFIX}metrics`,
        JSON.stringify(current)
      );
    } catch (error) {
      console.error('Failed to update aggregated metrics:', error);
    }
  }

  private static getAllMetrics(): PerformanceMetric[] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}performance`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get all metrics:', error);
      return [];
    }
  }

  private static getAllAlerts(): StorageAlert[] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}alerts`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get all alerts:', error);
      return [];
    }
  }

  private static async getBucketUsage(): Promise<Record<string, number>> {
    // Simulate bucket usage - in real implementation, would call storage API
    return {
      'ngo-logos': Math.random() * 100 * 1024 * 1024, // Random usage up to 100MB
      'event-images': Math.random() * 500 * 1024 * 1024, // Random usage up to 500MB
      'avatars': Math.random() * 50 * 1024 * 1024, // Random usage up to 50MB
    };
  }

  private static checkForAlerts(): void {
    try {
      const metrics = this.getStorageMetrics();
      const alerts: StorageAlert[] = [];
      
      // Check error rate
      const uploadErrorRate = metrics.totalUploads > 0 
        ? metrics.failedUploads / metrics.totalUploads 
        : 0;
      
      if (uploadErrorRate > this.ERROR_RATE_THRESHOLD) {
        alerts.push({
          id: `error_rate_${Date.now()}`,
          type: 'high_error_rate',
          message: `Upload error rate is ${(uploadErrorRate * 100).toFixed(1)}% (threshold: ${this.ERROR_RATE_THRESHOLD * 100}%)`,
          severity: uploadErrorRate > 0.2 ? 'critical' : 'high',
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: { errorRate: uploadErrorRate },
        });
      }
      
      // Check performance degradation
      if (metrics.averageUploadTime > 30000) { // 30 seconds
        alerts.push({
          id: `performance_${Date.now()}`,
          type: 'performance_degradation',
          message: `Average upload time is ${(metrics.averageUploadTime / 1000).toFixed(1)}s (threshold: 30s)`,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: { averageUploadTime: metrics.averageUploadTime },
        });
      }
      
      // Store new alerts
      if (alerts.length > 0) {
        const existingAlerts = this.getAllAlerts();
        const allAlerts = [...existingAlerts, ...alerts];
        
        localStorage.setItem(
          `${this.STORAGE_KEY_PREFIX}alerts`,
          JSON.stringify(allAlerts)
        );
      }
    } catch (error) {
      console.error('Failed to check for alerts:', error);
    }
  }
}

/**
 * Hook for monitoring storage operations
 */
export function useStorageMonitoring() {
  const recordOperation = (
    operation: 'upload' | 'download' | 'delete',
    bucket: string,
    fileSize: number,
    startTime: number,
    success: boolean,
    error?: string,
    userId?: string
  ) => {
    const duration = Date.now() - startTime;
    
    StorageMonitoringService.recordOperation({
      operation,
      bucket,
      fileSize,
      duration,
      success,
      error,
      userId,
    });
  };

  return {
    recordOperation,
    getMetrics: StorageMonitoringService.getStorageMetrics,
    getSuccessRate: StorageMonitoringService.getSuccessRate,
    getActiveAlerts: StorageMonitoringService.getActiveAlerts,
    resolveAlert: StorageMonitoringService.resolveAlert,
  };
}