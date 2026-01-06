import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { subscribeToConversations, markConversationAsRead } from '../services/chat';

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

const Inbox = ({ navigation, insideAppNavigator = false }) => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('Messages'); // Track active tab for bottom navigation
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useContext(AuthContext);

  // Get IDs from user object safely
  const userId = user?._id || user?.id;
  const userRole = user?.role?.toLowerCase() || 'creator';

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToConversations(userId, userRole, (newConversations) => {
      // Transform conversations for UI
      const formattedConversations = newConversations.map(conv => {
        // Determine other party details based on current user role
        const isBrand = userRole === 'brand';
        const otherName = isBrand ? conv.influencerName : conv.brandName;
        const otherAvatar = isBrand ? conv.influencerAvatar : conv.brandAvatar;
        const myUnreadCount = isBrand ? (conv.unreadCount?.brand || 0) : (conv.unreadCount?.influencer || 0);

        return {
          id: conv.id,
          name: otherName,
          subtitle: isBrand ? 'Creator' : 'Brand',
          avatar: otherAvatar || (isBrand ? '👩‍🎤' : '🏢'), // Default avatars
          lastMessage: conv.lastMessage || 'No messages yet',
          timestamp: getTimeAgo(conv.lastMessageTime),
          unreadCount: myUnreadCount,
          isUnread: myUnreadCount > 0,
          originalData: conv // Keep original data for passing to Messages
        };
      });

      setConversations(formattedConversations);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, userRole]);

  // Helper to format time
  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const msgDate = date instanceof Date ? date : new Date(date);
    const diffInSeconds = Math.floor((now - msgDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return msgDate.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return conv.name.toLowerCase().includes(searchLower) ||
      conv.lastMessage.toLowerCase().includes(searchLower);
  });

  const handleConversationPress = async (conversation) => {
    // Mark as read locally first (optional, for immediate feedback)
    // Actual update happens in background

    // Pass the correctly structured conversation object expected by Messages.js
    // We construct it from the transformed UI data + original IDs
    const navConversation = {
      id: conversation.id,
      name: conversation.name,
      avatar: conversation.avatar,
      subtitle: conversation.subtitle
      // Add IDs if needed by Messages.js (referencing originalData)
    };

    navigation?.navigate('Messages', { conversation: navConversation });

    // Mark as read in Firestore
    if (conversation.isUnread) {
      await markConversationAsRead(conversation.id, userRole);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.drawerButton}
          onPress={() => navigation?.openDrawer?.()}
        >
          <MaterialIcons name="menu" size={24} color="#2d3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation?.navigate('Notifications', { returnScreen: 'Inbox' })}
        >
          <MaterialIcons name="notifications" size={24} color="#2d3748" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#9E9E9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search brand or creator..."
            placeholderTextColor="#9E9E9E"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Conversation List */}
      {loading ? (
        <ActivityIndicator size="large" color="#464FE5" style={{ marginTop: 20 }} />
      ) : filteredConversations.length > 0 ? (
        <ScrollView style={[styles.conversationList, styles.scrollView]} showsVerticalScrollIndicator={false}>
          {filteredConversations.map((conversation, index) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationItem}
              onPress={() => handleConversationPress(conversation)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {conversation.avatar && conversation.avatar.length < 5 ? (
                  <Text style={styles.avatarText}>{conversation.avatar}</Text>
                ) : (
                  <Text style={[styles.avatarText, { fontSize: 18 }]}>{conversation.avatar.substring(0, 2).toUpperCase()}</Text>
                )}
              </View>

              {/* Content */}
              <View style={styles.conversationContent}>
                <View style={styles.nameRow}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.conversationName} numberOfLines={1}>
                      {conversation.name}
                    </Text>
                    {conversation.subtitle && (
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {conversation.subtitle}
                      </Text>
                    )}
                  </View>
                  <View style={styles.rightSection}>
                    <Text style={styles.timestamp}>{conversation.timestamp}</Text>
                    {conversation.isUnread && conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                    {conversation.isUnread && conversation.unreadCount === 0 && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                </View>
                <Text style={[
                  styles.lastMessage,
                  conversation.isUnread && { color: '#2d3748', fontWeight: '500' }
                ]} numberOfLines={1}>
                  {conversation.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        /* Empty State */
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>💬</Text>
          <Text style={styles.emptyStateTitle}>No messages yet</Text>
          <Text style={styles.emptyStateText}>
            Start by sending a proposal or accepting an offer.
          </Text>
        </View>
      )}

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
              // Already on Inbox (Messages), do nothing
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
    backgroundColor: '#ffffff',
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
  drawerButton: {
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
    marginLeft: 12,
  },
  conversationList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDED',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  conversationContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#464FE5',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#464FE5',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
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

export default Inbox;

