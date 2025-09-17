/**
 * Component-Level Error Handler Hook
 * 
 * Provides consistent error handling for form components with
 * error boundary integration and automatic error recovery mechanisms.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorService, ErrorUtils, type ErrorCategory } from '../services/errorService';
import { toast } from 'react-hot-toast';

export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  category: ErrorCategory;
  retryCount: number;
  isRecovering: boolean;
}

export interface ErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
  logErrors?: boolean;
  component?: string;
  onError?: (error: Error, errorId: string) => void;
  onRecovery?: () => void;
  enableAutoRecovery?: boolean;
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  type: 'retry' | 'reset' | 'navigate' | 'custom';
  disabled?: boolean;
}

/**
 * Hook for consistent component-level error handling
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
    logErrors = true,
    component = 'UnknownComponent',
    onError,
    onRecovery,
    enableAutoRecovery = false,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorId: null,
    category: 'unknown',
    retryCount: 0,
    isRecovering: false,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);

  /**
   * Handles an error with logging and user feedback
   */
  const handleError = useCallback((
    error: Error | string,
    context: Record<string, any> = {}
  ) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const category = ErrorService.categorizeError ? 
      (ErrorService as any).categorizeError(errorObj) : 'unknown';
    
    let errorId: string | null = null;
    
    if (logErrors) {
      errorId = ErrorService.logError(errorObj, component, context);
    }

    setErrorState(prev => ({
      hasError: true,
      error: errorObj,
      errorId,
      category,
      retryCount: prev.retryCount,
      isRecovering: false,
    }));

    if (showToast) {
      const userMessage = ErrorService.getUserFriendlyMessage(errorObj);
      toast.error(userMessage);
    }

    onError?.(errorObj, errorId || '');

    // Auto-recovery for certain error types
    if (enableAutoRecovery && shouldAutoRecover(category) && errorState.retryCount < maxRetries) {
      scheduleAutoRecovery();
    }
  }, [component, logErrors, showToast, onError, enableAutoRecovery, maxRetries, errorState.retryCount]);

  /**
   * Clears the error state
   */
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState({
      hasError: false,
      error: null,
      errorId: null,
      category: 'unknown',
      retryCount: 0,
      isRecovering: false,
    });

    onRecovery?.();
  }, [onRecovery]);

  /**
   * Retries the last failed operation
   */
  const retry = useCallback(async () => {
    if (!lastOperationRef.current || errorState.retryCount >= maxRetries) {
      return false;
    }

    setErrorState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1,
    }));

    try {
      await lastOperationRef.current();
      clearError();
      
      if (showToast) {
        toast.success('Operation completed successfully');
      }
      
      return true;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      handleError(errorObj, { isRetry: true, retryAttempt: errorState.retryCount + 1 });
      return false;
    }
  }, [errorState.retryCount, maxRetries, clearError, handleError, showToast]);

  /**
   * Wraps an async operation with error handling
   */
  const withErrorHandling = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    operationName?: string
  ) => {
    return async (...args: T): Promise<R | null> => {
      // Store the operation for potential retry
      lastOperationRef.current = () => operation(...args);

      try {
        const result = await operation(...args);
        
        // Clear any previous errors on success
        if (errorState.hasError) {
          clearError();
        }
        
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        handleError(errorObj, { 
          operation: operationName || operation.name,
          arguments: args,
        });
        return null;
      }
    };
  }, [errorState.hasError, clearError, handleError]);

  /**
   * Wraps a sync operation with error handling
   */
  const withSyncErrorHandling = useCallback(<T extends any[], R>(
    operation: (...args: T) => R,
    fallback: R,
    operationName?: string
  ) => {
    return (...args: T): R => {
      try {
        const result = operation(...args);
        
        // Clear any previous errors on success
        if (errorState.hasError) {
          clearError();
        }
        
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        handleError(errorObj, { 
          operation: operationName || operation.name,
          arguments: args,
          isSyncOperation: true,
        });
        return fallback;
      }
    };
  }, [errorState.hasError, clearError, handleError]);

  /**
   * Gets recovery actions based on error type
   */
  const getRecoveryActions = useCallback((): ErrorRecoveryAction[] => {
    if (!errorState.hasError || !errorState.error) return [];

    const actions: ErrorRecoveryAction[] = [];

    // Retry action
    if (errorState.retryCount < maxRetries && lastOperationRef.current) {
      actions.push({
        label: `Retry (${maxRetries - errorState.retryCount} attempts left)`,
        action: retry,
        type: 'retry',
        disabled: errorState.isRecovering,
      });
    }

    // Reset action
    actions.push({
      label: 'Clear Error',
      action: clearError,
      type: 'reset',
    });

    // Category-specific actions
    switch (errorState.category) {
      case 'network':
        actions.push({
          label: 'Refresh Page',
          action: () => window.location.reload(),
          type: 'navigate',
        });
        break;
        
      case 'auth':
        actions.push({
          label: 'Sign In Again',
          action: () => window.location.href = '/auth',
          type: 'navigate',
        });
        break;
        
      case 'not_found':
        actions.push({
          label: 'Go Home',
          action: () => window.location.href = '/',
          type: 'navigate',
        });
        break;
    }

    return actions;
  }, [errorState, maxRetries, retry, clearError]);

  /**
   * Schedules automatic recovery
   */
  const scheduleAutoRecovery = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const delay = retryDelay * Math.pow(2, errorState.retryCount); // Exponential backoff
    
    retryTimeoutRef.current = setTimeout(() => {
      retry();
    }, delay);
  }, [retryDelay, errorState.retryCount, retry]);

  /**
   * Determines if an error should trigger auto-recovery
   */
  const shouldAutoRecover = useCallback((category: ErrorCategory): boolean => {
    return ['network', 'server'].includes(category);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Error state
    ...errorState,
    
    // Error handling functions
    handleError,
    clearError,
    retry,
    
    // Wrapper functions
    withErrorHandling,
    withSyncErrorHandling,
    
    // Recovery actions
    getRecoveryActions,
    
    // Utility functions
    canRetry: errorState.retryCount < maxRetries && !!lastOperationRef.current,
    getUserFriendlyMessage: () => 
      errorState.error ? ErrorService.getUserFriendlyMessage(errorState.error) : null,
  };
}

