/**
 * Environment Configuration System
 * 
 * Provides type-safe environment handling with validation
 * and environment-specific configurations for development,
 * staging, and production environments.
 */

export interface EnvironmentConfig {
  mode: 'development' | 'staging' | 'production';
  supabaseUrl: string;
  supabaseAnonKey: string;
  enableAnalytics: boolean;
  enableDevTools: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  apiTimeout: number;
  maxFileUploadSize: number; // in MB
  enablePerformanceMonitoring: boolean;
  enableErrorReporting: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<EnvironmentConfig> = {
  enableAnalytics: false,
  enableDevTools: false,
  logLevel: 'info',
  apiTimeout: 30000, // 30 seconds
  maxFileUploadSize: 5, // 5MB
  enablePerformanceMonitoring: false,
  enableErrorReporting: false,
};

/**
 * Environment-specific configurations
 */
const ENVIRONMENT_CONFIGS: Record<string, Partial<EnvironmentConfig>> = {
  development: {
    enableDevTools: true,
    logLevel: 'debug',
    enableAnalytics: false,
    enablePerformanceMonitoring: false,
    enableErrorReporting: false,
  },
  staging: {
    enableDevTools: true,
    logLevel: 'info',
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    enableErrorReporting: true,
  },
  production: {
    enableDevTools: false,
    logLevel: 'warn',
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    enableErrorReporting: true,
  },
};

/**
 * Validates required environment variables
 */
function validateEnvironmentVariables(): void {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

/**
 * Gets the current environment mode
 */
function getEnvironmentMode(): EnvironmentConfig['mode'] {
  const mode = import.meta.env.MODE;
  
  if (mode === 'development' || mode === 'staging' || mode === 'production') {
    return mode;
  }
  
  // Default to development for unknown modes
  console.warn(`Unknown environment mode: ${mode}. Defaulting to development.`);
  return 'development';
}

/**
 * Creates and validates the environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  try {
    // Validate required environment variables
    validateEnvironmentVariables();
    
    const mode = getEnvironmentMode();
    const envConfig = ENVIRONMENT_CONFIGS[mode] || {};
    
    const config: EnvironmentConfig = {
      ...DEFAULT_CONFIG,
      ...envConfig,
      mode,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    } as EnvironmentConfig;
    
    // Log configuration in development
    if (config.mode === 'development') {
      console.log('Environment Configuration:', {
        mode: config.mode,
        enableDevTools: config.enableDevTools,
        logLevel: config.logLevel,
        enableAnalytics: config.enableAnalytics,
        // Don't log sensitive data
        supabaseUrl: config.supabaseUrl ? '***configured***' : 'missing',
        supabaseAnonKey: config.supabaseAnonKey ? '***configured***' : 'missing',
      });
    }
    
    return config;
  } catch (error) {
    console.error('Failed to initialize environment configuration:', error);
    throw error;
  }
}

/**
 * Global environment configuration instance
 */
export const ENV_CONFIG = getEnvironmentConfig();

/**
 * Utility functions for environment checks
 */
export const isProduction = () => ENV_CONFIG.mode === 'production';
export const isDevelopment = () => ENV_CONFIG.mode === 'development';
export const isStaging = () => ENV_CONFIG.mode === 'staging';

/**
 * Feature flags based on environment
 */
export const FEATURE_FLAGS = {
  enableAnalytics: ENV_CONFIG.enableAnalytics,
  enableDevTools: ENV_CONFIG.enableDevTools,
  enablePerformanceMonitoring: ENV_CONFIG.enablePerformanceMonitoring,
  enableErrorReporting: ENV_CONFIG.enableErrorReporting,
} as const;