/**
 * Storage Health Check Component
 * 
 * Provides real-time monitoring and status indicators for storage buckets,
 * with automatic bucket creation and health reporting capabilities.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Shield,
  Clock,
  Info
} from 'lucide-react';
import { StorageService, type StorageHealthReport, type BucketHealthStatus } from '../services/storageService';
import { toast } from 'react-hot-toast';

export interface StorageHealthCheckProps {
  buckets?: string[];
  onHealthStatus?: (status: StorageHealthReport) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showCreateButton?: boolean;
  className?: string;
}

interface HealthCheckState {
  report: StorageHealthReport;
  loading: boolean;
  lastChecked: string | null;
  error: string | null;
}

export function StorageHealthCheck({
  buckets = ['ngo-logos', 'event-images', 'avatars'],
  onHealthStatus,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  showCreateButton = false,
  className = '',
}: StorageHealthCheckProps) {
  const [state, setState] = useState<HealthCheckState>({
    report: {},
    loading: true,
    lastChecked: null,
    error: null,
  });

  const [creatingBucket, setCreatingBucket] = useState<string | null>(null);

  /**
   * Performs health check for all buckets
   */
  const performHealthCheck = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const report = await StorageService.getStorageHealthReport();
      const timestamp = new Date().toISOString();

      setState({
        report,
        loading: false,
        lastChecked: timestamp,
        error: null,
      });

      // Notify parent component
      onHealthStatus?.(report);

      // Show toast for critical issues
      const criticalIssues = Object.entries(report).filter(
        ([, status]) => !status.exists || !status.accessible
      );

      if (criticalIssues.length > 0) {
        toast.error(
          `Storage issues detected in ${criticalIssues.length} bucket(s)`,
          { id: 'storage-health-error' }
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      toast.error(`Health check failed: ${errorMessage}`);
    }
  }, [onHealthStatus]);

  /**
   * Creates a missing bucket
   */
  const createBucket = useCallback(async (bucketName: string) => {
    setCreatingBucket(bucketName);

    try {
      await StorageService.createBucketIfNotExists(bucketName);
      toast.success(`Successfully created bucket: ${bucketName}`);
      
      // Refresh health check after creation
      await performHealthCheck();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create bucket ${bucketName}: ${errorMessage}`);
    } finally {
      setCreatingBucket(null);
    }
  }, [performHealthCheck]);

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(() => {
    performHealthCheck();
  }, [performHealthCheck]);

  // Initial health check
  useEffect(() => {
    performHealthCheck();
  }, [performHealthCheck]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(performHealthCheck, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, performHealthCheck]);

  /**
   * Gets status icon and color for a bucket
   */
  const getStatusIcon = (status: BucketHealthStatus) => {
    if (!status.exists) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    if (!status.accessible) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }

    if (status.permissions === 'full') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }

    if (status.permissions === 'read' || status.permissions === 'write') {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }

    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  /**
   * Gets status text for a bucket
   */
  const getStatusText = (status: BucketHealthStatus) => {
    if (!status.exists) return 'Not Found';
    if (!status.accessible) return 'Inaccessible';
    
    switch (status.permissions) {
      case 'full': return 'Healthy';
      case 'read': return 'Read Only';
      case 'write': return 'Write Only';
      case 'none': return 'No Access';
      default: return 'Unknown';
    }
  };

  /**
   * Gets status color class for styling
   */
  const getStatusColorClass = (status: BucketHealthStatus) => {
    if (!status.exists || status.permissions === 'none') return 'text-red-600 bg-red-50';
    if (!status.accessible || status.permissions !== 'full') return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (state.loading && Object.keys(state.report).length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Checking storage health...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Storage Health</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {state.lastChecked && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>
                  {new Date(state.lastChecked).toLocaleTimeString()}
                </span>
              </div>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={state.loading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Refresh health check"
            >
              <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {state.error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{state.error}</span>
          </div>
        </div>
      )}

      {/* Bucket Status List */}
      <div className="divide-y divide-gray-200">
        {buckets.map((bucketName) => {
          const status = state.report[bucketName];
          
          if (!status) {
            return (
              <div key={bucketName} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse mr-3" />
                    <span className="font-medium text-gray-900">{bucketName}</span>
                  </div>
                  <span className="text-gray-500">Checking...</span>
                </div>
              </div>
            );
          }

          return (
            <div key={bucketName} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(status)}
                  <div className="ml-3">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{bucketName}</span>
                      <Shield className="h-4 w-4 text-gray-400 ml-2" />
                    </div>
                    {status.error && (
                      <p className="text-sm text-red-600 mt-1">{status.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColorClass(status)}`}>
                    {getStatusText(status)}
                  </span>

                  {!status.exists && showCreateButton && (
                    <button
                      onClick={() => createBucket(bucketName)}
                      disabled={creatingBucket === bucketName}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
                    >
                      {creatingBucket === bucketName ? 'Creating...' : 'Create'}
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Status Info */}
              {status.exists && (
                <div className="mt-2 ml-8">
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>Permissions: {status.permissions}</span>
                    <span>•</span>
                    <span>Accessible: {status.accessible ? 'Yes' : 'No'}</span>
                    <span>•</span>
                    <span>Last checked: {new Date(status.lastChecked).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Info className="h-4 w-4 mr-1" />
            <span>
              {Object.values(state.report).filter(s => s.exists && s.accessible).length} of {buckets.length} buckets healthy
            </span>
          </div>
          
          {autoRefresh && (
            <span className="text-gray-500">
              Auto-refresh every {Math.round(refreshInterval / 1000)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}