import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
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

const OfferDetails = ({ navigation, route }) => {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || route?.params?.role?.toLowerCase() || navigation?.getParam?.('role')?.toLowerCase() || 'creator';
  const isBrand = userRole === 'brand';
  const isCreator = userRole === 'creator' || userRole === 'influencer';
  
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState('1');

  // Fetch offer details from API
  useEffect(() => {
    const fetchOfferDetails = async () => {
      const offerFromRoute = route?.params?.offer || route?.params?.campaign;
      const offerId = offerFromRoute?._id || offerFromRoute?.id || route?.params?.offerId;

      if (offerId && !offerFromRoute?.title) {
        // Only fetch if we have an ID but not full offer data
        try {
          setLoading(true);
          const offersService = await import('../services/offers');
          const response = await offersService.getOfferById(offerId);
          
          if (response && response.data) {
            setOffer(response.data);
          } else {
            setOffer(offerFromRoute || null);
          }
        } catch (err) {
          console.error('Failed to fetch offer details:', err);
          setError(err.message || 'Failed to load offer details');
          // Fallback to route params if available
          setOffer(offerFromRoute || null);
        } finally {
          setLoading(false);
        }
      } else if (offerFromRoute) {
        // Use offer from route params, but fetch creator if creatorId is a string
        let finalOffer = offerFromRoute;
        
        // If creatorId is a string, fetch creator profile
        if (offerFromRoute.creatorId && typeof offerFromRoute.creatorId === 'string') {
          try {
            const userService = await import('../services/user');
            const creatorResponse = await userService.getProfileByUserId(offerFromRoute.creatorId);
            if (creatorResponse && creatorResponse.data) {
              finalOffer = {
                ...offerFromRoute,
                creatorId: creatorResponse.data,
              };
            }
          } catch (err) {
            console.error('Failed to fetch creator for offer:', err);
          }
        }
        
        setOffer(finalOffer);
        setLoading(false);
      } else {
        // Try to get offerId from route and fetch
        const offerIdFromRoute = route?.params?.offerId;
        if (offerIdFromRoute) {
          try {
            setLoading(true);
            const offersService = await import('../services/offers');
            const response = await offersService.getOfferById(offerIdFromRoute);
            
            if (response && response.data) {
              setOffer(response.data);
            }
          } catch (err) {
            console.error('Failed to fetch offer details:', err);
            setError(err.message || 'Failed to load offer details');
          } finally {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    };

    fetchOfferDetails();
  }, [route?.params?.offer, route?.params?.offerId]);

  // Handle purchase offer - Navigate to checkout screen
  const handlePurchaseOffer = () => {
    if (!offer || !mappedOffer) {
      Alert.alert('Error', 'Offer information not available');
      return;
    }

    const offerId = mappedOffer?._original?._id || mappedOffer?._original?.id || offer?._id || offer?.id;
    
    if (!offerId) {
      Alert.alert('Error', 'Offer ID not available');
      return;
    }

    // Navigate to checkout screen with offer details
    navigation?.navigate('Checkout', {
      offerId,
      offer: mappedOffer?._original || offer,
      quantity: parseInt(quantity) || 1,
    });
  };

  // Helper function to map API offer data to UI format
  // Handles GET /offers/:id response format: { _id, creatorId, title, serviceType, platform, rate, etc. }
  const mapOfferToUI = (offerData) => {
    if (!offerData) return null;

    // Handle creatorId - can be string ID or populated object
    let creator = offerData.creator || offerData.user || {};
    if (offerData.creatorId) {
      if (typeof offerData.creatorId === 'object' && offerData.creatorId !== null && offerData.creatorId.name) {
        // creatorId is populated (from Get Offer by ID) - has creator info
        creator = offerData.creatorId;
      }
      // If creatorId is a string, we'll need to fetch it separately (handled in useEffect)
    }

    const location = offerData.location || {};
    const platformMetrics = creator.platformMetrics || [];
    const primaryPlatform = offerData.platform?.[0] || platformMetrics[0]?.platform || 'instagram';

    // Map serviceType from API to display format
    const serviceTypeDisplay = offerData.serviceType === 'reel' ? 'Creator' 
      : offerData.serviceType === 'short_video' ? 'Influencer'
      : offerData.serviceType || 'Creator';

    // Handle rate - can be number or object {ngn, usd}
    let priceDisplay = 'Free';
    if (offerData.rate) {
      if (typeof offerData.rate === 'number') {
        priceDisplay = `$${offerData.rate}`;
      } else if (typeof offerData.rate === 'object' && offerData.rate !== null) {
        // Rate is an object with ngn and usd
        if (offerData.rate.usd) {
          priceDisplay = `$${offerData.rate.usd}`;
        } else if (offerData.rate.ngn) {
          priceDisplay = `₦${offerData.rate.ngn.toLocaleString()}`;
        } else {
          priceDisplay = 'Free';
        }
      }
    }

    // Extract creatorId for navigation
    let creatorIdForNav = null;
    if (offerData.creatorId) {
      if (typeof offerData.creatorId === 'object' && offerData.creatorId !== null) {
        creatorIdForNav = offerData.creatorId._id || offerData.creatorId.id;
      } else if (typeof offerData.creatorId === 'string') {
        creatorIdForNav = offerData.creatorId;
      }
    }
    // Fallback to creator object
    if (!creatorIdForNav && creator && (creator._id || creator.id)) {
      creatorIdForNav = creator._id || creator.id;
    }

    return {
      id: offerData._id || offerData.id,
      title: offerData.title || 'Untitled Offer',
      creator: creator.username ? `@${creator.username}` : creator.name || 'Unknown Creator',
      avatar: creator.profileImage || creator.avatar || null,
      creatorId: creatorIdForNav, // Store creatorId for navigation
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
      isFreeProduct: offerData.rate === 0 || !offerData.rate,
      image: offerData.media?.[0]?.url || creator.profileImage || creator.avatar || null,
      serviceType: serviceTypeDisplay, // Use serviceType from offer data (reel/short_video)
      quantity: offerData.quantity || '1',
      deliveryDays: offerData.deliveryDays || 0,
      duration: offerData.duration || 30,
      category: offerData.category || 'General',
      tags: offerData.tags || [],
      description: offerData.description || 'No description available',
      _original: offerData,
    };
  };

  const mappedOffer = mapOfferToUI(offer);
  const displayOffer = mappedOffer || offer || {
    title: 'Loading...',
    creator: 'Loading...',
    location: 'N/A',
    audience: 'N/A',
    platform: 'N/A',
    price: 'N/A',
    quantity: '1',
    description: 'Loading offer details...',
  };

  const handleGoBack = () => {
    // Check if we have a preserved tab to return to AppNavigator
    const preservedTab = route?.params?.preservedTab;
    if (preservedTab) {
      // Return to AppNavigator with the preserved tab (e.g., 'Offers')
      navigation?.navigate('AppNavigator', { initialTab: preservedTab });
    } else if (navigation?.goBack) {
      // Otherwise use normal goBack
      navigation.goBack();
    }
  };

  const handleViewCampaign = () => {
    const preservedTab = route?.params?.preservedTab;
    navigation?.navigate('CampaignDetails', {
      campaign: offer,
      preservedTab: preservedTab
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offer Details</Text>
          {!isBrand && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  const preservedTab = route?.params?.preservedTab;
                  navigation?.navigate('EditOffer', {
                    offer: mappedOffer?._original || offer,
                    preservedTab: preservedTab
                  });
                }}
              >
                <MaterialIcons name="edit" size={20} color="#464FE5" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={async () => {
                  Alert.alert('Delete Offer', 'Are you sure you want to delete this offer?', [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Delete', 
                      style: 'destructive', 
                      onPress: async () => {
                        try {
                          const offersService = await import('../services/offers');
                          const offerId = mappedOffer?._original?._id || mappedOffer?._original?.id || offer?._id || offer?.id;
                          if (offerId) {
                            await offersService.deleteOffer(offerId);
                            Alert.alert('Success', 'Offer deleted successfully');
                            navigation?.goBack();
                          } else {
                            Alert.alert('Error', 'Unable to delete offer');
                          }
                        } catch (err) {
                          Alert.alert('Error', err.message || 'Failed to delete offer');
                        }
                      }
                    }
                  ]);
                }}
              >
                <MaterialIcons name="delete" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
          {isBrand && <View style={styles.headerActions} />}
        </View>

        {/* Offer Image/Icon */}
        <View style={styles.offerImageContainer}>
          <View style={styles.offerImageWrapper}>
            {displayOffer?.image && typeof displayOffer.image === 'string' && (displayOffer.image.startsWith('http://') || displayOffer.image.startsWith('https://')) ? (
              <Image source={{ uri: displayOffer.image }} style={styles.offerImageActual} resizeMode="cover" />
            ) : (
              <Text style={styles.offerImage}>📦</Text>
            )}
          </View>
        </View>

        {/* Offer Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.offerTitle}>{displayOffer?.title || 'Offer Title'}</Text>
        </View>

        {/* Creator Information */}
        <View style={styles.creatorContainer}>
          <View style={styles.creatorAvatar}>
            {displayOffer?.avatar && typeof displayOffer.avatar === 'string' && (displayOffer.avatar.startsWith('http://') || displayOffer.avatar.startsWith('https://')) ? (
              <Image source={{ uri: displayOffer.avatar }} style={styles.creatorAvatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.creatorAvatarText}>
                {(() => {
                  const creatorName = displayOffer?.creator?.replace('@', '') || 'Unknown';
                  const parts = creatorName.trim().split(' ').filter(p => p.length > 0);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  return creatorName.substring(0, 2).toUpperCase();
                })()}
              </Text>
            )}
          </View>
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorHandle}>{displayOffer?.creator || '@creator'}</Text>
            <Text style={styles.creatorType}>{displayOffer?.serviceType || 'Creator'} Service</Text>
          </View>
        </View>

        {/* Key Details Cards */}
        <View style={styles.detailsContainer}>
          {/* Only show location if creator has enabled it */}
          {(displayOffer?.showLocation !== false) && (
            <View style={styles.detailCard}>
              <MaterialIcons name="location-on" size={20} color="#464FE5" />
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{displayOffer?.location || 'N/A'}</Text>
            </View>
          )}
          <View style={styles.detailCard}>
            <MaterialIcons name="people" size={20} color="#464FE5" />
            <Text style={styles.detailLabel}>Audience</Text>
            <Text style={styles.detailValue}>{displayOffer.audience || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <MaterialIcons name={displayOffer.platformIcon || 'camera-alt'} size={20} color="#464FE5" />
            <Text style={styles.detailLabel}>Platform</Text>
            <Text style={styles.detailValue}>{displayOffer.platform || 'N/A'}</Text>
          </View>
          <View style={styles.detailCard}>
            <MaterialIcons name={displayOffer?.isFreeProduct ? "card-giftcard" : "attach-money"} size={20} color="#464FE5" />
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>
              {displayOffer?.isFreeProduct ? 'Free Product' : (displayOffer?.price || 'N/A')}
            </Text>
          </View>
        </View>

        {/* Quantity Display */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <MaterialIcons name="format-list-numbered" size={20} color="#464FE5" />
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{displayOffer.quantity || '1'}</Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Offer</Text>
          <Text style={styles.descriptionText}>
            {displayOffer.description ||
              `This is a ${displayOffer.serviceType || 'creator'} service offer for ${displayOffer.platform || 'social media'}. ` +
              `The creator ${displayOffer.creator || ''} is offering their services with an audience of ${displayOffer.audience || 'followers'}. ` +
              `This opportunity is based in ${displayOffer.location || 'various locations'}.`
            }
          </Text>
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.serviceDetailsList}>
            <View style={styles.serviceDetailItem}>
              <MaterialIcons name="check-circle" size={16} color="#464FE5" />
              <Text style={styles.serviceDetailText}>
                Professional content creation on {displayOffer.platform || 'selected platform'}
              </Text>
            </View>
            <View style={styles.serviceDetailItem}>
              <MaterialIcons name="check-circle" size={16} color="#464FE5" />
              <Text style={styles.serviceDetailText}>
                {displayOffer?.serviceType === 'Influencer' ? 'Brand partnership' : 'Creator collaboration'} opportunity
              </Text>
            </View>
            <View style={styles.serviceDetailItem}>
              <MaterialIcons name="check-circle" size={16} color="#464FE5" />
              <Text style={styles.serviceDetailText}>
                {displayOffer?.isFreeProduct ? 'Free product included' : 'Paid collaboration'}
              </Text>
            </View>
          </View>
        </View>

        {/* Creator Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creator Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{displayOffer.audience || '0'}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{displayOffer?.platform || 'N/A'}</Text>
              <Text style={styles.statLabel}>Platform</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{displayOffer?.location || 'N/A'}</Text>
              <Text style={styles.statLabel}>Location</Text>
            </View>
          </View>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Purchase button - only for brands */}
          {isBrand && mappedOffer?.price !== 'Free' && (
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={handlePurchaseOffer}
            >
              <MaterialIcons name="shopping-cart" size={20} color="#ffffff" />
              <Text style={styles.purchaseButtonText}>Purchase Offer</Text>
            </TouchableOpacity>
          )}

          {/* View Creator Profile button - only for brands */}
          {isBrand && (
            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={() => {
                // Extract creatorId from mapped offer or original offer data
                let creatorId = mappedOffer?.creatorId;
                
                // If not in mapped offer, try original offer
                if (!creatorId) {
                  const originalOffer = mappedOffer?._original || offer;
                  
                  if (originalOffer?.creatorId) {
                    if (typeof originalOffer.creatorId === 'object' && originalOffer.creatorId !== null) {
                      creatorId = originalOffer.creatorId._id || originalOffer.creatorId.id;
                    } else if (typeof originalOffer.creatorId === 'string') {
                      creatorId = originalOffer.creatorId;
                    }
                  }
                  
                  // Fallback to creator object
                  if (!creatorId && originalOffer?.creator) {
                    if (typeof originalOffer.creator === 'object' && originalOffer.creator !== null) {
                      creatorId = originalOffer.creator._id || originalOffer.creator.id;
                    } else if (typeof originalOffer.creator === 'string') {
                      creatorId = originalOffer.creator;
                    }
                  }
                }
                
                if (creatorId) {
                  console.log('[OfferDetails] Navigating to CreatorProfile with userId:', creatorId);
                  navigation?.navigate('CreatorProfile', { userId: creatorId });
                } else {
                  console.error('[OfferDetails] Creator ID not found in offer data');
                  Alert.alert('Error', 'Creator information not available');
                }
              }}
            >
              <MaterialIcons name="person" size={20} color="#464FE5" />
              <Text style={styles.viewProfileButtonText}>View Creator Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.ordersButton}
            onPress={() => navigation?.navigate('ActiveOrders', { fromOffer: offer })}
          >
            <MaterialIcons name="shopping-bag" size={20} color="#464FE5" />
            <Text style={styles.ordersButtonText}>List All Orders</Text>
          </TouchableOpacity>
          
          {/* Send to Brand button - only for creators, hide for brands */}
          {!isBrand && (
            <TouchableOpacity
              style={styles.sendToBrandButton}
              onPress={() => navigation?.navigate('CreatorsList', { sendOffer: offer })}
            >
              <MaterialIcons name="send" size={20} color="#ffffff" />
              <Text style={styles.sendToBrandButtonText}>Send to Brand</Text>
            </TouchableOpacity>
          )}
        </View>

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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6ecff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerImageContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  offerImageWrapper: {
    width: 150,
    height: 150,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  offerImage: {
    fontSize: 80,
  },
  offerImageActual: {
    width: 150,
    height: 150,
    borderRadius: 16,
  },
  titleContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  offerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    lineHeight: 32,
    textAlign: 'center',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  creatorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creatorAvatarText: {
    fontSize: 28,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorHandle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  creatorType: {
    fontSize: 14,
    color: '#718096',
  },
  detailsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#e6ecff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#464FE5',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  serviceDetailsList: {
    gap: 12,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceDetailText: {
    fontSize: 14,
    color: '#4a5568',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 40,
    marginTop: -24,
    gap: 12,
  },
  ordersButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#464FE5',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ordersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#464FE5',
  },
  sendToBrandButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#464FE5',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  sendToBrandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewProfileButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#464FE5',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#464FE5',
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
    textAlign: 'center',
  },
  creatorAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  purchaseButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  purchaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  modalNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 16,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#464FE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default OfferDetails;

