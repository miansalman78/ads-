import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
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

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(p => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const CampaignDetails = ({ navigation, route }) => {
  const { user } = useAuth();
  const { campaign: initialCampaign, role: routeRole } = route.params || {};
  const [campaign, setCampaign] = useState(initialCampaign || null);
  const [loading, setLoading] = useState(!initialCampaign);
  const [proposalCount, setProposalCount] = useState(0);
  const [proposals, setProposals] = useState([]);
  
  // Determine role from route params or user context
  const userRole = user?.role?.toLowerCase();
  const role = routeRole || (userRole === 'brand' ? 'Brand' : 'Creator');
  const isBrand = role === 'Brand' || role === 'brand' || userRole === 'brand';

  useEffect(() => {
    const fetchDetails = async () => {
      const currentCampaign = initialCampaign || campaign;
      if (currentCampaign?.id || currentCampaign?._id) {
        try {
          const campaignId = currentCampaign.id || currentCampaign._id;
          console.log('[CampaignDetails] Fetching details for campaign ID:', campaignId, 'isBrand:', isBrand);
          
          const response = await import('../services/campaigns').then(m => m.getCampaignDetails(campaignId));
          let campaignData = null;
          if (response && response.data) {
            campaignData = response.data;
            setCampaign(campaignData);
          } else {
            campaignData = currentCampaign;
            if (!campaign) {
              setCampaign(campaignData);
            }
          }
          
          // Fetch proposals for brand users - always try if isBrand
          if (isBrand) {
            try {
              console.log('[CampaignDetails] Fetching proposals for campaign:', campaignId);
              const proposalsService = await import('../services/proposals');
              const proposalsResponse = await proposalsService.getCampaignProposals(campaignId, { page: 1, limit: 100 });
              console.log('[CampaignDetails] Proposals response:', proposalsResponse);
              
              if (proposalsResponse) {
                // Handle different response structures
                let proposalsData = [];
                let totalCount = 0;
                
                if (Array.isArray(proposalsResponse.data)) {
                  proposalsData = proposalsResponse.data;
                  totalCount = proposalsResponse.data.length;
                } else if (proposalsResponse.data) {
                  // Check for nested proposals array
                  proposalsData = proposalsResponse.data.proposals || proposalsResponse.data.items || proposalsResponse.data.data || [];
                  
                  // Get total count from pagination or array length
                  totalCount = proposalsResponse.data.pagination?.total 
                    || proposalsResponse.data.pagination?.totalItems
                    || proposalsResponse.data.pagination?.totalResults
                    || proposalsResponse.data.total 
                    || proposalsResponse.total
                    || proposalsData.length;
                }
                
                console.log('[CampaignDetails] Extracted proposals:', proposalsData.length, 'Total count:', totalCount);
                
                // Store proposals for display
                setProposals(proposalsData);
                setProposalCount(totalCount);
                
                if (totalCount === 0 && proposalsData.length === 0) {
                  console.log('[CampaignDetails] No proposals found, checking fallback');
                  // Fallback to campaign.proposalCount if available
                  const fallbackCount = campaignData?.proposalCount 
                    || campaignData?.applicantCount
                    || initialCampaign?.proposalCount 
                    || initialCampaign?.applicantCount
                    || 0;
                  if (fallbackCount > 0) {
                    setProposalCount(fallbackCount);
                    console.log('[CampaignDetails] Using fallback proposal count:', fallbackCount);
                  }
                }
              } else {
                console.log('[CampaignDetails] No proposals response data');
                setProposals([]);
                const fallbackCount = campaignData?.proposalCount 
                  || campaignData?.applicantCount
                  || initialCampaign?.proposalCount 
                  || initialCampaign?.applicantCount
                  || 0;
                setProposalCount(fallbackCount);
              }
            } catch (proposalError) {
              console.error('[CampaignDetails] Error fetching proposals:', proposalError);
              setProposals([]);
              // Fallback to campaign.proposalCount if available
              const fallbackCount = campaignData?.proposalCount 
                || campaignData?.applicantCount
                || initialCampaign?.proposalCount 
                || initialCampaign?.applicantCount
                || 0;
              setProposalCount(fallbackCount);
              console.log('[CampaignDetails] Using fallback proposal count after error:', fallbackCount);
            }
          } else {
            console.log('[CampaignDetails] Not a brand user, skipping proposal fetch. Role:', role, 'isBrand:', isBrand);
          }
        } catch (error) {
          console.error("Error fetching campaign details:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [initialCampaign?.id, initialCampaign?._id, role, isBrand]);


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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading campaign details...</Text>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Campaign not found</Text>
        <TouchableOpacity onPress={handleGoBack} style={{ marginTop: 20 }}>
          <Text style={{ color: '#464FE5' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Campaign Details</Text>
          {isBrand && campaign?.brandId && user?.id && (campaign.brandId === user.id || campaign.brandId?._id === user.id || campaign.brandId?.toString() === user.id?.toString()) && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                const campaignId = campaign.id || campaign._id;
                navigation?.navigate('CreateCampaign', { 
                  campaign: campaign,
                  campaignId: campaignId,
                  isEdit: true 
                });
              }}
            >
              <MaterialIcons name="edit" size={20} color="#464FE5" />
            </TouchableOpacity>
          )}
          {!isBrand && (
          <TouchableOpacity style={styles.bookmarkButton}>
            <View style={styles.bookmarkCircle}>
              <MaterialIcons name="bookmark-border" size={20} color="#2d3748" />
            </View>
          </TouchableOpacity>
          )}
        </View>

        {/* Hero Image */}
        <View style={styles.heroImageContainer}>
          <Image
            source={{ uri: campaign.media?.[0]?.url || 'https://via.placeholder.com/400x200' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Campaign Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.campaignTitle}>{campaign.title || campaign.name}</Text>
        </View>

        {/* Brand Information */}
        <View style={styles.brandContainer}>
          <Image
            source={{ uri: campaign.brandLogo || 'https://via.placeholder.com/50' }}
            style={styles.brandImage}
          />
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>{campaign.brandName || 'Brand Name'}</Text>
            <Text style={styles.brandTagline}>{campaign.brandCategory || 'Category'}</Text>
          </View>
        </View>

        {/* Budget & Platform Cards */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>BUDGET</Text>
            <Text style={styles.detailValue}>
              {campaign.budgetRange ? `$${campaign.budgetRange.min} - $${campaign.budgetRange.max}` : campaign.budget ? `$${campaign.budget}` : 'Negotiable'}
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>PLATFORM</Text>
            <View style={styles.platformRow}>
              {Array.isArray(campaign.platform) ? campaign.platform.map(p => (
                <MaterialIcons key={p} name={p.includes('tiktok') ? "music-note" : p.includes('youtube') ? "play-circle-outline" : "camera-alt"} size={20} color="#000" style={{ marginRight: 4 }} />
              )) : (
                <MaterialIcons name="music-note" size={20} color="#000" />
              )}
              <Text style={styles.detailValue}>{Array.isArray(campaign.platform) ? campaign.platform.join(', ') : campaign.platform || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {campaign.description}
          </Text>
        </View>

        {/* Deliverables Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliverables</Text>
          <View style={styles.deliverablesList}>
            {campaign.deliverables && campaign.deliverables.map((item, index) => (
              <View key={index} style={styles.deliverableItem}>
                <MaterialIcons name="check-circle" size={16} color="#464FE5" />
                <Text style={styles.deliverableText}>{item}</Text>
              </View>
            ))}
            {!campaign.deliverables && <Text style={styles.descriptionText}>Contact for deliverables</Text>}
          </View>
        </View>

        {/* Creator Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creator Requirements</Text>
          <View style={styles.requirementsContainer}>
            {campaign.requirements?.followerRange && (
              <View style={styles.requirementTag}>
                <Text style={styles.requirementText}>{campaign.requirements.followerRange.range || `${campaign.requirements.followerRange.min}-${campaign.requirements.followerRange.max}`}</Text>
              </View>
            )}
            {campaign.requirements?.niche && campaign.requirements.niche.map(n => (
              <View key={n} style={styles.requirementTag}>
                <Text style={styles.requirementText}>{n}</Text>
              </View>
            ))}
            {campaign.requirements?.location && campaign.requirements.location.map(l => (
              <View key={l} style={styles.requirementTag}>
                <Text style={styles.requirementText}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compensation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compensation</Text>
          <View style={styles.compensationContainer}>
            <View style={styles.compensationCard}>
              <MaterialIcons name="attach-money" size={20} color="#22c55e" />
              <Text style={styles.compensationText}>{campaign.compensationType === 'both' ? 'Paid & Product' : campaign.compensationType === 'paid' ? 'Paid Collaboration' : 'Product Gifting'}</Text>
            </View>
          </View>
        </View>

        {/* Proposals Section */}
        {/* Proposals Section / Action Section based on role */}
        {!isBrand ? (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => navigation?.navigate('Messages')} // Or specific chat
            >
              <Text style={styles.messageButtonText}>Message Brand</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => navigation?.navigate('SubmitProposal', { campaign })}
            >
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.proposalsHeader}>
              <Text style={styles.sectionTitle}>Proposals Received</Text>
              <View style={styles.proposalsBadge}>
                <Text style={styles.proposalsCount}>{proposalCount || campaign.proposalCount || 0}</Text>
              </View>
            </View>
            <Text style={styles.proposalsSubtitle}>
              {proposalCount || campaign.proposalCount || 0} creators have submitted proposals for this campaign
            </Text>
            
            {/* Proposal Preview Cards */}
            {proposals.length > 0 && (
              <View style={styles.proposalsPreviewContainer}>
                {proposals.slice(0, 3).map((proposal, index) => {
                  // Handle creatorId - can be object (populated) or string ID
                  const creator = (proposal.creatorId && typeof proposal.creatorId === 'object') 
                    ? proposal.creatorId 
                    : (proposal.creator || {});
                  const creatorName = creator.name || creator.username || 'Unknown Creator';
                  const creatorEmail = creator.email || '';
                  const creatorAvatar = creator.profileImage || creator.avatar;
                  
                  // Extract bid amount from compensation object (same structure as Proposals.js)
                  const bidAmount = proposal.compensation?.amount || proposal.bidAmount || proposal.amount || proposal.price || 0;
                  const pricingType = proposal.compensation?.type === 'fixed_price' 
                    ? 'Fixed Price' 
                    : proposal.compensation?.type === 'product' 
                    ? 'Product' 
                    : proposal.compensation?.type || proposal.pricingType || proposal.type || 'Fixed Price';
                  
                  return (
                    <View key={proposal._id || proposal.id || index} style={styles.proposalPreviewCard}>
                      <View style={styles.proposalPreviewHeader}>
                        {creatorAvatar ? (
                          <Image
                            source={{ uri: creatorAvatar }}
                            style={styles.proposalCreatorAvatar}
                          />
                        ) : (
                          <View style={[styles.proposalCreatorAvatar, styles.proposalCreatorAvatarPlaceholder]}>
                            <Text style={styles.proposalCreatorInitials}>{getInitials(creatorName)}</Text>
                          </View>
                        )}
                        <View style={styles.proposalCreatorInfo}>
                          <Text style={styles.proposalCreatorName}>{creatorName}</Text>
                          {creatorEmail && (
                            <Text style={styles.proposalCreatorEmail} numberOfLines={1}>
                              {creatorEmail}
                            </Text>
                          )}
                        </View>
                        <View style={styles.proposalBidAmount}>
                          {proposal.compensation?.type === 'product' ? (
                            <>
                              <View style={styles.freeProductContainer}>
                                <MaterialIcons name="card-giftcard" size={16} color="#10b981" />
                                <Text style={styles.freeProductText}>In-kind</Text>
                              </View>
                              <Text style={styles.proposalPricingType}>{pricingType}</Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.proposalBidAmountText}>
                                {(() => {
                                  const campaignCurrency = campaign?.currency || 'USD';
                                  const currencySymbol = campaignCurrency === 'USD' ? '$' : '₦';
                                  return `${currencySymbol}${typeof bidAmount === 'number' ? bidAmount.toFixed(0) : bidAmount}`;
                                })()}
                              </Text>
                              <Text style={styles.proposalPricingType}>{pricingType}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
                {proposals.length > 3 && (
                  <Text style={styles.proposalsMoreText}>
                    +{proposals.length - 3} more proposals
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={styles.viewProposalsButton}
              onPress={() => {
                const campaignId = campaign.id || campaign._id || initialCampaign?.id || initialCampaign?._id;
                navigation?.navigate('Proposals', { campaignId, campaign: campaign, role: 'Brand' });
              }}
            >
              <Text style={styles.viewProposalsText}>View All Proposals</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
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
  bookmarkButton: {
    padding: 4,
  },
  bookmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e6ecff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    padding: 4,
  },
  heroImageContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  titleContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  campaignTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    lineHeight: 32,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  brandImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 14,
    color: '#718096',
  },
  detailsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#e6ecff',
    padding: 16,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#464FE5',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  deliverablesList: {
    gap: 12,
  },
  deliverableItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliverableText: {
    fontSize: 14,
    color: '#4a5568',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementTag: {
    backgroundColor: '#e6ecff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  requirementText: {
    fontSize: 12,
    color: '#2d3748',
    fontWeight: '500',
  },
  compensationContainer: {
    gap: 12,
  },
  compensationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6ecff',
    padding: 17,
    borderRadius: 12,
  },
  compensationText: {
    fontSize: 14,
    color: '#2d3748',
    marginLeft: 12,
    fontWeight: '500',
  },
  proposalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  proposalsBadge: {
    backgroundColor: '#464FE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proposalsCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  proposalsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  viewProposalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#464FE5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  viewProposalsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  proposalsPreviewContainer: {
    marginBottom: 16,
    gap: 12,
  },
  proposalPreviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  proposalPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proposalCreatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  proposalCreatorAvatarPlaceholder: {
    backgroundColor: '#464FE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proposalCreatorInitials: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  proposalCreatorInfo: {
    flex: 1,
    marginRight: 8,
  },
  proposalCreatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  proposalCreatorEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  proposalBidAmount: {
    alignItems: 'flex-end',
  },
  proposalBidAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  proposalPricingType: {
    fontSize: 12,
    color: '#6b7280',
  },
  proposalsMoreText: {
    fontSize: 14,
    color: '#464FE5',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  freeProductContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  freeProductText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 40,
    marginTop: -24,
    gap: 12,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 15,

  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#464FE5',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 15,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default CampaignDetails;
