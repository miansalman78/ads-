import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, FlatList, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Drawer from './Drawer';

// Import MaterialIcons - handle both ES6 and CommonJS
let MaterialIcons;
try {
  const MaterialIconModule = require('react-native-vector-icons/MaterialIcons');
  MaterialIcons = MaterialIconModule.default || MaterialIconModule;
  if (typeof MaterialIcons !== 'function') {
    MaterialIcons = ({ name, size, color, style }) => (
      <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
    );
  }
} catch (error) {
  console.error('Error importing MaterialIcons:', error);
  MaterialIcons = ({ name, size, color, style }) => (
    <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
  );
}

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const DashboardNew = ({ navigation, route }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [bookmarkedInfluencers, setBookmarkedInfluencers] = useState(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState('followers');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState('Brand'); // DashboardNew is for Brand role
  const [activeTab, setActiveTab] = useState('Home'); // Track active tab
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const roleParam = route?.params?.role;
    if (roleParam) {
      setUserRole(roleParam.charAt(0).toUpperCase() + roleParam.slice(1));
    }
  }, [route?.params?.role]);

  // Fetch user profile for header
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userService = await import('../services/user');
        const response = await userService.getMyProfile();
        if (response && response.data) {
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user profile in DashboardNew:', error);
      }
    };
    fetchUserProfile();
  }, []);

  const categories = ['All', 'Fashion', 'Beauty', 'Lifestyle'];
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [trendingInfluencers, setTrendingInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured offers and trending influencers from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const offersService = await import('../services/offers');
        const userService = await import('../services/user');
        
        // Fetch featured offers (limit to 3 for horizontal scroll display)
        // Helper function to map offers to UI format
        const mapOffersToUI = async (offersArray, creatorsCache = null) => {
          if (!offersArray || offersArray.length === 0) return [];
          
          // Collect all unique creator IDs that need to be fetched
          const creatorIdsToFetch = new Set();
          const offersWithCreatorIds = [];
          
          offersArray.slice(0, 3).forEach(offer => {
            const offerId = offer._id || offer.id;
            const creatorId = offer.creatorId;
            
            console.log('[DashboardNew] Processing offer:', {
              id: offerId,
              title: offer.title,
              creatorId: creatorId,
              creatorIdType: typeof creatorId,
              hasCreator: !!offer.creator,
              hasUser: !!offer.user
            });
            
            if (creatorId && typeof creatorId === 'string') {
              // Normalize the creatorId to ensure consistent matching
              const normalizedCreatorId = creatorId.trim();
              creatorIdsToFetch.add(normalizedCreatorId);
              console.log('[DashboardNew] Added creatorId to fetch list:', normalizedCreatorId);
            }
            offersWithCreatorIds.push(offer);
          });
          
          console.log('[DashboardNew] Total creator IDs to fetch:', creatorIdsToFetch.size, Array.from(creatorIdsToFetch));
          
          // Build creator map - first try to use creatorsCache (from getCreators API)
          const creatorMap = new Map();
          
          // If we have a creators cache, try to match creator IDs from it
          if (creatorsCache && Array.isArray(creatorsCache)) {
            creatorsCache.forEach(creator => {
              const creatorId = creator.id || creator._id;
              if (creatorId && creatorIdsToFetch.has(creatorId)) {
                creatorMap.set(creatorId, creator);
                console.log('[DashboardNew] Found creator in cache:', creatorId, creator.name || creator.username);
              }
            });
          }
          
          // Fetch remaining creators that weren't in cache
          const remainingCreatorIds = Array.from(creatorIdsToFetch).filter(id => !creatorMap.has(id));
          
          if (remainingCreatorIds.length > 0) {
            console.log('[DashboardNew] Fetching', remainingCreatorIds.length, 'creators not in cache:', remainingCreatorIds);
            try {
              const creatorPromises = remainingCreatorIds.map(async (creatorId) => {
                try {
                  console.log('[DashboardNew] Fetching creator profile for ID:', creatorId);
                  const creatorResponse = await userService.getProfileByUserId(creatorId);
                  console.log('[DashboardNew] Creator response for', creatorId, ':', creatorResponse);
                  
                  // apiRequest returns the data object directly: { success: true, data: {...} }
                  // Check response structure - same as OfferDetails.js
                  let creatorData = null;
                  
                  if (creatorResponse) {
                    // Check if response has nested data (like OfferDetails expects)
                    if (creatorResponse.data && typeof creatorResponse.data === 'object') {
                      creatorData = creatorResponse.data;
                    } 
                    // Check if response itself is the creator data
                    else if (creatorResponse.id || creatorResponse._id || creatorResponse.name) {
                      creatorData = creatorResponse;
                    }
                    // Check if response has success property and data
                    else if (creatorResponse.success !== false && creatorResponse.data) {
                      creatorData = creatorResponse.data;
                    }
                  }
                  
                  // Ensure we have a valid creator object with at least an id or name
                  if (creatorData && (creatorData.id || creatorData._id || creatorData.name)) {
                    console.log('[DashboardNew] Creator data for', creatorId, ':', {
                      name: creatorData.name,
                      username: creatorData.username,
                      email: creatorData.email,
                      avatar: creatorData.avatar,
                      profileImage: creatorData.profileImage,
                      id: creatorData.id || creatorData._id
                    });
                    return { id: creatorId, data: creatorData };
                  } else {
                    console.warn('[DashboardNew] Creator data missing required fields for', creatorId, ':', {
                      hasResponse: !!creatorResponse,
                      responseKeys: creatorResponse ? Object.keys(creatorResponse) : [],
                      hasData: !!(creatorResponse && creatorResponse.data),
                      creatorData: creatorData
                    });
                  }
                } catch (error) {
                  // Silently handle errors - backend API has issues, we'll use cache or fallback
                  const errorMessage = error?.message || error?.toString() || String(error);
                  console.warn('[DashboardNew] Failed to fetch creator (will use cache if available):', creatorId, errorMessage);
                }
                return null;
              });
              
              const creatorResults = await Promise.all(creatorPromises);
              const successfulResults = creatorResults.filter(r => r !== null);
              console.log('[DashboardNew] Creator fetch results:', creatorResults.length, 'total,', successfulResults.length, 'successful');
              
              successfulResults.forEach(result => {
                if (result && result.data) {
                  // Use the original creatorId as the key (the one from the offer)
                  creatorMap.set(result.id, result.data);
                  console.log('[DashboardNew] Added creator to map:', {
                    key: result.id,
                    name: result.data.name || result.data.username || 'Unknown',
                    hasName: !!result.data.name,
                    hasUsername: !!result.data.username,
                    hasEmail: !!result.data.email,
                    id: result.data.id || result.data._id
                  });
                }
              });
            } catch (error) {
              console.error('[DashboardNew] Error fetching creators:', error);
            }
          }
          
          console.log('[DashboardNew] Final creator map size:', creatorMap.size);
          console.log('[DashboardNew] Final creator map keys:', Array.from(creatorMap.keys()));
          
          // Map offers to UI format
          return offersWithCreatorIds.map(offer => {
            let creatorName = 'Unknown Creator';
            let creatorImage = null;
            
            // Handle creatorId - can be string ID or populated object
            if (offer.creatorId) {
              if (typeof offer.creatorId === 'object' && offer.creatorId !== null && offer.creatorId.name) {
                // creatorId is populated (from Get Offer by ID) - has creator info
                creatorName = offer.creatorId.name || offer.creatorId.username || 'Unknown Creator';
                creatorImage = offer.creatorId.profileImage || offer.creatorId.avatar || null;
                console.log('[DashboardNew] Using populated creatorId for offer', offer._id || offer.id, ':', creatorName);
              } else if (typeof offer.creatorId === 'string') {
                // creatorId is just an ID string - use fetched creator data
                const normalizedCreatorId = offer.creatorId.trim();
                const creatorData = creatorMap.get(normalizedCreatorId);
                
                console.log('[DashboardNew] Looking up creator in map:', {
                  offerId: offer._id || offer.id,
                  creatorId: normalizedCreatorId,
                  found: !!creatorData,
                  mapSize: creatorMap.size,
                  mapKeys: Array.from(creatorMap.keys())
                });
                
                if (creatorData) {
                  creatorName = creatorData.name || creatorData.username || creatorData.email || 'Unknown Creator';
                  creatorImage = creatorData.profileImage || creatorData.avatar || null;
                  console.log('[DashboardNew] Using fetched creator data for offer', offer._id || offer.id, ':', creatorName);
                } else {
                  console.warn('[DashboardNew] Creator data not found in map for ID:', normalizedCreatorId, 'Offer ID:', offer._id || offer.id, 'Available keys:', Array.from(creatorMap.keys()));
                }
              }
            }
            
            // Fallback to creator or user object if present in offer
            if (creatorName === 'Unknown Creator') {
            const creator = offer.creator || offer.user || {};
              if (creator && creator.name) {
                creatorName = creator.name || creator.username || creatorName;
                creatorImage = creator.profileImage || creator.avatar || creatorImage;
              }
            }
            
            // Handle rate - can be number or object {ngn, usd}
            let priceDisplay = 'Free';
            if (offer.rate) {
              if (typeof offer.rate === 'number') {
                priceDisplay = offer.rate.toString();
              } else if (typeof offer.rate === 'object' && offer.rate !== null) {
                // Rate is an object with ngn and usd
                if (offer.rate.usd) {
                  priceDisplay = offer.rate.usd.toString();
                } else if (offer.rate.ngn) {
                  priceDisplay = offer.rate.ngn.toLocaleString();
                } else {
                  priceDisplay = 'Free';
                }
              }
            }
            
            return {
              id: offer._id || offer.id,
              title: offer.title || 'Untitled Offer',
              creator: creatorName,
              creatorImage: creatorImage,
              category: offer.category || 'General',
              price: priceDisplay,
              deliverables: offer.quantity ? `${offer.quantity} ${offer.serviceType || 'items'}` : 'N/A',
              duration: offer.deliveryDays ? `${offer.deliveryDays} days` : 'N/A',
              image: offer.media?.[0]?.url || creatorImage || null,
              rating: offer.averageRating ? offer.averageRating.toFixed(1) : '4.5',
              serviceType: offer.serviceType || 'reel',
              platform: offer.platform?.[0] || 'instagram',
              _original: offer,
            };
          });
        };

        // Helper function to extract offers from response
        const extractOffersFromResponse = (response) => {
          if (!response || !response.data) return [];
          
          if (Array.isArray(response.data)) {
            return response.data;
          } else if (response.data.offers && Array.isArray(response.data.offers)) {
            return response.data.offers;
          } else if (response.data.items && Array.isArray(response.data.items)) {
            return response.data.items;
          }
          return [];
        };

        // FIRST: Fetch creators list to use as cache for creator names
        // This works around the backend bug where getProfileByUserId fails with "Assignment to constant variable"
        let creatorsCache = null;
        try {
          // Try to get from cache first
          const cacheUtils = await import('../utils/cache');
          const cachedCreators = await cacheUtils.getCache('dashboard_creators');
          
          if (cachedCreators) {
            creatorsCache = cachedCreators;
            console.log('[DashboardNew] Using cached creators:', cachedCreators.length);
          }

          // Always fetch fresh data in background
          const creatorsResponse = await userService.getCreators({ 
            page: 1, 
            limit: 50, // Fetch more to increase chance of matching offer creators
            sortBy: 'rating',
            sortOrder: 'desc'
          });
          console.log('[DashboardNew] Creators response:', creatorsResponse);
          
          if (creatorsResponse && creatorsResponse.success && creatorsResponse.data) {
            let creatorsData = creatorsResponse.data.creators || [];
            
            // Store creators cache for use in mapOffersToUI
            creatorsCache = creatorsData;
            
            // Cache for 30 minutes
            await cacheUtils.setCache('dashboard_creators', creatorsData, cacheUtils.DEFAULT_TTL.MEDIUM);
            console.log('[DashboardNew] Creators cache updated with', creatorsData.length, 'creators');
            
            // Filter to only show creators (exclude brands) for trending section
            const filteredCreatorsData = creatorsData.filter(creator => {
              const role = creator.role || creator.userRole || '';
              return role.toLowerCase() === 'creator' || role.toLowerCase() === 'influencer';
            });
            
            console.log('[DashboardNew] Filtered creators data:', filteredCreatorsData.length);
            
            const trending = filteredCreatorsData.slice(0, 10).map(creator => {
              // Get location
              const location = creator.location || {};
              const locationDisplay = location.city && location.state
                ? `${location.city}, ${location.state}`
                : location.city || location.country || 'N/A';

              // Calculate total followers
              const totalFollowers = creator.totalFollowers || 0;
              const followersDisplay = totalFollowers > 1000000 
                ? `${(totalFollowers / 1000000).toFixed(1)}M`
                : totalFollowers > 1000
                ? `${(totalFollowers / 1000).toFixed(0)}K`
                : totalFollowers.toString();

              // Calculate engagement rate
              const engagementRate = creator.totalEngagementRate || 0;
              const engagementDisplay = `${engagementRate.toFixed(1)}%`;

              // Get tags (use categories if tags not available)
              const tags = creator.tags || creator.categories || [];

              // Build social stats from platform metrics
              const socialStats = {};
              (creator.platformMetrics || []).forEach(metric => {
                if (metric.platform && metric.followers) {
                  const count = metric.followers > 1000 
                    ? `${(metric.followers / 1000).toFixed(0)}K`
                    : metric.followers.toString();
                  socialStats[metric.platform] = count;
                }
              });

              const creatorId = creator.id || creator._id;

              return {
                id: creatorId,
                userId: creatorId,
                name: creator.name || 'Unknown Creator',
                location: locationDisplay,
                image: creator.profileImage || creator.avatar || null,
                tags: tags.slice(0, 3),
                tagColors: ['#fce7f3', '#f3e8ff', '#dcfce7'].slice(0, Math.min(tags.length, 3)),
                followers: followersDisplay,
                engagement: engagementDisplay,
                rating: creator.averageRating ? creator.averageRating.toFixed(1) : '4.5',
                socialStats: socialStats,
                _original: creator,
              };
            });
            
            if (trending.length > 0) {
              console.log('[DashboardNew] Setting trending influencers:', trending.length);
              setTrendingInfluencers(trending);
            } else {
              console.log('[DashboardNew] No trending influencers to set');
            }
          } else {
            console.log('[DashboardNew] Invalid creators response:', creatorsResponse);
          }
        } catch (creatorsError) {
          console.error('[DashboardNew] Failed to fetch creators cache:', creatorsError);
        }

        // SECOND: Fetch offers and use creators cache to populate creator names
        let offersFound = false;

        // First, try to get featured offers
        try {
          const featuredResponse = await offersService.getFeaturedOffers({ page: 1, limit: 3 });
          console.log('[DashboardNew] Featured offers response:', featuredResponse);
          
          const offersData = extractOffersFromResponse(featuredResponse);
          if (offersData.length > 0) {
            // Use creatorsCache to populate creator names
            const mappedOffers = await mapOffersToUI(offersData, creatorsCache);
            console.log('[DashboardNew] Setting featured offers:', mappedOffers.length);
            setFeaturedOffers(mappedOffers);
            offersFound = true;
          }
        } catch (featuredError) {
          console.error('[DashboardNew] Failed to fetch featured offers:', featuredError);
        }

        // If featured offers failed or returned empty, try getAllOffers
        if (!offersFound) {
          try {
            const allOffersResponse = await offersService.getAllOffers({ page: 1, limit: 3 });
            console.log('[DashboardNew] Trying getAllOffers response:', allOffersResponse);
            
            const offersData = extractOffersFromResponse(allOffersResponse);
            if (offersData.length > 0) {
              // Use creatorsCache to populate creator names
              const mappedOffers = await mapOffersToUI(offersData, creatorsCache);
              console.log('[DashboardNew] Setting offers from getAllOffers:', mappedOffers.length);
              setFeaturedOffers(mappedOffers);
              offersFound = true;
            }
          } catch (allOffersError) {
            console.error('[DashboardNew] Failed to fetch all offers:', allOffersError);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // All data is now fetched from API - no hardcoded data

  const handleMenu = () => {
    setIsDrawerOpen(true);
  };

  // Enhanced navigation with drawer control
  const enhancedNavigation = {
    ...navigation,
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
  };

  const handleNotification = () => {
    // Navigate to notifications screen
    navigation?.navigate('Notifications');
  };

  const handleProfile = () => {
    navigation?.navigate('CreatorProfile');
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    // You can add search logic here to filter influencers
    // const filteredInfluencers = trendingInfluencers.filter(influencer => 
    //   influencer.name.toLowerCase().includes(text.toLowerCase()) ||
    //   influencer.username.toLowerCase().includes(text.toLowerCase()) ||
    //   influencer.tags.some(tag => tag.toLowerCase().includes(text.toLowerCase()))
    // );
  };

  const handleViewAll = () => {
    // Navigate to ExploreOffers to view all influencer offers
    navigation?.navigate('ExploreOffers');
  };

  const handleFindInfluencer = () => {
    // Navigate to CreatorsList to find and browse influencers
    navigation?.navigate('CreatorsList');
  };

  const handleFilter = () => {
    setShowFilterModal(true);
  };

  const handleSortBy = (sort) => {
    setSortBy(sort);
    setShowFilterModal(false);
  };

  const handleFilterCategory = (category) => {
    setFilterCategory(category);
    setShowFilterModal(false);
  };

  const handleFilterLocation = (location) => {
    setFilterLocation(location);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setSortBy('followers');
    setFilterCategory('All');
    setFilterLocation('All');
    setShowFilterModal(false);
  };

  const handleBookmark = (influencerId) => {
    const newBookmarks = new Set(bookmarkedInfluencers);
    if (newBookmarks.has(influencerId)) {
      newBookmarks.delete(influencerId);
      alert('Removed from bookmarks');
    } else {
      newBookmarks.add(influencerId);
      alert('Added to bookmarks');
    }
    setBookmarkedInfluencers(newBookmarks);
  };

  const handleViewProfile = (item) => {
    const userId = item.userId || item.id || item._original?.id || item._original?._id;
    console.log('[DashboardNew] handleViewProfile called with item:', {
      userId: item.userId,
      id: item.id,
      originalId: item._original?.id,
      original_id: item._original?._id,
      extractedUserId: userId
    });
    
    if (userId) {
      console.log('[DashboardNew] Navigating to CreatorProfile with userId:', userId);
      navigation?.navigate('CreatorProfile', { userId });
    } else {
      console.error('[DashboardNew] Cannot navigate: userId not found', item);
      Alert.alert('Error', 'Creator information not available');
    }
  };

  const renderFeaturedOffer = ({ item }) => {
    // Helper to get initials for fallback avatar - use first and last name
    const getInitials = (name) => {
      if (!name) return '?';
      const parts = name.trim().split(' ').filter(p => p.length > 0);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    // Use creatorImage if available, otherwise use offer media image
    const displayImage = item.creatorImage || item.image;
    const isValidImage = displayImage && typeof displayImage === 'string' && (displayImage.startsWith('http://') || displayImage.startsWith('https://'));

    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={() => navigation?.navigate('OfferDetails', { offerId: item.id })}
      >
        {isValidImage ? (
          <Image source={{ uri: displayImage }} style={styles.featuredImage} />
        ) : (
          <View style={[styles.featuredImage, { backgroundColor: '#464FE5', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>
              {getInitials(item.creator)}
            </Text>
          </View>
        )}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredOfferTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.featuredCreator} numberOfLines={1}>by {item.creator}</Text>
          <View style={styles.featuredStats}>
            <View style={styles.featuredStatItem}>
              <MaterialIcons name="attach-money" size={16} color="#ffffff" />
              <Text style={styles.featuredStatValue}>{item.price}</Text>
            </View>
            <View style={styles.featuredStatItem}>
              <MaterialIcons name="check-circle" size={16} color="#ffffff" />
              <Text style={styles.featuredStatValue} numberOfLines={1}>{item.deliverables}</Text>
            </View>
          </View>
          <View style={styles.offerFooter}>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={14} color="#FCD34D" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTrendingInfluencer = ({ item }) => {
    const getInitials = (name) => {
      if (!name) return '?';
      const parts = name.trim().split(' ').filter(p => p.length > 0);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    return (
    <View style={styles.trendingCard}>
      <View style={styles.trendingHeader}>
        <View style={styles.trendingProfile}>
            <View style={[styles.trendingImage, styles.trendingImagePlaceholder]}>
              <Text style={styles.trendingImageInitials}>
                {getInitials(item.name)}
              </Text>
            </View>
          <View style={styles.trendingInfo}>
            <Text style={styles.trendingName}>{item.name}</Text>
            <View style={styles.trendingLocation}>
              <MaterialIcons name="location-on" size={14} color="#6b7280" />
              <Text style={styles.trendingLocationText}>{item.location}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={() => handleBookmark(item.id)}
        >
          <MaterialIcons
            name={bookmarkedInfluencers.has(item.id) ? "bookmark" : "bookmark-border"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.trendingTags}>
        {item.tags.map((tag, index) => (
          <View key={index} style={[styles.trendingTag, { backgroundColor: item.tagColors[index] }]}>
            <Text style={styles.trendingTagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.trendingStats}>
        <View style={styles.trendingStatItem}>
          <Text style={styles.trendingStatValue}>{item.followers}</Text>
          <Text style={styles.trendingStatLabel}>Followers</Text>
        </View>
        <View style={styles.trendingStatItem}>
          <Text style={styles.trendingStatValue}>{item.engagement}</Text>
          <Text style={styles.trendingStatLabel}>Engagement</Text>
        </View>
        <View style={styles.trendingStatItem}>
          <Text style={styles.trendingStatValue}>{item.rating}</Text>
          <Text style={styles.trendingStatLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.socialStats}>
        {Object.entries(item.socialStats).map(([platform, count]) => (
          <View key={platform} style={styles.socialStatItem}>
            <MaterialIcons
              name={platform === 'instagram' ? 'camera-alt' : platform === 'tiktok' ? 'music-note' : platform === 'youtube' ? 'play-circle-outline' : 'gamepad'}
              size={16}
              color="#6b7280"
            />
            <Text style={styles.socialStatText}>{count}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.viewProfileButton}
        onPress={() => handleViewProfile(item)}
      >
        <Text style={styles.viewProfileButtonText}>View Profile</Text>
      </TouchableOpacity>
    </View>
  );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenu}>
            <MaterialIcons name="menu" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton} onPress={handleNotification}>
              <MaterialIcons name="notifications" size={24} color="#374151" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={handleProfile}>
              {userProfile?.profileImage || userProfile?.avatar ? (
                <Image
                  source={{ uri: userProfile.profileImage || userProfile.avatar }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                  <Text style={styles.profileImageInitials}>
                    {getInitials(userProfile?.name || 'User')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Find Influencers Section */}
        <View style={styles.findSection}>
          <Text style={styles.findTitle}>Find Influencers</Text>
          <Text style={styles.findSubtitle}>Discover creators for your brand</Text>

          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search influencers, categories..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={handleSearch}
            />
          </View>

          {/* Find Influencer Button */}
          <TouchableOpacity style={styles.findInfluencerButton} onPress={handleFindInfluencer}>
            <MaterialIcons name="person-search" size={24} color="#ffffff" />
            <Text style={styles.findInfluencerButtonText}>Find Influencer</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filters */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  selectedCategory === category && styles.filterChipSelected
                ]}
                onPress={() => handleCategorySelect(category)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedCategory === category && styles.filterChipTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Offers */}
        <View style={styles.featuredSection}>
          <View style={styles.featuredHeader}>
            <Text style={styles.featuredTitle}>Featured Offers</Text>
            <TouchableOpacity onPress={handleViewAll}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading featured offers...</Text>
            </View>
          ) : featuredOffers.length > 0 ? (
            <FlatList
              data={featuredOffers}
              renderItem={renderFeaturedOffer}
              keyExtractor={(item) => item.id?.toString() || item._original?._id?.toString() || Math.random().toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No featured offers available</Text>
            </View>
          )}
        </View>

        {/* Trending Now */}
        <View style={styles.trendingSection}>
          <View style={styles.trendingHeader}>
            <Text style={styles.trendingTitle}>Trending Now</Text>
            <TouchableOpacity onPress={handleFilter}>
              <MaterialIcons name="tune" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading trending influencers...</Text>
            </View>
          ) : trendingInfluencers.length > 0 ? (
            <FlatList
              data={trendingInfluencers}
              renderItem={renderTrendingInfluencer}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.trendingList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No trending influencers available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigation={navigation}
        userRole={userRole}
        currentScreen="DashboardNew"
      />

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('Home');
            // Already on DashboardNew, do nothing
          }}
        >
          <MaterialIcons
            name="home"
            size={24}
            color={activeTab === 'Home' ? '#464FE5' : '#64748b'}
          />
          <Text style={[
            styles.navText,
            activeTab === 'Home' && styles.navTextActive
          ]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('Campaigns');
            navigation?.navigate('Campaigns');
          }}
        >
          <MaterialIcons
            name="campaign"
            size={24}
            color={activeTab === 'Campaigns' ? '#464FE5' : '#64748b'}
          />
          <Text style={[
            styles.navText,
            activeTab === 'Campaigns' && styles.navTextActive
          ]}>
            Campaigns
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('Messages');
            navigation?.navigate('Inbox');
          }}
        >
          <MaterialIcons
            name="chat-bubble"
            size={24}
            color={activeTab === 'Messages' ? '#464FE5' : '#64748b'}
          />
          <Text style={[
            styles.navText,
            activeTab === 'Messages' && styles.navTextActive
          ]}>
            Messages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('Orders');
            navigation?.navigate('ActiveOrders');
          }}
        >
          <MaterialIcons
            name="shopping-bag"
            size={24}
            color={activeTab === 'Orders' ? '#464FE5' : '#64748b'}
          />
          <Text style={[
            styles.navText,
            activeTab === 'Orders' && styles.navTextActive
          ]}>
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('Profile');
            navigation?.navigate('CreatorProfile');
          }}
        >
          <MaterialIcons
            name="person"
            size={24}
            color={activeTab === 'Profile' ? '#464FE5' : '#64748b'}
          />
          <Text style={[
            styles.navText,
            activeTab === 'Profile' && styles.navTextActive
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      {showFilterModal && (
        <View style={styles.filterModal}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                {['followers', 'engagement', 'rating'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      sortBy === option && styles.filterOptionSelected
                    ]}
                    onPress={() => handleSortBy(option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      sortBy === option && styles.filterOptionTextSelected
                    ]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Category</Text>
              <View style={styles.filterOptions}>
                {['All', 'Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Fitness'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      filterCategory === option && styles.filterOptionSelected
                    ]}
                    onPress={() => handleFilterCategory(option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filterCategory === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <View style={styles.filterOptions}>
                {['All', 'New York', 'San Francisco', 'Miami', 'Anywhere'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      filterLocation === option && styles.filterOptionSelected
                    ]}
                    onPress={() => handleFilterLocation(option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filterLocation === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterModalActions}>
              <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80, // Add padding to prevent content from being hidden behind tabs
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    position: 'relative',
  },
  menuButton: {
    padding: 8,
    position: 'absolute',
    left: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'absolute',
    right: 20,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#464FE5',
  },
  profileButton: {
    padding: 4,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileImagePlaceholder: {
    backgroundColor: '#464FE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  findSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  findTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  findSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  findInfluencerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#464FE5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
    shadowColor: '#464FE5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  findInfluencerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#464FE5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#ffffff',
  },
  featuredSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: 14,
    color: '#464FE5',
    fontWeight: '600',
  },
  featuredList: {
    paddingRight: 16,
    paddingVertical: 4,
  },
  featuredCard: {
    width: 300,
    backgroundColor: '#464FE5',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  featuredContent: {
    flex: 1,
  },
  featuredName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  featuredOfferTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  featuredCreator: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.85,
    marginBottom: 12,
  },
  featuredCategory: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 12,
  },
  featuredStats: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  featuredStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredStatLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 2,
  },
  featuredStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  viewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  durationText: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  trendingSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  trendingList: {
    gap: 16,
  },
  trendingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trendingProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trendingImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  trendingImagePlaceholder: {
    backgroundColor: '#464FE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingImageInitials: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trendingInfo: {
    flex: 1,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  trendingUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  trendingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingLocationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  bookmarkButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  trendingTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingTagText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  trendingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendingStatItem: {
    alignItems: 'center',
  },
  trendingStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  trendingStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  socialStats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  socialStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socialStatText: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewProfileButton: {
    backgroundColor: '#464FE5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  viewProfileButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 20, // Extra padding for safe area
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10, // Increased elevation to ensure tabs are above other content
    zIndex: 1000, // Ensure tabs are always on top
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navItemActive: {
    // Active state styling
  },
  navText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  navTextActive: {
    color: '#464FE5',
    fontWeight: '600',
  },
  filterModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  filterModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterOptionSelected: {
    backgroundColor: '#464FE5',
    borderColor: '#464FE5',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#ffffff',
  },
  filterModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#464FE5',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default DashboardNew;
