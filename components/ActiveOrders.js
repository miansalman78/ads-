import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
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

const ActiveOrders = ({ navigation, route, insideAppNavigator = false }) => {
  const [activeTab, setActiveTab] = useState('Orders'); // Track active tab for bottom navigation
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const ordersService = await import('../services/orders');
        const response = await ordersService.getActiveOrders({ page: 1, limit: 50 });
        
        if (response && response.data) {
          const ordersData = Array.isArray(response.data) ? response.data : response.data.orders || response.data.items || [];
          setOrders(ordersData);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError(err.message || 'Failed to load orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    
    // Refresh when screen gains focus
    const unsubscribe = navigation?.addListener?.('focus', fetchOrders);
    return unsubscribe;
  }, [navigation]);

  // Helper function to map API order data to UI format
  const mapOrderToUI = (order) => {
    // Handle both populated objects and IDs - API returns populated brandId/creatorId
    const brand = order.brandId || order.brand || order.campaignId?.brandId || order.campaign?.brand || {};
    const creator = order.creatorId || order.creator || order.proposalId?.creatorId || order.proposal?.creator || {};
    const statusColors = {
      'pending': '#fbbf24',
      'in_progress': '#fbbf24',
      'awaiting_approval': '#10b981',
      'revisions': '#bfdbfe',
      'content_creation': '#fbcfe8',
      'review': '#fde68a',
      'completed': '#10b981',
      'cancelled': '#ef4444',
    };
    
    // Calculate progress based on status
    const progressMap = {
      'pending': 0,
      'in_progress': 50,
      'awaiting_approval': 100,
      'revisions': 85,
      'content_creation': 45,
      'review': 60,
      'completed': 100,
    };

    const status = order.status || 'pending';
    const dueDate = order.timeline?.dueDate || order.dueDate || order.endDate;
    const daysUntilDue = dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    
    return {
      id: order._id || order.id,
      title: order.campaignId?.name || order.campaign?.name || order.title || 'Untitled Order',
      company: brand.name || brand.companyName || 'Unknown Brand',
      status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      statusColor: statusColors[status] || '#6b7280',
      progress: progressMap[status] || 0,
      dueDate: daysUntilDue !== null 
        ? daysUntilDue > 0 
          ? `Due in ${daysUntilDue} days`
          : daysUntilDue === 0
          ? 'Due today'
          : `Overdue by ${Math.abs(daysUntilDue)} days`
        : 'No due date',
      participants: [
        { name: brand.name || 'Brand', avatar: brand.profileImage || null },
        { name: creator.name || 'Creator', avatar: creator.profileImage || null }
      ],
      actionText: status === 'awaiting_approval' ? 'View Details' : status === 'revisions' ? 'Chat' : 'View Brief',
      budget: order.compensation?.amount || order.payment?.amount || order.totalAmount || order.amount ? `$${order.compensation?.amount || order.payment?.amount || order.totalAmount || order.amount}` : 'N/A',
      deliverables: order.deliverables?.map(d => `${d.quantity || 1} ${d.type || 'item'}`).join(' + ') || 'N/A',
      description: order.brief || order.description || order.campaignId?.description || order.campaign?.description || 'No description',
      creatorName: creator.name || 'Unknown Creator',
      creatorUsername: creator.username ? `@${creator.username}` : '',
      creatorImage: creator.profileImage || null,
      // Keep original API data
      _original: order,
    };
  };

  // Check if order was just completed from route params
  useEffect(() => {
    const completedOrder = route?.params?.completedOrder;
    if (completedOrder) {
      // Navigate to LeaveReview screen with the completed order
      navigation?.navigate('LeaveReview', { order: completedOrder });
    }
  }, [route?.params?.completedOrder]);


  // Map orders to UI format
  const mappedOrders = orders.map(mapOrderToUI);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.openDrawer?.()}
          >
            <MaterialIcons name="menu" size={24} color="#2d3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Orders</Text>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation?.navigate('Notifications', { returnScreen: 'ActiveOrders' })}
          >
            <MaterialIcons name="notifications" size={24} color="#2d3748" />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#464FE5" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Orders List */}
        {!loading && !error && (
        <View style={styles.ordersContainer}>
            {mappedOrders.length > 0 ? (
              mappedOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
                  onPress={() => navigation?.navigate('OrderDetails', { order: order._original || order })}
              activeOpacity={0.7}
            >
              {/* Order Title, Company and Status in Same Row */}
              <View style={styles.orderHeaderRow}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderTitle}>{order.title}</Text>
                  <Text style={styles.companyName}>{order.company}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: order.statusColor }]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>

              {/* Timeline */}
              <View style={styles.timelineContainer}>
                <Text style={styles.timelineLabel}>Timeline</Text>
                <View style={styles.timelineBar}>
                  <View style={[
                    styles.timelineProgress,
                    {
                      width: `${order.progress}%`,
                      backgroundColor: order.progress === 100 ? '#10b981' : '#464FE5'
                    }
                  ]} />
                </View>
                <Text style={styles.dueDate}>{order.dueDate}</Text>
              </View>

              {/* Participants and Action Button in Same Row */}
              <View style={styles.participantsActionRow}>
                <View style={styles.participantsSection}>
                  <Text style={styles.participantsLabel}>Participants</Text>
                  <View style={styles.participantsRow}>
                    <View style={styles.avatarContainer}>
                      {order.participants.map((participant, index) => (
                        <View key={index} style={[styles.avatar, { marginLeft: index > 0 ? -8 : 0 }]}>
                          {participant.avatar && typeof participant.avatar === 'string' && participant.avatar.startsWith('http') ? (
                            <Image source={{ uri: participant.avatar }} style={styles.avatarImage} />
                          ) : (
                            <Text style={styles.avatarText}>
                              {participant.avatar || participant.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.participantsText}>
                      {order.participants.length > 0 ? `You & ${order.participants[0].name}` : 'Participants'}
                    </Text>
                  </View>
                </View>

                {order.status === 'completed' || order.status === 'Completed' ? (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation?.navigate('LeaveReview', { order });
                    }}
                  >
                    <Text style={styles.reviewButtonText}>Leave Review</Text>
                    <MaterialIcons name="star" size={16} color="#fbbf24" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (order.actionText === 'Chat') {
                        navigation?.navigate('Messages');
                      } else if (order.actionText === 'Review') {
                        navigation?.navigate('LeaveReview', { order });
                      } else if (order.actionText === 'View Brief' || order.actionText === 'View Details') {
                        // Navigate to OrderDetails with the order data
                        navigation?.navigate('OrderDetails', { order: order._original || order });
                      } else {
                        // Fallback to OrderDetails
                        navigation?.navigate('OrderDetails', { order: order._original || order });
                      }
                    }}
                  >
                    <Text style={styles.actionButtonText}>{order.actionText}</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#464FE5" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No active orders</Text>
                <Text style={styles.emptySubtext}>Your orders will appear here</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Navigation - Only show if NOT inside AppNavigator (for Brand role) */}
      {!insideAppNavigator && (
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
              // Already on Orders, do nothing
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
  notificationButton: {
    padding: 4,
  },
  ordersContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 90,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
  },
  timelineContainer: {
    marginBottom: 16,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  timelineBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: '#464FE5',
    borderRadius: 3,
  },
  dueDate: {
    fontSize: 14,
    color: '#2d3748',
    textAlign: 'right',
  },
  participantsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  participantsSection: {
    flex: 1,
    marginRight: 20,
  },
  participantsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 16,
  },
  participantsText: {
    fontSize: 14,
    color: '#2d3748',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dbeafe',
    minWidth: 60,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#464FE5',
    marginRight: 4,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#10b981',
    minWidth: 100,
  },
  completeButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
    marginRight: 4,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fbbf24',
    minWidth: 100,
  },
  reviewButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
    marginRight: 4,
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

export default ActiveOrders;
