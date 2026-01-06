import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
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

const BrandProfile = ({ navigation, route }) => {
    const [activeTab, setActiveTab] = useState('Account');
    const [profile, setProfile] = useState(null);

    React.useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await import('../services/user').then(m => m.getMyProfile());
                if (response && response.data) {
                    setProfile(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch brand profile", error);
            }
        };
        fetchProfile();
        const unsubscribe = navigation?.addListener?.('focus', fetchProfile);
        return unsubscribe;
    }, [navigation]);

    const handleEditProfile = () => {
        navigation?.navigate('EditProfile', { role: 'Brand' });
    };

    const handleDrawer = () => {
        if (navigation?.openDrawer) {
            navigation.openDrawer();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.menuButton} onPress={handleDrawer}>
                        <MaterialIcons name="menu" size={24} color="#2d3748" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Brand Profile</Text>
                    <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                        <MaterialIcons name="edit" size={24} color="#464FE5" />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileImageContainer}>
                        {profile?.profileImage ? (
                            <Image
                                source={{ uri: profile.profileImage }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={[styles.profileImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                                <MaterialIcons name="business" size={40} color="#9CA3AF" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.companyName}>{profile?.companyName || profile?.name || 'Brand Name'}</Text>
                    <Text style={styles.companyEmail}>{profile?.email || 'No email provided'}</Text>
                    <View style={styles.industryBadge}>
                        <Text style={styles.industryText}>{profile?.industry || 'Industry'}</Text>
                    </View>
                </View>

                {/* Stats Section */}
                <View style={styles.statsSection}>
                    <View style={styles.statBox}>
                        <MaterialIcons name="campaign" size={32} color="#464FE5" />
                        <Text style={styles.statNumber}>{profile?.campaignCount || 0}</Text>
                        <Text style={styles.statLabel}>Total Campaigns</Text>
                    </View>
                    <View style={styles.statBox}>
                        <MaterialIcons name="trending-up" size={32} color="#10b981" />
                        <Text style={styles.statNumber}>{profile?.activeCampaignCount || 0}</Text>
                        <Text style={styles.statLabel}>Active Campaigns</Text>
                    </View>
                    <View style={styles.statBox}>
                        <MaterialIcons name="people" size={32} color="#f59e0b" />
                        <Text style={styles.statNumber}>{profile?.hiredCount || 0}</Text>
                        <Text style={styles.statLabel}>Creators Hired</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Account' && styles.activeTab]}
                        onPress={() => setActiveTab('Account')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Account' && styles.activeTabText]}>
                            Account Details
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Payment' && styles.activeTab]}
                        onPress={() => setActiveTab('Payment')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Payment' && styles.activeTabText]}>
                            Payment Info
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Account Details Tab */}
                {activeTab === 'Account' && (
                    <View style={styles.contentSection}>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="business" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Company Name</Text>
                                    <Text style={styles.infoValue}>{profile?.companyName || profile?.name || 'N/A'}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="email" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Business Email</Text>
                                    <Text style={styles.infoValue}>{profile?.email || 'N/A'}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="phone" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Phone Number</Text>
                                    <Text style={styles.infoValue}>{profile?.phone || 'N/A'}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="language" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Website</Text>
                                    <Text style={styles.infoValue}>{profile?.website || 'N/A'}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="category" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Industry</Text>
                                    <Text style={styles.infoValue}>{profile?.industry || 'N/A'}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="location-on" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Location</Text>
                                    <Text style={styles.infoValue}>
                                        {profile?.location ? (typeof profile.location === 'string' ? profile.location : `${profile.location.city || ''}, ${profile.location.state || ''}`) : 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Payment Info Tab */}
                {activeTab === 'Payment' && (
                    <View style={styles.contentSection}>
                        {profile?.paymentMethods && profile.paymentMethods.length > 0 ? (
                            profile.paymentMethods.map((method, index) => (
                                <View key={index} style={styles.infoCard}>
                                    <View style={styles.infoRow}>
                                        <MaterialIcons name="credit-card" size={20} color="#6b7280" />
                                        <View style={styles.infoContent}>
                                            <Text style={styles.infoLabel}>Payment Method</Text>
                                            <Text style={styles.infoValue}>
                                                {method.maskedNumber || method.accountNumber ? 
                                                    `•••• •••• •••• ${method.accountNumber?.slice(-4) || method.maskedNumber?.slice(-4) || ''}` : 
                                                    'N/A'}
                                            </Text>
                                            {method.type && (
                                                <Text style={styles.infoSubtext}>{method.type}</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="credit-card" size={20} color="#6b7280" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Payment Methods</Text>
                                        <Text style={styles.infoValue}>No payment methods added</Text>
                                        <Text style={styles.infoSubtext}>Add a payment method in wallet settings</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {profile?.billingAddress && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="account-balance" size={20} color="#6b7280" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Billing Address</Text>
                                        <Text style={styles.infoValue}>
                                            {profile.billingAddress.street || 'N/A'}
                                        </Text>
                                        <Text style={styles.infoSubtext}>
                                            {profile.billingAddress.city || ''}, {profile.billingAddress.state || ''} {profile.billingAddress.zipCode || ''}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {profile?.taxInfo && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="receipt" size={20} color="#6b7280" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Tax Information</Text>
                                        <Text style={styles.infoValue}>
                                            {profile.taxInfo.ein ? `EIN: ${profile.taxInfo.ein}` : 
                                             profile.taxInfo.taxId ? `Tax ID: ${profile.taxInfo.taxId}` : 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {profile?.subscription && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="star" size={20} color="#6b7280" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Subscription Plan</Text>
                                        <Text style={styles.infoValue}>
                                            {profile.subscription.plan || 'N/A'}
                                        </Text>
                                        {profile.subscription.renewalDate && (
                                            <Text style={styles.infoSubtext}>
                                                ${profile.subscription.amount || 0}/month • Renews on {new Date(profile.subscription.renewalDate).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        {profile?.totalSpent !== undefined && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="attach-money" size={20} color="#6b7280" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Total Spent</Text>
                                        <Text style={styles.infoValue}>
                                            ${profile.totalSpent.toLocaleString()}
                                        </Text>
                                        <Text style={styles.infoSubtext}>Lifetime spending</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleEditProfile}>
                        <MaterialIcons name="edit" size={20} color="#ffffff" />
                        <Text style={styles.primaryButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation?.navigate('Settings')}
                    >
                        <MaterialIcons name="settings" size={20} color="#464FE5" />
                        <Text style={styles.secondaryButtonText}>Account Settings</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    menuButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    editButton: {
        padding: 8,
    },
    profileCard: {
        backgroundColor: '#ffffff',
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    profileImageContainer: {
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#464FE5',
    },
    companyName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    companyEmail: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 12,
    },
    industryBadge: {
        backgroundColor: '#ede9fe',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    industryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7c3aed',
    },
    statsSection: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        paddingVertical: 24,
        paddingHorizontal: 16,
        marginBottom: 16,
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: 16,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#464FE5',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    activeTabText: {
        color: '#464FE5',
    },
    contentSection: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoContent: {
        marginLeft: 12,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    infoSubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 2,
    },
    actionSection: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: '#464FE5',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginLeft: 8,
    },
    secondaryButton: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#464FE5',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#464FE5',
        marginLeft: 8,
    },
});

export default BrandProfile;
