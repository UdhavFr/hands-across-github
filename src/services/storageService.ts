/**
 * Storage Service Verification System
 * 
 * Provides comprehensive storage bucket health checking, verification,
 * and management functionality for Supabase storage operations.
 */

import { supabase } from '../lib/supabase';
import { ENV_CONFIG } from '../config/environment';

export interface BucketHealthStatus {
  exists: boolean;
  accessible: boolean;
  permissions: 'read' | 'write' | 'full' | 'none';
  error?: string;
  lastChecked: string;
}

export interface StorageHealthReport {
  [bucketName: string]: BucketHealthStatus;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Storage Service for bucket verification and file operations
 */
export class StorageService {
  private static readonly REQUIRED_BUCKETS = ['ngo-logos', 'event-images', 'avatars'];
  private static readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000;

  /**
   * Verifies if a storage bucket exists
   */
  static async verifyBucketExists(bucketName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      
      if (error) {
        console.warn(`Bucket verification failed for ${bucketName}:`, error.message);
        return false;
      }
      
      return data !== null;
    } catch (error) {
      console.error(`Error verifying bucket ${bucketName}:`, error);
      return false;
    }
  }

  /**
   * Creates a bucket if it doesn't exist (admin operation)
   */
  static async createBucketIfNotExists(bucketName: string): Promise<void> {
    try {
      const exists = await this.verifyBucketExists(bucketName);
      
      if (!exists) {
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: this.getAllowedMimeTypes(bucketName),
          fileSizeLimit: this.getFileSizeLimit(bucketName),
        });
        
        if (error) {
          throw new Error(`Failed to create bucket ${bucketName}: ${error.message}`);
        }
        
        console.log(`Successfully created bucket: ${bucketName}`);
      }
    } catch (error) {
      console.error(`Error creating bucket ${bucketName}:`, error);
      throw error;
    }
  }

  /**
   * Tests bucket permissions by attempting read/write operations
   */
  static async testBucketPermissions(bucketName: string): Promise<'read' | 'write' | 'full' | 'none'> {
    try {
      // Test read permission by listing files
      const { data: listData, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 1 });

      const canRead = !listError;

      // Test write permission by uploading a small test file
      const testFileName = `test-${Date.now()}.txt`;
      const testFile = new File(['test'], testFileName, { type: 'text/plain' });
      
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(testFileName, testFile);

      const canWrite = !uploadError;

      // Clean up test file if upload succeeded
      if (canWrite) {
        await supabase.storage.from(bucketName).remove([testFileName]);
      }

      if (canRead && canWrite) return 'full';
      if (canWrite) return 'write';
      if (canRead) return 'read';
      return 'none';
    } catch (error) {
      console.error(`Error testing permissions for bucket ${bucketName}:`, error);
      return 'none';
    }
  }

  /**
   * Uploads a file with retry logic and progress tracking
   */
  static async uploadWithRetry(
    file: File,
    path: string,
    bucket: string,
    options: UploadOptions = {}
  ): Promise<string> {
    const {
      maxRetries = this.DEFAULT_RETRY_ATTEMPTS,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      onProgress,
      signal
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if operation was aborted
        if (signal?.aborted) {
          throw new Error('Upload aborted');
        }

        // Simulate progress for the upload
        if (onProgress) {
          onProgress({ loaded: 0, total: file.size, percentage: 0 });
        }

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          throw new Error(error.message);
        }

        // Simulate progress completion
        if (onProgress) {
          onProgress({ loaded: file.size, total: file.size, percentage: 100 });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        return urlData.publicUrl;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          console.warn(`Upload attempt ${attempt} failed, retrying in ${retryDelay}ms:`, lastError.message);
          await this.delay(retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Downloads a file with retry logic
   */
  static async downloadWithRetry(
    path: string,
    bucket: string,
    maxRetries: number = this.DEFAULT_RETRY_ATTEMPTS
  ): Promise<Blob> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(path);

        if (error) {
          throw new Error(error.message);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          console.warn(`Download attempt ${attempt} failed, retrying:`, lastError.message);
          await this.delay(this.DEFAULT_RETRY_DELAY * attempt);
        }
      }
    }

    throw new Error(`Download failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Removes files with error handling
   */
  static async removeFiles(
    paths: string[],
    bucket: string
  ): Promise<{ success: string[]; failed: string[] }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        return { success: [], failed: paths };
      }

      const successPaths = data?.map(item => item.name) || [];
      const failedPaths = paths.filter(path => !successPaths.includes(path));

      return { success: successPaths, failed: failedPaths };
    } catch (error) {
      console.error('Error removing files:', error);
      return { success: [], failed: paths };
    }
  }

  /**
   * Gets comprehensive health status for all required buckets
   */
  static async getStorageHealthReport(): Promise<StorageHealthReport> {
    const report: StorageHealthReport = {};
    const timestamp = new Date().toISOString();

    for (const bucketName of this.REQUIRED_BUCKETS) {
      try {
        const exists = await this.verifyBucketExists(bucketName);
        
        if (!exists) {
          report[bucketName] = {
            exists: false,
            accessible: false,
            permissions: 'none',
            error: 'Bucket does not exist',
            lastChecked: timestamp,
          };
          continue;
        }

        const permissions = await this.testBucketPermissions(bucketName);
        
        report[bucketName] = {
          exists: true,
          accessible: permissions !== 'none',
          permissions,
          lastChecked: timestamp,
        };
      } catch (error) {
        report[bucketName] = {
          exists: false,
          accessible: false,
          permissions: 'none',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: timestamp,
        };
      }
    }

    return report;
  }

  /**
   * Validates file before upload
   */
  static validateFile(file: File, bucket: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allowedTypes = this.getAllowedMimeTypes(bucket);
    const maxSize = this.getFileSizeLimit(bucket);

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      errors.push(`File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`);
    }

    // Check file name
    if (file.name.length > 100) {
      errors.push('File name is too long (maximum 100 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets storage usage statistics
   */
  static async getStorageStats(bucket: string): Promise<{
    totalFiles: number;
    totalSize: number;
    lastModified?: string;
  }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1000 });

      if (error) {
        throw new Error(error.message);
      }

      const files = data || [];
      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      const lastModified = files.length > 0 
        ? Math.max(...files.map(f => new Date(f.updated_at || f.created_at).getTime()))
        : undefined;

      return {
        totalFiles,
        totalSize,
        lastModified: lastModified ? new Date(lastModified).toISOString() : undefined,
      };
    } catch (error) {
      console.error(`Error getting storage stats for ${bucket}:`, error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }

  /**
   * Private helper methods
   */
  private static getAllowedMimeTypes(bucket: string): string[] {
    const typeMap: Record<string, string[]> = {
      'ngo-logos': ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      'event-images': ['image/jpeg', 'image/png', 'image/webp'],
      'avatars': ['image/jpeg', 'image/png', 'image/webp'],
    };
    
    return typeMap[bucket] || [];
  }

  private static getFileSizeLimit(bucket: string): number {
    const sizeMap: Record<string, number> = {
      'ngo-logos': 3 * 1024 * 1024, // 3MB
      'event-images': 5 * 1024 * 1024, // 5MB
      'avatars': 2 * 1024 * 1024, // 2MB
    };
    
    return sizeMap[bucket] || ENV_CONFIG.maxFileUploadSize * 1024 * 1024;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Utility functions for storage operations
 */
export const StorageUtils = {
  /**
   * Generates a unique file path with timestamp
   */
  generateFilePath: (userId: string, fileName: string, folder?: string): string => {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const basePath = folder ? `${folder}/${userId}` : userId;
    return `${basePath}/${timestamp}_${sanitizedName}`;
  },

  /**
   * Extracts file extension from filename
   */
  getFileExtension: (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  },

  /**
   * Formats file size for display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Checks if file is an image
   */
  isImageFile: (file: File): boolean => {
    return file.type.startsWith('image/');
  },

  /**
   * Creates a preview URL for uploaded files
   */
  createPreviewUrl: (file: File): string => {
    return URL.createObjectURL(file);
  },

  /**
   * Revokes a preview URL to free memory
   */
  revokePreviewUrl: (url: string): void => {
    URL.revokeObjectURL(url);
  },
};