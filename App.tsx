import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Text, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './context/AuthContext';
import { PAYMENT_CONFIG } from './config/payment.config';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import OnboardingScreen from './components/OnboardingScreen';
import ChooseRoleScreen from './components/ChooseRole';
import AppNavigator from './components/Navigator/AppNavigator';
import Dashboard from './components/Dashboard';
import CampaignDetails from './components/CampaignDetails';
import CreateCampaign from './components/CreateCampaign';
import CreateOffer from './components/CreateOffer';
import EditOffer from './components/EditOffer';
import ActiveOrders from './components/ActiveOrders';
import Proposals from './components/Proposals';
import ExploreOffers from './components/ExploreOffers';
import Wallet from './components/Wallet';
import Messages from './components/Messages';
import LeaveReview from './components/LeaveReview';
import CreatorProfile from './components/CreatorProfile';
import Campaigns from './components/Campaigns';
import ExploreCampaigns from './components/ExploreCampaigns';
import DashboardNew from './components/DashboardNew';
import CreatorsList from './components/CreatorsList';
import CreateAccount from './components/CreateAccount';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Notifications from './components/Notifications';
import Settings from './components/Settings';
import HelpSupport from './components/HelpSupport';
import Reviews from './components/Reviews';
import LegalInfo from './components/LegalInfo';
import EditProfile from './components/EditProfile';
import Drawer from './components/Drawer';
import OfferConfirmation from './components/OfferConfirmation';
import Inbox from './components/Inbox';
import OfferDetails from './components/OfferDetails';
import OrderDetails from './components/OrderDetails';
import ProposalDetails from './components/ProposalDetails';
import ChoosePrimaryRole from './components/ChoosePrimaryRole';
import CreatorDetailsSetup from './components/CreatorDetailsSetup';
import CreateFirstOffer from './components/CreateFirstOffer';
import SubmitProposal from './components/SubmitProposal';
import CheckoutScreen from './components/CheckoutScreen';
import PaymentMethodsScreen from './components/PaymentMethodsScreen';
import CreatorWalletPaymentMethodsScreen from './components/CreatorWalletPaymentMethodsScreen';
import ServicesManagement from './components/ServicesManagement';
import MyProposals from './components/MyProposals';
import TransactionDetails from './components/TransactionDetails';

