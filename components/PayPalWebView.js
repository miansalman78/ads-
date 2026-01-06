/**
 * PayPal Payment Handler Component
 * 
 * Handles PayPal payment redirect flow:
 * 1. Opens PayPal approval URL in device browser using Linking
 * 2. User approves payment in browser
 * 3. PayPal redirects back to app via deep link
 * 4. App handles deep link and extracts orderId and token
 * 5. Calls onSuccess callback with extracted values
 * 
 * Note: This component doesn't render a WebView. Instead, it:
 * - Opens PayPal URL in device browser
 * - Shows instructions to user
 * - Relies on deep link handling in App.tsx or navigation
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';

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

const PayPalWebView = ({
  approvalUrl,
  orderId, // Your database order ID (saved from createPaymentIntent)
  onSuccess, // Callback: (orderId, paypalOrderId) => void
  onCancel, // Callback: () => void
  onError, // Callback: (error) => void
}) => {
  const [opening, setOpening] = useState(false);

  // Handle deep link when app returns from browser
  useEffect(() => {
    // Set up deep link listener
    const handleDeepLink = (event) => {
      const url = event.url || event;
      
      // Check if this is a PayPal success redirect
      if (url.includes('/payments/paypal/success') || url.includes('token=')) {
        try {
          // Extract query parameters
          const urlObj = new URL(url);
          const extractedOrderId = urlObj.searchParams.get('orderId') || orderId;
          const paypalOrderId = urlObj.searchParams.get('token');

          if (extractedOrderId && paypalOrderId) {
            // Success - user approved payment
            if (onSuccess) {
              onSuccess(extractedOrderId, paypalOrderId);
            }
            return;
          }
        } catch (error) {
          console.error('Error parsing PayPal redirect URL:', error);
          // Try alternative parsing for non-standard URLs
          const match = url.match(/[?&]orderId=([^&]+)/);
          const tokenMatch = url.match(/[?&]token=([^&]+)/);
          
          if (match && tokenMatch) {
            const extractedOrderId = decodeURIComponent(match[1]);
            const paypalOrderId = decodeURIComponent(tokenMatch[1]);
            if (onSuccess) {
              onSuccess(extractedOrderId, paypalOrderId);
            }
            return;
          }
        }
      }

      // Check if user cancelled
      if (url.includes('/checkout/') || url.includes('cancel')) {
        if (onCancel) {
          onCancel();
        }
        return;
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link (already has URL)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [orderId, onSuccess, onCancel]);

  const handleOpenPayPal = async () => {
    try {
      setOpening(true);
      const canOpen = await Linking.canOpenURL(approvalUrl);
      
      if (!canOpen) {
        throw new Error('Cannot open PayPal URL. Please check your device settings.');
      }

      await Linking.openURL(approvalUrl);
      
      // Show instructions to user
      Alert.alert(
        'Complete Payment in Browser',
        'PayPal has opened in your browser. Please complete the payment there.\n\nYou will be redirected back to the app automatically after payment.',
        [
          {
            text: 'OK',
            onPress: () => {
              setOpening(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error opening PayPal URL:', error);
      setOpening(false);
      if (onError) {
        onError(error);
      } else {
        Alert.alert('Error', error.message || 'Failed to open PayPal. Please try again.');
      }
    }
  };

  // Auto-open PayPal when component mounts
  useEffect(() => {
    handleOpenPayPal();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="account-balance-wallet" size={64} color="#464FE5" />
        <Text style={styles.title}>Opening PayPal</Text>
        <Text style={styles.description}>
          PayPal will open in your browser. Please complete the payment there.
        </Text>
        {opening && (
          <ActivityIndicator size="large" color="#464FE5" style={styles.loader} />
        )}
        
        <TouchableOpacity
          style={styles.openButton}
          onPress={handleOpenPayPal}
          disabled={opening}
        >
          <MaterialIcons name="open-in-browser" size={20} color="#ffffff" />
          <Text style={styles.openButtonText}>
            {opening ? 'Opening...' : 'Open PayPal in Browser'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            if (onCancel) {
              onCancel();
            }
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel Payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  loader: {
    marginVertical: 24,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#464FE5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default PayPalWebView;


