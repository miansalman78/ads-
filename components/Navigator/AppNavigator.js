import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Dashboard from '../Dashboard';
import ExploreOffers from '../ExploreOffers';
import Messages from '../Messages';
import Inbox from '../Inbox';
import ActiveOrders from '../ActiveOrders';
import CreatorProfile from '../CreatorProfile';
import BrandProfile from '../BrandProfile';
import Drawer from '../Drawer';

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

const AppNavigator = ({ navigation, route, onTabChange }) => {
  // Get initial tab from route params or default to 'Home'
  const initialTab = route?.params?.initialTab || navigation?.getParam?.('initialTab') || 'Home';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get userRole from route params or navigation, default to 'Creator' if not provided
  const incomingRole = route?.params?.role || navigation?.getParam?.('role');
  const [userRole, setUserRole] = useState(incomingRole || 'Creator');

  // Update activeTab when route params change (when returning from another screen)
  useEffect(() => {
    const newInitialTab = route?.params?.initialTab;
    if (newInitialTab !== undefined && newInitialTab !== activeTab) {
      // Update if the route param changed
      // This handles the case when returning from another screen
      setActiveTab(newInitialTab);
    }
  }, [route?.params?.initialTab, activeTab]);

  useEffect(() => {
    const incomingRole = route?.params?.role || navigation?.getParam?.('role');
    if (incomingRole) {
      const normalizedRole = incomingRole.charAt(0).toUpperCase() + incomingRole.slice(1);
      console.log('AppNavigator - Setting userRole to:', normalizedRole);
      setUserRole(normalizedRole);
    }
  }, [route?.params?.role, navigation]);

  const handleTabPress = (tabName) => {
    setActiveTab(tabName);
    // Notify parent component of tab change to preserve state
    if (onTabChange) {
      onTabChange(tabName);
    }
  };

  // Create enhanced navigation that includes tab switching and drawer control
  const enhancedNavigation = {
    ...navigation,
    navigate: (screen, params) => {
      // Brand-only screens that creators should not access
      const brandOnlyScreens = ['DashboardNew', 'Campaigns', 'CreateCampaign', 'Proposals'];
      if (brandOnlyScreens.includes(screen) && userRole?.toLowerCase() !== 'brand') {
        console.warn(`Creator trying to access brand-only screen: ${screen}`);
        // Stay on current screen - don't navigate
        return;
      }

      // Creator-only screens that brands should not access
      const creatorOnlyScreens = ['ServicesManagement', 'MyProposals', 'Dashboard', 'ExploreCampaigns', 'SubmitProposal'];
      if (creatorOnlyScreens.includes(screen) && userRole?.toLowerCase() === 'brand') {
        console.warn(`Brand trying to access creator-only screen: ${screen}`);
        // Redirect to brand dashboard
        navigation.navigate('DashboardNew', { role: 'Brand' });
        return;
      }

      // If navigating to a tab screen, switch tabs
      if (screen === 'Dashboard') {
        const tab = 'Home';
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
      } else if (screen === 'ExploreOffers') {
        const tab = 'Offers';
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
      } else if (screen === 'Inbox') {
        const tab = 'Messages';
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
      } else if (screen === 'ActiveOrders') {
        const tab = 'Orders';
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
      } else if (screen === 'CreatorProfile') {
        const tab = 'Profile';
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
      } else if (screen === 'Messages' && activeTab === 'Messages') {
        // If already on Messages tab and navigating to Messages detail, use main navigation
        navigation?.navigate(screen, params);
      } else if (screen === 'Messages') {
        // If not on Messages tab, switch to it
        const tab = 'Messages';
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
      } else {
        // For other screens (like CampaignDetails, Notifications), use the main navigation
        // Preserve the current active tab so we can restore it when coming back
        // Store the current tab in parent state before navigating
        if (onTabChange) {
          onTabChange(activeTab);
        }
        navigation?.navigate(screen, {
          ...params,
          returnToAppNavigator: true,
          preservedTab: activeTab, // Store current tab to restore later
        });
      }
    },
    goBack: () => {
      // Use main navigation's goBack to properly restore previous screen
      if (navigation?.goBack) {
        navigation.goBack();
      }
    },
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <Dashboard navigation={enhancedNavigation} route={route} />;
      case 'Offers':
        return <ExploreOffers navigation={enhancedNavigation} insideAppNavigator={true} />;
      case 'Messages':
        return <Inbox navigation={enhancedNavigation} insideAppNavigator={true} />;
      case 'Orders':
        return <ActiveOrders navigation={enhancedNavigation} insideAppNavigator={true} />;
      case 'Profile':
        // Role-based profile rendering
        const isBrand = userRole?.toLowerCase() === 'brand';
        console.log('AppNavigator - Rendering Profile. UserRole:', userRole, 'isBrand:', isBrand);
        return isBrand ? (
          <BrandProfile navigation={enhancedNavigation} route={route} />
        ) : (
          <CreatorProfile navigation={enhancedNavigation} route={route} insideAppNavigator={true} />
        );
      default:
        return <Dashboard navigation={enhancedNavigation} route={route} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigation={navigation}
        userRole={userRole}
        currentScreen={activeTab === 'Messages' ? 'Inbox' : activeTab === 'Home' ? 'Dashboard' : activeTab === 'Orders' ? 'ActiveOrders' : activeTab === 'Profile' ? 'CreatorProfile' : 'AppNavigator'}
      />

      {/* Bottom Tab Navigation - Role-based tabs */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('Home')}
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

        {/* Conditional tab based on role */}
        {userRole?.toLowerCase() === 'brand' ? (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              navigation?.navigate('Campaigns', { role: userRole });
            }}
          >
            <MaterialIcons
              name="campaign"
              size={24}
              color={'#64748b'}
            />
            <Text style={styles.navText}>
              Campaigns
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              // Switch to Offers tab to show ExploreOffers screen
              handleTabPress('Offers');
            }}
          >
            <MaterialIcons
              name="local-offer"
              size={24}
              color={activeTab === 'Offers' ? '#464FE5' : '#64748b'}
            />
            <Text style={[
              styles.navText,
              activeTab === 'Offers' && styles.navTextActive
            ]}>
              Offers
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('Messages')}
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
          onPress={() => handleTabPress('Orders')}
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

        {/* Only show Profile tab for creators/influencers, not brands */}
        {userRole?.toLowerCase() !== 'brand' && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress('Profile')}
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
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenContainer: {
    flex: 1,
    paddingBottom: 80, // Add padding to prevent content from being hidden behind tabs
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

export default AppNavigator;

