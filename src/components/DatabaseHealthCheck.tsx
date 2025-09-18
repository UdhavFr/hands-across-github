/**
 * Database Health Check Component
 * 
 * Displays database schema health, missing tables/columns,
 * and provides recommendations for database maintenance.
 */

import { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Info,
  Code,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Key,
} from 'lucide-react';
import {
  MigrationService,
  type SchemaHealthReport,
  type MigrationResult,
} from '../services/migrationService';
import { toast } from 'react-hot-toast';

interface DatabaseHealthCheckProps {
  className?: string;
  showAdminActions?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function DatabaseHealthCheck({
  className = '',
  showAdminActions = false,
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute
}: DatabaseHealthCheckProps) {
  const [healthReport, setHealthReport] = useState<SchemaHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [showSql, setShowSql] = useState<Record<string, boolean>>({});
  const [migrationResults, setMigrationResults] = useState<Record<string, MigrationResult>>({});

  /**
   * Loads the database health report
   */
  const loadHealthReport = async () => {
    try {
      setLoading(true);
      const report = await MigrationService.getSchemaHealth();
      setHealthReport(report);
    } catch (error) {
      console.error('Failed to load database health report:', error);
      toast.error('Failed to load database health report');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggles table expansion
   */
  const toggleTableExpansion = (tableName: string) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  /**
   * Toggles SQL visibility
   */
  const toggleSqlVisibility = (key: string) => {
    setShowSql(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Copies text to clipboard
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  /**
   * Attempts to create a missing table
   */
  const createMissingTable = async (tableName: string) => {
    try {
      const result = await MigrationService.createMissingTable(tableName);
      setMigrationResults(prev => ({ ...prev, [tableName]: result }));
      
      if (result.success) {
        toast.success(result.message);
        await loadHealthReport(); // Refresh the report
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(`Failed to create table: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /**
   * Attempts to add missing columns
   */
  const addMissingColumns = async (tableName: string, columns: string[]) => {
    try {
      const result = await MigrationService.addMissingColumns(tableName, columns);
      setMigrationResults(prev => ({ ...prev, [`${tableName}_columns`]: result }));
      
      if (result.success) {
        toast.success(result.message);
        await loadHealthReport(); // Refresh the report
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(`Failed to add columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    loadHealthReport();
    
    if (autoRefresh) {
      const interval = setInterval(loadHealthReport, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading && !healthReport) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Checking database health...</span>
        </div>
      </div>
    );
  }

  if (!healthReport) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center text-red-600">
          <XCircle className="h-6 w-6 mr-2" />
          <span>Failed to load database health report</span>
        </div>
      </div>
    );
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Database className="h-6 w-6 text-gray-500" />;
    }
  };

  const getHealthColorClass = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Database Health</h3>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-1 rounded-full border ${getHealthColorClass(healthReport.overallHealth)}`}>
              {getHealthIcon(healthReport.overallHealth)}
              <span className="ml-2 text-sm font-medium capitalize">
                {healthReport.overallHealth}
              </span>
            </div>
            
            <button
              onClick={loadHealthReport}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Refresh health check"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-1">
          Last checked: {new Date(healthReport.lastChecked).toLocaleString()}
        </p>
      </div>

      {/* Recommendations */}
      {healthReport.recommendations.length > 0 && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {healthReport.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tables Status */}
      <div className="divide-y divide-gray-200">
        {Object.entries(healthReport.tables).map(([tableName, tableInfo]) => (
          <div key={tableName} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => toggleTableExpansion(tableName)}
                  className="flex items-center text-left"
                >
                  {tableInfo.exists ? (
                    tableInfo.issues.length === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                    )
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-3" />
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-900">{tableName}</h4>
                    <p className="text-sm text-gray-500">
                      {tableInfo.exists ? (
                        `${tableInfo.columns.length} columns${tableInfo.issues.length > 0 ? `, ${tableInfo.issues.length} issues` : ''}`
                      ) : (
                        'Table does not exist'
                      )}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {showAdminActions && !tableInfo.exists && (
                  <button
                    onClick={() => createMissingTable(tableName)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Create Table
                  </button>
                )}
                
                {showAdminActions && tableInfo.exists && tableInfo.missingColumns.length > 0 && (
                  <button
                    onClick={() => addMissingColumns(tableName, tableInfo.missingColumns)}
                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    Add Columns
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Details */}
            {expandedTables.has(tableName) && (
              <div className="mt-4 ml-8 space-y-3">
                {/* Issues */}
                {tableInfo.issues.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-red-800 mb-2">Issues</h5>
                    <ul className="text-sm text-red-700 space-y-1">
                      {tableInfo.issues.map((issue, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Columns */}
                {tableInfo.missingColumns.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-yellow-800 mb-2">Missing Columns</h5>
                    <div className="flex flex-wrap gap-2">
                      {tableInfo.missingColumns.map(column => (
                        <span
                          key={column}
                          className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded"
                        >
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra Columns */}
                {tableInfo.extraColumns.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-blue-800 mb-2">Extra Columns</h5>
                    <div className="flex flex-wrap gap-2">
                      {tableInfo.extraColumns.map(column => (
                        <span
                          key={column}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Migration Results */}
                {migrationResults[tableName] && (
                  <div className="p-3 bg-gray-50 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-800">Migration Result</h5>
                      {migrationResults[tableName].details?.sql && (
                        <button
                          onClick={() => toggleSqlVisibility(tableName)}
                          className="flex items-center text-xs text-gray-600 hover:text-gray-800"
                        >
                          <Code className="h-3 w-3 mr-1" />
                          {showSql[tableName] ? <EyeOff className="h-3 w-3 ml-1" /> : <Eye className="h-3 w-3 ml-1" />}
                        </button>
                      )}
                    </div>
                    
                    <p className={`text-sm ${migrationResults[tableName].success ? 'text-green-700' : 'text-red-700'}`}>
                      {migrationResults[tableName].message}
                    </p>

                    {showSql[tableName] && migrationResults[tableName].details?.sql && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">SQL Commands</span>
                          <button
                            onClick={() => copyToClipboard(
                              Array.isArray(migrationResults[tableName].details.sql)
                                ? migrationResults[tableName].details.sql.join('\n')
                                : migrationResults[tableName].details.sql
                            )}
                            className="flex items-center text-xs text-gray-600 hover:text-gray-800"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </button>
                        </div>
                        <pre className="text-xs bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto">
                          {Array.isArray(migrationResults[tableName].details.sql)
                            ? migrationResults[tableName].details.sql.join('\n')
                            : migrationResults[tableName].details.sql}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Current Columns */}
                {tableInfo.exists && tableInfo.columns.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">Current Columns</h5>
                    <div className="flex flex-wrap gap-2">
                      {tableInfo.columns.map(column => (
                        <span
                          key={column}
                          className={`px-2 py-1 text-xs rounded ${
                            tableInfo.missingColumns.includes(column)
                              ? 'bg-red-100 text-red-800'
                              : tableInfo.extraColumns.includes(column)
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}