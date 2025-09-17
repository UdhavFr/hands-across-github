/**
 * Global Error Boundary System
 * 
 * Comprehensive error catching with context preservation,
 * user-friendly error messages, and error logging capabilities.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react';
import { ErrorService } from '../services/errorService';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Global Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Generate unique error ID
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update state with error details
    this.setState({
      errorInfo,
      errorId,
    });

    // Log error with context
    const context = {
      level,
      errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    ErrorService.logError(error, 'ErrorBoundary', context);

    // Call custom error handler
    onError?.(error, errorInfo);

    // Report to external services in production
    if (process.env.NODE_ENV === 'production') {
      ErrorService.reportToAnalytics(error, context);
    }
  }

  /**
   * Attempts to recover from the error
   */
  handleRetry = () => {
    const maxRetries = 3;
    const retryCooldownMs = 3000; // 3 seconds cooldown between retries

    if (this.state.retryCount < maxRetries && !this.retryTimeoutId) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
      }));

      // Set cooldown timer to prevent rapid retries
      this.retryTimeoutId = setTimeout(() => {
        this.retryTimeoutId = null;
      }, retryCooldownMs);
    }
  };

  /**
   * Reloads the page as a last resort
   */
  handleReload = () => {
    window.location.reload();
  };

  /**
   * Navigates to home page
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Copies error details to clipboard
   */
  handleCopyError = async () => {
    if (!this.state.error || !this.state.errorInfo) return;

    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error.message,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      // Show a toast notification for success
      import('react-hot-toast').then(({ toast }) => {
        toast.success('Error details copied to clipboard');
      });
    } catch (err) {
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Failed to copy error details');
      });
      console.error('Failed to copy error details:', err);
    }
  };

  /**
   * Renders different error UIs based on error level
   */
  renderErrorUI() {
    const { level = 'component', showDetails = false } = this.props;
    const { error, errorInfo, errorId, retryCount } = this.state;

    if (!error) return null;

    const maxRetries = 3;
    const canRetry = retryCount < maxRetries;
    const userFriendlyMessage = ErrorService.getUserFriendlyMessage(error);

    // Critical level - full page error
    if (level === 'critical') {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  Something went wrong
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {userFriendlyMessage}
                </p>
                
                {errorId && (
                  <p className="mt-2 text-xs text-gray-500">
                    Error ID: {errorId}
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({maxRetries - retryCount} attempts left)
                  </button>
                )}

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </button>

                <button
                  onClick={this.handleReload}
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </button>
              </div>

              {showDetails && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap">{error.stack}</pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={this.handleCopyError}
                    className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Error Details
                  </button>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Page level - partial page error
    if (level === 'page') {
      return (
        <div className="bg-white rounded-lg border border-red-200 p-6 m-4">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-red-500 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800">
                Page Error
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {userFriendlyMessage}
              </p>
              
              {errorId && (
                <p className="mt-1 text-xs text-red-600">
                  Error ID: {errorId}
                </p>
              )}

              <div className="mt-4 flex space-x-3">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </button>
                )}

                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Component level - inline error
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">
              Component Error
            </h4>
            <p className="mt-1 text-sm text-red-700">
              {userFriendlyMessage}
            </p>
            
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="mt-2 inline-flex items-center text-sm text-red-600 hover:text-red-800"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { children, fallback, level = 'component' } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // Custom fallback UI for critical errors
      if (fallback && level === 'critical') {
        return fallback;
      }

      // Default error UI
      return this.renderErrorUI();
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook for manually triggering error boundaries
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    // This will be caught by the nearest error boundary
    throw error;
  };
}