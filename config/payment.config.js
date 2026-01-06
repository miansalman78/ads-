/**
 * Payment Gateway Configuration
 * Contains API keys for Stripe, Paystack, and PayPal
 */

export const PAYMENT_CONFIG = {
    // Stripe Configuration (USD payments)
    // Test Key for Sandbox Testing
    STRIPE_PUBLIC_KEY: 'pk_test_51ShLUfQ2aKV1cNbN121yrsMRokeTyPsBNAmjEhiA6EKO9uDo74wrXpdeW9XhVeUy09QcydtuohpVo20oiyUry9nM00oYg5NYtM',
    
    // Stripe Test Cards:
    // 4242 4242 4242 4242 - Test successful payment
    // 4000 0027 6000 3184 - Test 3DS Authentication needs
    // 4000 0000 0000 0002 - Test failed payment

    // Paystack Configuration (NGN payments)
    PAYSTACK_PUBLIC_KEY: 'pk_live_d8154d162296da5e5b7fa262cf04e9753cfaadad',

    // PayPal Configuration (Sandbox)
    PAYPAL_CLIENT_ID: 'AUGMlbssNIzwkEyanGOrQKN4CewfCtavt-AGSATfpNMn3z1Zrizb6Cp_3L6Ihe36KNE4FWSj7hZ_q5DY',
    PAYPAL_MODE: 'sandbox', // 'sandbox' or 'live'
    // PayPal Sandbox Test Account:
    // Email: sb-oqg94348361344@business.example.com
    // Password: 5ocY^rS5
};
