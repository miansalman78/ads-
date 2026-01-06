/**
 * Checkout Screen Component
 * 
 * Complete checkout flow for offers and proposals:
 * - Payment method selection
 * - Payment processing (two-step flow)
 * - PayPal redirect handling
 * - 3DS authentication (for Stripe)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PaymentMethodSelection from './PaymentMethodSelection';
import PayPalWebView from './PayPalWebView';
import AddCardModal from './AddCardModal';
import DirectPayModal from './DirectPayModal';
import {
  createPaymentIntent,
  confirmCardPayment,
  capturePayPalPayment,
} from '../services/payments.service';
import { fetchPaymentMethods } from '../services/paymentMethods.service';

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

const CheckoutScreen = ({
  navigation,
  route,
}) => {
  // Route params
  const { offerId, proposalId, offer, proposal, currency: initialCurrency } = route?.params || {};

  // State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [currency, setCurrency] = useState(initialCurrency || null);
  const [loading, setLoading] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showPayPalWebView, setShowPayPalWebView] = useState(false);
  const [paypalData, setPaypalData] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showDirectPay, setShowDirectPay] = useState(false);

  // Determine currency from offer/proposal
  useEffect(() => {
    if (!currency && offer) {
      // Check if offer has USD rate
      if (offer.rate?.usd) {
        setCurrency('USD');
      } else if (offer.rate?.ngn) {
        setCurrency('NGN');
      }
    } else if (!currency && proposal) {
      // Proposals use campaign currency, default to USD if not provided
      setCurrency('USD');
    }
  }, [offer, proposal, currency]);

  // Handle deep links when app returns from browser
  useEffect(() => {
    const handleDeepLink = (url) => {
      // Check if this is a PayPal success redirect
      if (url && (url.includes('/payments/paypal/success') || url.includes('token='))) {
        try {
          // Extract query parameters
          const urlObj = new URL(url);
          const extractedOrderId = urlObj.searchParams.get('orderId') || paypalData?.orderId;
          const paypalOrderId = urlObj.searchParams.get('token');

          if (extractedOrderId && paypalOrderId) {
            // Close PayPal WebView modal
            setShowPayPalWebView(false);
            // Process payment
            handlePayPalSuccess(extractedOrderId, paypalOrderId);
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
            setShowPayPalWebView(false);
            handlePayPalSuccess(extractedOrderId, paypalOrderId);
            return;
          }
        }
      }
    };

    // Listen for deep links when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && showPayPalWebView) {
        // Check if app was opened via deep link
        Linking.getInitialURL().then((url) => {
          if (url) {
            handleDeepLink(url);
          }
        });
      }
    });

    // Also listen for URL events
    const urlSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check initial URL (in case app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
      urlSubscription.remove();
    };
  }, [showPayPalWebView, paypalData]);

  // Calculate total amount
  const calculateTotal = () => {
    if (offer) {
      const qty = parseInt(quantity) || 1;
      const rate = currency === 'USD' ? offer.rate?.usd : offer.rate?.ngn;
      return rate ? rate * qty : 0;
    } else if (proposal) {
      return proposal.compensation?.amount || 0;
    }
    return 0;
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentMethods(false);
  };

  const handleProceedToPayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    if (!selectedPaymentMethod._id) {
      Alert.alert('Error', 'Invalid payment method selected');
      return;
    }

    // Validate currency for PayPal
    if (selectedPaymentMethod.type === 'paypal' && currency !== 'USD') {
      Alert.alert(
        'Invalid Currency',
        'PayPal payments only support USD currency. Please select USD or use a different payment method.'
      );
      return;
    }

    // Validate offer has USD rate for PayPal
    if (selectedPaymentMethod.type === 'paypal' && offer && !offer.rate?.usd) {
      Alert.alert(
        'Invalid Offer',
        'This offer does not have a USD rate. PayPal cannot be used. Please select a different payment method or currency.'
      );
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create payment intent
      // For proposals, use createPaymentIntent with proposalId (same flow as offers)
      // The backend will handle proposal acceptance internally when creating the intent
      let intentResponse;
      if (proposalId) {
        // Use the same two-step flow as offers for proposals
        intentResponse = await createPaymentIntent({
          proposalId,
          paymentMethodId: selectedPaymentMethod._id,
          ...(currency && { currency }),
        });
      } else {
        intentResponse = await createPaymentIntent({
          offerId,
          paymentMethodId: selectedPaymentMethod._id,
          quantity: parseInt(quantity) || 1,
          ...(currency && { currency }),
        });
      }

      if (!intentResponse || !intentResponse.data) {
        throw new Error(intentResponse?.message || 'Failed to create payment intent');
      }

      const intentData = intentResponse.data;

      // Debug logging
      console.log('[Checkout] Payment intent created:', {
        paymentMethodType: intentData.paymentMethodType,
        gatewayProvider: intentData.gatewayProvider,
        selectedPaymentMethodType: selectedPaymentMethod?.type,
        requiresAction: intentData.requiresAction,
      });

      // Step 2: Handle PayPal flow
      // Check both intentData.paymentMethodType and selectedPaymentMethod.type
      const isPayPal = intentData.paymentMethodType === 'paypal' || selectedPaymentMethod.type === 'paypal';
      
      if (isPayPal) {
        // Store PayPal data and show WebView
        setPaypalData({
          orderId: intentData.orderId,
          paypalOrderId: intentData.intentId,
          approvalUrl: intentData.approvalUrl,
        });
        setShowPayPalWebView(true);
        setLoading(false);
        return;
      }

      // Step 3: Validate this is a card payment
      const isCardPayment = selectedPaymentMethod.type === 'card' || 
                            intentData.paymentMethodType === 'card' ||
                            intentData.gatewayProvider === 'stripe' ||
                            intentData.gatewayProvider === 'paystack';
      
      if (!isCardPayment) {
        throw new Error('Invalid payment method type. Only card and PayPal payments are supported.');
      }

      // Step 4: Handle card payment flow
      // Check if 3DS is required
      if (intentData.requiresAction) {
        // TODO: Handle 3DS authentication
        // For now, show alert - in production, integrate Stripe 3DS SDK
        Alert.alert(
          '3D Secure Required',
          'This payment requires 3D Secure authentication. Please complete the authentication in the next step.',
          [
            {
              text: 'Continue',
              onPress: async () => {
                // After 3DS completion, confirm payment
                await confirmPayment(intentData.intentId);
              },
            },
          ]
        );
        setLoading(false);
        return;
      }

      // Step 5: Confirm payment (no 3DS required)
      await confirmPayment(intentData.intentId);
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Error', error.message || 'Failed to process payment');
      setLoading(false);
    }
  };

  const confirmPayment = async (intentId) => {
    try {
      setLoading(true);
      
      // Double-check we're not trying to confirm a PayPal payment
      if (selectedPaymentMethod && selectedPaymentMethod.type === 'paypal') {
        throw new Error('PayPal payments must be captured using the PayPal capture endpoint. Please use the PayPal flow.');
      }
      
      const response = await confirmCardPayment(intentId);

      if (response && response.data) {
        Alert.alert(
          'Payment Successful',
          'Your payment has been processed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation?.navigate('ActiveOrders');
              },
            },
          ]
        );
      } else {
        throw new Error(response?.message || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      
      // Check if error is about PayPal
      if (error.message && error.message.toLowerCase().includes('paypal')) {
        Alert.alert(
          'Payment Error',
          'This payment method requires PayPal flow. Please select a card payment method or use PayPal flow.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedPaymentMethod(null);
                setShowPaymentMethods(true);
              },
            },
          ]
        );
      } else {
      Alert.alert('Payment Error', error.message || 'Failed to confirm payment');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalSuccess = async (orderId, paypalOrderId) => {
    try {
      setLoading(true);
      setShowPayPalWebView(false);

      const response = await capturePayPalPayment(orderId, paypalOrderId);

      if (response && response.data) {
        Alert.alert(
          'Payment Successful',
          'Your PayPal payment has been processed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation?.navigate('ActiveOrders');
              },
            },
          ]
        );
      } else {
        throw new Error(response?.message || 'PayPal payment capture failed');
      }
    } catch (error) {
      console.error('PayPal capture error:', error);
      Alert.alert('Payment Error', error.message || 'Failed to capture PayPal payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalCancel = () => {
    setShowPayPalWebView(false);
    Alert.alert('Payment Cancelled', 'You cancelled the PayPal payment.');
  };

  const totalAmount = calculateTotal();
  const displayCurrency = currency || 'USD';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {offer && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Offer:</Text>
                <Text style={styles.summaryValue}>{offer.title || 'N/A'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Quantity:</Text>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            </>
          )}
          {proposal && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Proposal:</Text>
              <Text style={styles.summaryValue}>Proposal #{proposalId}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>
              {displayCurrency === 'USD' ? '$' : '₦'}
              {totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {selectedPaymentMethod ? (
            <TouchableOpacity
              style={styles.selectedPaymentMethod}
              onPress={() => setShowPaymentMethods(true)}
            >
              <MaterialIcons
                name={selectedPaymentMethod.type === 'paypal' ? 'account-balance-wallet' : 'credit-card'}
                size={24}
                color="#464FE5"
              />
              <View style={styles.selectedPaymentInfo}>
                <Text style={styles.selectedPaymentLabel}>
                  {selectedPaymentMethod.type === 'paypal'
                    ? `PayPal (${selectedPaymentMethod.paypalAccount?.email || 'N/A'})`
                    : `${selectedPaymentMethod.cardDetails?.brand || 'Card'} •••• ${selectedPaymentMethod.cardDetails?.last4 || '****'}`}
                </Text>
                {selectedPaymentMethod.isDefault && (
                  <Text style={styles.defaultBadge}>Default</Text>
                )}
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#6b7280" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.selectPaymentButton}
                onPress={() => setShowPaymentMethods(true)}
              >
                <MaterialIcons name="add-circle-outline" size={24} color="#464FE5" />
                <Text style={styles.selectPaymentText}>Select Payment Method</Text>
              </TouchableOpacity>

              {/* Direct Pay Option - Only for USD */}
              {currency === 'USD' && (
                <View style={styles.directPayContainer}>
                  <View style={styles.directPayDivider}>
                    <View style={styles.directPayDividerLine} />
                    <Text style={styles.directPayDividerText}>OR</Text>
                    <View style={styles.directPayDividerLine} />
                  </View>
                  <TouchableOpacity
                    style={styles.directPayButton}
                    onPress={() => setShowDirectPay(true)}
                  >
                    <MaterialIcons name="credit-card" size={20} color="#464FE5" />
                    <Text style={styles.directPayButtonText}>
                      Pay with card (one-time, won't be saved)
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.directPayHint}>
                    Complete payment without saving your card details
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Currency Selection (if offer has both rates) */}
        {offer && offer.rate?.usd && offer.rate?.ngn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currency</Text>
            <View style={styles.currencyButtons}>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  currency === 'NGN' && styles.currencyButtonSelected,
                ]}
                onPress={() => setCurrency('NGN')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    currency === 'NGN' && styles.currencyButtonTextSelected,
                  ]}
                >
                  NGN (₦{offer.rate.ngn})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  currency === 'USD' && styles.currencyButtonSelected,
                ]}
                onPress={() => setCurrency('USD')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    currency === 'USD' && styles.currencyButtonTextSelected,
                  ]}
                >
                  USD (${offer.rate.usd})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Proceed Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.proceedButton,
              (!selectedPaymentMethod || loading) && styles.proceedButtonDisabled,
            ]}
            onPress={handleProceedToPayment}
            disabled={!selectedPaymentMethod || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="lock" size={20} color="#ffffff" />
                <Text style={styles.proceedButtonText}>
                  Pay {displayCurrency === 'USD' ? '$' : '₦'}
                  {totalAmount.toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentMethods}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentMethods(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <TouchableOpacity onPress={() => setShowPaymentMethods(false)}>
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <PaymentMethodSelection
            currency={currency || 'USD'}
            onSelect={handleSelectPaymentMethod}
            onAddNew={(methodType) => {
              if (methodType === 'paypal') {
                setShowPaymentMethods(false);
                navigation?.navigate('PaymentMethods', {
                  showAddPayPal: true,
                  onPayPalAdded: (paypalMethod) => {
                    handleSelectPaymentMethod(paypalMethod);
                  }
                });
              } else {
              setShowPaymentMethods(false);
                setShowAddCard(true);
              }
            }}
            selectedPaymentMethodId={selectedPaymentMethod?._id}
            navigation={navigation}
          />
        </SafeAreaView>
      </Modal>

      {/* PayPal WebView Modal */}
      <Modal
        visible={showPayPalWebView}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handlePayPalCancel}
      >
        {paypalData && (
          <PayPalWebView
            approvalUrl={paypalData.approvalUrl}
            orderId={paypalData.orderId}
            onSuccess={handlePayPalSuccess}
            onCancel={handlePayPalCancel}
            onError={(error) => {
              Alert.alert('Error', error.message || 'PayPal payment failed');
              setShowPayPalWebView(false);
            }}
          />
        )}
      </Modal>

      {/* Direct Pay Modal */}
      <DirectPayModal
        visible={showDirectPay}
        onClose={() => setShowDirectPay(false)}
        onSuccess={(paymentData) => {
          Alert.alert(
            'Payment Successful',
            'Your payment has been processed successfully!',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation?.navigate('ActiveOrders');
                },
              },
            ]
          );
        }}
        offerId={offerId}
        proposalId={proposalId}
        currency={currency || 'USD'}
        quantity={parseInt(quantity) || 1}
      />

      {/* Add Card Modal */}
      <AddCardModal
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSuccess={(newCard) => {
          setShowAddCard(false);
          setSelectedPaymentMethod(newCard);
        }}
        currency={currency || 'USD'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
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
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  selectedPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#464FE5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  selectedPaymentInfo: {
    flex: 1,
  },
  selectedPaymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
  },
  selectPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  selectPaymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#464FE5',
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  currencyButtonSelected: {
    borderColor: '#464FE5',
    backgroundColor: '#f0f4ff',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  currencyButtonTextSelected: {
    color: '#464FE5',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#464FE5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  proceedButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: '#2d3748',
  },
  directPayContainer: {
    marginTop: 20,
  },
  directPayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  directPayDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  directPayDividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  directPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#464FE5',
    backgroundColor: '#f8fafc',
  },
  directPayButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#464FE5',
  },
  directPayHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default CheckoutScreen;