type Screen =
  | 'SplashScreen'
  | 'Onboarding'
  | 'ChooseRole'
  | 'AppNavigator'
  | 'Dashboard'
  | 'Campaigns'
  | 'ExploreCampaigns'
  | 'CampaignDetails'
  | 'CreateCampaign'
  | 'CreateOffer'
  | 'EditOffer'
  | 'ActiveOrders'
  | 'Proposals'
  | 'ExploreOffers'
  | 'Wallet'
  | 'Messages'
  | 'Inbox'
  | 'LeaveReview'
  | 'CreatorProfile'
  | 'DashboardNew'
  | 'CreatorsList'
  | 'CreateAccount'
  | 'Login'
  | 'ForgotPassword'
  | 'Notifications'
  | 'Settings'
  | 'HelpSupport'
  | 'Reviews'
  | 'LegalInfo'
  | 'EditProfile'
  | 'OfferConfirmation'
  | 'OfferDetails'
  | 'OrderDetails'
  | 'ProposalDetails'
  | 'ChoosePrimaryRole'
  | 'CreatorDetailsSetup'
  | 'CreateFirstOffer'
  | 'SubmitProposal'
  | 'Checkout'
  | 'PaymentMethods'
  | 'CreatorWalletPaymentMethods'
  | 'ServicesManagement'
  | 'MyProposals'
  | 'TransactionDetails';

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentScreen, setCurrentScreen] = useState<Screen>('SplashScreen');
  const [screenHistory, setScreenHistory] = useState<Screen[]>(['SplashScreen']);
  const [screenParams, setScreenParams] = useState<Record<string, any>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appNavigatorActiveTab, setAppNavigatorActiveTab] = useState<string>('Home');
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get user role from stored user data on mount
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { getUser } = await import('./services/apiClient');
        const user = await getUser();
        if (user?.role) {
          const role = user.role.toLowerCase();
          setUserRole(role === 'brand' ? 'brand' : 'creator');
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      }
    };
    getUserRole();
  }, []);

  // Handle deep links for OAuth callbacks
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        console.log('[App] Deep link received:', url);

        // Check if it's a social media OAuth callback
        // Format: adpartnr://social/callback/instagram?code=...&state=...
        // or: adpartnr://social/callback/facebook?code=...&state=...
        if (url.includes('/social/callback/')) {
          const urlParts = url.split('/social/callback/');
          if (urlParts.length > 1) {
            const platformAndParams = urlParts[1];
            const [platform] = platformAndParams.split('?');

            // Extract query parameters
            const queryString = url.split('?')[1];
            const params = new URLSearchParams(queryString);
            const code = params.get('code');
            const state = params.get('state');

            console.log(`[App] OAuth callback for ${platform}`, { code: code?.substring(0, 20) + '...', state: state?.substring(0, 20) + '...' });

            // Backend handles the callback automatically via redirect URL
            // Just refresh user profile to get updated social connections
            try {
              const userService = await import('./services/user');
              const profile = await userService.getMyProfile();
              console.log('[App] Profile refreshed after OAuth callback');

              // You can show a success message or navigate to settings
              // For now, we'll just log - UI can handle refresh in Settings component
            } catch (error) {
              console.error('[App] Error refreshing profile after OAuth:', error);
            }
          }
        }
      } catch (error) {
        console.error('[App] Error handling deep link:', error);
      }
    };

    // Listen for deep links (React Native Linking)
    const { Linking } = require('react-native');

    // Handle deep link if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    }).catch((err) => {
      console.error('[App] Error getting initial URL:', err);
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Helper function to check user role
  const getCurrentRole = (params?: any): string | null => {
    return userRole?.toLowerCase() || params?.role?.toLowerCase() || null;
  };

  // Helper function to check if user has required role
  const checkRoleAccess = (requiredRole: 'brand' | 'creator', params?: any): boolean => {
    const currentRole = getCurrentRole(params);
    if (!currentRole) return false;
    if (requiredRole === 'brand') {
      return currentRole === 'brand';
    } else {
      return currentRole === 'creator' || currentRole === 'influencer';
    }
  };

  const navigation = {
    navigate: (screen: Screen, params?: any) => {
      setScreenHistory(prev => [...prev, currentScreen]);
      setScreenParams(prev => ({ ...prev, [screen]: params }));
      if (params?.role) {
        setUserRole(params.role);
      }
      if (params && Object.prototype.hasOwnProperty.call(params, 'token')) {
        setAuthToken(params.token || null);
      }
      setCurrentScreen(screen);
    },
    goBack: () => {
      if (screenHistory.length > 0) {
        const previousScreen = screenHistory[screenHistory.length - 1];
        if (previousScreen === 'AppNavigator') {
          const currentParams = screenParams[currentScreen];
          if (currentParams?.preservedTab) {
            setAppNavigatorActiveTab(currentParams.preservedTab);
          }
        }
        const newHistory = screenHistory.slice(0, -1);
        setScreenHistory(newHistory);
        setCurrentScreen(previousScreen);
      }
    },
    reset: (screen: Screen) => {
      setScreenHistory([screen]);
      setCurrentScreen(screen);
      if (screen === 'Onboarding' || screen === 'ChooseRole' || screen === 'Login') {
        setUserRole(null);
        setAuthToken(null);
      }
    },
    getParam: (key: string) => {
      return screenParams[currentScreen]?.[key];
    },
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
  };

  const renderScreen = () => {
    try {
      switch (currentScreen) {
        case 'SplashScreen':
          return <SplashScreen onAuthCheckComplete={async (isAuthenticated: boolean) => {
            if (isAuthenticated) {
              try {
                const { getUser } = await import('./services/apiClient');
                const user = await getUser();
                const userRole = user?.role?.toLowerCase();
                const creatorRole = user?.creatorRole?.toLowerCase();
                
                if (userRole === 'brand') {
                  navigation.navigate('DashboardNew', { role: 'Brand', user });
                } else if (userRole === 'creator' || userRole === 'influencer' || creatorRole === 'influencer' || creatorRole === 'creator') {
                  navigation.navigate('AppNavigator', { role: 'Creator', user });
                } else {
                  navigation.navigate('AppNavigator', { role: 'Creator', user });
                }
              } catch (error) {
                console.error('[App] Error getting user role after auth:', error);
                navigation.navigate('AppNavigator', { role: 'Creator' });
              }
            } else {
              navigation.navigate('Onboarding');
            }
          }} />;
        case 'Onboarding':
          return <OnboardingScreen navigation={navigation} />;
        case 'ChooseRole':
          return <ChooseRoleScreen navigation={navigation} />;
        case 'AppNavigator':
          const appNavigatorParams = screenParams['AppNavigator'] || {};
          return <AppNavigator
            navigation={navigation}
            route={{ params: { ...appNavigatorParams, initialTab: appNavigatorActiveTab } }}
            onTabChange={setAppNavigatorActiveTab}
          />;
        case 'Dashboard': {
          // Creator-only page - check role
          const params = screenParams['Dashboard'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <Dashboard navigation={navigation} route={{ params }} />;
        }
        case 'Campaigns': {
          // Brand-only page - check role
          const params = screenParams['Campaigns'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole !== 'brand') {
            // Redirect creator/influencer to their dashboard
            navigation.navigate('AppNavigator', { role: 'Creator' });
            return null;
          }
          return <Campaigns navigation={navigation} route={{ params }} />;
        }
        case 'ExploreCampaigns': {
          // Creator-only page (browse campaigns)
          const params = screenParams['ExploreCampaigns'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <ExploreCampaigns navigation={navigation} insideAppNavigator={false} />;
        }
        case 'CampaignDetails': {
          // Accessible to both - no role check needed
          const params = screenParams['CampaignDetails'] || {};
          return <CampaignDetails navigation={navigation} route={{ params }} />;
        }
        case 'CreateCampaign': {
          // Brand-only page - check role
          const params = screenParams['CreateCampaign'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole !== 'brand') {
            // Redirect creator/influencer to their dashboard
            navigation.navigate('AppNavigator', { role: 'Creator' });
            return null;
          }
          return <CreateCampaign navigation={navigation} route={{ params }} />;
        }
        case 'CreateOffer': {
          // Creator-only page - check role
          const params = screenParams['CreateOffer'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return (
            <>
              <CreateOffer navigation={navigation} route={{ params }} />
              <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                navigation={navigation}
                userRole={currentRole || 'Creator'}
                currentScreen="CreateOffer"
              />
            </>
          );
        }
        case 'EditOffer': {
          // Creator-only page - check role
          const params = screenParams['EditOffer'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return (
            <>
              <EditOffer navigation={navigation} route={{ params }} />
              <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                navigation={navigation}
                userRole={currentRole || 'Creator'}
                currentScreen="EditOffer"
              />
            </>
          );
        }
        case 'ActiveOrders': {
          // Accessible to both - no role check needed
          const params = screenParams['ActiveOrders'] || {};
          const currentRole = getCurrentRole(params);
          return (
            <>
              <ActiveOrders navigation={navigation} route={{ params }} />
              <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                navigation={navigation}
                userRole={currentRole || 'Creator'}
                currentScreen="ActiveOrders"
              />
            </>
          );
        }
        case 'Proposals': {
          // Brand-only page - check role
          const params = screenParams['Proposals'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase() || 'brand';
          if (currentRole !== 'brand') {
            // Redirect creator/influencer to their dashboard
            navigation.navigate('AppNavigator', { role: 'Creator' });
            return null;
          }
          return <Proposals navigation={navigation} route={{ params }} userRole={currentRole} />;
        }
        case 'ExploreOffers': {
          // Accessible to both brands and creators - brands can browse influencer offers
          const params = screenParams['ExploreOffers'] || {};
          return <ExploreOffers navigation={navigation} route={{ params }} />;
        }
        case 'Wallet':
          return <Wallet navigation={navigation} />;
        case 'Messages':
          return <Messages navigation={navigation} route={{ params: screenParams['Messages'] }} />;
        case 'Inbox':
          return <Inbox navigation={navigation} />;
        case 'LeaveReview':
          return <LeaveReview navigation={navigation} route={{ params: screenParams['LeaveReview'] }} />;
        case 'CreatorProfile': {
          // Allow brands to view creator profiles when userId is provided (viewing another creator)
          // Only redirect if brand is trying to view their own profile (no userId)
          const params = screenParams['CreatorProfile'] || {};
          const currentRole = getCurrentRole(params);
          const hasUserId = params?.userId; // If userId is provided, brand is viewing another creator
          
          if (currentRole === 'brand' && !hasUserId) {
            // Brand trying to view their own profile - redirect to dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          // Allow access if:
          // 1. User is creator/influencer (viewing own or other profile)
          // 2. User is brand but has userId (viewing another creator's profile)
          return (
            <>
              <CreatorProfile navigation={navigation} route={{ params }} />
              <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                navigation={navigation}
                userRole={currentRole || 'Creator'}
                currentScreen="CreatorProfile"
              />
            </>
          );
        }
        case 'DashboardNew': {
          // Brand-only page - check role
          const params = screenParams['DashboardNew'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole !== 'brand') {
            // Redirect creator/influencer to their dashboard
            navigation.navigate('AppNavigator', { role: 'Creator' });
            return null;
          }
          return <DashboardNew navigation={navigation} route={{ params }} />;
        }
        case 'CreatorsList': {
          // Brand-only page - check role
          const params = screenParams['CreatorsList'] || {};
          const currentRole = getCurrentRole(params);
          if (currentRole !== 'brand') {
            // Redirect creator/influencer to their dashboard
            navigation.navigate('AppNavigator', { role: 'Creator' });
            return null;
          }
          return <CreatorsList navigation={navigation} route={{ params }} />;
        }
        case 'CreateAccount':
          return <CreateAccount navigation={navigation} route={{ params: screenParams['CreateAccount'] }} />;
        case 'Login':
          return <Login navigation={navigation} route={{ params: screenParams['Login'] }} />;
        case 'ForgotPassword':
          return <ForgotPassword navigation={navigation} />;
        case 'Notifications':
          return <Notifications navigation={navigation} route={{ params: screenParams['Notifications'] }} />;
        case 'Settings':
          return <Settings navigation={navigation} route={{ params: screenParams['Settings'] }} />;
        case 'HelpSupport':
          return <HelpSupport navigation={navigation} route={{ params: screenParams['HelpSupport'] }} />;
        case 'Reviews':
          return <Reviews navigation={navigation} route={{ params: screenParams['Reviews'] }} />;
        case 'LegalInfo':
          return <LegalInfo navigation={navigation} route={{ params: screenParams['LegalInfo'] }} />;
        case 'EditProfile':
          return <EditProfile navigation={navigation} route={{ params: screenParams['EditProfile'] }} />;
        case 'OfferConfirmation':
          return <OfferConfirmation navigation={navigation} route={{ params: screenParams['OfferConfirmation'] }} />;
        case 'OfferDetails': {
          // Accessible to both - no role check needed (though creators can create/edit their own)
          const params = screenParams['OfferDetails'] || {};
          return <OfferDetails navigation={navigation} route={{ params }} />;
        }
        case 'OrderDetails': {
          // Accessible to both - no role check needed (actions differ by role, handled in component)
          const params = screenParams['OrderDetails'] || {};
          return <OrderDetails navigation={navigation} route={{ params }} />;
        }
        case 'ProposalDetails': {
          // Accessible to both - no role check needed
          const params = screenParams['ProposalDetails'] || {};
          return <ProposalDetails navigation={navigation} route={{ params }} />;
        }
        case 'ChoosePrimaryRole': {
          // Creator-only page - check role
          const params = screenParams['ChoosePrimaryRole'] || {};
          const currentRole = getCurrentRole(params);
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <ChoosePrimaryRole navigation={navigation} route={{ params }} />;
        }
        case 'CreatorDetailsSetup': {
          // Creator-only page - check role
          const params = screenParams['CreatorDetailsSetup'] || {};
          const currentRole = getCurrentRole(params);
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <CreatorDetailsSetup navigation={navigation} route={{ params }} />;
        }
        case 'CreateFirstOffer': {
          // Creator-only page - check role
          const params = screenParams['CreateFirstOffer'] || {};
          const currentRole = getCurrentRole(params);
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <CreateFirstOffer navigation={navigation} route={{ params }} />;
        }
        case 'SubmitProposal': {
          // Creator-only page - check role
          const params = screenParams['SubmitProposal'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <SubmitProposal navigation={navigation} route={{ params }} />;
        }
        case 'Checkout': {
          // Brand-only page - check role (only brands can make payments)
          const params = screenParams['Checkout'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole !== 'brand') {
            // Redirect creator/influencer to their dashboard
            navigation.navigate('AppNavigator', { role: 'Creator' });
            return null;
          }
          return <CheckoutScreen navigation={navigation} route={{ params }} />;
        }
        case 'PaymentMethods': {
          // Brand-only page - check role (only brands have payment methods for paying)
          const params = screenParams['PaymentMethods'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole !== 'brand') {
            // Redirect creator/influencer to their dashboard
            navigation.navigate('AppNavigator', { role: 'Creator' });
            return null;
          }
          return <PaymentMethodsScreen navigation={navigation} route={{ params }} />;
        }
        case 'CreatorWalletPaymentMethods': {
          // Creator-only page - check role (only creators have wallet payment methods for receiving)
          const params = screenParams['CreatorWalletPaymentMethods'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            // Redirect brand to their dashboard
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <CreatorWalletPaymentMethodsScreen navigation={navigation} route={{ params }} />;
        }
        case 'ServicesManagement': {
          const params = screenParams['ServicesManagement'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <ServicesManagement navigation={navigation} route={{ params }} />;
        }
        case 'MyProposals': {
          const params = screenParams['MyProposals'] || {};
          const currentRole = userRole?.toLowerCase() || params?.role?.toLowerCase();
          if (currentRole === 'brand') {
            navigation.navigate('DashboardNew', { role: 'Brand' });
            return null;
          }
          return <MyProposals navigation={navigation} route={{ params }} />;
        }
        case 'TransactionDetails': {
          const params = screenParams['TransactionDetails'] || {};
          return <TransactionDetails navigation={navigation} route={{ params }} />;
        }
        default:
          return <OnboardingScreen navigation={navigation} />;
      }
    } catch (error) {
      console.error('Error rendering screen:', error);
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Error loading screen. Check console for details.</Text>
        </View>
      );
    }
  };

  return (
    <ErrorBoundary>
      <StripeProvider publishableKey={PAYMENT_CONFIG.STRIPE_PUBLIC_KEY}>
        <SafeAreaProvider>
          <View style={styles.container}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            {renderScreen()}
          </View>
        </SafeAreaProvider>
      </StripeProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

const AppWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default AppWithAuth;
