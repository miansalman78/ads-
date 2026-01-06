import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import MaterialIcons - handle both ES6 and CommonJS
let MaterialIcons;
try {
  const MaterialIconModule = require('react-native-vector-icons/MaterialIcons');
  MaterialIcons = MaterialIconModule.default || MaterialIconModule;
  // Verify it's a valid component
  if (typeof MaterialIcons !== 'function') {
    console.warn('MaterialIcons is not a function, creating fallback');
    MaterialIcons = ({ name, size, color, style }) => (
      <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
    );
  }
} catch (error) {
  console.error('Error importing MaterialIcons:', error);
  // Fallback component
  MaterialIcons = ({ name, size, color, style }) => (
    <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
  );
}

const { width } = Dimensions.get('window');

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const Dashboard = ({ navigation, route }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ totalEarnings: 0, activeOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(route?.params?.role || navigation?.getParam?.('role') || 'Creator');
  const isBrand = userRole?.toLowerCase() === 'brand';

  // Fetch user profile and dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const userService = await import('../services/user');
        const profileResponse = await userService.getMyProfile();
        
        if (profileResponse && profileResponse.data) {
          setUserProfile(profileResponse.data);
          const userRoleFromProfile = profileResponse.data.role || profileResponse.data.userRole;
          if (userRoleFromProfile) {
            const normalizedRole = userRoleFromProfile.charAt(0).toUpperCase() + userRoleFromProfile.slice(1).toLowerCase();
            if (normalizedRole !== userRole) {
              setUserRole(normalizedRole);
            }
          }
        }

        // Fetch campaigns/offers based on role
        const currentUserRole = profileResponse?.data?.role || profileResponse?.data?.userRole || userRole;
        const isBrandRole = currentUserRole?.toLowerCase() === 'brand';
        
        if (isBrandRole) {
          const campaignsService = await import('../services/campaigns');
          const campaignsResponse = await campaignsService.getMyCampaigns({ page: 1, limit: 100 });
          let campaignsData = [];
          if (campaignsResponse && campaignsResponse.data) {
            campaignsData = Array.isArray(campaignsResponse.data)
              ? campaignsResponse.data
              : campaignsResponse.data.campaigns || campaignsResponse.data.items || [];
            setCampaigns(campaignsData.slice(0, 3));
          }

          // Fetch stats for brand (total spent, active campaigns)
          // Calculate comprehensive stats from orders and campaigns
          const ordersService = await import('../services/orders');
          const statsUtils = await import('../utils/dashboardStats');
          
          try {
            // Fetch all orders (not just active) to calculate total spent
            const allOrdersResponse = await ordersService.getAllOrders({ page: 1, limit: 100 });
            const orders = allOrdersResponse && allOrdersResponse.data
              ? (Array.isArray(allOrdersResponse.data)
                  ? allOrdersResponse.data
                  : allOrdersResponse.data.orders || allOrdersResponse.data.items || [])
              : [];

            // Calculate stats using utility function
            const calculatedStats = statsUtils.calculateBrandStats({
              campaigns: campaignsData,
              orders: orders,
            });

            setStats({
              totalSpent: calculatedStats.totalSpent,
              activeCampaigns: calculatedStats.activeCampaigns,
              pendingProposals: calculatedStats.pendingProposals || 0,
              completedOrders: calculatedStats.completedOrders || 0,
            });
          } catch (statsError) {
            console.error('Failed to calculate brand stats:', statsError);
            // Fallback to basic stats
            setStats({
              totalSpent: 0,
              activeCampaigns: campaignsData.filter(
                (c) => c.status === 'open' || c.status === 'active' || c.status === 'Open' || c.status === 'Active'
              ).length,
            });
          }
        } else {
          // Creator: Fetch campaigns (brand campaigns for opportunities)
          const campaignsService = await import('../services/campaigns');
          const campaignsResponse = await campaignsService.browseCampaigns({ page: 1, limit: 10 });
          if (campaignsResponse && campaignsResponse.data) {
            const campaignsData = Array.isArray(campaignsResponse.data)
              ? campaignsResponse.data
              : campaignsResponse.data.campaigns || campaignsResponse.data.items || [];
            setCampaigns(campaignsData.slice(0, 3));
          }

          const ordersService = await import('../services/orders');
          const statsUtils = await import('../utils/dashboardStats');
          
          // Fetch wallet balance for real total earnings
          let walletBalance = 0;
          try {
            const walletService = await import('../services/wallet');
            const walletResponse = await walletService.getWallet();
            if (walletResponse && walletResponse.data) {
              walletBalance = walletResponse.data.balance || walletResponse.data.totalEarnings || 0;
            }
          } catch (walletError) {
            console.error('Failed to fetch wallet balance:', walletError);
          }

          // Fetch all orders to calculate accurate stats
          try {
            const allOrdersResponse = await ordersService.getAllOrders({ page: 1, limit: 100 });
            const orders = allOrdersResponse && allOrdersResponse.data
              ? (Array.isArray(allOrdersResponse.data)
                  ? allOrdersResponse.data
                  : allOrdersResponse.data.orders || allOrdersResponse.data.items || [])
              : [];

            // Calculate stats using utility function
            const calculatedStats = statsUtils.calculateCreatorStats({
              walletBalance: walletBalance,
              orders: orders,
            });

            setStats({
              totalEarnings: calculatedStats.totalEarnings,
              activeOrders: calculatedStats.activeOrders,
              completedOrders: calculatedStats.completedOrders || 0,
            });
          } catch (statsError) {
            console.error('Failed to calculate creator stats:', statsError);
            // Fallback to wallet balance only
            setStats({
              totalEarnings: walletBalance,
              activeOrders: 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  // Map API data to UI format
  const campaignData = campaigns && campaigns.length > 0 ? campaigns.map((item, index) => {
    const platform = Array.isArray(item.platform) ? item.platform[0] : item.platform || 'instagram';
    const platformLower = platform.toLowerCase();
    const iconMap = {
      instagram: 'camera-alt',
      tiktok: 'music-note',
      youtube: 'play-circle-filled',
      facebook: 'facebook',
      twitter: 'chat',
    };
    
    // Handle budget - can be number, budgetRange object, or missing
    let priceDisplay = 'N/A';
    if (item.budget) {
      priceDisplay = `$${item.budget}`;
    } else if (item.budgetRange) {
      if (item.budgetRange.min && item.budgetRange.max) {
        priceDisplay = `$${item.budgetRange.min} - $${item.budgetRange.max}`;
      } else if (item.budgetRange.min) {
        priceDisplay = `$${item.budgetRange.min}+`;
      } else if (item.budgetRange.max) {
        priceDisplay = `Up to $${item.budgetRange.max}`;
      }
    } else if (item.rate) {
      priceDisplay = `$${item.rate}`;
    }
    
    return {
      id: item._id || item.id || index,
      title: item.name || item.title || 'Untitled Campaign',
      image: item.media?.[0]?.url || item.image || null,
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      icon: iconMap[platformLower] || 'camera-alt',
      price: priceDisplay,
      description: item.description || 'No description available',
      _original: item,
    };
  }) : [];

  const renderCampaignItem = ({ item }) => {
    const handleCampaignPress = () => {
      // For creators, navigate directly to SubmitProposal (same as "Apply Now" button)
      // For brands, navigate to CampaignDetails to manage their campaigns
      if (isBrand) {
        navigation?.navigate('CampaignDetails', { campaign: item._original || item, role: 'Brand' });
      } else {
        // Creator: navigate directly to SubmitProposal
        navigation?.navigate('SubmitProposal', { campaign: item._original || item });
      }
    };

    return (
    <TouchableOpacity
      style={styles.campaignBox}
      onPress={handleCampaignPress}
      activeOpacity={0.7}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.campaignImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.campaignImage, styles.campaignImagePlaceholder]}>
          <MaterialIcons name="image" size={32} color="#9CA3AF" />
        </View>
      )}
      <Text style={styles.campaignTitle}>{item.title}</Text>
      <View style={styles.campaignDetailRow}>
        <MaterialIcons name={item.icon} size={14} color="#464FE5" />
        <Text style={styles.campaignDetail}>{item.platform} • {item.price}</Text>
      </View>
      <Text style={styles.campaignDetailSmall}>{item.description}</Text>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with hamburger and bell */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.hamburger}
            onPress={() => navigation?.openDrawer?.()}
          >
            <MaterialIcons name="menu" size={24} color="#2d3748" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Dashboard</Text>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation?.navigate('Notifications')}
          >
            <MaterialIcons name="notifications" size={24} color="#2d3748" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome{'\n'}back, {loading ? '...' : (userProfile?.name?.split(' ')[0] || 'User')}!
          </Text>
          {userProfile?.profileImage || userProfile?.avatar ? (
            <Image
              source={{ uri: userProfile.profileImage || userProfile.avatar }}
              style={styles.userImage}
            />
          ) : (
            <View style={[styles.userImage, styles.userImagePlaceholder]}>
              <Text style={styles.userImageInitials}>
                {getInitials(userProfile?.name || 'User')}
              </Text>
            </View>
          )}
        </View>

        {/* Stats Section - Role-based */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statBox}
            onPress={() => navigation?.navigate('Wallet')}
          >
            <Text style={styles.statLabel}>{isBrand ? 'Total Spent' : 'Total Earnings'}</Text>
            <Text style={styles.statValue}>
              {loading ? '...' : (isBrand ? `$${stats.totalSpent?.toLocaleString() || '0'}` : `$${stats.totalEarnings?.toLocaleString() || '0'}`)}
            </Text>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{isBrand ? 'Active Campaigns' : 'Active Orders'}</Text>
            <Text style={styles.statValue}>
              {loading ? '...' : (isBrand ? stats.activeCampaigns || '0' : stats.activeOrders || '0')}
            </Text>
          </View>
        </View>

        {/* New Opportunities Section - Role-based */}
        <View style={styles.opportunitiesSection}>
          <Text style={styles.sectionTitle}>{isBrand ? 'YOUR CAMPAIGNS' : 'NEW OPPORTUNITIES'}</Text>
          <Text style={styles.sectionSubtitle}>{isBrand ? 'Manage your active campaigns' : 'We have new brand campaigns!'}</Text>
          <View style={styles.campaignsContainer}>
            <FlatList
              ref={flatListRef}
              data={campaignData}
              renderItem={renderCampaignItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width * 0.8));
                setCurrentIndex(index);
              }}
              style={styles.campaignSlider}
              contentContainerStyle={styles.campaignSliderContent}
            />
            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
              {campaignData.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot
                  ]}
                />
              ))}
            </View>
          </View>
          {isBrand ? (
            <>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation?.navigate('Campaigns', { insideAppNavigator: true })}
              >
                <Text style={styles.viewButtonText}>View All Campaigns</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewButtonSecondary}
                onPress={() => navigation?.navigate('CreatorsList')}
              >
                <Text style={styles.viewButtonTextSecondary}>Browse Creators</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation?.navigate('ExploreCampaigns', { insideAppNavigator: true })}
              >
                <Text style={styles.viewButtonText}>View All Campaigns</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewButtonSecondary}
                onPress={() => navigation?.navigate('ExploreOffers')}
              >
                <Text style={styles.viewButtonTextSecondary}>Explore Offers</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Quick Links Section */}
        <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkBox}
              onPress={() => navigation?.navigate('ActiveOrders')}
            >
              <View style={styles.linkMaterialIconsContainer}>
                <MaterialIcons name="shopping-basket" size={20} color="#464FE5" />
              </View>
              <Text style={styles.linkText}>My Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBox}
              onPress={() => navigation?.navigate('Messages')}
            >
              <View style={styles.linkMaterialIconsContainer}>
                <MaterialIcons name="headset" size={20} color="#464FE5" />
              </View>
              <Text style={styles.linkText}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBox}
              onPress={() => navigation?.navigate('Messages')}
            >
              <View style={styles.linkMaterialIconsContainer}>
                <MaterialIcons name="chat-bubble-outline" size={20} color="#464FE5" />
              </View>
              <Text style={styles.linkText}>Messages</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity Section - Removed hardcoded data */}
        {!loading && (
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.emptyActivityContainer}>
              <MaterialIcons name="history" size={48} color="#9ca3af" />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
              <Text style={styles.emptyActivitySubtext}>Your recent activities will appear here</Text>
            </View>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  hamburger: {
    padding: 4,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  bell: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5a67d8',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    flex: 1,
  },
  userImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 8,
  },
  userImagePlaceholder: {
    backgroundColor: '#464FE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userImageInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  opportunitiesSection: {
    backgroundColor: '#f0f4ff',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#464FE5',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
  },
  campaignsContainer: {
    marginBottom: 16,
  },
  campaignSlider: {
    height: 200,
  },
  campaignSliderContent: {
    paddingHorizontal: 8,
  },
  campaignBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    width: width * 0.5,
    marginHorizontal: 8,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#464FE5',
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  campaignImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  campaignImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  campaignTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
    textAlign: 'left',
  },
  campaignDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    justifyContent: 'flex-start',
  },
  campaignDetail: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
  campaignDetailSmall: {
    fontSize: 11,
    color: '#718096',
    textAlign: 'left',
    lineHeight: 14,
  },
  viewButton: {
    backgroundColor: '#464fe5',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,

  },
  viewButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#464fe5',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  viewButtonTextSecondary: {
    color: '#464FE5',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quickLinksSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkMaterialIconsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 12,
    color: '#2d3748',
    textAlign: 'center',
  },
  activitySection: {
    paddingHorizontal: 16,
    marginBottom: 100,
  },
  emptyActivityContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyActivitySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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
  },
});

export default Dashboard;