/**
 * Hook for form-specific error handling
 */
export function useFormErrorHandler(options: ErrorHandlerOptions = {}) {
  const errorHandler = useErrorHandler({
    ...options,
    component: options.component || 'FormComponent',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Sets an error for a specific field
   */
  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  /**
   * Clears error for a specific field
   */
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * Clears all field errors
   */
  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * Validates a field and sets error if invalid
   */
  const validateField = useCallback((
    field: string,
    value: any,
    validator: (value: any) => string | null
  ) => {
    const error = validator(value);
    if (error) {
      setFieldError(field, error);
      return false;
    } else {
      clearFieldError(field);
      return true;
    }
  }, [setFieldError, clearFieldError]);

  /**
   * Gets error for a specific field
   */
  const getFieldError = useCallback((field: string) => {
    return fieldErrors[field] || null;
  }, [fieldErrors]);

  /**
   * Checks if form has any errors
   */
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return {
    ...errorHandler,
    
    // Field-specific error handling
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    validateField,
    getFieldError,
    hasFieldErrors,
    
    // Enhanced clear function that also clears field errors
    clearError: () => {
      errorHandler.clearError();
      clearAllFieldErrors();
    },
  };
}

/**
 * Hook for API-specific error handling
 */
export function useApiErrorHandler(options: ErrorHandlerOptions = {}) {
  const errorHandler = useErrorHandler({
    ...options,
    component: options.component || 'ApiComponent',
    enableAutoRecovery: options.enableAutoRecovery ?? true,
  });

  /**
   * Handles API response errors
   */
  const handleApiError = useCallback((response: Response, context: Record<string, any> = {}) => {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    
    // Map common HTTP status codes to user-friendly messages
    switch (response.status) {
      case 400:
        errorMessage = 'Invalid request. Please check your input.';
        break;
      case 401:
        errorMessage = 'Authentication required. Please sign in.';
        break;
      case 403:
        errorMessage = 'Access denied. You do not have permission.';
        break;
      case 404:
        errorMessage = 'Resource not found.';
        break;
      case 429:
        errorMessage = 'Too many requests. Please wait and try again.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
      case 503:
        errorMessage = 'Service unavailable. Please try again later.';
        break;
    }

    const error = new Error(errorMessage);
    errorHandler.handleError(error, {
      ...context,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      url: response.url,
    });
  }, [errorHandler]);

  return {
    ...errorHandler,
    handleApiError,
  };
}