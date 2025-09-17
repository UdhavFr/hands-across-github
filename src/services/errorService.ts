/**
 * Centralized Error Service
 * 
 * Provides error categorization, logging, reporting, and
 * user-friendly error message mapping with recovery suggestions.
 */

import { ENV_CONFIG } from '../config/environment';

export type ErrorCategory = 
  | 'network'
  | 'validation' 
  | 'storage' 
  | 'auth' 
  | 'permission'
  | 'not_found'
  | 'server'
  | 'client'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: string;
  resolved: boolean;
  userFriendlyMessage: string;
  recoveryActions: string[];
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  type: 'retry' | 'navigate' | 'reload' | 'custom';
}

/**
 * Centralized Error Service
 */
export class ErrorService {
  private static readonly STORAGE_KEY = 'error_logs';
  private static readonly MAX_STORED_ERRORS = 100;
  
  // Error message mappings
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    // Network errors
    'NetworkError': 'Unable to connect to the server. Please check your internet connection.',
    'fetch failed': 'Network request failed. Please check your connection and try again.',
    'Failed to fetch': 'Unable to reach the server. Please check your internet connection.',
    
    // Authentication errors
    'Invalid login credentials': 'The email or password you entered is incorrect.',
    'User not found': 'No account found with this email address.',
    'Email not confirmed': 'Please check your email and click the confirmation link.',
    'Password too weak': 'Password must be at least 8 characters with numbers and letters.',
    
    // Storage errors
    'Storage quota exceeded': 'You have reached your storage limit. Please delete some files.',
    'File too large': 'The file you selected is too large. Please choose a smaller file.',
    'Invalid file type': 'This file type is not supported. Please choose a different file.',
    'Upload failed': 'File upload failed. Please try again.',
    
    // Validation errors
    'Required field': 'This field is required.',
    'Invalid email': 'Please enter a valid email address.',
    'Invalid phone': 'Please enter a valid phone number.',
    'Invalid date': 'Please enter a valid date.',
    
    // Permission errors
    'Insufficient permissions': 'You do not have permission to perform this action.',
    'Access denied': 'Access denied. Please contact an administrator.',
    
    // Server errors
    'Internal server error': 'Something went wrong on our end. Please try again later.',
    'Service unavailable': 'The service is temporarily unavailable. Please try again later.',
    'Database error': 'Database connection issue. Please try again in a moment.',
    
