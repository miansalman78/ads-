import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

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

const ExploreOffers = ({ navigation, insideAppNavigator = false }) => {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();
  const isBrand = userRole === 'brand';
  const isCreator = userRole === 'creator' || userRole === 'influencer';
  
  const [selectedServiceType, setSelectedServiceType] = useState('Creator');
  const [freeProductsOnly, setFreeProductsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    platform: 'All',
    priceRange: 'All',
    location: 'All',
    audience: 'All'
  });
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatorsCache, setCreatorsCache] = useState(null);

  // Fetch creators cache first (for creator name lookup)
  React.useEffect(() => {
    const fetchCreatorsCache = async () => {
      try {
        const userService = await import('../services/user');
        const creatorsResponse = await userService.getCreators({ 
          page: 1, 
          limit: 50 
        });
        
        if (creatorsResponse && creatorsResponse.success && creatorsResponse.data) {
          const creatorsData = creatorsResponse.data.creators || [];
          setCreatorsCache(creatorsData);
          console.log('[ExploreOffers] Creators cache populated with', creatorsData.length, 'creators');
        }
      } catch (err) {
        console.error('[ExploreOffers] Failed to fetch creators cache:', err);
      }
    };

    fetchCreatorsCache();
  }, []);

  // Fetch offers from API
  React.useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const offersService = await import('../services/offers');
        
        let response;
        
        // If creator, use getUserOffers to get their own offers
        if (isCreator) {
          if (searchText.trim()) {
            // For creators, still use search if they have search text
            response = await offersService.searchOffers(searchText, { page: 1, limit: 50 });
          } else {
            // Get creator's own offers
            response = await offersService.getUserOffers({ page: 1, limit: 50 });
          }
        } else {
          // For brands, use regular offers API
          if (searchText.trim()) {
            response = await offersService.searchOffers(searchText, { page: 1, limit: 50 });
          } else {
            // Build filters for API
            const filters = {};
            if (selectedFilters.platform !== 'All') {
              filters.platform = selectedFilters.platform.toLowerCase();
            }
            if (selectedFilters.priceRange !== 'All') {
              // Parse price range
              if (selectedFilters.priceRange.includes('Under')) {
                filters.maxRate = 100;
              } else if (selectedFilters.priceRange.includes('$100 - $300')) {
                filters.minRate = 100;
                filters.maxRate = 300;
              } else if (selectedFilters.priceRange.includes('$300 - $500')) {
                filters.minRate = 300;
                filters.maxRate = 500;
              } else if (selectedFilters.priceRange.includes('Over')) {
                filters.minRate = 500;
              }
            }
            if (selectedFilters.location !== 'All') {
              // Extract location info if needed
              const locationParts = selectedFilters.location.split(', ');
              if (locationParts.length > 0) filters.city = locationParts[0];
              if (locationParts.length > 1) filters.state = locationParts[1];
            }
            
            response = await offersService.getOffersWithFilters({ ...filters, page: 1, limit: 50 });
          }
        }

        if (response && response.data) {
          // Handle GET /offers response format: { success: true, data: { offers: [...], pagination: {...} } }
          const offersData = Array.isArray(response.data) 
            ? response.data 
            : response.data.offers || response.data.items || [];
          setOffers(offersData);
        }
      } catch (err) {
        console.error('Failed to fetch offers:', err);
        setError(err.message || 'Failed to load offers');
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [searchText, selectedFilters, isCreator]);

  // Helper function to map API offer data to UI format
  // Handles GET /offers response format: { _id, creatorId, title, serviceType, platform, rate, etc. }
  const mapOfferToUI = (offer) => {
    // Handle creatorId - can be string ID or populated object
    let creator = offer.creator || offer.user || {};
    let creatorName = 'Unknown Creator';
    let creatorImage = null;
    
    if (offer.creatorId) {
      if (typeof offer.creatorId === 'object' && offer.creatorId !== null && offer.creatorId.name) {
        // creatorId is populated (from Get Offer by ID) - has creator info
        creator = offer.creatorId;
        creatorName = creator.name || creator.username || 'Unknown Creator';
        creatorImage = creator.profileImage || creator.avatar || null;
      } else if (typeof offer.creatorId === 'string') {
        // creatorId is just an ID string - try to find in creators cache
        if (creatorsCache && Array.isArray(creatorsCache)) {
          const cachedCreator = creatorsCache.find(c => (c.id || c._id) === offer.creatorId);
          if (cachedCreator) {
            creator = cachedCreator;
            creatorName = cachedCreator.name || cachedCreator.username || 'Unknown Creator';
            creatorImage = cachedCreator.profileImage || cachedCreator.avatar || null;
          }
        }
      }
    }
    
    // Fallback to creator object if available
    if (creatorName === 'Unknown Creator' && creator && (creator.name || creator.username)) {
      creatorName = creator.username ? `@${creator.username}` : creator.name;
      creatorImage = creator.profileImage || creator.avatar || null;
    }
    
    const location = offer.location || {};
    const platformMetrics = creator.platformMetrics || [];
    
    // Handle platform - can be array or string
    let primaryPlatform = 'instagram';
    if (offer.platform) {
      if (Array.isArray(offer.platform) && offer.platform.length > 0) {
        primaryPlatform = offer.platform[0];
      } else if (typeof offer.platform === 'string') {
        primaryPlatform = offer.platform;
      }
    } else if (platformMetrics.length > 0) {
      primaryPlatform = platformMetrics[0].platform || 'instagram';
    }
    
    // Map serviceType from API to display format
    const serviceTypeDisplay = offer.serviceType === 'reel' ? 'Creator' 
      : offer.serviceType === 'short_video' ? 'Influencer'
      : offer.serviceType || 'Creator';
    
    // Handle rate - can be number or object {ngn, usd}
    let priceDisplay = 'Free';
    if (offer.rate) {
      if (typeof offer.rate === 'number') {
        priceDisplay = `$${offer.rate}`;
      } else if (typeof offer.rate === 'object' && offer.rate !== null) {
        // Rate is an object with ngn and usd
        if (offer.rate.usd) {
          priceDisplay = `$${offer.rate.usd}`;
        } else if (offer.rate.ngn) {
          priceDisplay = `₦${offer.rate.ngn.toLocaleString()}`;
        } else {
          priceDisplay = 'Free';
        }
      }
    }
    
    return {
      id: offer._id || offer.id,
      title: offer.title || 'Untitled Offer',
      creator: creatorName,
      avatar: creatorImage,
      location: location.city && location.state 
        ? `${location.city}, ${location.state}` 
        : location.city || location.country || 'N/A',
      audience: platformMetrics[0]?.followers 
        ? platformMetrics[0].followers > 1000000 
          ? `${(platformMetrics[0].followers / 1000000).toFixed(1)}M`
          : `${(platformMetrics[0].followers / 1000).toFixed(0)}k`
        : 'N/A',
      platform: primaryPlatform.charAt(0).toUpperCase() + primaryPlatform.slice(1),
      platformIcon: primaryPlatform === 'instagram' ? 'camera-alt' 
        : primaryPlatform === 'tiktok' ? 'music-note'
        : primaryPlatform === 'youtube' ? 'play-circle-filled'
        : 'link',
      price: priceDisplay,
      isFreeProduct: offer.rate === 0 || !offer.rate || (typeof offer.rate === 'object' && !offer.rate.usd && !offer.rate.ngn),
      image: offer.media?.[0]?.url || creatorImage || null,
      serviceType: serviceTypeDisplay,
      quantity: offer.quantity || 1,
      deliveryDays: offer.deliveryDays || 0,
      duration: offer.duration || 30,
      category: offer.category || 'General',
      tags: offer.tags || [],
      // Keep original API data for navigation
      _original: offer,
    };
  };

  const handleServiceTypePress = (type) => {
    setSelectedServiceType(type);
  };

  const handleFreeProductsToggle = () => {
    setFreeProductsOnly(!freeProductsOnly);
  };

  const handleFiltersPress = () => {
    setShowFilters(!showFilters);
  };

  const filterOptions = {
    platform: ['All', 'Instagram', 'YouTube', 'TikTok', 'Blog'],
    priceRange: ['All', 'Under $100', '$100 - $300', '$300 - $500', 'Over $500', 'Free Products'],
    location: ['All', 'CA, USA', 'NY, USA', 'CO, USA', 'FL, USA', 'TX, USA', 'NV, USA', 'LA, USA', 'Miami, USA', 'Chicago, USA', 'Vegas, USA', 'Seattle, USA'],
    audience: ['All', 'Under 100k', '100k - 500k', '500k - 1M', 'Over 1M']
  };

  const selectFilterOption = (category, option) => {
    setSelectedFilters(prev => ({
      ...prev,
      [category]: option
    }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      platform: 'All',
      priceRange: 'All',
      location: 'All',
      audience: 'All'
    });
    setFreeProductsOnly(false);
  };

  // Map API offers to UI format
  const mappedOffers = offers.map(mapOfferToUI);

  // Client-side filtering (additional to API filters)
  const filteredOffers = mappedOffers.filter(offer => {
    // Service type filter (Creator or Influencer)
    if (offer.serviceType !== selectedServiceType) return false;

    // Free products filter
    if (freeProductsOnly && !offer.isFreeProduct) return false;

    // Platform filter (if not already filtered by API)
    if (selectedFilters.platform !== 'All' && offer.platform !== selectedFilters.platform) return false;

    // Price range filter (if not already filtered by API)
    if (selectedFilters.priceRange !== 'All') {
      const priceNum = offer._original?.rate || 0;
      if (selectedFilters.priceRange === 'Free Products' && !offer.isFreeProduct) return false;
      if (selectedFilters.priceRange === 'Under $100' && priceNum >= 100) return false;
      if (selectedFilters.priceRange === '$100 - $300' && (priceNum < 100 || priceNum > 300)) return false;
      if (selectedFilters.priceRange === '$300 - $500' && (priceNum < 300 || priceNum > 500)) return false;
      if (selectedFilters.priceRange === 'Over $500' && priceNum <= 500) return false;
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (insideAppNavigator) {
                // If inside AppNavigator, open drawer
                navigation?.openDrawer?.();
              } else {
                // Otherwise go back to previous screen
                navigation?.navigate('DashboardNew');
              }
            }}
          >
            <MaterialIcons
              name={insideAppNavigator ? "menu" : "arrow-back"}
              size={24}
              color="#2d3748"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Offers</Text>
          {!isBrand && (
            <TouchableOpacity
              style={styles.createOfferButton}
              onPress={() => navigation?.navigate('CreateOffer')}
            >
              <MaterialIcons name="add" size={24} color="#464FE5" />
            </TouchableOpacity>
          )}
          {isBrand && <View style={styles.createOfferButton} />}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for services..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Service Type Selection */}
        <View style={styles.serviceTypeContainer}>
          <TouchableOpacity
            style={[
              styles.serviceTypeButton,
              selectedServiceType === 'Creator' && styles.serviceTypeButtonSelected
            ]}
            onPress={() => handleServiceTypePress('Creator')}
          >
            <Text style={[
              styles.serviceTypeText,
              selectedServiceType === 'Creator' && styles.serviceTypeTextSelected
            ]}>
              Creator Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.serviceTypeButton,
              selectedServiceType === 'Influencer' && styles.serviceTypeButtonSelected
            ]}
            onPress={() => handleServiceTypePress('Influencer')}
          >
            <Text style={[
              styles.serviceTypeText,
              selectedServiceType === 'Influencer' && styles.serviceTypeTextSelected
            ]}>
              Influencer Services
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Options */}
        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.checkboxContainer} onPress={handleFreeProductsToggle}>
            <View style={[styles.checkbox, freeProductsOnly && styles.checkboxSelected]}>
              {freeProductsOnly && <MaterialIcons name="check" size={16} color="#ffffff" />}
            </View>
            <Text style={styles.checkboxText}>Free Products Only</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.allFiltersButton} onPress={handleFiltersPress}>
            <MaterialIcons name="tune" size={16} color="#6b7280" />
            <Text style={styles.allFiltersText}>All Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Dropdown */}
        {showFilters && (
          <View style={styles.filterDropdown}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Platform Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Platform</Text>
              <View style={styles.filterOptions}>
                {filterOptions.platform.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterOption,
                      selectedFilters.platform === option && styles.filterOptionSelected
                    ]}
                    onPress={() => selectFilterOption('platform', option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilters.platform === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.filterOptions}>
                {filterOptions.priceRange.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterOption,
                      selectedFilters.priceRange === option && styles.filterOptionSelected
                    ]}
                    onPress={() => selectFilterOption('priceRange', option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilters.priceRange === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <View style={styles.filterOptions}>
                {filterOptions.location.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterOption,
                      selectedFilters.location === option && styles.filterOptionSelected
                    ]}
                    onPress={() => selectFilterOption('location', option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilters.location === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Audience Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Audience Size</Text>
              <View style={styles.filterOptions}>
                {filterOptions.audience.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterOption,
                      selectedFilters.audience === option && styles.filterOptionSelected
                    ]}
                    onPress={() => selectFilterOption('audience', option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilters.audience === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Apply Filters Button */}
            <TouchableOpacity style={styles.applyFiltersButton} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                // Trigger refetch by updating searchText
                setSearchText(prev => prev + ' ');
                setTimeout(() => setSearchText(prev => prev.trim()), 100);
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Offers Grid */}
        {!loading && !error && (
        <View style={styles.offersGrid}>
            {filteredOffers.length > 0 ? (
              filteredOffers.map((offer) => (
            <TouchableOpacity
              key={offer.id}
              style={styles.offerCard}
                  onPress={() => navigation?.navigate('OfferDetails', { offer: offer._original || offer })}
            >
              <View style={styles.offerCardContent}>
                {/* Offer Image */}
                <View style={styles.offerImageContainer}>
                  {offer.image && typeof offer.image === 'string' && offer.image.startsWith('http') ? (
                    <Image source={{ uri: offer.image }} style={styles.offerImage} resizeMode="cover" />
                  ) : offer.avatar && typeof offer.avatar === 'string' && offer.avatar.startsWith('http') ? (
                    <Image source={{ uri: offer.avatar }} style={styles.offerImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.offerImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                      <MaterialIcons name="image" size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                {/* Offer Title */}
                <Text style={styles.offerTitle} numberOfLines={2} ellipsizeMode="tail">{offer.title}</Text>

              {/* Creator Profile */}
              <View style={styles.creatorProfile}>
                {offer.avatar && typeof offer.avatar === 'string' && offer.avatar.startsWith('http') ? (
                  <Image source={{ uri: offer.avatar }} style={styles.creatorAvatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.creatorAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialIcons name="person" size={14} color="#9CA3AF" />
                </View>
                )}
                <Text style={styles.creatorHandle} numberOfLines={1} ellipsizeMode="tail">{offer.creator}</Text>
              </View>

              {/* Location & Audience */}
              <View style={styles.locationAudience}>
                <View style={styles.locationItem}>
                  <MaterialIcons name="location-on" size={12} color="#6b7280" />
                  <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{offer.location}</Text>
                </View>
                <View style={styles.audienceItem}>
                  <MaterialIcons name="people" size={12} color="#6b7280" />
                  <Text style={styles.audienceText} numberOfLines={1} ellipsizeMode="tail">{offer.audience}</Text>
                </View>
              </View>

              {/* Platform & Price */}
              <View style={styles.platformPrice}>
                <View style={styles.platformContainer}>
                  <MaterialIcons name={offer.platformIcon} size={14} color="#6b7280" />
                  <Text style={styles.platformText} numberOfLines={1} ellipsizeMode="tail">{offer.platform}</Text>
                </View>
                <View style={styles.priceContainer}>
                  {offer.isFreeProduct ? (
                    <Text style={styles.freeProductText}>Free</Text>
                  ) : (
                    <Text style={styles.priceText} numberOfLines={1}>{offer.price}</Text>
                  )}
                </View>
              </View>
              </View>
            </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No offers found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters or search terms</Text>
        </View>
            )}
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  createOfferButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
    marginLeft: 12,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  serviceTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  serviceTypeButtonSelected: {
    backgroundColor: '#464FE5',
  },
  serviceTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  serviceTypeTextSelected: {
    color: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#464FE5',
    borderColor: '#464FE5',
  },
  checkboxText: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '500',
  },
  allFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  allFiltersText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  filterDropdown: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  clearAllText: {
    fontSize: 14,
    color: '#464FE5',
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  filterOptionSelected: {
    backgroundColor: '#464FE5',
    borderColor: '#464FE5',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#ffffff',
  },
  applyFiltersButton: {
    backgroundColor: '#464FE5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  offersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
    justifyContent: 'space-between',
  },
  offerCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
  },
  offerCardContent: {
    flex: 1,
    padding: 12,
    minHeight: 280,
  },
  offerImageContainer: {
    height: 120,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  offerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
    lineHeight: 20,
    minHeight: 40,
  },
  creatorProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 24,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  creatorAvatarText: {
    fontSize: 10,
    fontWeight: '600',
  },
  creatorAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#464FE5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  creatorHandle: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  locationAudience: {
    flexDirection: 'column',
    marginBottom: 10,
    gap: 6,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minHeight: 18,
  },
  locationText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
    flex: 1,
    flexShrink: 1,
  },
  audienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minHeight: 18,
  },
  audienceText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
    flex: 1,
    flexShrink: 1,
  },
  platformPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  platformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  platformText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
    flexShrink: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#464FE5',
  },
  freeProductText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#464FE5',
  },
});

export default ExploreOffers;
