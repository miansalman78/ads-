/**
 * API Constants - Aligned with Postman Collections
 * This file contains all valid enum values and API specifications
 */

/**
 * Valid Categories for User Profile
 * Source: User Profile.postman_collection.json
 */
export const USER_PROFILE_CATEGORIES = [
  'fashion_beauty',
  'tech_gadgets',
  'fitness_health',
  'travel_lifestyle',
  'food_drink',
  'entertainment_media',
  'sports',
  'education',
  'business',
  'parenting',
  'automotive',
  'gaming',
  'music',
  'art_design',
];

/**
 * Valid Categories for Offers
 * Source: Offers by Creators-Influencers.postman_collection.json
 * Note: Offers API only accepts 2 categories based on examples
 */
export const OFFER_CATEGORIES = [
  'fashion_beauty',
  'entertainment_media',
];

/**
 * Valid Platforms
 * Source: User Profile.postman_collection.json
 */
export const VALID_PLATFORMS = [
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'facebook',
];

/**
 * Map UI category names to User Profile backend categories
 */
export const mapCategoryToUserProfile = (uiCategory) => {
  const mapping = {
    'Food': 'food_drink',
    'Tech': 'tech_gadgets',
    'Health & Wellness': 'fitness_health',
    'Fashion': 'fashion_beauty',
    'Beauty': 'fashion_beauty',
    'Travel': 'travel_lifestyle',
    'Fitness': 'fitness_health',
    'Lifestyle': 'travel_lifestyle',
    'Gaming': 'gaming',
    'Education': 'education',
  };
  return mapping[uiCategory] || 'fashion_beauty';
};

/**
 * Map UI category names to Offer backend categories
 * Offers API only accepts fashion_beauty or entertainment_media
 */
export const mapCategoryToOffer = (uiCategory) => {
  const mapping = {
    'Food': 'entertainment_media',
    'Tech': 'entertainment_media',
    'Health & Wellness': 'fashion_beauty',
    'Fashion': 'fashion_beauty',
    'Beauty': 'fashion_beauty',
    'Travel': 'entertainment_media',
    'Fitness': 'fashion_beauty',
    'Lifestyle': 'fashion_beauty',
    'Gaming': 'entertainment_media',
    'Education': 'entertainment_media',
  };
  return mapping[uiCategory] || 'fashion_beauty';
};

/**
 * Map backend category to UI display name
 */
export const mapBackendCategoryToUI = (backendCategory) => {
  const reverseMapping = {
    'food_drink': 'Food',
    'tech_gadgets': 'Tech',
    'fitness_health': 'Health & Wellness',
    'fashion_beauty': 'Fashion',
    'travel_lifestyle': 'Travel',
    'gaming': 'Gaming',
    'education': 'Education',
    'entertainment_media': 'Entertainment',
  };
  return reverseMapping[backendCategory] || backendCategory;
};




