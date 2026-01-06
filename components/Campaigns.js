import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const Campaigns = ({ navigation, route, insideAppNavigator = false }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [bookmarkedCampaigns, setBookmarkedCampaigns] = useState(new Set());
  const [activeTab, setActiveTab] = useState('Campaigns'); // Track active tab for bottom navigation

  // Get user role from route params or navigation
  const userRole = route?.params?.role || navigation?.getParam?.('role') || 'Brand';
  const isBrand = userRole?.toLowerCase() === 'brand';

  // Check if inside AppNavigator (from Dashboard) or from DashboardNew
  const isInsideAppNav = route?.params?.insideAppNavigator || insideAppNavigator;

  const categories = ['All', 'Fashion', 'Tech', 'Beauty', 'Food'];

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState({ activeCampaigns: 0, totalEarnings: 0 });

  // Fetch campaigns based on role
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        let response;
        // Dynamically import to avoid top-level require issues if any
        const campaignService = await import('../services/campaigns');

        if (isBrand) {
          // Brand: Get My Campaigns
          response = await campaignService.getMyCampaigns();
        } else {
          // Creator: Browse Campaigns
          response = await campaignService.browseCampaigns();
        }

        if (response && response.data) {
          const data = Array.isArray(response.data) ? response.data : (response.data.campaigns || []);
          
          // Calculate summary stats from real data
          const activeCampaignsCount = data.filter(c => 
            c.status === 'open' || c.status === 'active' || c.status === 'Open' || c.status === 'Active'
          ).length;
          const totalBudget = data.reduce((sum, c) => sum + (parseFloat(c.budget) || 0), 0);
          
          setSummaryStats({
            activeCampaigns: activeCampaignsCount,
            totalEarnings: totalBudget
          });
          
          setCampaigns(data.map(c => ({
            id: c.id,
            brandName: c.brandName || (isBrand ? 'Me' : 'Brand'), // API might not return brand name for own campaigns
            brandCategory: c.brandCategory || 'General',
            brandIcon: c.brandIcon || '🏢',
            brandColor: c.brandColor || '#464FE5',
            status: c.status || 'Open',
            statusColor: (c.status === 'open' || c.status === 'active') ? '#10b981' : '#f59e0b',
            title: c.name || c.title,
            description: c.description,
            location: c.requirements?.location?.[0] || 'Remote',
            followers: c.requirements?.followerRange?.range || 'Any',
            platform: c.platform?.[0] ? (c.platform[0].charAt(0).toUpperCase() + c.platform[0].slice(1)) : 'Any',
            platformIcon: c.platform?.[0]?.includes('youtube') ? 'play-circle-outline' : c.platform?.[0]?.includes('tiktok') ? 'music-note' : 'camera-alt',
            budget: c.budget ? `$${c.budget}` : 'Negotiable',
            daysLeft: c.daysLeft || (c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / (1000 * 60 * 60 * 24))) : '-'),
            applied: `${c.proposalCount || 0} applied`,
            appliedIcon: 'group'
          })));
        }
      } catch (error) {
        console.error("Failed to fetch campaigns", error);
        // Fallback to empty
        setSummaryStats({ activeCampaigns: 0, totalEarnings: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
    // Add logic to refresh on focus if needed using useIsFocused from @react-navigation/native
  }, [isBrand]); // Re-fetch if role changes

  const handleBack = () => {
    // If inside AppNavigator (from Dashboard): go back to Dashboard
    // If from DashboardNew: open drawer (menu)
    if (isInsideAppNav) {
      navigation?.goBack();
    } else {
      navigation?.openDrawer?.();
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleBidNow = (campaign) => {
    navigation?.navigate('CampaignDetails', { campaign });
  };

  const handleBookmark = (campaignId) => {
    const newBookmarks = new Set(bookmarkedCampaigns);
    if (newBookmarks.has(campaignId)) {
      newBookmarks.delete(campaignId);
      alert('Removed from bookmarks');
    } else {
      newBookmarks.add(campaignId);
      alert('Added to bookmarks');
    }
    setBookmarkedCampaigns(newBookmarks);
  };

  const filteredCampaigns = selectedCategory === 'All'
    ? campaigns
    : campaigns.filter(campaign => campaign.brandCategory === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons
              name={isInsideAppNav ? "arrow-back" : "menu"}
              size={24}
              color="#374151"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campaigns</Text>
          {!isInsideAppNav ? (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation?.navigate('CreateCampaign')}
            >
              <MaterialIcons name="add" size={24} color="#464FE5" />
            </TouchableOpacity>
          ) : (
            <View style={styles.createButton} />
          )}
        </View>

        {/* Summary Statistics */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Active Campaigns</Text>
                <Text style={styles.summaryValue}>{loading ? '-' : summaryStats.activeCampaigns}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{isBrand ? 'Total Budget' : 'Total Value'}</Text>
                <Text style={styles.summaryValue}>{loading ? '-' : `$${summaryStats.totalEarnings.toLocaleString()}`}</Text>
              </View>
            </View>
          </View>
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

        {/* Campaigns List */}
        <View style={styles.campaignsSection}>
          {filteredCampaigns.map((campaign) => (
            <TouchableOpacity
              key={campaign.id}
              style={styles.campaignCard}
              onPress={() => navigation?.navigate('CampaignDetails', { campaign })}
              activeOpacity={0.7}
            >
              {/* Campaign Header */}
              <View style={styles.campaignHeader}>
                <View style={styles.brandInfo}>
                  <View style={[styles.brandIcon, { backgroundColor: campaign.brandColor }]}>
                    <Text style={styles.brandIconText}>{campaign.brandIcon}</Text>
                  </View>
                  <View style={styles.brandDetails}>
                    <Text style={styles.brandName}>{campaign.brandName}</Text>
                    <Text style={styles.brandCategory}>{campaign.brandCategory}</Text>
                  </View>
                </View>
                <View style={[styles.statusTag, { backgroundColor: campaign.statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: campaign.statusColor }]}>
                    {campaign.status}
                  </Text>
                </View>
              </View>

              {/* Campaign Content */}
              <Text style={styles.campaignTitle}>{campaign.title}</Text>
              <Text style={styles.campaignDescription}>{campaign.description}</Text>

              {/* Campaign Details */}
              <View style={styles.campaignDetails}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="location-on" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{campaign.location}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="group" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{campaign.followers}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name={campaign.platformIcon} size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{campaign.platform}</Text>
                </View>
              </View>

              {/* Campaign Metrics */}
              <View style={styles.campaignMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Budget</Text>
                  <Text style={styles.metricValue}>{campaign.budget}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Days left</Text>
                  <Text style={styles.metricValue}>{campaign.daysLeft}</Text>
                </View>
                <View style={styles.metricItem}>
                  <MaterialIcons name={campaign.appliedIcon} size={16} color="#6b7280" />
                  <Text style={styles.metricText}>{campaign.applied}</Text>
                </View>
              </View>

              {/* Campaign Actions */}
              <View style={styles.campaignActions}>
                <TouchableOpacity
                  style={styles.bidButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleBidNow(campaign);
                  }}
                >
                  <MaterialIcons name="send" size={16} color="#ffffff" />
                  <Text style={styles.bidButtonText}>Bid Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookmarkButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleBookmark(campaign.id);
                  }}
                >
                  <MaterialIcons
                    name={bookmarkedCampaigns.has(campaign.id) ? "bookmark" : "bookmark-border"}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Tab Navigation - Only show when NOT inside AppNavigator */}
      {!isInsideAppNav && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setActiveTab('Home');
              navigation?.navigate('DashboardNew');
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
              name="message"
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
              navigation?.navigate('Profile');
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  createButton: {
    padding: 4,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  summaryCard: {
    backgroundColor: '#464FE5',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  campaignsSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  campaignCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandIconText: {
    fontSize: 16,
  },
  brandDetails: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  brandCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  campaignDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  campaignDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  campaignMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  campaignActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bidButton: {
    flex: 1,
    backgroundColor: '#464FE5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
    gap: 8,
  },
  bidButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
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

export default Campaigns;