    // Default fallbacks
    'Unknown error': 'An unexpected error occurred. Please try again.',
  };

  /**
   * Logs an error with context and categorization
   */
  static logError(
    error: Error, 
    component: string, 
    additionalContext: Record<string, any> = {}
  ): string {
    const errorId = this.generateErrorId();
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const userFriendlyMessage = this.getUserFriendlyMessage(error);
    const recoveryActions = this.getRecoveryActions(error, category);

    const context: ErrorContext = {
      component,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      additionalData: additionalContext,
    };

    const errorLog: ErrorLog = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      category,
      severity,
      context,
      timestamp: new Date().toISOString(),
      resolved: false,
      userFriendlyMessage,
      recoveryActions,
    };

    // Store error log
    this.storeErrorLog(errorLog);

    // Log to console in development
    if (ENV_CONFIG.mode === 'development') {
      console.group(`🚨 Error [${category}] - ${severity}`);
      console.error('Original Error:', error);
      console.log('Error ID:', errorId);
      console.log('Context:', context);
      console.log('User Message:', userFriendlyMessage);
      console.log('Recovery Actions:', recoveryActions);
      console.groupEnd();
    }

    // Report critical errors immediately
    if (severity === 'critical') {
      this.reportCriticalError(errorLog);
    }

    return errorId;
  }

  /**
   * Gets a user-friendly error message
   */
  static getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Check for exact matches first
    for (const [key, friendlyMessage] of Object.entries(this.ERROR_MESSAGES)) {
      if (message.includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }

    // Check for common patterns
    if (message.includes('network') || message.includes('fetch')) {
      return this.ERROR_MESSAGES['NetworkError'];
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return this.ERROR_MESSAGES['Access denied'];
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'The requested resource was not found.';
    }
    
    if (message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and try again.';
    }

    // Default fallback
    return this.ERROR_MESSAGES['Unknown error'];
  }

  /**
   * Reports error to external analytics service
   */
  static reportToAnalytics(error: Error, context: ErrorContext = {}): void {
    if (!ENV_CONFIG.enableErrorReporting) return;

    try {
      // In a real implementation, this would send to services like:
      // - Sentry
      // - LogRocket
      // - Bugsnag
      // - Custom analytics endpoint
      
      const errorData = {
        message: error.message,
        stack: error.stack,
        category: this.categorizeError(error),
        severity: this.determineSeverity(error, this.categorizeError(error)),
        context,
        timestamp: new Date().toISOString(),
        environment: ENV_CONFIG.mode,
      };

      // Simulate analytics reporting
      if (ENV_CONFIG.mode === 'development') {
        console.log('📊 Analytics Report:', errorData);
      }

      // Example: Send to external service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // });

    } catch (reportingError) {
      console.error('Failed to report error to analytics:', reportingError);
    }
  }

  /**
   * Gets all stored error logs
   */
  static getErrorLogs(): ErrorLog[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  /**
   * Gets error logs by category
   */
  static getErrorsByCategory(category: ErrorCategory): ErrorLog[] {
    return this.getErrorLogs().filter(log => log.category === category);
  }

  /**
   * Gets unresolved errors
   */
  static getUnresolvedErrors(): ErrorLog[] {
    return this.getErrorLogs().filter(log => !log.resolved);
  }

  /**
   * Marks an error as resolved
   */
  static resolveError(errorId: string): void {
    try {
      const logs = this.getErrorLogs();
      const errorIndex = logs.findIndex(log => log.id === errorId);
      
      if (errorIndex !== -1) {
        logs[errorIndex].resolved = true;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
      }
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  }

  /**
   * Clears all error logs
   */
  static clearErrorLogs(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  /**
   * Gets error statistics
   */
  static getErrorStatistics(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    resolved: number;
    unresolved: number;
  } {
    const logs = this.getErrorLogs();
    
    const byCategory = logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);
    
    const bySeverity = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      total: logs.length,
      byCategory,
      bySeverity,
      resolved: logs.filter(log => log.resolved).length,
      unresolved: logs.filter(log => !log.resolved).length,
    };
  }

  /**
   * Private helper methods
   */
  private static categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || message.includes('timeout')) {
      return 'network';
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('login') || 
        message.includes('unauthorized') || message.includes('token')) {
      return 'auth';
    }

    // Storage errors
    if (message.includes('storage') || message.includes('upload') || 
        message.includes('file') || message.includes('bucket')) {
      return 'storage';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || 
        message.includes('required') || message.includes('format')) {
      return 'validation';
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || 
        message.includes('access denied')) {
      return 'permission';
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }

    // Server errors
    if (message.includes('server') || message.includes('500') || 
        message.includes('internal') || message.includes('database')) {
      return 'server';
    }

    // Client errors
    if (stack.includes('react') || stack.includes('component') || 
        message.includes('render') || message.includes('hook')) {
      return 'client';
    }

    return 'unknown';
  }

  private static determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    const message = error.message.toLowerCase();

    // Critical errors
    if (category === 'server' || message.includes('critical') || 
        message.includes('fatal') || message.includes('crash')) {
      return 'critical';
    }

    // High severity
    if (category === 'auth' || category === 'permission' || 
        message.includes('security') || message.includes('unauthorized')) {
      return 'high';
    }

    // Medium severity
    if (category === 'network' || category === 'storage' || 
        category === 'not_found') {
      return 'medium';
    }

    // Low severity
    if (category === 'validation' || category === 'client') {
      return 'low';
    }

    return 'medium';
  }

  private static getRecoveryActions(error: Error, category: ErrorCategory): string[] {
    const actions: string[] = [];

    switch (category) {
      case 'network':
        actions.push('Check your internet connection');
        actions.push('Try refreshing the page');
        actions.push('Wait a moment and try again');
        break;
        
      case 'auth':
        actions.push('Try signing in again');
        actions.push('Check your credentials');
        actions.push('Reset your password if needed');
        break;
        
      case 'storage':
        actions.push('Check file size and format');
        actions.push('Try uploading again');
        actions.push('Clear browser cache');
        break;
        
      case 'validation':
        actions.push('Check your input');
        actions.push('Ensure all required fields are filled');
        actions.push('Verify data format');
        break;
        
      case 'permission':
        actions.push('Contact an administrator');
        actions.push('Check your account permissions');
        break;
        
      case 'not_found':
        actions.push('Check the URL');
        actions.push('Go back to the previous page');
        actions.push('Use the navigation menu');
        break;
        
      default:
        actions.push('Refresh the page');
        actions.push('Try again later');
        actions.push('Contact support if the problem persists');
    }

    return actions;
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static storeErrorLog(errorLog: ErrorLog): void {
    try {
      const logs = this.getErrorLogs();
      logs.push(errorLog);
      
      // Keep only the most recent errors
      if (logs.length > this.MAX_STORED_ERRORS) {
        logs.splice(0, logs.length - this.MAX_STORED_ERRORS);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store error log:', error);
    }
  }

  private static reportCriticalError(errorLog: ErrorLog): void {
    // In production, this would immediately notify administrators
    console.error('🚨 CRITICAL ERROR DETECTED:', errorLog);
    
    // Example: Send immediate notification
    // if (ENV_CONFIG.mode === 'production') {
    //   fetch('/api/critical-errors', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(errorLog)
    //   });
    // }
  }
}

/**
 * Error handling utilities
 */
export const ErrorUtils = {
  /**
   * Wraps async functions with error handling
   */
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    component: string,
    onError?: (error: Error) => void
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        ErrorService.logError(err, component);
        onError?.(err);
        return null;
      }
    };
  },

  /**
   * Creates a safe version of a function that won't throw
   */
  makeSafe: <T extends any[], R>(
    fn: (...args: T) => R,
    fallback: R,
    component: string
  ) => {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        ErrorService.logError(err, component);
        return fallback;
      }
    };
  },

  /**
   * Retries a function with exponential backoff
   */
  withRetry: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    component: string = 'unknown'
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          ErrorService.logError(lastError, component, { 
            retryAttempts: maxRetries,
            finalAttempt: true 
          });
          throw lastError;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  },
};