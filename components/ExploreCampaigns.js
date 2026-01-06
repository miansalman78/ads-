import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
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

const ExploreCampaigns = ({ navigation, insideAppNavigator = false }) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchText, setSearchText] = useState('');

    const categories = ['All', 'Food', 'Tech', 'Health & Wellness', 'Fashion', 'Beauty', 'Travel', 'Fitness', 'Lifestyle', 'Gaming', 'Education'];

    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch campaigns on mount
    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                setLoading(true);
                const response = await import('../services/campaigns').then(m => m.browseCampaigns());
                if (response && response.data) {
                    // Map API response to component structure if needed
                    // Assuming API returns an array in response.data or response.data.campaigns
                    const remoteCampaigns = Array.isArray(response.data) ? response.data : (response.data.campaigns || []);
                    setCampaigns(remoteCampaigns.map(c => {
                        // Calculate days left from deadline
                        let daysLeft = 'N/A';
                        if (c.applicationDeadline || c.dueDate) {
                            const deadline = new Date(c.applicationDeadline || c.dueDate);
                            const today = new Date();
                            const diffTime = deadline - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            daysLeft = diffDays > 0 ? `${diffDays} days` : 'Expired';
                        }
                        
                        // Get platform icon
                        const platform = Array.isArray(c.platform) ? c.platform[0] : c.platform || 'instagram';
                        const platformLower = platform.toLowerCase();
                        let platformIcon = 'camera-alt';
                        if (platformLower.includes('youtube')) platformIcon = 'play-circle-outline';
                        else if (platformLower.includes('tiktok')) platformIcon = 'music-note';
                        else if (platformLower.includes('instagram')) platformIcon = 'camera-alt';
                        
                        // Get brand name
                        const brandName = c.brandId?.name || c.brandName || 'Brand';
                        const brandCategory = c.brandId?.category || c.brandCategory || 'General';
                        
                        // Get budget display
                        let budgetDisplay = 'Negotiable';
                        if (c.budget) {
                            budgetDisplay = `$${c.budget}`;
                        } else if (c.budgetRange) {
                            if (c.budgetRange.min && c.budgetRange.max) {
                                budgetDisplay = `$${c.budgetRange.min} - $${c.budgetRange.max}`;
                            } else if (c.budgetRange.min) {
                                budgetDisplay = `$${c.budgetRange.min}+`;
                            }
                        }
                        
                        return {
                            ...c,
                            id: c._id || c.id,
                            title: c.name || c.title || 'Untitled Campaign',
                            brandName: brandName,
                            brandCategory: brandCategory,
                            brandIcon: c.brandIcon || '🏢',
                            brandColor: c.brandColor || '#464FE5',
                            status: c.status || 'Open',
                            statusColor: (c.status === 'open' || c.status === 'Open') ? '#10b981' : '#f59e0b',
                            applied: `${c.proposalCount || c.applicantCount || 0} applied`,
                            daysLeft: daysLeft,
                            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                            platformIcon: platformIcon,
                            budget: budgetDisplay,
                            location: c.requirements?.location?.[0] || 'Remote',
                            followers: c.requirements?.followerRange?.range || 'Any',
                        };
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch campaigns", err);
                setError("Failed to load campaigns.");
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
    };

    const handleBidNow = (campaign) => {
        // Navigate directly to SubmitProposal (same as "Apply Now" button behavior)
        navigation?.navigate('SubmitProposal', { campaign });
    };


    const filteredCampaigns = campaigns.filter(campaign => {
        if (selectedCategory !== 'All' && campaign.brandCategory !== selectedCategory) return false;
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            const titleMatch = campaign.title?.toLowerCase().includes(searchLower);
            const brandMatch = campaign.brandName?.toLowerCase().includes(searchLower);
            const descMatch = campaign.description?.toLowerCase().includes(searchLower);
            if (!titleMatch && !brandMatch && !descMatch) return false;
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
                                navigation?.openDrawer?.();
                            } else {
                                navigation?.navigate('AppNavigator');
                            }
                        }}
                    >
                        <MaterialIcons
                            name={insideAppNavigator ? "menu" : "arrow-back"}
                            size={24}
                            color="#374151"
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Explore Campaigns</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <MaterialIcons name="search" size={20} color="#6b7280" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search campaigns..."
                            placeholderTextColor="#9ca3af"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                </View>

                {/* Summary Statistics */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Available Campaigns</Text>
                                <Text style={styles.summaryValue}>{filteredCampaigns.length}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Avg. Budget</Text>
                                <Text style={styles.summaryValue}>
                                    {filteredCampaigns.length > 0
                                        ? `$${Math.round(
                                            filteredCampaigns.reduce((sum, c) => {
                                                const budget = typeof c.budget === 'number' 
                                                    ? c.budget 
                                                    : typeof c.budget === 'string' 
                                                        ? parseInt(c.budget.replace(/[^0-9]/g, '')) || 0
                                                        : 0;
                                                return sum + budget;
                                            }, 0) / filteredCampaigns.length
                                        )}`
                                        : '$0'
                                    }
                                </Text>
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

                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading campaigns...</Text>
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
                                const fetchCampaigns = async () => {
                                    try {
                                        setLoading(true);
                                        const response = await import('../services/campaigns').then(m => m.browseCampaigns());
                                        if (response && response.data) {
                                            const remoteCampaigns = Array.isArray(response.data) ? response.data : (response.data.campaigns || []);
                                            setCampaigns(remoteCampaigns.map(c => {
                                                let daysLeft = 'N/A';
                                                if (c.applicationDeadline || c.dueDate) {
                                                    const deadline = new Date(c.applicationDeadline || c.dueDate);
                                                    const today = new Date();
                                                    const diffTime = deadline - today;
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    daysLeft = diffDays > 0 ? `${diffDays} days` : 'Expired';
                                                }
                                                
                                                const platform = Array.isArray(c.platform) ? c.platform[0] : c.platform || 'instagram';
                                                const platformLower = platform.toLowerCase();
                                                let platformIcon = 'camera-alt';
                                                if (platformLower.includes('youtube')) platformIcon = 'play-circle-outline';
                                                else if (platformLower.includes('tiktok')) platformIcon = 'music-note';
                                                else if (platformLower.includes('instagram')) platformIcon = 'camera-alt';
                                                
                                                const brandName = c.brandId?.name || c.brandName || 'Brand';
                                                const brandCategory = c.brandId?.category || c.brandCategory || 'General';
                                                
                                                let budgetDisplay = 'Negotiable';
                                                if (c.budget) {
                                                    budgetDisplay = `$${c.budget}`;
                                                } else if (c.budgetRange) {
                                                    if (c.budgetRange.min && c.budgetRange.max) {
                                                        budgetDisplay = `$${c.budgetRange.min} - $${c.budgetRange.max}`;
                                                    } else if (c.budgetRange.min) {
                                                        budgetDisplay = `$${c.budgetRange.min}+`;
                                                    }
                                                }
                                                
                                                return {
                                                    ...c,
                                                    id: c._id || c.id,
                                                    title: c.name || c.title || 'Untitled Campaign',
                                                    brandName: brandName,
                                                    brandCategory: brandCategory,
                                                    brandIcon: c.brandIcon || '🏢',
                                                    brandColor: c.brandColor || '#667eea',
                                                    status: c.status || 'Open',
                                                    statusColor: (c.status === 'open' || c.status === 'Open') ? '#10b981' : '#f59e0b',
                                                    applied: `${c.proposalCount || c.applicantCount || 0} applied`,
                                                    daysLeft: daysLeft,
                                                    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                                                    platformIcon: platformIcon,
                                                    budget: budgetDisplay,
                                                    location: c.requirements?.location?.[0] || 'Remote',
                                                    followers: c.requirements?.followerRange?.range || 'Any',
                                                };
                                            }));
                                        }
                                    } catch (err) {
                                        console.error("Failed to fetch campaigns", err);
                                        setError("Failed to load campaigns.");
                                    } finally {
                                        setLoading(false);
                                    }
                                };
                                fetchCampaigns();
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Campaigns List */}
                {!loading && !error && (
                <View style={styles.campaignsSection}>
                    {filteredCampaigns.length > 0 ? filteredCampaigns.map((campaign) => (
                        <TouchableOpacity
                            key={campaign.id}
                            style={styles.campaignCard}
                            onPress={() => handleBidNow(campaign)}
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
                                    <Text style={styles.bidButtonText}>Submit Proposal</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    )) : (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="campaign" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No campaigns found</Text>
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
        backgroundColor: '#f5f7fa',
    },
    scrollView: {
        flex: 1,
        paddingBottom: 80,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e8ecf0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a202c',
        flex: 1,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    placeholder: {
        width: 40,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: '#ffffff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#e8ecf0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#2d3748',
        marginLeft: 12,
        fontWeight: '500',
    },
    summarySection: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
    },
    summaryCard: {
        backgroundColor: '#464FE5',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#464FE5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
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
        fontSize: 13,
        color: '#ffffff',
        opacity: 0.95,
        marginBottom: 8,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    filtersSection: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
        backgroundColor: '#ffffff',
    },
    filtersScroll: {
        flexDirection: 'row',
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#f1f3f5',
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#e8ecf0',
    },
    filterChipSelected: {
        backgroundColor: '#464FE5',
        borderColor: '#464FE5',
        shadowColor: '#464FE5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    filterChipText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    filterChipTextSelected: {
        color: '#ffffff',
        fontWeight: '700',
    },
    campaignsSection: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 100,
    },
    campaignCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f0f2f5',
    },
    campaignHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    brandInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    brandIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    brandIconText: {
        fontSize: 20,
    },
    brandDetails: {
        flex: 1,
    },
    brandName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    brandCategory: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    statusTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    campaignTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: 10,
        lineHeight: 28,
        letterSpacing: -0.4,
    },
    campaignDescription: {
        fontSize: 15,
        color: '#64748b',
        lineHeight: 24,
        marginBottom: 20,
        fontWeight: '400',
    },
    campaignDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        gap: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f2f5',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    campaignMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: '#f0f2f5',
        borderBottomColor: '#f0f2f5',
        backgroundColor: '#fafbfc',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
    },
    metricLabel: {
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 6,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a202c',
        letterSpacing: -0.3,
    },
    metricText: {
        fontSize: 13,
        color: '#64748b',
        marginLeft: 4,
        fontWeight: '600',
    },
    campaignActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bidButton: {
        flex: 1,
        backgroundColor: '#464FE5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 10,
        shadowColor: '#464FE5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    bidButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    loadingContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    errorContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '500',
    },
    retryButton: {
        backgroundColor: '#464FE5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#464FE5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 20,
        color: '#1a202c',
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '400',
    },
});

export default ExploreCampaigns;
