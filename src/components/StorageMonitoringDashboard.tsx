/**
 * Storage Monitoring Dashboard Component
 * 
 * Displays real-time storage metrics, performance data,
 * and alerts for storage operations monitoring.
 */

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Activity,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  StorageMonitoringService,
  type StorageMetrics,
  type StorageQuota,
  type StorageAlert,
} from '../services/storageMonitoringService';
import { StorageUtils } from '../services/storageService';

interface StorageMonitoringDashboardProps {
  className?: string;
  refreshInterval?: number;
}

export function StorageMonitoringDashboard({
  className = '',
  refreshInterval = 30000, // 30 seconds
}: StorageMonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [alerts, setAlerts] = useState<StorageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /**
   * Loads all monitoring data
   */
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [metricsData, quotaData, alertsData] = await Promise.all([
        Promise.resolve(StorageMonitoringService.getStorageMetrics()),
        StorageMonitoringService.getStorageQuota(),
        Promise.resolve(StorageMonitoringService.getActiveAlerts()),
      ]);
      
      setMetrics(metricsData);
      setQuota(quotaData);
      setAlerts(alertsData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resolves an alert
   */
  const handleResolveAlert = (alertId: string) => {
    StorageMonitoringService.resolveAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Initial load and auto-refresh
  useEffect(() => {
    loadData();
    
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading && !metrics) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  const uploadSuccessRate = metrics ? StorageMonitoringService.getSuccessRate('upload') : 0;
  const downloadSuccessRate = metrics ? StorageMonitoringService.getSuccessRate('download') : 0;
  const overallSuccessRate = metrics ? StorageMonitoringService.getSuccessRate() : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Activity className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Storage Monitoring</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="font-medium text-red-800">Active Alerts ({alerts.length})</h3>
          </div>
          
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-white p-3 rounded border"
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full mr-2 ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{alert.type.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Resolve alert"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Upload Success Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upload Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {(uploadSuccessRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              uploadSuccessRate >= 0.95 ? 'bg-green-100' : 
              uploadSuccessRate >= 0.8 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {uploadSuccessRate >= 0.95 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
          {metrics && (
            <p className="text-xs text-gray-500 mt-2">
              {metrics.successfulUploads} of {metrics.totalUploads} uploads successful
            </p>
          )}
        </div>

        {/* Download Success Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Download Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {(downloadSuccessRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              downloadSuccessRate >= 0.95 ? 'bg-green-100' : 
              downloadSuccessRate >= 0.8 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {downloadSuccessRate >= 0.95 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
          {metrics && (
            <p className="text-xs text-gray-500 mt-2">
              {metrics.successfulDownloads} of {metrics.totalDownloads} downloads successful
            </p>
          )}
        </div>

        {/* Average Upload Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Upload Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics ? (metrics.averageUploadTime / 1000).toFixed(1) : '0'}s
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {metrics && metrics.totalUploads > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Based on {metrics.successfulUploads} successful uploads
            </p>
          )}
        </div>

        {/* Storage Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {quota ? (quota.percentage * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              quota && quota.percentage >= 0.9 ? 'bg-red-100' :
              quota && quota.percentage >= 0.7 ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <HardDrive className={`h-6 w-6 ${
                quota && quota.percentage >= 0.9 ? 'text-red-600' :
                quota && quota.percentage >= 0.7 ? 'text-yellow-600' : 'text-green-600'
              }`} />
            </div>
          </div>
          {quota && (
            <p className="text-xs text-gray-500 mt-2">
              {StorageUtils.formatFileSize(quota.used)} of {StorageUtils.formatFileSize(quota.total)}
            </p>
          )}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Statistics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Transfer Statistics</h3>
          </div>
          
          {metrics && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Uploads</span>
                <span className="font-medium">{metrics.totalUploads}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Downloads</span>
                <span className="font-medium">{metrics.totalDownloads}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data Uploaded</span>
                <span className="font-medium">
                  {StorageUtils.formatFileSize(metrics.totalBytesUploaded)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data Downloaded</span>
                <span className="font-medium">
                  {StorageUtils.formatFileSize(metrics.totalBytesDownloaded)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Success Rate</span>
                <span className={`font-medium ${
                  overallSuccessRate >= 0.95 ? 'text-green-600' :
                  overallSuccessRate >= 0.8 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(overallSuccessRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bucket Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <HardDrive className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Bucket Usage</h3>
          </div>
          
          {quota && (
            <div className="space-y-4">
              {Object.entries(quota.bucketUsage).map(([bucket, usage]) => (
                <div key={bucket}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">{bucket}</span>
                    <span className="text-sm font-medium">
                      {StorageUtils.formatFileSize(usage)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(usage / quota.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Total Usage</span>
                  <span className="font-medium">
                    {StorageUtils.formatFileSize(quota.used)} / {StorageUtils.formatFileSize(quota.total)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}