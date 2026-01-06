/**
 * Application Constants
 * 
 * Centralized configuration for magic numbers, limits, and constants
 * used throughout the application.
 */

export const WALLET_CONSTANTS = {
  MIN_WITHDRAWAL_USD: 10,
  MIN_WITHDRAWAL_NGN: 1000,
  POLLING_INTERVAL: 30000, // 30 seconds
  TRANSACTIONS_PER_PAGE: 50,
  DEFAULT_CURRENCY: 'USD',
  MAX_WITHDRAWAL_AMOUNT: 1000000, // $1,000,000
  MAX_DECIMAL_PLACES: 2,
};

export const API_CONSTANTS = {
  TIMEOUT: 60000, // 60 seconds
  RETRY_ATTEMPTS: 1,
  RETRY_DELAY: 2000, // 2 seconds
  BASE_URL: 'https://adpartnr.onrender.com/api',
};

export const VALIDATION_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_EMAIL_LENGTH: 255,
  MAX_TEXT_LENGTH: 1000,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 15,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
};

export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
};

export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300, // milliseconds
  ANIMATION_DURATION: 300, // milliseconds
  TOAST_DURATION: 3000, // milliseconds
  REFRESH_INTERVAL: 30000, // 30 seconds
};

export const ROLE_CONSTANTS = {
  ROLES: {
    BRAND: 'brand',
    CREATOR: 'creator',
    INFLUENCER: 'influencer',
  },
  CREATOR_ROLES: ['creator', 'influencer'],
  ALL_ROLES: ['brand', 'creator', 'influencer'],
};

