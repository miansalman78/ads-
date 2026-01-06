import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
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

const Proposals = ({ navigation, route, userRole: routeUserRole }) => {
  const { user } = useAuth();
  const userRole = user?.role || routeUserRole || route?.params?.role;
  const isBrandRole = userRole?.toLowerCase() === 'brand';
  
  const { campaignId, campaign: initialCampaign } = route.params || {};
  const [proposals, setProposals] = useState([]);
  const [campaign, setCampaign] = useState(initialCampaign || null);
  const [loading, setLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(!initialCampaign);
  const [refreshing, setRefreshing] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Best Match');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('Proposals');
  
  React.useEffect(() => {
    if (!isBrandRole) {
      Alert.alert('Access Denied', 'This page is only available for brands.', [
        { text: 'OK', onPress: () => navigation?.goBack() }
      ]);
    }
  }, [isBrandRole]);
  const [selectedFilters, setSelectedFilters] = useState({
    platform: 'All',
    priceRange: 'All',
    followers: 'All',
    rating: 'All'
  });

  const sortOptions = [
    'Best Match',
    'Price: Low to High',
    'Price: High to Low',
    'Followers: High to Low',
    'Rating: High to Low',
    'Newest First'
  ];

  const handleSortPress = () => {
    setShowSortDropdown(!showSortDropdown);
  };

  const selectSortOption = (option) => {
    setSelectedSort(option);
    setShowSortDropdown(false);
  };

  const filterOptions = {
    platform: ['All', 'Instagram', 'TikTok', 'YouTube', 'Twitter'],
    priceRange: ['All', 'Under $100', '$100 - $300', '$300 - $500', 'Over $500'],
    followers: ['All', 'Under 10k', '10k - 100k', '100k - 1M', 'Over 1M'],
    rating: ['All', '4.5+ Stars', '4.0+ Stars', '3.5+ Stars', 'New Creators']
  };

  const handleFilterPress = () => {
    setShowFilterDropdown(!showFilterDropdown);
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
      followers: 'All',
      rating: 'All'
    });
  };


  // Fetch campaign details if not passed via route params
  const fetchCampaignDetails = async () => {
    if (!campaignId) {
      setCampaignLoading(false);
      return;
    }
    try {
      const response = await import('../services/campaigns').then(m => m.getCampaignDetails(campaignId));
      if (response && response.data) {
        setCampaign(response.data);
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setCampaignLoading(false);
    }
  };

  const fetchProposals = async () => {
    if (!campaignId) {
      setLoading(false);
      setProposals([]); // Ensure proposals is always an array
      return;
    }
    try {
      const response = await import('../services/proposals').then(m => m.getCampaignProposals(campaignId));
      if (response && response.data) {
        // Handle different response structures - similar to campaigns pattern
        // API might return: { data: [...] } or { data: { proposals: [...] } }
        const proposalsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.proposals || response.data.items || []);
        setProposals(proposalsData);
      } else {
        setProposals([]); // Ensure proposals is always an array
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setProposals([]); // On error, set to empty array
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    if (!initialCampaign && campaignId) {
      fetchCampaignDetails();
    }
    if (campaignId) {
      fetchProposals();
    }
  }, [campaignId]);

  // Refresh proposals when screen gains focus (following campaign pattern)
  React.useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      if (campaignId) {
        fetchProposals();
      }
    });
    return unsubscribe;
  }, [navigation, campaignId]);

  const handleHire = (proposal) => {
    // ALWAYS navigate to checkout screen for proposal acceptance
    // Backend requires paymentMethodId for all proposals (even in-kind)
    const proposalId = proposal?._id || proposal?.id;
    
    if (!proposalId) {
      Alert.alert('Error', 'Proposal ID not available');
      return;
    }

    // Get currency from campaign (campaigns define the currency, proposals inherit it)
    const currency = campaign?.currency || 'USD';

    // Navigate to checkout screen - it will handle payment method selection
    navigation?.navigate('Checkout', {
      proposalId,
      proposal: proposal,
      currency,
    });
  };

  const handleReject = async (proposalId) => {
    Alert.alert(
      'Reject Proposal',
      'Are you sure you want to reject this proposal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const proposalsService = await import('../services/proposals');
              await proposalsService.rejectProposal(proposalId);
              Alert.alert('Success', 'Proposal rejected successfully.');
              fetchProposals();
            } catch (error) {
              console.error('Error rejecting proposal:', error);
              Alert.alert('Error', 'Failed to reject proposal. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={[styles.scrollView, isBrandRole && { paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Proposals</Text>
          <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
            <MaterialIcons name="tune" size={24} color="#2d3748" />
          </TouchableOpacity>
        </View>

        {/* Campaign Details Card */}
        <View style={styles.campaignCard}>
          <Text style={styles.campaignLabel}>CAMPAIGN</Text>
          <Text style={styles.campaignTitle}>
            {campaignLoading ? 'Loading...' : (campaign?.title || campaign?.name || 'Campaign')}
          </Text>
          <View style={styles.campaignDetails}>
            <MaterialIcons name="local-offer" size={16} color="#6b7280" />
            <Text style={styles.budgetText}>
              {campaign?.budgetRange 
                ? `$${campaign.budgetRange.min} - $${campaign.budgetRange.max}` 
                : campaign?.budget 
                  ? `$${campaign.budget}` 
                  : 'Negotiable'}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusTag, 
              { backgroundColor: (campaign?.status === 'open' || campaign?.status === 'active') ? '#10b981' : '#f59e0b' }
            ]}>
              <Text style={styles.statusText}>
                {campaign?.status 
                  ? (campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)) 
                  : 'Open'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bids Received Section */}
        <View style={styles.bidsHeaderContainer}>
        <View style={styles.bidsHeader}>
            <View style={styles.bidsTitleContainer}>
              <Text style={styles.bidsTitle}>Bids Received</Text>
              <View style={styles.bidsCountBadge}>
                <Text style={styles.bidsCountText}>
                  {loading ? '-' : (Array.isArray(proposals) ? proposals.length : 0)}
                </Text>
              </View>
            </View>
          <TouchableOpacity style={styles.sortContainer} onPress={handleSortPress}>
            <Text style={styles.sortText}>Sort by: {selectedSort}</Text>
            <MaterialIcons
              name={showSortDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
          </View>
        </View>

        {/* Sort Dropdown */}
        {showSortDropdown && (
          <View style={styles.sortDropdown}>
            {sortOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.sortOption}
                onPress={() => selectSortOption(option)}
              >
                <Text style={[
                  styles.sortOptionText,
                  selectedSort === option && styles.sortOptionTextSelected
                ]}>
                  {option}
                </Text>
                {selectedSort === option && (
                  <MaterialIcons name="check" size={16} color="#464FE5" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Filter Dropdown */}
        {showFilterDropdown && (
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

            {/* Followers Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Followers</Text>
              <View style={styles.filterOptions}>
                {filterOptions.followers.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterOption,
                      selectedFilters.followers === option && styles.filterOptionSelected
                    ]}
                    onPress={() => selectFilterOption('followers', option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilters.followers === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rating Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Rating</Text>
              <View style={styles.filterOptions}>
                {filterOptions.rating.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterOption,
                      selectedFilters.rating === option && styles.filterOptionSelected
                    ]}
                    onPress={() => selectFilterOption('rating', option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilters.rating === option && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Apply Filters Button */}
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilterDropdown(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Proposals List */}
        <View style={styles.proposalsContainer}>
          {loading ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading proposals...</Text>
          ) : (!proposals || !Array.isArray(proposals) || proposals.length === 0) ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#6b7280' }}>No proposals received yet.</Text>
          ) : (
            proposals.map((proposal) => {
              // Handle creatorId - can be object (populated) or string ID (following campaign pattern)
              const creator = proposal.creatorId && typeof proposal.creatorId === 'object' 
                ? proposal.creatorId 
                : (proposal.creator || {});
              const creatorId = creator._id || creator.id || proposal.creatorId;
              const creatorMetrics = proposal.creatorMetrics || {};
              
              return (
                <TouchableOpacity
                  key={proposal._id || proposal.id}
                  style={styles.proposalCard}
                  onPress={() => navigation?.navigate('ProposalDetails', { proposal, campaign })}
                  activeOpacity={0.7}
                >
                  {/* Creator Profile Header */}
                  <View style={styles.profileSection}>
                    <View style={styles.creatorInfo}>
                      <View style={styles.avatar}>
                        {creator.profileImage ? (
                          <Image source={{ uri: creator.profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>{(creator.name?.[0] || 'U').toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.creatorDetails}>
                        <Text style={styles.creatorName}>{creator.name || 'Unknown Creator'}</Text>
                        <Text style={styles.creatorUsername}>
                          {creator.email || (creator.username && creator.username !== '@username' ? creator.username : '')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.compensationContainer}>
                      {proposal.compensation?.type === 'product' ? (
                        <View style={styles.freeProductBadge}>
                          <MaterialIcons name="card-giftcard" size={18} color="#10b981" />
                          <Text style={styles.freeProductText}>In-kind</Text>
                        </View>
                      ) : (
                        <View style={styles.compensationBadge}>
                        <Text style={styles.compensationAmount}>
                          {(() => {
                            const campaignCurrency = campaign?.currency || 'USD';
                            const currencySymbol = campaignCurrency === 'USD' ? '$' : '₦';
                            return `${currencySymbol}${proposal.compensation?.amount || 0}`;
                          })()}
                        </Text>
                      <Text style={styles.compensationType}>{proposal.compensation?.type === 'fixed_price' ? 'Fixed Price' : proposal.compensation?.type || 'Other'}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Proposal Text */}
                  <View style={styles.proposalTextContainer}>
                    <Text style={styles.proposalText} numberOfLines={3}>
                      {proposal.message || 'No proposal message provided'}
                    </Text>
                  </View>

                  {/* Metrics */}
                  <View style={styles.metricsContainer}>
                    <View style={styles.metricItem}>
                      <View style={styles.metricIconContainer}>
                        <MaterialIcons name="people" size={18} color="#464FE5" />
                      </View>
                      <View style={styles.metricTextContainer}>
                        <Text style={styles.metricLabel}>Followers</Text>
                        <Text style={styles.metricText}>
                          {creatorMetrics.totalFollowers ? 
                            (creatorMetrics.totalFollowers > 1000 
                              ? `${(creatorMetrics.totalFollowers / 1000).toFixed(1)}K` 
                              : creatorMetrics.totalFollowers) 
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.metricItem}>
                      <View style={styles.metricIconContainer}>
                        <MaterialIcons name="star" size={18} color="#fbbf24" />
                      </View>
                      <View style={styles.metricTextContainer}>
                        <Text style={styles.metricLabel}>Rating</Text>
                        <Text style={styles.metricText}>
                          {creatorMetrics.rating || creator.averageRating || creator.rating || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    {proposal.createdAt && (
                      <View style={styles.metricItem}>
                        <View style={styles.metricIconContainer}>
                          <MaterialIcons name="schedule" size={18} color="#6b7280" />
                        </View>
                        <View style={styles.metricTextContainer}>
                          <Text style={styles.metricLabel}>Submitted</Text>
                          <Text style={styles.metricText}>
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => navigation?.navigate('Messages', { userId: creatorId, recipientName: creator.name })}
                    >
                      <MaterialIcons name="chat-bubble" size={18} color="#0284c7" />
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(proposal._id || proposal.id)}
                    >
                      <MaterialIcons name="close" size={18} color="#dc2626" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.hireButton}
                      onPress={() => handleHire(proposal)}
                    >
                      <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                      <Text style={styles.hireButtonText}>Hire Creator</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Bottom Tab Navigation - Only show for Brand role */}
      {isBrandRole && (
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
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80, // Add padding to prevent content from being hidden behind tabs
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
  filterButton: {
    padding: 4,
  },
  campaignCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  campaignTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  campaignDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusTag: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  bidsHeaderContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  bidsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bidsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bidsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  bidsCountBadge: {
    backgroundColor: '#464FE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  bidsCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 4,
  },
  sortDropdown: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#2d3748',
  },
  sortOptionTextSelected: {
    color: '#464FE5',
    fontWeight: '600',
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
  proposalsContainer: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  proposalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  proposalTextContainer: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  proposalText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#464FE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 2,
  },
  creatorUsername: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
    marginTop: 2,
  },
  compensationContainer: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  compensationBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  compensationAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 2,
  },
  compensationType: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freeProductBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
    gap: 6,
  },
  freeProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  metricIconContainer: {
    marginRight: 8,
  },
  metricTextContainer: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricText: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 0.3,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.3,
  },
  hireButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#464FE5',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#464FE5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  hireButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
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

export default Proposals;
