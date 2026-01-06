/**
 * Environment Configuration
 * 
 * Provides environment-specific configuration
 * Uses react-native-config for environment variables when available
 * Falls back to default values for development
 */

// Check if react-native-config is available
let Config;
try {
  Config = require('react-native-config').default;
} catch (e) {
  // Fallback if react-native-config is not installed
  Config = {};
}

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

/**
 * Get environment variable with fallback
 */
const getEnvVar = (key, fallback = null) => {
  return Config[key] || process.env[key] || fallback;
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: getEnvVar('API_BASE_URL', 'https://adpartnr.onrender.com/api'),
  TIMEOUT: parseInt(getEnvVar('API_TIMEOUT', '60000'), 10),
  RETRY_ATTEMPTS: parseInt(getEnvVar('API_RETRY_ATTEMPTS', '1'), 10),
  RETRY_DELAY: parseInt(getEnvVar('API_RETRY_DELAY', '2000'), 10),
};

/**
 * Payment Configuration
 */
export const PAYMENT_CONFIG = {
  STRIPE_PUBLIC_KEY: getEnvVar('STRIPE_PUBLIC_KEY', ''),
  PAYSTACK_PUBLIC_KEY: getEnvVar('PAYSTACK_PUBLIC_KEY', ''),
  PAYPAL_CLIENT_ID: getEnvVar('PAYPAL_CLIENT_ID', ''),
};

/**
 * App Configuration
 */
export const APP_CONFIG = {
  ENV: getEnvVar('ENV', isDevelopment ? 'development' : 'production'),
  APP_NAME: getEnvVar('APP_NAME', 'InfluencerNative'),
  VERSION: getEnvVar('APP_VERSION', '0.0.1'),
  IS_DEVELOPMENT: isDevelopment,
  IS_PRODUCTION: isProduction,
};

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: getEnvVar('ENABLE_ANALYTICS', 'false') === 'true',
  ENABLE_CRASH_REPORTING: getEnvVar('ENABLE_CRASH_REPORTING', 'false') === 'true',
  ENABLE_OFFLINE_MODE: getEnvVar('ENABLE_OFFLINE_MODE', 'false') === 'true',
  ENABLE_DEBUG_MODE: isDevelopment || getEnvVar('ENABLE_DEBUG_MODE', 'false') === 'true',
};

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  TOKEN_STORAGE_KEY: '@adpartnr_token',
  USER_STORAGE_KEY: '@adpartnr_user',
  SESSION_TIMEOUT: parseInt(getEnvVar('SESSION_TIMEOUT', '3600000'), 10), // 1 hour
};

/**
 * Logging Configuration
 */
export const LOGGING_CONFIG = {
  LOG_LEVEL: getEnvVar('LOG_LEVEL', isDevelopment ? 'debug' : 'error'),
  ENABLE_CONSOLE: isDevelopment || getEnvVar('ENABLE_CONSOLE_LOGS', 'false') === 'true',
  ENABLE_REMOTE_LOGGING: getEnvVar('ENABLE_REMOTE_LOGGING', 'false') === 'true',
};

// Export all config
export default {
  API_CONFIG,
  PAYMENT_CONFIG,
  APP_CONFIG,
  FEATURE_FLAGS,
  SECURITY_CONFIG,
  LOGGING_CONFIG,
};

