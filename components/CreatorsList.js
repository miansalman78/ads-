import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const CreatorsList = ({ navigation, route }) => {
    const [searchText, setSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [bookmarkedCreators, setBookmarkedCreators] = useState(new Set());
    const [allCreators, setAllCreators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const categories = ['All', 'Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Fitness', 'Food', 'Travel'];

    // Map API category to UI category
    const mapCategoryToUI = (category) => {
        const categoryMap = {
            'fashion_beauty': 'Fashion',
            'beauty': 'Beauty',
            'lifestyle': 'Lifestyle',
            'tech_gadgets': 'Tech',
            'fitness_health': 'Fitness',
            'food_dining': 'Food',
            'travel': 'Travel',
        };
        return categoryMap[category] || category;
    };

    // Map UI category to API category
    const mapUIToCategory = (uiCategory) => {
        if (uiCategory === 'All') return null;
        const categoryMap = {
            'Fashion': 'fashion_beauty',
            'Beauty': 'beauty',
            'Lifestyle': 'lifestyle',
            'Tech': 'tech_gadgets',
            'Fitness': 'fitness_health',
            'Food': 'food_dining',
            'Travel': 'travel',
        };
        return categoryMap[uiCategory];
    };

    // Fetch creators from API
    useEffect(() => {
        fetchCreators();
    }, [selectedCategory]);

    const fetchCreators = async (pageNum = 1, append = false, searchQuery = searchText) => {
        try {
            setLoading(true);
            const userService = await import('../services/user');
            
            const params = {
                page: pageNum,
                limit: 20,
                sortBy: 'rating',
                sortOrder: 'desc',
            };

            // Add category filter if not 'All'
            const apiCategory = mapUIToCategory(selectedCategory);
            if (apiCategory) {
                params.category = apiCategory;
            }

            // Add search query if provided
            if (searchQuery && searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            const response = await userService.getCreators(params);
            
            // Filter to only show creators (exclude brands)
            if (response && response.success && response.data) {
                const creatorsData = response.data.creators || [];
                const filteredCreators = creatorsData.filter(creator => {
                    const role = creator.role || creator.userRole || '';
                    return role.toLowerCase() === 'creator' || role.toLowerCase() === 'influencer';
                });
                response.data.creators = filteredCreators;
            }

            if (response && response.success && response.data) {
                const creatorsData = response.data.creators || [];
                const pagination = response.data.pagination || {};

                // Transform API data to UI format
                const transformedCreators = creatorsData.map(creator => {
                    // Get primary platform metrics
                    const platformMetrics = creator.platformMetrics || [];
                    const primaryPlatform = platformMetrics[0] || {};
                    
                    // Calculate total followers
                    const totalFollowers = creator.totalFollowers || primaryPlatform.followers || 0;
                    const followersDisplay = totalFollowers > 1000000 
                        ? `${(totalFollowers / 1000000).toFixed(1)}M`
                        : totalFollowers > 1000
                        ? `${(totalFollowers / 1000).toFixed(0)}K`
                        : totalFollowers.toString();

                    // Calculate engagement rate
                    const engagementRate = creator.totalEngagementRate || primaryPlatform.engagementRate || 0;
                    const engagementDisplay = `${engagementRate.toFixed(1)}%`;

                    // Get location
                    const location = creator.location || {};
                    const locationDisplay = location.city && location.state
                        ? `${location.city}, ${location.state}`
                        : location.city || location.country || 'N/A';

                    // Get tags (use categories if tags not available)
                    const tags = creator.tags || creator.categories || [];
                    const primaryCategory = creator.categories?.[0] || tags[0] || 'General';

                    // Extract email - API response doesn't include email field currently
                    // TODO: Backend should include email in /api/users/creators response
                    // For now, email is not available in the creators list API response
                    const email = creator.email || creator.userEmail || creator.user?.email || null;

                    // Build social stats from platform metrics
                    const socialStats = {};
                    platformMetrics.forEach(metric => {
                        if (metric.platform && metric.followers) {
                            const count = metric.followers > 1000 
                                ? `${(metric.followers / 1000).toFixed(0)}K`
                                : metric.followers.toString();
                            socialStats[metric.platform] = count;
                        }
                    });

                    return {
                        id: creator.id || creator._id,
                        name: creator.name || 'Unknown',
                        email: email || 'Email not available',
                        location: locationDisplay,
                        image: creator.profileImage || creator.avatar || null,
                        tags: tags.slice(0, 3), // Limit to 3 tags
                        category: mapCategoryToUI(primaryCategory),
                        followers: followersDisplay,
                        engagement: engagementDisplay,
                        rating: creator.averageRating ? creator.averageRating.toFixed(1) : '0.0',
                        socialStats: socialStats,
                        _original: creator, // Keep original data for navigation
                    };
                });

                if (append) {
                    setAllCreators(prev => [...prev, ...transformedCreators]);
                } else {
                    setAllCreators(transformedCreators);
                }

                setHasMore(pagination.hasNextPage || false);
                setPage(pageNum);
            } else {
                if (!append) {
                    setAllCreators([]);
                }
                setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to fetch creators:', error);
            Alert.alert('Error', 'Failed to load creators. Please try again.');
            if (!append) {
                setAllCreators([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchCreators(page + 1, true);
        }
    };

    // Debounced search effect
    useEffect(() => {
        const searchTimer = setTimeout(() => {
            setPage(1);
            setAllCreators([]);
            fetchCreators(1, false, searchText);
        }, 500);

        return () => clearTimeout(searchTimer);
    }, [searchText]);

    const handleBack = () => {
        navigation?.goBack();
    };

    const handleSearch = (text) => {
        setSearchText(text);
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setPage(1);
        setAllCreators([]);
    };

    const handleBookmark = (creatorId) => {
        const newBookmarks = new Set(bookmarkedCreators);
        if (newBookmarks.has(creatorId)) {
            newBookmarks.delete(creatorId);
        } else {
            newBookmarks.add(creatorId);
        }
        setBookmarkedCreators(newBookmarks);
    };

    const handleViewProfile = (creator) => {
        const userId = creator._original?.id || creator._original?._id || creator.id;
        navigation?.navigate('CreatorProfile', { userId });
    };

    // Filter creators based on search (API handles category filtering, but we can do local search too)
    const filteredCreators = allCreators.filter(creator => {
        if (!searchText) return true;
        const searchLower = searchText.toLowerCase();
        return creator.name.toLowerCase().includes(searchLower) ||
            creator.email.toLowerCase().includes(searchLower) ||
            creator.tags.some(tag => tag.toLowerCase().includes(searchLower));
    });

    const renderCreator = ({ item }) => {
        // Helper to get initials for fallback avatar - use first and last name
        const getInitials = (name) => {
            if (!name) return '?';
            const parts = name.trim().split(' ').filter(p => p.length > 0);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        };

        return (
        <View style={styles.creatorCard}>
            <View style={styles.creatorHeader}>
                <View style={styles.creatorProfile}>
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.creatorImage} />
                    ) : (
                        <View style={[styles.creatorImage, { backgroundColor: '#464FE5', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>
                                {getInitials(item.name)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.creatorInfo}>
                        <Text style={styles.creatorName}>{item.name}</Text>
                        <Text style={styles.creatorUsername}>{item.email}</Text>
                        <View style={styles.creatorLocation}>
                            <MaterialIcons name="location-on" size={14} color="#6b7280" />
                            <Text style={styles.creatorLocationText}>{item.location}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.bookmarkButton}
                    onPress={() => handleBookmark(item.id)}
                >
                    <MaterialIcons
                        name={bookmarkedCreators.has(item.id) ? "bookmark" : "bookmark-border"}
                        size={20}
                        color="#6b7280"
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.creatorTags}>
                {item.tags.map((tag, index) => (
                    <View key={index} style={styles.creatorTag}>
                        <Text style={styles.creatorTagText}>{tag}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.creatorStats}>
                <View style={styles.creatorStatItem}>
                    <Text style={styles.creatorStatValue}>{item.followers}</Text>
                    <Text style={styles.creatorStatLabel}>Followers</Text>
                </View>
                <View style={styles.creatorStatItem}>
                    <Text style={styles.creatorStatValue}>{item.engagement}</Text>
                    <Text style={styles.creatorStatLabel}>Engagement</Text>
                </View>
                <View style={styles.creatorStatItem}>
                    <Text style={styles.creatorStatValue}>{item.rating}</Text>
                    <Text style={styles.creatorStatLabel}>Rating</Text>
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <MaterialIcons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Creators</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search creators..."
                        placeholderTextColor="#9ca3af"
                        value={searchText}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <MaterialIcons name="close" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Category Filters */}
            <View style={styles.filtersSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

            {/* Results Count */}
            <View style={styles.resultsSection}>
                <Text style={styles.resultsText}>
                    {filteredCreators.length} {filteredCreators.length === 1 ? 'Creator' : 'Creators'} Found
                </Text>
            </View>

            {/* Creators List */}
            {loading && allCreators.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#464FE5" />
                    <Text style={styles.loadingText}>Loading creators...</Text>
                </View>
            ) : filteredCreators.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="people-outline" size={64} color="#9ca3af" />
                    <Text style={styles.emptyText}>No creators found</Text>
                    <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredCreators}
                    renderItem={renderCreator}
                    keyExtractor={(item) => item.id?.toString() || item._original?._id || item._original?.id || Math.random().toString()}
                    contentContainerStyle={styles.creatorsList}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loading && allCreators.length > 0 ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color="#464FE5" />
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        position: 'relative',
    },
    backButton: {
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
        width: 40,
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    filtersSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
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
    resultsSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    resultsText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    creatorsList: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    creatorCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    creatorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    creatorProfile: {
        flexDirection: 'row',
        flex: 1,
    },
    creatorImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    creatorInfo: {
        flex: 1,
    },
    creatorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    creatorUsername: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    creatorLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    creatorLocationText: {
        fontSize: 12,
        color: '#6b7280',
    },
    bookmarkButton: {
        padding: 8,
    },
    creatorTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    creatorTag: {
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    creatorTagText: {
        fontSize: 12,
        color: '#7c3aed',
        fontWeight: '500',
    },
    creatorStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
    },
    creatorStatItem: {
        alignItems: 'center',
    },
    creatorStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    creatorStatLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    socialStats: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    socialStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    socialStatText: {
        fontSize: 12,
        color: '#6b7280',
    },
    viewProfileButton: {
        backgroundColor: '#464FE5',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    viewProfileButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#6b7280',
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default CreatorsList;
