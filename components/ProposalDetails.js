import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

// Import MaterialIcons
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

const ProposalDetails = ({ navigation, route }) => {
    const { user } = useAuth();
    const userRole = user?.role?.toLowerCase();
    const isBrand = userRole === 'brand';
    const isCreator = userRole === 'creator' || userRole === 'influencer';
    
    const [hiring, setHiring] = useState(false);
    const [loading, setLoading] = useState(true);
    const [creatorData, setCreatorData] = useState(null);
    const [rejecting, setRejecting] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    
    const { proposal, campaign, isMyProposal } = route?.params || {};
    
    // Extract creator from proposal - handle both populated object and ID
    const creatorFromProposal = (proposal?.creatorId && typeof proposal.creatorId === 'object') 
      ? proposal.creatorId 
      : (proposal?.creator || {});
    const creatorId = typeof proposal?.creatorId === 'string' 
      ? proposal.creatorId 
      : (creatorFromProposal?._id || creatorFromProposal?.id || proposal?.creatorId?._id || proposal?.creatorId?.id);
    
    useEffect(() => {
      const fetchCreatorData = async () => {
        if (!proposal) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          let finalCreator = creatorFromProposal;
          
          // If creatorId is a string, fetch creator profile
          if (creatorId && typeof creatorId === 'string') {
            try {
              const userService = await import('../services/user');
              const creatorResponse = await userService.getProfileByUserId(creatorId);
              if (creatorResponse && creatorResponse.data) {
                finalCreator = creatorResponse.data;
              }
            } catch (getProfileError) {
              console.error('[ProposalDetails] Error fetching creator profile:', getProfileError);
              // Fallback: try getCreators API
              try {
                const userService = await import('../services/user');
                const creatorsResponse = await userService.getCreators({ page: 1, limit: 100 });
                if (creatorsResponse && creatorsResponse.data) {
                  const creators = creatorsResponse.data.creators || [];
                  const foundCreator = creators.find(c => {
                    const cId = c.id || c._id;
                    return cId === creatorId || cId?.toString() === creatorId?.toString();
                  });
                  if (foundCreator) {
                    finalCreator = foundCreator;
                  }
                }
              } catch (fallbackError) {
                console.error('[ProposalDetails] Fallback fetch failed:', fallbackError);
              }
            }
          }
          
          setCreatorData(finalCreator);
        } catch (error) {
          console.error('[ProposalDetails] Error in fetchCreatorData:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchCreatorData();
    }, [proposal, creatorId]);
    
    // Prepare display data
    const creator = creatorData || creatorFromProposal;
    const creatorMetrics = proposal?.creatorMetrics || {};
    const platformMetrics = creator?.platformMetrics || [];
    const primaryPlatform = proposal?.proposedDeliverables?.[0]?.platform || platformMetrics[0]?.platform || 'instagram';
    
    // Calculate engagement rate
    let engagementRate = 'N/A';
    if (creatorMetrics.totalEngagementRate) {
      engagementRate = `${(creatorMetrics.totalEngagementRate * 100).toFixed(1)}%`;
    } else if (creator?.averageEngagementRate) {
      engagementRate = `${(creator.averageEngagementRate * 100).toFixed(1)}%`;
    }
    
    // Get followers count
    let followers = 'N/A';
    if (creatorMetrics.totalFollowers) {
      followers = creatorMetrics.totalFollowers > 1000 
        ? `${(creatorMetrics.totalFollowers / 1000).toFixed(1)}K` 
        : creatorMetrics.totalFollowers.toString();
    } else if (creator?.totalFollowers) {
      followers = creator.totalFollowers > 1000 
        ? `${(creator.totalFollowers / 1000).toFixed(1)}K` 
        : creator.totalFollowers.toString();
    }
    
    // Get rating (out of 5)
    let rating = 'N/A';
    if (creatorMetrics.rating || creator?.rating || creator?.averageRating) {
      const rawRating = creatorMetrics.rating || creator?.rating || creator?.averageRating;
      rating = rawRating > 5 ? (rawRating / 2).toFixed(1) : rawRating.toFixed(1);
    }
    
    // Platform icon
    const platformIconMap = {
      instagram: 'camera-alt',
      tiktok: 'music-note',
      youtube: 'play-circle-outline',
      facebook: 'facebook',
      twitter: 'chat',
    };
    const platformIcon = platformIconMap[primaryPlatform?.toLowerCase()] || 'camera-alt';
    
    // Get currency from campaign (campaigns define the currency, proposals inherit it)
    const campaignCurrency = campaign?.currency || 'USD';
    const currencySymbol = campaignCurrency === 'USD' ? '$' : '₦';
    
    const displayData = {
        id: proposal?._id || proposal?.id || 1,
        name: creator?.name || 'Unknown Creator',
        email: creator?.email || '',
        username: creator?.username || creator?.email || '@username',
        avatar: creator?.profileImage || creator?.avatar,
        proposal: proposal?.message || 'No proposal text requested.',
        compensation: proposal?.compensation?.type === 'product' 
          ? 'In-kind' 
          : (proposal?.compensation?.amount ? `${currencySymbol}${proposal.compensation.amount}` : 'N/A'),
        compensationType: proposal?.compensation?.type === 'fixed_price' ? 'Fixed Price' : proposal?.compensation?.type === 'product' ? 'Product' : 'Other',
        platform: primaryPlatform?.charAt(0).toUpperCase() + primaryPlatform?.slice(1) || 'Instagram',
        followers: followers,
        engagement: engagementRate,
        rating: rating,
        platformIcon: platformIcon
    };

    const handleStartChat = () => {
        const creatorIdForChat = creatorId || creator?._id || creator?.id;
        navigation?.navigate('Messages', {
            userId: creatorIdForChat,
            recipientName: displayData.name,
        });
    };

    const handleHireCreator = () => {
        // ALWAYS navigate to checkout screen for proposal acceptance
        // Backend requires paymentMethodId for all proposals (even in-kind)
        const proposalId = proposal?.id || proposal?._id || displayData.id;
        
        if (!proposalId) {
            Alert.alert('Error', 'Proposal ID not available');
            return;
        }

        // Get currency from campaign (campaigns define the currency, proposals inherit it)
        const currency = campaign?.currency || 'USD';

        // Navigate to checkout screen - it will handle payment method selection
        navigation?.navigate('Checkout', {
            proposalId,
            proposal: proposal || displayData,
            currency,
        });
    };

    const handleRejectProposal = async () => {
        const proposalId = proposal?.id || proposal?._id;
        
        if (!proposalId) {
            Alert.alert('Error', 'Proposal ID not available');
            return;
        }

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
                            setRejecting(true);
                            const proposalsService = await import('../services/proposals');
                            const response = await proposalsService.rejectProposal(proposalId);
                            
                            if (response && response.success) {
                                Alert.alert('Success', 'Proposal rejected successfully.', [
                                    { text: 'OK', onPress: () => navigation?.goBack() }
                                ]);
                            } else {
                                throw new Error(response?.message || 'Failed to reject proposal.');
                            }
                        } catch (error) {
                            console.error('[ProposalDetails] Error rejecting proposal:', error);
                            Alert.alert('Error', error.message || 'Failed to reject proposal. Please try again.');
                        } finally {
                            setRejecting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleWithdrawProposal = async () => {
        const proposalId = proposal?.id || proposal?._id;
        
        if (!proposalId) {
            Alert.alert('Error', 'Proposal ID not available');
            return;
        }

        Alert.alert(
            'Withdraw Proposal',
            'Are you sure you want to withdraw this proposal? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Withdraw',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setWithdrawing(true);
                            const proposalsService = await import('../services/proposals');
                            const response = await proposalsService.withdrawProposal(proposalId);
                            
                            if (response && response.success) {
                                Alert.alert('Success', 'Proposal withdrawn successfully.', [
                                    { text: 'OK', onPress: () => navigation?.goBack() }
                                ]);
                            } else {
                                throw new Error(response?.message || 'Failed to withdraw proposal.');
                            }
                        } catch (error) {
                            console.error('[ProposalDetails] Error withdrawing proposal:', error);
                            Alert.alert('Error', error.message || 'Failed to withdraw proposal. Please try again.');
                        } finally {
                            setWithdrawing(false);
                        }
                    },
                },
            ]
        );
    };
    
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#464FE5" />
                    <Text style={styles.loadingText}>Loading proposal details...</Text>
                </View>
            </SafeAreaView>
        );
    }
    
    if (!proposal) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
                        <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Proposal Details</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Proposal not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
                        <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Proposal Details</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Creator Profile */}
                <View style={styles.creatorSection}>
                    <View style={styles.creatorAvatar}>
                        {displayData.avatar ? (
                            <Image source={{ uri: displayData.avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{getInitials(displayData.name)}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.creatorName}>{displayData.name}</Text>
                    {displayData.email ? (
                        <Text style={styles.creatorEmail}>{displayData.email}</Text>
                    ) : displayData.username && displayData.username !== '@username' ? (
                        <Text style={styles.creatorUsername}>{displayData.username}</Text>
                    ) : null}
                </View>

                {/* Compensation */}
                <View style={styles.compensationSection}>
                    <Text style={styles.compensationLabel}>Proposed Budget</Text>
                    {proposal?.compensation?.type === 'product' ? (
                        <View style={styles.inKindContainer}>
                            <MaterialIcons name="card-giftcard" size={24} color="#10b981" />
                            <Text style={styles.inKindText}>In-kind</Text>
                        </View>
                    ) : (
                        <Text style={styles.compensationAmount}>{displayData.compensation}</Text>
                    )}
                    <Text style={styles.compensationType}>{displayData.compensationType}</Text>
                </View>

                {/* Proposal Text */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Proposal</Text>
                    <Text style={styles.proposalText}>{displayData.proposal}</Text>
                </View>

                {/* Creator Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Creator Stats</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <MaterialIcons name={displayData.platformIcon} size={24} color="#464FE5" />
                            <Text style={styles.statLabel}>Platform</Text>
                            <Text style={styles.statValue}>{displayData.platform}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <MaterialIcons name="group" size={24} color="#464FE5" />
                            <Text style={styles.statLabel}>Followers</Text>
                            <Text style={styles.statValue}>{displayData.followers}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <MaterialIcons name="favorite" size={24} color="#464FE5" />
                            <Text style={styles.statLabel}>Engagement</Text>
                            <Text style={styles.statValue}>{displayData.engagement}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <MaterialIcons name="star" size={24} color="#464FE5" />
                            <Text style={styles.statLabel}>Rating</Text>
                            <Text style={styles.statValue}>{displayData.rating}</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {isMyProposal && isCreator ? (
                        <>
                            <TouchableOpacity 
                                style={[styles.withdrawButton, withdrawing && styles.withdrawButtonDisabled]} 
                                onPress={handleWithdrawProposal}
                                disabled={withdrawing || proposal?.status?.toLowerCase() !== 'pending'}
                            >
                                {withdrawing ? (
                                    <ActivityIndicator size="small" color="#ef4444" />
                                ) : (
                                    <>
                                        <MaterialIcons name="cancel" size={20} color="#ef4444" />
                                        <Text style={styles.withdrawButtonText}>Withdraw</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : isBrand ? (
                        <>
                    <TouchableOpacity style={styles.chatButton} onPress={handleStartChat}>
                                <MaterialIcons name="chat-bubble" size={18} color="#0284c7" />
                        <Text style={styles.chatButtonText}>Start Chat</Text>
                    </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.rejectButton, rejecting && styles.rejectButtonDisabled]} 
                                onPress={handleRejectProposal}
                                disabled={rejecting}
                            >
                                {rejecting ? (
                                    <ActivityIndicator size="small" color="#dc2626" />
                                ) : (
                                    <>
                                        <MaterialIcons name="close" size={18} color="#dc2626" />
                                        <Text style={styles.rejectButtonText}>Reject</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.hireButton, hiring && styles.hireButtonDisabled]} 
                        onPress={handleHireCreator}
                        disabled={hiring}
                    >
                        {hiring ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <>
                                        <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                                <Text style={styles.hireButtonText}>Hire Creator</Text>
                            </>
                        )}
                    </TouchableOpacity>
                        </>
                    ) : null}
                </View>
            </ScrollView>

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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3748',
    },
    placeholder: {
        width: 32,
    },
    creatorSection: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    creatorAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#464FE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    creatorName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    creatorEmail: {
        fontSize: 15,
        color: '#4b5563',
        marginTop: 6,
        fontWeight: '500',
    },
    creatorUsername: {
        fontSize: 15,
        color: '#4b5563',
        marginTop: 6,
        fontWeight: '500',
    },
    compensationSection: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    compensationLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    compensationAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#10b981',
        marginBottom: 4,
    },
    compensationType: {
        fontSize: 14,
        color: '#6b7280',
    },
    inKindContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 4,
    },
    inKindText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#10b981',
    },
    section: {
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    proposalText: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 10,
        backgroundColor: '#fff',
        marginBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    chatButton: {
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
    chatButtonText: {
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
    rejectButtonDisabled: {
        opacity: 0.5,
        backgroundColor: '#f9fafb',
    },
    withdrawButton: {
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
    withdrawButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#dc2626',
        letterSpacing: 0.3,
    },
    withdrawButtonDisabled: {
        opacity: 0.5,
        backgroundColor: '#f9fafb',
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
    hireButtonDisabled: {
        opacity: 0.6,
        backgroundColor: '#9ca3af',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
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

export default ProposalDetails;
