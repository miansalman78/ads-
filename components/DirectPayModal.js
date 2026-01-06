/**
 * Direct Pay Modal Component
 * 
 * Provides UI for one-time payments without saving payment methods
 * Uses Stripe SDK to tokenize cards and calls directPay service
 * 
 * NOTE: Currently only supports Stripe (USD). Paystack support can be added later.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { directPay } from '../services/payments.service';

// Safe imports for Stripe
let CardField, useStripe;
let stripeAvailable = false;

try {
    const StripeModule = require('@stripe/stripe-react-native');
    CardField = StripeModule.CardField;
    useStripe = StripeModule.useStripe;
    stripeAvailable = true;
    console.log('[DirectPayModal] Stripe SDK loaded successfully');
} catch (error) {
    console.warn('[DirectPayModal] Stripe SDK not available:', error.message);
    useStripe = () => ({ createPaymentMethod: null });
    CardField = () => null;
}

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

const DirectPayModal = ({
    visible,
    onClose,
    onSuccess,
    offerId,
    proposalId,
    currency = 'USD',
    quantity = 1,
}) => {
    const stripe = useStripe();
    const createPaymentMethod = stripe?.createPaymentMethod;
    const [loading, setLoading] = useState(false);
    const [cardComplete, setCardComplete] = useState(false);

    // Only support USD/Stripe for now
    const isStripe = currency === 'USD';

    const handleDirectPay = async () => {
        try {
            setLoading(true);
            console.log('[DirectPayModal] Starting direct pay');

            if (!stripeAvailable || !createPaymentMethod) {
                throw new Error('Stripe SDK not available. Please rebuild the app.');
            }

            if (!offerId && !proposalId) {
                throw new Error('Either offerId or proposalId must be provided');
            }

            // Validate card is complete
            if (!cardComplete) {
                Alert.alert('Invalid Card', 'Please enter a valid card number');
                return;
            }

            // Create payment method with Stripe (this tokenizes the card)
            const { paymentMethod, error } = await createPaymentMethod({
                paymentMethodType: 'Card',
            });

            if (error) {
                throw new Error(error.message);
            }

            if (!paymentMethod || !paymentMethod.id) {
                throw new Error('Failed to create payment method');
            }

            console.log('[DirectPayModal] Stripe payment method created:', paymentMethod.id);

            // Call directPay service with the payment token
            const paymentData = {
                paymentToken: paymentMethod.id, // pm_xxx from Stripe
                gatewayProvider: 'stripe',
                ...(offerId && { offerId }),
                ...(proposalId && { proposalId }),
                ...(offerId && { quantity }),
                ...(currency && { currency }),
            };

            console.log('[DirectPayModal] Calling directPay with:', paymentData);

            const response = await directPay(paymentData);

            if (response && response.data) {
                console.log('[DirectPayModal] Direct pay successful:', response.data);
                
                Alert.alert(
                    'Payment Successful',
                    'Your payment has been processed successfully!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                onSuccess(response.data);
                                onClose();
                            },
                        },
                    ]
                );
            } else {
                throw new Error(response?.message || 'Payment failed');
            }
        } catch (error) {
            console.error('[DirectPayModal] Direct pay error:', error);
            Alert.alert('Payment Error', error.message || 'Failed to process payment');
        } finally {
            setLoading(false);
        }
    };

    // Show not supported message for non-USD currencies
    if (!isStripe) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={onClose}
            >
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Pay with Card</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.notSupported}>
                            <MaterialIcons name="info-outline" size={64} color="#464FE5" />
                            <Text style={styles.notSupportedTitle}>Currency Not Supported</Text>
                            <Text style={styles.notSupportedText}>
                                Direct pay with cards is currently only supported for USD payments.
                                {'\n\n'}
                                Please use a saved payment method or PayPal for {currency} payments.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.closeButton, { flex: 1 }]}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Pay with Card</Text>
                    <TouchableOpacity onPress={onClose} disabled={loading}>
                        <MaterialIcons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.subtitle}>
                        Enter your card details to complete payment. Your card will not be saved.
                    </Text>

                    {/* Stripe Card Field */}
                    {stripeAvailable && CardField ? (
                        <>
                            <View style={styles.cardFieldContainer}>
                                <CardField
                                    postalCodeEnabled={false}
                                    placeholders={{
                                        number: '4242 4242 4242 4242',
                                    }}
                                    cardStyle={styles.cardField}
                                    style={styles.cardFieldWrapper}
                                    onCardChange={(cardDetails) => {
                                        setCardComplete(cardDetails.complete);
                                    }}
                                />
                            </View>

                            <View style={styles.infoBox}>
                                <MaterialIcons name="lock-outline" size={20} color="#10b981" />
                                <Text style={styles.infoText}>
                                    Your payment is secured and encrypted. Card details are not stored.
                                </Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.sdkNotReady}>
                            <MaterialIcons name="warning" size={48} color="#f59e0b" />
                            <Text style={styles.sdkNotReadyTitle}>SDK Not Ready</Text>
                            <Text style={styles.sdkNotReadyText}>
                                Please rebuild the app to enable card payments
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={loading}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.payButton,
                            (loading || !cardComplete || !stripeAvailable) && styles.payButtonDisabled,
                        ]}
                        onPress={handleDirectPay}
                        disabled={loading || !cardComplete || !stripeAvailable}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.payButtonText}>Pay Now</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3748',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 24,
        lineHeight: 22,
    },
    cardFieldContainer: {
        marginBottom: 24,
    },
    cardFieldWrapper: {
        height: 50,
    },
    cardField: {
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#166534',
        marginLeft: 12,
        lineHeight: 20,
    },
    sdkNotReady: {
        alignItems: 'center',
        padding: 40,
    },
    sdkNotReadyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3748',
        marginTop: 16,
    },
    sdkNotReadyText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    notSupported: {
        alignItems: 'center',
        padding: 40,
        flex: 1,
        justifyContent: 'center',
    },
    notSupportedTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3748',
        marginTop: 24,
    },
    notSupportedText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    payButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#464FE5',
        alignItems: 'center',
    },
    payButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    payButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    closeButton: {
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
});

export default DirectPayModal;


