import { apiRequest } from './api';

/**
 * Social Media Services
 * Handles social media platform connection (OAuth) and metrics syncing
 */

// ============================================
// Instagram
// ============================================

/**
 * Initiate Instagram OAuth connection
 * Returns OAuth URL that should be opened in WebView
 * @returns {Promise} OAuth URL and state token
 */
export const connectInstagram = async () => {
  return apiRequest('/social/connect/instagram', {
    method: 'GET',
  });
};

/**
 * Sync Instagram metrics (followers, engagement, etc.)
 * Call after Instagram connection is established
 * @returns {Promise} Synced metrics data
 */
export const syncInstagram = async () => {
  return apiRequest('/social/sync/instagram', {
    method: 'POST',
  });
};

// ============================================
// Facebook
// ============================================

/**
 * Initiate Facebook OAuth connection
 * Returns OAuth URL that should be opened in WebView
 * @returns {Promise} OAuth URL and state token
 */
export const connectFacebook = async () => {
  return apiRequest('/social/connect/facebook', {
    method: 'GET',
  });
};

/**
 * Sync Facebook metrics
 * Call after Facebook connection is established
 * @returns {Promise} Synced metrics data
 */
export const syncFacebook = async () => {
  return apiRequest('/social/sync/facebook', {
    method: 'POST',
  });
};

// ============================================
// TikTok
// ============================================

/**
 * Initiate TikTok OAuth connection
 * Returns OAuth URL that should be opened in WebView
 * @returns {Promise} OAuth URL and state token
 */
export const connectTikTok = async () => {
  return apiRequest('/social/connect/tiktok', {
    method: 'GET',
  });
};

/**
 * Sync TikTok metrics
 * Call after TikTok connection is established
 * @returns {Promise} Synced metrics data
 */
export const syncTikTok = async () => {
  return apiRequest('/social/sync/tiktok', {
    method: 'POST',
  });
};

// ============================================
// Twitter
// ============================================

/**
 * Initiate Twitter OAuth connection
 * Returns OAuth URL that should be opened in WebView
 * @returns {Promise} OAuth URL and state token
 */
export const connectTwitter = async () => {
  return apiRequest('/social/connect/twitter', {
    method: 'GET',
  });
};

/**
 * Sync Twitter metrics
 * Call after Twitter connection is established
 * @returns {Promise} Synced metrics data
 */
export const syncTwitter = async () => {
  return apiRequest('/social/sync/twitter', {
    method: 'POST',
  });
};

// ============================================
// OAuth Callback Handling
// ============================================

/**
 * Handle OAuth callback after user authenticates on platform
 * This endpoint is called by the backend after OAuth redirect
 * Frontend should use deep linking to detect when user returns from OAuth flow
 * @param {string} platform - Platform name ('instagram', 'facebook', 'tiktok', 'twitter')
 * @param {string} code - OAuth authorization code
 * @param {string} state - OAuth state token (for security)
 * @returns {Promise} Connection status
 * 
 * Note: This is typically handled by backend automatically via redirect URL.
 * Frontend should listen for deep link and check connection status via getMyProfile()
 */
export const handleOAuthCallback = async (platform, code, state) => {
  // This is informational - backend handles the callback automatically
  // Frontend should verify connection by calling getMyProfile() after deep link
  console.log(`[Social] OAuth callback received for ${platform}`);
  // Return connection status check
  const userService = await import('./user');
  return userService.getMyProfile();
};

// ============================================
// Generic Helper Functions
// ============================================

/**
 * Get OAuth connection URL for a platform
 * @param {string} platform - Platform name ('instagram', 'facebook', 'tiktok', 'twitter')
 * @returns {Promise} OAuth URL
 */
export const connectSocialPlatform = async (platform) => {
  const platformMap = {
    instagram: connectInstagram,
    facebook: connectFacebook,
    tiktok: connectTikTok,
    twitter: connectTwitter,
  };

  const connectFunction = platformMap[platform.toLowerCase()];
  if (!connectFunction) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return connectFunction();
};

/**
 * Sync metrics for a platform
 * @param {string} platform - Platform name ('instagram', 'facebook', 'tiktok', 'twitter')
 * @returns {Promise} Synced metrics data
 */
export const syncSocialPlatform = async (platform) => {
  const platformMap = {
    instagram: syncInstagram,
    facebook: syncFacebook,
    tiktok: syncTikTok,
    twitter: syncTwitter,
  };

  const syncFunction = platformMap[platform.toLowerCase()];
  if (!syncFunction) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return syncFunction();
};

