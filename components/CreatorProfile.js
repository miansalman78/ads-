import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Dimensions, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
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

const { width } = Dimensions.get('window');

const CreatorProfile = ({ navigation, route, insideAppNavigator = false }) => {
  const { user } = useAuth();
  const currentUserRole = user?.role?.toLowerCase();
  const isCurrentUserBrand = currentUserRole === 'brand';
  
  const [activeTab, setActiveTab] = useState('Portfolio');
  const [activeBottomTab, setActiveBottomTab] = useState('Profile'); // Track active tab for bottom navigation
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState(null);
  const [portfolioType, setPortfolioType] = useState('photo'); // photo, video, link
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioThumbnail, setPortfolioThumbnail] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [portfolioTags, setPortfolioTags] = useState('');
  const [portfolioOrder, setPortfolioOrder] = useState(0);
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewerCache, setReviewerCache] = useState({}); // Cache for reviewer profiles
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const userId = route?.params?.userId; // If viewing another user
  const isSelf = !userId;

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        let response;
        // Dynamically import to avoid circular dependency issues if any
        const userService = await import('../services/user');
        if (userId) {
          // Try getProfileByUserId first
          try {
            response = await userService.getProfileByUserId(userId);
            if (response && response.data) {
              // Normalize the profile data structure
              const profileData = response.data;
              const normalizedProfile = {
                ...profileData,
                id: profileData.id || profileData._id,
                _id: profileData._id || profileData.id,
              };
              setProfile(normalizedProfile);
              return; // Success, exit early
            }
          } catch (getProfileError) {
            // Backend bug: "Assignment to constant variable" error
            // Fallback: Use getCreators API and find the user
            console.warn('[CreatorProfile] getProfileByUserId failed, using getCreators fallback:', getProfileError);
            
            try {
              // Fetch creators list and find the matching user
              const creatorsResponse = await userService.getCreators({ 
                page: 1, 
                limit: 100, // Fetch more to increase chance of finding the user
                sortBy: 'rating',
                sortOrder: 'desc'
              });
              
              if (creatorsResponse && creatorsResponse.success && creatorsResponse.data) {
                const creators = creatorsResponse.data.creators || [];
                // Find creator with matching ID
                const foundCreator = creators.find(creator => {
                  const creatorId = creator.id || creator._id;
                  return creatorId === userId || creatorId?.toString() === userId?.toString();
                });
                
                if (foundCreator) {
                  console.log('[CreatorProfile] Found creator via getCreators fallback:', foundCreator.name || foundCreator.username);
                  // Normalize the profile data structure to ensure compatibility
                  const normalizedProfile = {
                    ...foundCreator,
                    id: foundCreator.id || foundCreator._id,
                    _id: foundCreator._id || foundCreator.id,
                  };
                  setProfile(normalizedProfile);
                  return; // Success with fallback
                } else {
                  console.warn('[CreatorProfile] Creator not found in getCreators response for userId:', userId);
                }
              }
            } catch (fallbackError) {
              console.error('[CreatorProfile] Fallback getCreators also failed:', fallbackError);
            }
            
            // If both methods failed, show error
            console.error("Failed to fetch creator profile - both methods failed", getProfileError);
          }
        } else {
          // Viewing own profile - use getMyProfile
          response = await userService.getMyProfile();
          if (response && response.data) {
            setProfile(response.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch creator profile", error);
      }
    };

    const fetchPortfolio = async () => {
      try {
        const portfolioService = await import('../services/portfolio');
        let portfolioResponse;
        
        if (userId) {
          // Viewing another user's portfolio
          portfolioResponse = await portfolioService.getUserPortfolio(userId);
        } else {
          // Viewing own portfolio
          portfolioResponse = await portfolioService.getMyPortfolio();
        }
        
        if (portfolioResponse && portfolioResponse.data) {
          // Handle different response structures
          const portfolioData = Array.isArray(portfolioResponse.data) 
            ? portfolioResponse.data 
            : portfolioResponse.data.items || portfolioResponse.data.portfolio || [];
          setPortfolio(portfolioData);
        }
      } catch (error) {
        console.error("Failed to fetch portfolio", error);
        setPortfolio([]);
      }
    };

    // Fetch reviewer profile by ID (with caching and fallback)
    const fetchReviewerProfile = async (reviewerId) => {
      if (!reviewerId) return null;
      
      // Check cache first
      if (reviewerCache[reviewerId]) {
        return reviewerCache[reviewerId];
      }

      try {
        const userService = await import('../services/user');
        // Try getProfileByUserId first
        try {
          const response = await userService.getProfileByUserId(reviewerId);
          if (response && response.data) {
            const reviewerData = {
              name: response.data.name || response.data.companyName || 'Anonymous',
              companyName: response.data.companyName || response.data.name,
              profileImage: response.data.profileImage || response.data.avatar,
              avatar: response.data.avatar || response.data.profileImage,
            };
            setReviewerCache(prev => ({ ...prev, [reviewerId]: reviewerData }));
            return reviewerData;
          }
        } catch (error) {
          // Fallback: try getCreators API
          console.warn('[CreatorProfile] getProfileByUserId failed for reviewer, trying getCreators:', error);
          try {
            const creatorsResponse = await userService.getCreators({ page: 1, limit: 100 });
            if (creatorsResponse && creatorsResponse.success && creatorsResponse.data) {
              const creators = creatorsResponse.data.creators || [];
              const foundCreator = creators.find(c => {
                const cId = c.id || c._id;
                return cId === reviewerId || cId?.toString() === reviewerId?.toString();
              });
              if (foundCreator) {
                const reviewerData = {
                  name: foundCreator.name || foundCreator.companyName || 'Anonymous',
                  companyName: foundCreator.companyName || foundCreator.name,
                  profileImage: foundCreator.profileImage || foundCreator.avatar,
                  avatar: foundCreator.avatar || foundCreator.profileImage,
                };
                setReviewerCache(prev => ({ ...prev, [reviewerId]: reviewerData }));
                return reviewerData;
              }
            }
          } catch (fallbackError) {
            console.error('[CreatorProfile] Fallback getCreators also failed:', fallbackError);
          }
        }
      } catch (error) {
        console.error(`[CreatorProfile] Failed to fetch reviewer ${reviewerId}:`, error);
      }
      return null;
    };

    const fetchReviews = async () => {
      try {
        let targetUserId = userId;
        
        // If viewing own profile, get user ID from profile
        if (!targetUserId) {
          const userService = await import('../services/user');
          const profileResponse = await userService.getMyProfile();
          targetUserId = profileResponse?.data?._id || profileResponse?.data?.id;
        }

        if (targetUserId) {
          const reviewsService = await import('../services/reviews');
          const reviewsResponse = await reviewsService.getUserReviews(targetUserId, { type: 'received', page: 1, limit: 5 });
          
          if (reviewsResponse && reviewsResponse.data) {
            const reviewsData = Array.isArray(reviewsResponse.data) 
              ? reviewsResponse.data 
              : reviewsResponse.data.reviews || reviewsResponse.data.items || [];
            
            // Fetch reviewer profiles for reviews that only have IDs
            const reviewsWithReviewers = await Promise.all(
              reviewsData.map(async (review) => {
                // Check if reviewer is already populated
                if (review.reviewer && (review.reviewer.name || review.reviewer.companyName)) {
                  return review;
                }
                
                // Try to get reviewerId
                let reviewerId = null;
                if (typeof review.reviewerId === 'string') {
                  reviewerId = review.reviewerId;
                } else if (review.reviewerId && typeof review.reviewerId === 'object') {
                  reviewerId = review.reviewerId._id || review.reviewerId.id;
                }
                
                // Fetch reviewer profile if we have an ID
                if (reviewerId) {
                  const reviewerData = await fetchReviewerProfile(reviewerId);
                  if (reviewerData) {
                    return {
                      ...review,
                      reviewer: reviewerData,
                    };
                  }
                }
                
                return review;
              })
            );
            
            setReviews(reviewsWithReviewers);
          }
        }
      } catch (error) {
        console.error("Failed to fetch reviews", error);
        setReviews([]);
      }
    };

    fetchProfile();
    fetchPortfolio();
    fetchReviews();
    
    // Fetch offers if viewing another user's profile (brand viewing creator)
    if (!isSelf) {
      fetchCreatorOffers();
    }
    
    // Refresh when gaining focus if it's self profile
    if (isSelf) {
      const unsubscribe = navigation?.addListener?.('focus', () => {
        fetchProfile();
        fetchPortfolio();
        fetchReviews();
      });
      return unsubscribe;
    }
  }, [navigation, userId]);

  const fetchCreatorOffers = async () => {
    if (!userId) return;
    
    try {
      setLoadingOffers(true);
      const offersService = await import('../services/offers');
      
      // Fetch all offers and filter by creator
      const response = await offersService.getAllOffers({
        page: 1,
        limit: 50,
      });

      if (response && response.data) {
        const offersData = Array.isArray(response.data) 
          ? response.data 
          : response.data.offers || response.data.items || [];
        
        // Filter offers by creator/user ID
        const creatorOffers = offersData.filter(offer => {
          const offerCreatorId = offer.creatorId || offer.userId || offer.creator?._id || offer.creator?.id || offer.user?._id || offer.user?.id;
          return offerCreatorId === userId || offerCreatorId?.toString() === userId?.toString();
        });
        
        setOffers(creatorOffers);
      }
    } catch (error) {
      console.error("Failed to fetch creator offers", error);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };


  const handleConnect = () => {
    // When brand views creator profile, "Connect" means create a campaign to hire this creator
    // Navigate to CreateCampaign with creator pre-selected
    if (profile?.id) {
      navigation?.navigate('CreateCampaign', { 
        selectedCreatorId: profile.id,
        selectedCreatorName: profile.name 
      });
    } else {
      Alert.alert('Error', 'Unable to connect. Creator profile not found.');
    }
  };

  const handleMessage = () => {
    // Navigate to Messages screen to start/continue conversation
    if (profile?.id) {
      navigation?.navigate('Messages', { 
        recipientId: profile.id,
        recipientName: profile.name 
      });
    } else {
      Alert.alert('Error', 'Unable to message. User profile not found.');
    }
  };

  const handleSocialConnect = (platform) => {
    const url = profile?.socialMedia?.[platform.toLowerCase()];
    if (url) {
      alert(`Opening ${platform}: ${url}`);
      // Linking.openURL(url);
    } else {
      alert(`${platform} link not available`);
    }
  };

  const handleSendProposals = () => {
    // When creator views their own profile, "Send Proposals" means browse campaigns to submit proposals
    // Navigate to ExploreCampaigns to find brand campaigns
    navigation?.navigate('ExploreCampaigns');
  };

  const handleDrawer = () => {
    if (navigation?.openDrawer) {
      navigation.openDrawer();
    } else {
      navigation?.goBack();
    }
  };

  const handleMenu = () => {
    setShowShareModal(true);
  };

  const handleShare = () => {
    setShowShareModal(false);
    alert('Profile shared successfully!');
  };

  const handleReport = () => {
    setShowShareModal(false);
    setShowReportModal(true);
  };

  const handleReportSubmit = () => {
    setShowReportModal(false);
    alert('Report submitted. Thank you for your feedback.');
  };


  const handlePortfolioItem = (item) => {
    if (isSelf) {
      // If viewing own profile, show edit/delete options
      Alert.alert(
        'Portfolio Item',
        item.title || 'Untitled',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => handleEditPortfolio(item) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeletePortfolio(item) },
        ]
      );
    } else {
      // If viewing another user's profile, open the item
      if (item.type === 'link' && item.url) {
        Alert.alert('Open Link', `Would you like to open ${item.url}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => console.log('Open URL:', item.url) },
        ]);
      } else {
        Alert.alert('Portfolio Item', item.title || 'Untitled');
      }
    }
  };

  const handleAddPortfolio = () => {
    setEditingPortfolioItem(null);
    setPortfolioType('photo');
    setPortfolioTitle('');
    setPortfolioUrl('');
    setPortfolioThumbnail('');
    setPortfolioDescription('');
    setPortfolioTags('');
    setPortfolioOrder(0);
    setShowPortfolioModal(true);
  };

  const handleEditPortfolio = (item) => {
    setEditingPortfolioItem(item);
    setPortfolioType(item.type || 'photo');
    setPortfolioTitle(item.title || '');
    setPortfolioUrl(item.url || '');
    setPortfolioThumbnail(item.thumbnail || '');
    setPortfolioDescription(item.description || '');
    setPortfolioTags(item.tags ? item.tags.join(', ') : '');
    setPortfolioOrder(item.order || 0);
    setShowPortfolioModal(true);
  };

  const handleDeletePortfolio = async (item) => {
    Alert.alert(
      'Delete Portfolio Item',
      'Are you sure you want to delete this portfolio item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const portfolioService = await import('../services/portfolio');
              const response = await portfolioService.deletePortfolio(item._id || item.id);
              
              if (response && (response.success || response.data)) {
                Alert.alert('Success', 'Portfolio item deleted successfully');
                // Refetch portfolio
                const portfolioService2 = await import('../services/portfolio');
                const portfolioResponse = await portfolioService2.getMyPortfolio();
                if (portfolioResponse && portfolioResponse.data) {
                  const portfolioData = Array.isArray(portfolioResponse.data) 
                    ? portfolioResponse.data 
                    : portfolioResponse.data.items || [];
                  setPortfolio(portfolioData);
                }
              } else {
                throw new Error(response?.message || 'Failed to delete portfolio item');
              }
            } catch (error) {
              console.error('Failed to delete portfolio:', error);
              Alert.alert('Error', error.message || 'Failed to delete portfolio item');
            }
          },
        },
      ]
    );
  };

  const handleSavePortfolio = async () => {
    if (!portfolioUrl.trim() && portfolioType !== 'link') {
      Alert.alert('Validation Error', 'Please enter a URL');
      return;
    }

    if (portfolioType === 'link' && !portfolioUrl.trim()) {
      Alert.alert('Validation Error', 'Please enter a link URL');
      return;
    }

    try {
      setSavingPortfolio(true);
      const portfolioService = await import('../services/portfolio');
      
      const portfolioData = {
        type: portfolioType,
        url: portfolioUrl.trim(),
        ...(portfolioThumbnail.trim() && { thumbnail: portfolioThumbnail.trim() }),
        ...(portfolioTitle.trim() && { title: portfolioTitle.trim() }),
        ...(portfolioDescription.trim() && { description: portfolioDescription.trim() }),
        ...(portfolioTags.trim() && { 
          tags: portfolioTags.split(',').map(tag => tag.trim()).filter(tag => tag) 
        }),
        order: portfolioOrder || 0,
        isPublic: true,
      };

      let response;
      if (editingPortfolioItem) {
        // Update existing item
        response = await portfolioService.updatePortfolio(editingPortfolioItem._id || editingPortfolioItem.id, portfolioData);
      } else {
        // Create new item
        response = await portfolioService.createPortfolioItem(portfolioData);
      }

      if (response && (response.success || response.data)) {
        Alert.alert('Success', editingPortfolioItem ? 'Portfolio item updated successfully' : 'Portfolio item created successfully');
        setShowPortfolioModal(false);
        
        // Refetch portfolio
        const portfolioResponse = await portfolioService.getMyPortfolio();
        if (portfolioResponse && portfolioResponse.data) {
          const portfolioData = Array.isArray(portfolioResponse.data) 
            ? portfolioResponse.data 
            : portfolioResponse.data.items || [];
          setPortfolio(portfolioData);
        }
      } else {
        throw new Error(response?.message || 'Failed to save portfolio item');
      }
    } catch (error) {
      console.error('Failed to save portfolio:', error);
      Alert.alert('Error', error.message || 'Failed to save portfolio item');
    } finally {
      setSavingPortfolio(false);
    }
  };

  const handleReviewPress = () => {
    navigation?.navigate('Reviews', { returnScreen: 'CreatorProfile' });
  };

  const handleEditProfile = () => {
    navigation?.navigate('EditProfile', { role: 'Creator' });
  };

  const handleInsightPress = (insight) => {
    alert(`Viewing ${insight} insights...`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Background Image */}
        <View style={styles.headerSection}>
          {profile?.bannerImage ? (
            <Image
              source={{ uri: profile.bannerImage }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.backgroundImage, { backgroundColor: '#464FE5' }]} />
          )}

          {/* Navigation Icons */}
          <View style={styles.navIcons}>
            <TouchableOpacity style={styles.backButton} onPress={handleDrawer}>
              <MaterialIcons name={isSelf ? "menu" : "arrow-back"} size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenu}>
              <MaterialIcons name="more-vert" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Social Media Icons Sidebar */}
          <View style={styles.socialSidebar}>
            {profile?.socialMedia?.instagram && (
              <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialConnect('Instagram')}>
                <MaterialIcons name="camera-alt" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            {profile?.socialMedia?.tiktok && (
              <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialConnect('TikTok')}>
                <MaterialIcons name="music-note" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            {profile?.socialMedia?.youtube && (
              <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialConnect('YouTube')}>
                <MaterialIcons name="play-circle-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            {profile?.website && (
              <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialConnect('Website')}>
                <MaterialIcons name="link" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Dark Overlay for Profile Info */}
          <View style={styles.darkOverlay}>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              {profile?.profileImage ? (
                <Image
                  source={{ uri: profile.profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialIcons name="person" size={40} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.name || 'Loading...'}</Text>
                {profile?.email && (
                  <Text style={styles.profileUsername}>{profile.email}</Text>
                )}
                <View style={styles.locationContainer}>
                  <MaterialIcons name="location-on" size={16} color="#ffffff" />
                  <Text style={styles.locationText}>
                    {profile?.location ? (typeof profile.location === 'string' ? profile.location : `${profile.location.city || ''}, ${profile.location.state || ''}`) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Tags, Metrics & Actions Section */}
        <View style={styles.metricsSection}>
          {/* Tags */}
          <View style={styles.tagsContainer}>
            {profile?.categories && profile.categories.map((cat, index) => (
              <View key={index} style={[styles.tag, index % 2 === 1 && styles.tagGreen]}>
                <MaterialIcons name="local-florist" size={16} color="#ffffff" />
                <Text style={styles.tagText}>{cat}</Text>
              </View>
            ))}
            {!profile?.categories && (
              <View style={styles.tag}>
                <MaterialIcons name="local-florist" size={16} color="#ffffff" />
                <Text style={styles.tagText}>General</Text>
              </View>
            )}
          </View>

          {/* Statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.platformMetrics?.[0]?.followers ? (profile.platformMetrics[0].followers > 1000000 ? (profile.platformMetrics[0].followers / 1000000).toFixed(1) + 'M' : (profile.platformMetrics[0].followers / 1000).toFixed(1) + 'K') : '0'}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.platformMetrics?.[0]?.engagementRate ? profile.platformMetrics[0].engagementRate + '%' : '0%'}
              </Text>
              <Text style={styles.statLabel}>Engagement</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.rating ? (profile.rating > 5 ? (profile.rating / 2).toFixed(1) : profile.rating.toFixed(1)) : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!isSelf && (
            <TouchableOpacity
                style={styles.connectButton}
              onPress={handleConnect}
            >
                <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
              <MaterialIcons name="chat" size={20} color="#6b7280" />
            </TouchableOpacity>
            {/* Only show edit button when viewing own profile (not when brand views creator) */}
            {isSelf && (
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <MaterialIcons name="edit" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Social Media Reach Section */}
        <View style={styles.socialReachSection}>
          <Text style={styles.sectionTitle}>Social Media Reach</Text>

          {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter'].map(platform => {
            const handle = profile?.socialMedia?.[platform.toLowerCase()];
            if (!handle) return null;

            const platformColors = {
              'Instagram': '#E4405F',
              'TikTok': '#000000',
              'YouTube': '#FF0000',
              'Facebook': '#1877F2',
              'Twitter': '#1DA1F2'
            };

            const platformIcons = {
              'Instagram': 'camera-alt',
              'TikTok': 'music-note',
              'YouTube': 'play-circle-outline',
              'Facebook': 'facebook',
              'Twitter': 'alternate-email'
            };

            return (
              <View key={platform} style={styles.socialCard}>
                <View style={styles.socialCardHeader}>
                  <View style={styles.socialIconContainer}>
                    <MaterialIcons name={platformIcons[platform] || 'link'} size={24} color={platformColors[platform] || '#333'} />
                  </View>
                  <View style={styles.socialInfo}>
                    <Text style={styles.socialPlatform}>{platform}</Text>
                    <Text style={styles.socialHandle}>{handle}</Text>
                    <Text style={styles.socialFollowers}>
                      {profile?.platformMetrics?.find(m => m.platform?.toLowerCase() === platform.toLowerCase())?.followers
                        ? `${(profile.platformMetrics.find(m => m.platform?.toLowerCase() === platform.toLowerCase()).followers / 1000).toFixed(1)}K followers`
                        : 'Connect to see stats'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.socialConnectButton}
                  onPress={() => handleSocialConnect(platform)}
                >
                  <Text style={styles.socialConnectText}>View</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {(!profile?.socialMedia || Object.values(profile.socialMedia || {}).every(v => !v)) && (
            <Text style={{ color: '#6b7280', fontStyle: 'italic', padding: 10 }}>No social media accounts linked.</Text>
          )}
        </View>

        {/* About Me Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.aboutText}>
            {profile?.bio || 'No bio added yet.'}
          </Text>
          <View style={styles.hashtagContainer}>
            {profile?.categories && profile.categories.map((cat, index) => (
              <View key={index} style={[styles.hashtag, index % 2 === 0 ? styles.hashtagBlue : styles.hashtagPink]}>
                <Text style={styles.hashtagText}>#{cat.replace(/\s+/g, '')}</Text>
              </View>
            ))}
            {!profile?.categories && (
              <View style={[styles.hashtag, styles.hashtagBlue]}>
                <Text style={styles.hashtagText}>#Creator</Text>
              </View>
            )}
          </View>
        </View>

        {/* Audience Insights Section */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Audience Insights</Text>

          {/* Top Locations */}
          {profile?.audienceInsights?.topLocations && profile.audienceInsights.topLocations.length > 0 ? (
            <View style={styles.insightItem}>
              <Text style={styles.insightSubtitle}>Top Locations</Text>
              <Text style={styles.insightDescription}>Based on followers</Text>
              <View style={styles.progressContainer}>
                {profile.audienceInsights.topLocations.slice(0, 4).map((location, index) => {
                  const colors = [styles.progressBlue, styles.progressGreen, styles.progressPurple, styles.progressOrange];
                  return (
                    <View key={index} style={styles.progressItem}>
                      <Text style={styles.progressLabel}>{location.country}</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, colors[index % colors.length], { width: `${location.percentage || 0}%` }]} />
                      </View>
                      <Text style={styles.progressPercent}>{location.percentage || 0}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.insightItem}>
              <Text style={styles.insightSubtitle}>Top Locations</Text>
              <Text style={styles.insightDescription}>No location data available</Text>
            </View>
          )}

          {/* Gender Distribution */}
          {profile?.audienceInsights?.genderDistribution ? (
            <View style={styles.insightItem}>
              <Text style={styles.insightSubtitle}>Gender Distribution</Text>
              <Text style={styles.insightDescription}>Based on followers</Text>
              <View style={styles.progressContainer}>
                {profile.audienceInsights.genderDistribution.female > 0 && (
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Female</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, styles.progressPink, { width: `${profile.audienceInsights.genderDistribution.female || 0}%` }]} />
                    </View>
                    <Text style={styles.progressPercent}>{profile.audienceInsights.genderDistribution.female || 0}%</Text>
                  </View>
                )}
                {profile.audienceInsights.genderDistribution.male > 0 && (
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Male</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, styles.progressBlue, { width: `${profile.audienceInsights.genderDistribution.male || 0}%` }]} />
                    </View>
                    <Text style={styles.progressPercent}>{profile.audienceInsights.genderDistribution.male || 0}%</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.insightItem}>
              <Text style={styles.insightSubtitle}>Gender Distribution</Text>
              <Text style={styles.insightDescription}>No gender data available</Text>
            </View>
          )}

          {/* Summary Cards */}
          {profile?.audienceInsights && (
            <View style={styles.summaryCards}>
              {profile.audienceInsights.ageGroups && profile.audienceInsights.ageGroups.length > 0 && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>
                    Age Group {profile.audienceInsights.ageGroups[0].range} ({profile.audienceInsights.ageGroups[0].percentage}%)
                  </Text>
                </View>
              )}
              {profile.audienceInsights.avgViews && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>
                    Avg Views {profile.audienceInsights.avgViews > 1000 
                      ? `${(profile.audienceInsights.avgViews / 1000).toFixed(0)}K` 
                      : profile.audienceInsights.avgViews}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <TouchableOpacity
            style={styles.reviewsHeader}
            onPress={handleReviewPress}
          >
            <Text style={styles.sectionTitle}>
              Reviews {profile?.reviewCount ? `(${profile.reviewCount})` : ''}
            </Text>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={20} color="#fbbf24" />
              <Text style={styles.ratingText}>
                {profile?.rating ? (profile.rating > 5 ? (profile.rating / 2).toFixed(1) : profile.rating.toFixed(1)) : 'N/A'}
              </Text>
            </View>
          </TouchableOpacity>

          {reviews && reviews.length > 0 ? (
            reviews.slice(0, 3).map((review, index) => {
              // Handle both populated reviewer object and ID
              const reviewer = review.reviewer || (typeof review.reviewerId === 'object' ? review.reviewerId : {});
              const reviewerName = reviewer.name || reviewer.companyName || 'Anonymous';
              const reviewerImage = reviewer.profileImage || reviewer.avatar || null;
              const rating = review.rating || review.overallRating || 0;
              const comment = review.comment || review.review || 'No comment';
              
              // Helper to get initials
              const getInitials = (name) => {
                if (!name) return '?';
                const parts = name.split(' ').filter(p => p.length > 0);
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
              };

              return (
                <View key={review._id || review.id || index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    {reviewerImage ? (
                      <Image
                        source={{ uri: reviewerImage }}
                        style={styles.reviewerImage}
                      />
                    ) : (
                      <View style={[styles.reviewerImage, { backgroundColor: '#464FE5', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
                          {getInitials(reviewerName)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewerName}>{reviewerName}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialIcons 
                            key={star} 
                            name="star" 
                            size={16} 
                            color={star <= rating ? "#fbbf24" : "#e5e7eb"} 
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>
                    "{comment}"
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewText}>No reviews yet. Be the first to review!</Text>
            </View>
          )}
        </View>

        {/* Portfolio Section */}
        <View style={styles.portfolioSection}>
          <View style={styles.portfolioTabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Info' && styles.activeTab]}
              onPress={() => setActiveTab('Info')}
            >
              <Text style={[styles.tabText, activeTab === 'Info' && styles.activeTabText]}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Portfolio' && styles.activeTab]}
              onPress={() => setActiveTab('Portfolio')}
            >
              <Text style={[styles.tabText, activeTab === 'Portfolio' && styles.activeTabText]}>Portfolio</Text>
            </TouchableOpacity>
            {!isSelf && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'Offers' && styles.activeTab]}
                onPress={() => setActiveTab('Offers')}
              >
                <Text style={[styles.tabText, activeTab === 'Offers' && styles.activeTabText]}>Offers</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeTab === 'Info' && (
            <View style={styles.infoContent}>
              {/* About Section */}
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>About</Text>
                <Text style={styles.infoText}>{profile?.bio || 'No bio available'}</Text>
              </View>

              {/* Location */}
              {profile?.location && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Location</Text>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="location-on" size={20} color="#464FE5" />
                    <Text style={styles.infoText}>
                      {typeof profile.location === 'string' 
                        ? profile.location 
                        : `${profile.location.city || ''}${profile.location.city && profile.location.state ? ', ' : ''}${profile.location.state || ''}${(profile.location.city || profile.location.state) && profile.location.country ? ', ' : ''}${profile.location.country || ''}`.trim() || 'N/A'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Categories */}
              {profile?.categories && profile.categories.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Categories</Text>
                  <View style={styles.categoryTags}>
                    {profile.categories.map((cat, index) => (
                      <View key={index} style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Tags */}
              {profile?.tags && profile.tags.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Tags</Text>
                  <View style={styles.tagList}>
                    {profile.tags.map((tag, index) => (
                      <View key={index} style={styles.infoTag}>
                        <Text style={styles.infoTagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Platform Metrics */}
              {profile?.platformMetrics && profile.platformMetrics.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Platform Metrics</Text>
                  {profile.platformMetrics.map((metric, index) => (
                    <View key={index} style={styles.metricRow}>
                      <View style={styles.metricHeader}>
                        <MaterialIcons 
                          name={metric.platform === 'instagram' ? 'camera-alt' : metric.platform === 'tiktok' ? 'music-note' : metric.platform === 'youtube' ? 'play-circle-filled' : 'link'} 
                          size={20} 
                          color="#464FE5" 
                        />
                        <Text style={styles.metricPlatform}>{metric.platform?.charAt(0).toUpperCase() + metric.platform?.slice(1) || 'Platform'}</Text>
                      </View>
                      <View style={styles.metricDetails}>
                        <Text style={styles.metricLabel}>Followers: <Text style={styles.metricValue}>{metric.followers ? (metric.followers > 1000000 ? (metric.followers / 1000000).toFixed(1) + 'M' : (metric.followers / 1000).toFixed(0) + 'K') : '0'}</Text></Text>
                        <Text style={styles.metricLabel}>Engagement: <Text style={styles.metricValue}>{metric.engagementRate ? metric.engagementRate + '%' : '0%'}</Text></Text>
                        {metric.avgViews && (
                          <Text style={styles.metricLabel}>Avg Views: <Text style={styles.metricValue}>{metric.avgViews > 1000 ? (metric.avgViews / 1000).toFixed(0) + 'K' : metric.avgViews}</Text></Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Contact Info */}
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Contact</Text>
                {profile?.email && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="email" size={20} color="#464FE5" />
                    <Text style={styles.infoText}>{profile.email}</Text>
                  </View>
                )}
                {profile?.website && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="link" size={20} color="#464FE5" />
                    <Text style={styles.infoText}>{profile.website}</Text>
                  </View>
                )}
              </View>

              {/* Rating & Reviews */}
              {(profile?.rating || profile?.totalReviews) && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Rating & Reviews</Text>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="star" size={20} color="#fbbf24" />
                    <Text style={styles.infoText}>
                      {profile.rating ? (profile.rating > 5 ? (profile.rating / 2).toFixed(1) : profile.rating.toFixed(1)) : 'N/A'} 
                      {profile.totalReviews ? ` (${profile.totalReviews} reviews)` : ''}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'Offers' && !isSelf && (
            <>
              {loadingOffers ? (
                <View style={styles.emptyPortfolio}>
                  <ActivityIndicator size="large" color="#464FE5" />
                  <Text style={styles.emptyPortfolioText}>Loading offers...</Text>
                </View>
              ) : offers && offers.length > 0 ? (
                <View style={styles.offersList}>
                  {offers.map((offer, index) => {
                    const location = offer.location || {};
                    const locationDisplay = location.city && location.state
                      ? `${location.city}, ${location.state}`
                      : location.city || location.country || 'N/A';
                    
                    const platformMetrics = profile?.platformMetrics || [];
                    const primaryPlatform = offer.platform?.[0] || platformMetrics[0]?.platform || 'instagram';
                    const platformIcon = primaryPlatform === 'instagram' ? 'camera-alt' 
                      : primaryPlatform === 'tiktok' ? 'music-note'
                      : primaryPlatform === 'youtube' ? 'play-circle-filled'
                      : 'link';

                    return (
                      <TouchableOpacity
                        key={offer._id || offer.id || index}
                        style={styles.offerCard}
                        onPress={() => navigation?.navigate('OfferDetails', { offerId: offer._id || offer.id })}
                      >
                        {offer.media?.[0]?.url ? (
                          <Image
                            source={{ uri: offer.media[0].url }}
                            style={styles.offerImage}
                          />
                        ) : (
                          <View style={[styles.offerImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                            <MaterialIcons name="image" size={32} color="#9CA3AF" />
                          </View>
                        )}
                        <View style={styles.offerContent}>
                          <Text style={styles.offerTitle} numberOfLines={2}>
                            {offer.title || 'Untitled Offer'}
                          </Text>
                          <View style={styles.offerMeta}>
                            <View style={styles.offerMetaItem}>
                              <MaterialIcons name={platformIcon} size={16} color="#6b7280" />
                              <Text style={styles.offerMetaText}>{primaryPlatform.charAt(0).toUpperCase() + primaryPlatform.slice(1)}</Text>
                            </View>
                            <View style={styles.offerMetaItem}>
                              <MaterialIcons name="location-on" size={16} color="#6b7280" />
                              <Text style={styles.offerMetaText}>{locationDisplay}</Text>
                            </View>
                          </View>
                          <View style={styles.offerFooter}>
                            <Text style={styles.offerPrice}>
                              {(() => {
                                if (!offer.rate) return 'Free';
                                if (typeof offer.rate === 'number') {
                                  return `$${offer.rate}`;
                                }
                                if (typeof offer.rate === 'object' && offer.rate !== null) {
                                  if (offer.rate.usd) {
                                    return `$${offer.rate.usd}`;
                                  } else if (offer.rate.ngn) {
                                    return `₦${offer.rate.ngn.toLocaleString()}`;
                                  }
                                }
                                return 'Free';
                              })()}
                            </Text>
                            <Text style={styles.offerDelivery}>
                              {offer.deliveryDays ? `${offer.deliveryDays} days` : 'N/A'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyPortfolio}>
                  <MaterialIcons name="shopping-bag" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyPortfolioText}>No offers available</Text>
                  <Text style={styles.emptyPortfolioSubtext}>This creator hasn't posted any offers yet</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'Portfolio' && (
            <>
              {isSelf && (
                <TouchableOpacity style={styles.addPortfolioButton} onPress={handleAddPortfolio}>
                  <MaterialIcons name="add" size={20} color="#464FE5" />
                  <Text style={styles.addPortfolioButtonText}>Add Portfolio Item</Text>
                </TouchableOpacity>
              )}
              <View style={styles.portfolioGrid}>
                {portfolio && portfolio.length > 0 ? (
                  portfolio.map((item, index) => (
                    <TouchableOpacity
                      key={item._id || index}
                      style={styles.portfolioItem}
                      onPress={() => handlePortfolioItem(item)}
                    >
                      {item?.type === 'link' ? (
                        <View style={styles.linkCard}>
                          <MaterialIcons name="link" size={24} color="#ffffff" />
                          <Text style={styles.linkText} numberOfLines={2}>
                            {String(item?.title || item?.url || 'Link')}
                          </Text>
                        </View>
                      ) : (
                        item?.url || item?.thumbnail ? (
                          <Image
                            source={{ uri: String(item.url || item.thumbnail) }}
                            style={styles.portfolioImage}
                          />
                        ) : (
                          <View
                            style={[
                              styles.portfolioImage,
                              {
                                backgroundColor: '#E5E7EB',
                                justifyContent: 'center',
                                alignItems: 'center',
                              },
                            ]}
                          >
                            <MaterialIcons name="image" size={24} color="#9CA3AF" />
                          </View>
                        )
                      )}
                      {item?.type && (
                        <View style={styles.portfolioTag}>
                          <Text style={styles.portfolioTagText}>
                            {item.type === 'photo' ? 'Photo' : item.type === 'video' ? 'Video' : 'Link'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyPortfolio}>
                    <Text style={styles.emptyPortfolioText}>No portfolio items yet</Text>
                    {isSelf && (
                      <TouchableOpacity style={styles.addFirstPortfolioButton} onPress={handleAddPortfolio}>
                        <Text style={styles.addFirstPortfolioButtonText}>Add Your First Portfolio Item</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Bottom Action Button - Only show for creators viewing their own profile */}
        {isSelf && !isCurrentUserBrand && (
          <TouchableOpacity style={styles.bottomActionButton} onPress={handleSendProposals}>
            <Text style={styles.bottomActionText}>Send Proposals</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom Tab Navigation - Only show if NOT inside AppNavigator (for Brand role) */}
      {!insideAppNavigator && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setActiveBottomTab('Home');
              // Creator should stay in AppNavigator, not navigate to DashboardNew
              // This is already handled by AppNavigator tab switching
            }}
          >
            <MaterialIcons
              name="home"
              size={24}
              color={activeBottomTab === 'Home' ? '#464FE5' : '#64748b'}
            />
            <Text style={[
              styles.navText,
              activeBottomTab === 'Home' && styles.navTextActive
            ]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setActiveBottomTab('Campaigns');
              // Creator should navigate to ExploreCampaigns, not Campaigns (brand page)
              navigation?.navigate('ExploreCampaigns');
            }}
          >
            <MaterialIcons
              name="campaign"
              size={24}
              color={activeBottomTab === 'Campaigns' ? '#464FE5' : '#64748b'}
            />
            <Text style={[
              styles.navText,
              activeBottomTab === 'Campaigns' && styles.navTextActive
            ]}>
              Campaigns
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setActiveBottomTab('Messages');
              navigation?.navigate('Inbox');
            }}
          >
            <MaterialIcons
              name="chat-bubble"
              size={24}
              color={activeBottomTab === 'Messages' ? '#464FE5' : '#64748b'}
            />
            <Text style={[
              styles.navText,
              activeBottomTab === 'Messages' && styles.navTextActive
            ]}>
              Messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setActiveBottomTab('Orders');
              navigation?.navigate('ActiveOrders');
            }}
          >
            <MaterialIcons
              name="shopping-bag"
              size={24}
              color={activeBottomTab === 'Orders' ? '#464FE5' : '#64748b'}
            />
            <Text style={[
              styles.navText,
              activeBottomTab === 'Orders' && styles.navTextActive
            ]}>
              Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setActiveBottomTab('Profile');
              // Already on Profile, do nothing
            }}
          >
            <MaterialIcons
              name="person"
              size={24}
              color={activeBottomTab === 'Profile' ? '#464FE5' : '#64748b'}
            />
            <Text style={[
              styles.navText,
              activeBottomTab === 'Profile' && styles.navTextActive
            ]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Portfolio Modal */}
      <Modal
        visible={showPortfolioModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPortfolioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPortfolioItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPortfolioModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Type Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type *</Text>
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      portfolioType === 'photo' && styles.typeButtonActive,
                    ]}
                    onPress={() => setPortfolioType('photo')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        portfolioType === 'photo' && styles.typeButtonTextActive,
                      ]}
                    >
                      Photo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      portfolioType === 'video' && styles.typeButtonActive,
                    ]}
                    onPress={() => setPortfolioType('video')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        portfolioType === 'video' && styles.typeButtonTextActive,
                      ]}
                    >
                      Video
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      portfolioType === 'link' && styles.typeButtonActive,
                    ]}
                    onPress={() => setPortfolioType('link')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        portfolioType === 'link' && styles.typeButtonTextActive,
                      ]}
                    >
                      Link
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* URL */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>URL *</Text>
                <TextInput
                  style={styles.input}
                  value={portfolioUrl}
                  onChangeText={setPortfolioUrl}
                  placeholder="https://..."
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Thumbnail (for photo/video) */}
              {portfolioType !== 'link' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Thumbnail URL</Text>
                  <TextInput
                    style={styles.input}
                    value={portfolioThumbnail}
                    onChangeText={setPortfolioThumbnail}
                    placeholder="https://..."
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              )}

              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={portfolioTitle}
                  onChangeText={setPortfolioTitle}
                  placeholder="Enter title"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={portfolioDescription}
                  onChangeText={setPortfolioDescription}
                  placeholder="Enter description"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Tags */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tags (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  value={portfolioTags}
                  onChangeText={setPortfolioTags}
                  placeholder="tag1, tag2, tag3"
                  autoCapitalize="none"
                />
              </View>

              {/* Order */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Order</Text>
                <TextInput
                  style={styles.input}
                  value={String(portfolioOrder)}
                  onChangeText={(text) => setPortfolioOrder(parseInt(text) || 0)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPortfolioModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePortfolio}
                disabled={savingPortfolio}
              >
                {savingPortfolio ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 80, // Add padding to prevent content from being hidden behind tabs
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    height: 450,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  navIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  backButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  socialSidebar: {
    position: 'absolute',
    left: 16,
    top: 80,
    zIndex: 2,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  darkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    paddingBottom: 20,
    zIndex: 3,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 4,
  },
  metricsSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
  },
  tagGreen: {
    backgroundColor: '#10b981',
  },
  tagText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#464FE5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedButton: {
    backgroundColor: '#10b981',
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialReachSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  socialCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  socialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  socialIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  socialInfo: {
    flex: 1,
  },
  socialPlatform: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  socialHandle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  socialFollowers: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  socialConnectButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  socialConnectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  aboutText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hashtagBlue: {
    backgroundColor: '#dbeafe',
  },
  hashtagPink: {
    backgroundColor: '#fce7f3',
  },
  hashtagGreen: {
    backgroundColor: '#dcfce7',
  },
  hashtagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  insightItem: {
    marginBottom: 24,
  },
  insightSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  progressContainer: {
    gap: 8,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: '#374151',
    width: 100,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBlue: {
    backgroundColor: '#464FE5',
  },
  progressGreen: {
    backgroundColor: '#10b981',
  },
  progressPurple: {
    backgroundColor: '#8b5cf6',
  },
  progressOrange: {
    backgroundColor: '#f59e0b',
  },
  progressPink: {
    backgroundColor: '#ec4899',
  },
  progressPercent: {
    fontSize: 14,
    color: '#374151',
    width: 40,
    textAlign: 'right',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  reviewsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 4,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  portfolioSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  portfolioTabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#464FE5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#ffffff',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioItem: {
    width: (width - 44) / 2,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  portfolioTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  portfolioTagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  linkCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#464FE5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  linkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyPortfolio: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPortfolioText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyPortfolioSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  offersList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  offerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  offerImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  offerContent: {
    padding: 16,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  offerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  offerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offerMetaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  offerPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#464FE5',
  },
  offerDelivery: {
    fontSize: 14,
    color: '#6b7280',
  },
  addPortfolioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addPortfolioButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#464FE5',
  },
  addFirstPortfolioButton: {
    marginTop: 16,
    backgroundColor: '#464FE5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addFirstPortfolioButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  // Form Styles
  formGroup: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#464FE5',
    borderColor: '#464FE5',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#464FE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoContent: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#464FE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryTagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoTagText: {
    color: '#464FE5',
    fontSize: 12,
    fontWeight: '500',
  },
  metricRow: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricPlatform: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  metricDetails: {
    paddingLeft: 28,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
  bottomActionButton: {
    backgroundColor: '#000000',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bottomActionText: {
    color: '#ffffff',
    fontSize: 16,
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
  navText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  navTextActive: {
    color: '#464FE5',
    fontWeight: '600',
  },
});

export default CreatorProfile;
