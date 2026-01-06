import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// Import Ionicons - handle both ES6 and CommonJS
let Ionicons;
try {
  const IoniconsModule = require('react-native-vector-icons/Ionicons');
  Ionicons = IoniconsModule.default || IoniconsModule;
  if (typeof Ionicons !== 'function') {
    console.warn('Ionicons is not a function, creating fallback');
    Ionicons = ({ name, size, color, style }) => (
      <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
    );
  }
} catch (error) {
  console.error('Error importing Ionicons:', error);
  Ionicons = ({ name, size, color, style }) => (
    <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
  );
}

const Notifications = ({ navigation, route }) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "message",
      title: "New message from Brand X",
      description: "Hey! We're interested in your proposal...",
      timestamp: "2h ago",
      isRead: false,
      icon: "chatbubble-ellipses",
      color: "#464FE5",
    },
    {
      id: 2,
      type: "campaign",
      title: "Your bid was accepted",
      description: "Your bid on 'Summer Launch' campaign was accepted",
      timestamp: "5h ago",
      isRead: false,
      icon: "checkmark-circle",
      color: "#10B981",
    },
    {
      id: 3,
      type: "payment",
      title: "Payment received",
      description: "₦20,000 has been released to your wallet",
      timestamp: "1d ago",
      isRead: true,
      icon: "wallet",
      color: "#F59E0B",
    },
    {
      id: 4,
      type: "review",
      title: "New review received",
      description: "Brand Y left a 5-star review for your work",
      timestamp: "2d ago",
      isRead: true,
      icon: "star",
      color: "#8B5CF6",
    },
    {
      id: 5,
      type: "campaign",
      title: "Campaign deadline reminder",
      description: "Your 'Winter Collection' campaign ends in 2 days",
      timestamp: "3d ago",
      isRead: true,
      icon: "time",
      color: "#EF4444",
    },
    {
      id: 6,
      type: "message",
      title: "New message from Creator Z",
      description: "I've completed the deliverables for...",
      timestamp: "1w ago",
      isRead: true,
      icon: "chatbubble-ellipses",
      color: "#464FE5",
    },
  ]);

  const filters = ["All", "Messages", "Campaigns", "Payments", "Reviews"];

  const filteredNotifications = activeFilter === "All" 
    ? notifications 
    : notifications.filter(notif => {
        if (activeFilter === "Messages") return notif.type === "message";
        if (activeFilter === "Campaigns") return notif.type === "campaign";
        if (activeFilter === "Payments") return notif.type === "payment";
        if (activeFilter === "Reviews") return notif.type === "review";
        return true;
      });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationPress = (notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );

    // Navigate based on type
    switch (notification.type) {
      case "message":
        navigation?.navigate('Messages');
        break;
      case "campaign":
        navigation?.navigate('CampaignDetails');
        break;
      case "payment":
        navigation?.navigate('Wallet');
        break;
      case "review":
        navigation?.navigate('LeaveReview');
        break;
      default:
        break;
    }
  };

  const handleMarkAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleRefresh = () => {
    // TODO: Fetch new notifications from backend
    console.log("Refreshing notifications...");
  };

  const formatTimestamp = (timestamp) => {
    return timestamp;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          // Check returnScreen parameter to navigate back to the correct screen
          const returnScreen = route?.params?.returnScreen || navigation?.getParam?.('returnScreen');
          if (returnScreen === 'ActiveOrders') {
            navigation?.navigate('AppNavigator', { initialTab: 'Orders' });
          } else if (returnScreen === 'Inbox') {
            navigation?.navigate('AppNavigator', { initialTab: 'Messages' });
          } else if (returnScreen === 'CreateOffer') {
            navigation?.navigate('CreateOffer');
          } else if (navigation?.goBack) {
            navigation.goBack();
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={styles.headerIcon}>
            <Ionicons name="refresh" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={[styles.headerIcon, { marginLeft: 12 }]}>
              <Ionicons name="checkmark-done" size={24} color="#464FE5" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter && styles.filterTextActive
              ]}
            >
              {filter}
            </Text>
            {filter !== "All" && (
              <View style={[
                styles.filterBadge,
                activeFilter === filter && styles.filterBadgeActive
              ]}>
                <Text style={[
                  styles.filterBadgeText,
                  activeFilter === filter && styles.filterBadgeTextActive
                ]}>
                  {notifications.filter(n => {
                    if (filter === "Messages") return n.type === "message";
                    if (filter === "Campaigns") return n.type === "campaign";
                    if (filter === "Payments") return n.type === "payment";
                    if (filter === "Reviews") return n.type === "review";
                    return false;
                  }).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            You'll see updates about messages, campaigns, payments, and reviews here.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.isRead && styles.notificationItemUnread
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationContent}>
                <View style={[styles.iconContainer, { backgroundColor: `${notification.color}15` }]}>
                  <Ionicons 
                    name={notification.icon} 
                    size={24} 
                    color={notification.color} 
                  />
                </View>
                <View style={styles.notificationTextContainer}>
                  <View style={styles.notificationHeader}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.notificationTitleUnread
                    ]}>
                      {notification.title}
                    </Text>
                    {!notification.isRead && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                  <Text style={styles.notificationDescription} numberOfLines={2}>
                    {notification.description}
                  </Text>
                  <Text style={styles.timestamp}>
                    {formatTimestamp(notification.timestamp)}
                  </Text>
                </View>
              </View>
              <View style={styles.notificationActions}>
                {!notification.isRead && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="checkmark" size={20} color="#464FE5" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  style={[styles.actionButton, { marginLeft: 4 }]}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  headerActions: {
    flexDirection: "row",
  },
  headerIcon: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    maxHeight: height * 0.13,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
    minHeight: 48,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    marginRight: 6,
    height: 32,
  },
  filterButtonActive: {
    backgroundColor: "#464FE5",
    shadowColor: "#464FE5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.2,
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  filterBadge: {
    marginLeft: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeActive: {
    backgroundColor: "#FFFFFF",
    opacity: 0.3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    lineHeight: 12,
  },
  filterBadgeTextActive: {
    color: "#FFFFFF",
    opacity: 1,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationItemUnread: {
    backgroundColor: "#F0F7FF",
    borderLeftWidth: 3,
    borderLeftColor: "#464FE5",
  },
  notificationContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: "700",
    color: "#1a1a1a",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#464FE5",
    marginLeft: 8,
  },
  notificationDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  notificationActions: {
    flexDirection: "row",
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});

