import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWallet, getPaymentMethods, withdrawFunds } from '../services/wallet';
import { getTransactions } from '../services/transactions';
import { getBrandPayments } from '../services/payments.service';
import { useAuth } from '../hooks/useAuth';

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

const Wallet = ({ navigation, route }) => {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawCurrency, setWithdrawCurrency] = useState('USD');
  
  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  
  // Polling state
  const pollingIntervalRef = useRef(null);
  const POLLING_INTERVAL = 30000; // 30 seconds

  // Get user role
  const userRole = user?.role || route?.params?.role || 'creator';
  const isBrand = userRole?.toLowerCase() === 'brand';
  const isCreator = !isBrand;

  useEffect(() => {
    loadWalletData();
    
    // Start polling for real-time updates
    startPolling();
    
    // Cleanup polling on unmount
    return () => {
      stopPolling();
    };
  }, []);

  const loadWalletData = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      
      // For creators: Load wallet balance, payment methods, and transactions
      if (isCreator) {
        const [walletResponse, paymentMethodsResponse, transactionsResponse] = await Promise.all([
          getWallet().catch(() => null),
          getPaymentMethods().catch(() => null),
          getTransactions({ page, limit: 50 }).catch(() => null),
        ]);

        if (walletResponse && walletResponse.data) {
          setWalletData(walletResponse.data);
        }

        if (paymentMethodsResponse && paymentMethodsResponse.data) {
          setPaymentMethods(paymentMethodsResponse.data.paymentMethods || []);
        }

        if (transactionsResponse && transactionsResponse.data) {
          const transactionsData = Array.isArray(transactionsResponse.data)
            ? transactionsResponse.data
            : (transactionsResponse.data.transactions || transactionsResponse.data.items || []);
          
          // Handle pagination
          if (append) {
            setTransactions(prev => [...prev, ...transactionsData]);
          } else {
            setTransactions(transactionsData);
            setCurrentPage(1);
          }
          
          // Check if there are more transactions
          const total = transactionsResponse.data.total || transactionsResponse.data.totalResults || transactionsData.length;
          setTotalTransactions(total);
          
          if (transactionsData.length < 50) {
            setHasMoreTransactions(false);
          } else {
            setHasMoreTransactions(true);
          }
        }
      }
      // For brands: Load payment history
      if (isBrand) {
        try {
          const paymentsResponse = await getBrandPayments({ page, limit: 50 });
          if (paymentsResponse && paymentsResponse.data) {
            const paymentsData = Array.isArray(paymentsResponse.data)
              ? paymentsResponse.data
              : (paymentsResponse.data.payments || paymentsResponse.data.items || []);
            // Convert payments to transaction-like format for display
            const transactionsData = paymentsData.map(payment => ({
              _id: payment._id || payment.id,
              type: payment.status === 'completed' ? 'debit' : 'pending',
              amount: payment.amount || 0,
              description: payment.description || `Payment for ${payment.orderId ? 'Order' : 'Offer'}`,
              createdAt: payment.createdAt || payment.date,
              payment: payment, // Store full payment object
            }));
            
            if (append) {
              setTransactions(prev => [...prev, ...transactionsData]);
            } else {
              setTransactions(transactionsData);
              setCurrentPage(1);
            }
            
            if (transactionsData.length < 50) {
              setHasMoreTransactions(false);
            } else {
              setHasMoreTransactions(true);
            }
          }
        } catch (paymentError) {
          console.error('Error loading brand payments:', paymentError);
        }
      }
      
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData(1, false);
  };

  // Load more transactions
  const loadMoreTransactions = async () => {
    if (loadingMore || !hasMoreTransactions) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      await loadWalletData(nextPage, true);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      Alert.alert('Error', 'Failed to load more transactions');
    } finally {
      setLoadingMore(false);
    }
  };

  // Real-time updates with polling
  const startPolling = () => {
    // Only poll for creators (wallet balance updates)
    if (isCreator) {
      pollingIntervalRef.current = setInterval(() => {
        // Silently refresh wallet data
        loadWalletData(1, false).catch(error => {
          console.error('Polling error:', error);
        });
      }, POLLING_INTERVAL);
    }
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Input validation helper
  const validateWithdrawAmount = (amountStr) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = amountStr.replace(/[^0-9.]/g, '');
    
    // Check if empty
    if (!cleaned || cleaned.trim() === '') {
      return { valid: false, error: 'Please enter an amount' };
    }
    
    // Check if valid number
    const amount = parseFloat(cleaned);
    if (isNaN(amount) || !isFinite(amount)) {
      return { valid: false, error: 'Please enter a valid number' };
    }
    
    // Check if negative
    if (amount < 0) {
      return { valid: false, error: 'Amount cannot be negative' };
    }
    
    // Check if too large (prevent overflow)
    if (amount > 1000000) {
      return { valid: false, error: 'Maximum withdrawal amount is $1,000,000' };
    }
    
    // Check decimal places (max 2)
    const decimalParts = cleaned.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      return { valid: false, error: 'Amount can have maximum 2 decimal places' };
    }
    
    return { valid: true, amount };
  };

  // Format amount input
  const formatAmountInput = (text) => {
    // Remove any non-numeric characters except decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const handleWithdraw = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    // Validate amount input
    const validation = validateWithdrawAmount(withdrawAmount);
    if (!validation.valid) {
      Alert.alert('Invalid Amount', validation.error);
      return;
    }
    
    const amount = validation.amount;

    // Get wallet currency from backend data
    const walletCurrencyFromBackend = walletData?.currency || 'NGN';
    
    // Always use withdrawCurrency (defaults to USD) - ensure it's never null/undefined
    const selectedCurrency = (withdrawCurrency && withdrawCurrency.trim()) || 'USD';
    
    // CRITICAL: Backend doesn't support currency parameter, so it uses wallet's currency
    // If user selected USD but wallet is NGN, we must use NGN to match backend validation
    const effectiveCurrency = walletCurrencyFromBackend === 'NGN' ? 'NGN' : selectedCurrency;
    const minAmount = effectiveCurrency === 'USD' ? 10 : 1000;
    const currencySymbol = effectiveCurrency === 'USD' ? '$' : '₦';

    // Warn user if there's a currency mismatch
    if (selectedCurrency !== effectiveCurrency) {
      Alert.alert(
        'Currency Mismatch',
        `Your wallet is set to ${walletCurrencyFromBackend}. The withdrawal will be processed in ${walletCurrencyFromBackend}, not ${selectedCurrency}. Minimum withdrawal is ${walletCurrencyFromBackend === 'USD' ? '$' : '₦'}${minAmount.toLocaleString()}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: () => {
              // Update currency to match wallet - user will need to click withdraw again
              setWithdrawCurrency(effectiveCurrency);
              // Don't call handleWithdraw() recursively - let user click withdraw button again
            }
          }
        ]
      );
      return;
    }

    if (Number(amount) < minAmount) {
      Alert.alert(
        'Minimum Amount',
        `Minimum withdrawal amount is ${currencySymbol}${minAmount.toLocaleString()}`
      );
      return;
    }


    const balance = walletData?.balance || 0;
    if (amount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setWithdrawing(true);
      
      // Validate payment method ID
      const paymentMethodId = selectedPaymentMethod._id || selectedPaymentMethod.id;
      if (!paymentMethodId) {
        throw new Error('Payment method ID is missing');
      }

      // Verify payment method currency matches selected currency
      const paymentMethodCurrency = selectedPaymentMethod?.currency;
      if (paymentMethodCurrency && paymentMethodCurrency !== selectedCurrency) {
        Alert.alert(
          'Currency Mismatch',
          `Selected payment method is for ${paymentMethodCurrency}, but withdrawal is in ${selectedCurrency}. Please select a payment method that matches the withdrawal currency.`
        );
        return;
      }

      console.log('[Wallet] Calling withdrawFunds with:', {
        amount,
        paymentMethodId,
        currency: selectedCurrency,
        paymentMethodCurrency
      });

      // Call withdrawal API with currency
      const response = await withdrawFunds(amount, paymentMethodId, selectedCurrency);
      
      if (response && response.success) {
        Alert.alert('Success', 'Withdrawal request submitted successfully', [
          {
            text: 'OK',
            onPress: () => {
              setShowWithdrawModal(false);
              setWithdrawAmount('');
              // Reset to default payment method for USD
              const defaultMethod = paymentMethods.find(pm => 
                pm.isDefault && (!pm.currency || pm.currency === 'USD')
              ) || paymentMethods.find(pm => !pm.currency || pm.currency === 'USD');
              setSelectedPaymentMethod(defaultMethod || null);
              setWithdrawCurrency('USD');
              loadWalletData();
            },
          },
        ]);
      } else {
        // Check if error is about minimum amount and currency mismatch
        const errorMessage = response?.message || response?.error || 'Withdrawal failed';
        if (errorMessage.includes('₦1,000') && selectedCurrency === 'USD') {
          // Backend is validating against NGN - this means backend doesn't support currency parameter yet
          // Or the payment method/wallet is set to NGN
          const walletCurrency = walletData?.currency;
          const pmCurrency = selectedPaymentMethod?.currency;
          
          let helpfulMessage = 'Unable to process USD withdrawal. ';
          if (walletCurrency === 'NGN') {
            helpfulMessage += 'Your wallet is set to NGN. Please contact support to change your wallet currency to USD.';
          } else if (pmCurrency === 'NGN') {
            helpfulMessage += 'The selected payment method is for NGN. Please select a USD payment method.';
          } else {
            helpfulMessage += 'The backend may not support USD withdrawals yet, or your payment method needs to be configured for USD. Please contact support.';
          }
          
          throw new Error(helpfulMessage);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('[Wallet] Withdrawal error:', error);
      Alert.alert(
        'Withdrawal Error', 
        error.message || 'Failed to process withdrawal. Please try again.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (selectedFilter === 'All') return true;
    if (isCreator) {
      if (selectedFilter === 'Earnings') return transaction.type === 'earning' || transaction.type === 'credit';
      if (selectedFilter === 'Withdrawals') return transaction.type === 'withdrawal' || transaction.type === 'debit';
    } else {
      // For brands, filter by payment status
      if (selectedFilter === 'Completed') return transaction.type === 'debit' && transaction.payment?.status === 'completed';
      if (selectedFilter === 'Pending') return transaction.payment?.status === 'pending' || transaction.type !== 'debit';
    }
    return true;
  });

  const handleTransactionPress = async (transaction) => {
    const transactionId = transaction._id || transaction.id;
    if (transactionId) {
      try {
        // Navigate to transaction details with full transaction object
        navigation?.navigate('TransactionDetails', { 
          transaction: transaction,
          transactionId: transactionId 
        });
      } catch (error) {
        console.error('Error navigating to transaction details:', error);
        Alert.alert('Error', 'Failed to open transaction details');
      }
    }
  };

  const displayedTransactions = showAllTransactions ? filteredTransactions : filteredTransactions.slice(0, 5);

  const handleFilterPress = (filter) => {
    setSelectedFilter(filter);
  };

  const handleViewAllPress = () => {
    setShowAllTransactions(!showAllTransactions);
  };

  const balance = walletData?.balance || 0;
  const walletCurrency = walletData?.currency || 'USD';
  // const walletCurrency = 'USD';
  const currencySymbol = walletCurrency === 'USD' ? '$' : '₦';
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#464FE5" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#464FE5']}
            tintColor="#464FE5"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <TouchableOpacity style={styles.menuButton}>
            <MaterialIcons name="more-vert" size={24} color="#2d3748" />
          </TouchableOpacity>
        </View>

        {/* Available Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {currencySymbol}{balance.toFixed(2)}
          </Text>
          {walletCurrency && (
            <Text style={styles.currencyLabel}>{walletCurrency}</Text>
          )}
          {isCreator && (
            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={() => {
                setWithdrawCurrency('USD');
                setWithdrawAmount('');
                // Find and select default payment method for USD
                const defaultMethod = paymentMethods.find(pm => 
                  pm.isDefault && (!pm.currency || pm.currency === 'USD')
                ) || paymentMethods.find(pm => (!pm.currency || pm.currency === 'USD'));
                setSelectedPaymentMethod(defaultMethod || null);
                setShowWithdrawModal(true);
              }}
            >
              <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method Section - Only for creators */}
        {isCreator && (
          <View style={styles.paymentMethodSection}>
            <Text style={styles.sectionTitle}>Bank Account</Text>
            {defaultPaymentMethod ? (
              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodInfo}>
                  <View style={styles.bankIcon}>
                    <MaterialIcons name="account-balance" size={24} color="#464FE5" />
                  </View>
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankName}>{defaultPaymentMethod.bankName || 'Bank Account'}</Text>
                    <Text style={styles.accountNumber}>
                      {defaultPaymentMethod.accountNumber 
                        ? `****${defaultPaymentMethod.accountNumber.slice(-4)}`
                        : 'No account number'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.manageButton}
                  onPress={() => navigation?.navigate('CreatorWalletPaymentMethods')}
                >
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodInfo}>
                  <View style={styles.bankIcon}>
                    <MaterialIcons name="account-balance" size={24} color="#9ca3af" />
                  </View>
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankName}>No Bank Account</Text>
                    <Text style={styles.accountNumber}>Add a bank account to receive payments</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.manageButton}
                  onPress={() => navigation?.navigate('CreatorWalletPaymentMethods')}
                >
                  <Text style={styles.manageButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Payment Method Section - For brands (shows brand payment methods) */}
        {isBrand && (
          <View style={styles.paymentMethodSection}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.paymentMethodCard}>
              <View style={styles.paymentMethodInfo}>
                <View style={styles.bankIcon}>
                  <MaterialIcons name="credit-card" size={24} color="#464FE5" />
                </View>
                <View style={styles.bankDetails}>
                  <Text style={styles.bankName}>Payment Methods</Text>
                  <Text style={styles.accountNumber}>Manage your payment methods for purchases</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.manageButton}
                onPress={() => navigation?.navigate('PaymentMethods')}
              >
                <Text style={styles.manageButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Transaction History Section */}
        <View style={styles.transactionSection}>
          <View style={styles.transactionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            {transactions.length > 5 && (
              <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllPress}>
                <Text style={styles.viewAllText}>{showAllTransactions ? 'Show Less' : 'View All'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          {isCreator ? (
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === 'All' && styles.filterTabSelected
                ]}
                onPress={() => handleFilterPress('All')}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === 'All' && styles.filterTabTextSelected
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === 'Earnings' && styles.filterTabSelected
                ]}
                onPress={() => handleFilterPress('Earnings')}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === 'Earnings' && styles.filterTabTextSelected
                ]}>
                  Earnings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === 'Withdrawals' && styles.filterTabSelected
                ]}
                onPress={() => handleFilterPress('Withdrawals')}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === 'Withdrawals' && styles.filterTabTextSelected
                ]}>
                  Withdrawals
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === 'All' && styles.filterTabSelected
                ]}
                onPress={() => handleFilterPress('All')}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === 'All' && styles.filterTabTextSelected
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === 'Completed' && styles.filterTabSelected
                ]}
                onPress={() => handleFilterPress('Completed')}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === 'Completed' && styles.filterTabTextSelected
                ]}>
                  Completed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === 'Pending' && styles.filterTabSelected
                ]}
                onPress={() => handleFilterPress('Pending')}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === 'Pending' && styles.filterTabTextSelected
                ]}>
                  Pending
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Transaction List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <MaterialIcons name="receipt" size={48} color="#9ca3af" />
              <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.transactionList}>
                {filteredTransactions.map((transaction, index) => {
                  const isEarning = transaction.type === 'earning' || transaction.type === 'credit';
                  const amount = transaction.amount || 0;
                  const transactionCurrency = transaction.currency || walletCurrency || 'USD';
                  const transactionSymbol = transactionCurrency === 'USD' ? '$' : '₦';
                  const formattedAmount = isEarning 
                    ? `+${transactionSymbol}${Math.abs(amount).toFixed(2)}`
                    : `-${transactionSymbol}${Math.abs(amount).toFixed(2)}`;
                  
                  return (
                    <TouchableOpacity
                      key={transaction._id || transaction.id || index}
                      style={styles.transactionCard}
                      onPress={() => handleTransactionPress(transaction)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.transactionIcon, { backgroundColor: isEarning ? '#dcfce7' : '#dbeafe' }]}>
                        <MaterialIcons 
                          name={isEarning ? 'arrow-downward' : 'arrow-upward'} 
                          size={20} 
                          color={isEarning ? '#10b981' : '#464FE5'} 
                        />
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionTitle}>
                          {transaction.description || transaction.title || 'Transaction'}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {transaction.createdAt 
                            ? new Date(transaction.createdAt).toLocaleDateString()
                            : transaction.date || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.transactionAmountContainer}>
                        <Text style={[
                          styles.transactionAmount,
                          { color: isEarning ? '#10b981' : '#464FE5' }
                        ]}>
                          {formattedAmount}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Load More Button */}
              {hasMoreTransactions && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMoreTransactions}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#464FE5" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More Transactions</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Withdraw Modal - Only for creators */}
      {isCreator && (
        <Modal
          visible={showWithdrawModal}
          transparent={true}
          animationType="slide"
              onRequestClose={() => {
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                // Reset to default payment method for USD
                const defaultMethod = paymentMethods.find(pm => 
                  pm.isDefault && (!pm.currency || pm.currency === 'USD')
                ) || paymentMethods.find(pm => !pm.currency || pm.currency === 'USD');
                setSelectedPaymentMethod(defaultMethod || null);
                setWithdrawCurrency('USD');
              }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Withdraw Funds</Text>
                <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalLabel}>Available Balance</Text>
                <Text style={styles.modalBalance}>
                  {withdrawCurrency === 'USD' ? '$' : '₦'}{balance.toFixed(2)} ({withdrawCurrency})
                </Text>

                <Text style={styles.modalLabel}>Currency</Text>
                <View style={styles.currencySelector}>
                  <TouchableOpacity
                    style={[
                      styles.currencyOption,
                      withdrawCurrency === 'USD' && styles.currencyOptionSelected,
                    ]}
                    onPress={() => {
                      setWithdrawCurrency('USD');
                      // Find default payment method for USD
                      const defaultMethod = paymentMethods.find(pm => 
                        pm.isDefault && (!pm.currency || pm.currency === 'USD')
                      ) || paymentMethods.find(pm => !pm.currency || pm.currency === 'USD');
                      setSelectedPaymentMethod(defaultMethod || null);
                    }}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      withdrawCurrency === 'USD' && styles.currencyOptionTextSelected,
                    ]}>
                      USD ($)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.currencyOption,
                      withdrawCurrency === 'NGN' && styles.currencyOptionSelected,
                    ]}
                    onPress={() => {
                      setWithdrawCurrency('NGN');
                      // Find default payment method for NGN
                      const defaultMethod = paymentMethods.find(pm => 
                        pm.isDefault && (!pm.currency || pm.currency === 'NGN')
                      ) || paymentMethods.find(pm => !pm.currency || pm.currency === 'NGN');
                      setSelectedPaymentMethod(defaultMethod || null);
                    }}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      withdrawCurrency === 'NGN' && styles.currencyOptionTextSelected,
                    ]}>
                      NGN (₦)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Withdrawal Amount *</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>{withdrawCurrency === 'USD' ? '$' : '₦'}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={withdrawAmount}
                  onChangeText={(text) => {
                    const formatted = formatAmountInput(text);
                    setWithdrawAmount(formatted);
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  maxLength={12}
                />
                </View>
                <Text style={styles.modalHint}>
                  Minimum withdrawal: {withdrawCurrency === 'USD' ? '$' : '₦'}{withdrawCurrency === 'USD' ? '10.00' : '1,000.00'}
                </Text>

                <Text style={styles.modalLabel}>Payment Method *</Text>
                {paymentMethods.filter(method => {
                  if (method.currency) {
                    return method.currency === withdrawCurrency;
                  }
                  return true;
                }).length === 0 ? (
                  <TouchableOpacity
                    style={styles.addAccountButton}
                    onPress={() => {
                      setShowWithdrawModal(false);
                      navigation?.navigate('CreatorWalletPaymentMethods');
                    }}
                  >
                    <MaterialIcons name="add" size={20} color="#464FE5" />
                    <Text style={styles.addAccountButtonText}>
                      {withdrawCurrency === 'USD' ? 'Add Payment Method' : 'Add Bank Account'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.paymentMethodSelector}>
                    {paymentMethods
                      .filter(method => {
                        if (method.currency) {
                          return method.currency === withdrawCurrency;
                        }
                        return true;
                      })
                      .map((method) => {
                        // Compare both _id and id fields to ensure proper selection
                        const methodId = method._id || method.id;
                        const selectedId = selectedPaymentMethod?._id || selectedPaymentMethod?.id;
                        // Strict comparison: only true if both IDs exist and match exactly
                        const isSelected = selectedPaymentMethod !== null && 
                                         selectedPaymentMethod !== undefined && 
                                         methodId !== null && 
                                         methodId !== undefined &&
                                         String(methodId) === String(selectedId);
                        return (
                      <TouchableOpacity
                            key={methodId || method._id || method.id}
                        style={[
                          styles.paymentMethodOption,
                              isSelected && styles.paymentMethodOptionSelected,
                            ]}
                            onPress={() => {
                              // Radio button behavior: always select the clicked method, deselect others
                              setSelectedPaymentMethod(method);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.paymentMethodRadio}>
                              {isSelected && <View style={styles.paymentMethodRadioSelected} />}
                            </View>
                        <MaterialIcons
                              name={withdrawCurrency === 'USD' && method.type === 'paypal' ? 'account-balance-wallet' : 'account-balance'}
                          size={20}
                              color={isSelected ? '#464FE5' : '#6b7280'}
                        />
                        <View style={styles.paymentMethodOptionInfo}>
                          <Text style={styles.paymentMethodOptionName}>
                                {method.bankName || method.paypalAccount?.email || method.cardDetails?.brand || 'Payment Method'}
                          </Text>
                          <Text style={styles.paymentMethodOptionDetails}>
                            {method.accountNumber 
                              ? `****${method.accountNumber.slice(-4)}`
                                  : method.paypalAccount?.email
                                  ? method.paypalAccount.email
                                  : method.cardDetails?.last4
                                  ? `****${method.cardDetails.last4}`
                              : method.accountName || 'N/A'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                    // Reset to default payment method for USD
                    const defaultMethod = paymentMethods.find(pm => 
                      pm.isDefault && (!pm.currency || pm.currency === 'USD')
                    ) || paymentMethods.find(pm => !pm.currency || pm.currency === 'USD');
                    setSelectedPaymentMethod(defaultMethod || null);
                    setWithdrawCurrency('USD');
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, withdrawing && styles.modalConfirmButtonDisabled]}
                  onPress={handleWithdraw}
                  disabled={withdrawing || !selectedPaymentMethod || !withdrawAmount}
                >
                  {withdrawing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Withdraw</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingBottom: 100,
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
  menuButton: {
    padding: 4,
  },
  balanceCard: {
    backgroundColor: '#464FE5',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 20,
    fontWeight: '500',
  },
  withdrawButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#464FE5',
  },
  paymentMethodSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  paymentMethodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankDetails: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  manageButtonText: {
    fontSize: 14,
    color: '#464FE5',
    fontWeight: '600',
  },
  transactionSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#464FE5',
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabSelected: {
    backgroundColor: '#ffffff',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTabTextSelected: {
    color: '#2d3748',
    fontWeight: '600',
  },
  transactionList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  transactionAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#464FE5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTransactionsText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  loadMoreButton: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#464FE5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalBody: {
    padding: 16,
    maxHeight: 500,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  modalBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingLeft: 16,
    paddingRight: 8,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 18,
    color: '#1f2937',
    backgroundColor: 'transparent',
  },
  modalHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  currencyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  currencyOptionSelected: {
    borderColor: '#464FE5',
    backgroundColor: '#f0f4ff',
  },
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  currencyOptionTextSelected: {
    color: '#464FE5',
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  paymentMethodRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#464FE5',
  },
  addAccountButton: {
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
    marginBottom: 16,
  },
  addAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#464FE5',
  },
  paymentMethodSelector: {
    gap: 12,
    marginBottom: 16,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  paymentMethodOptionSelected: {
    borderColor: '#464FE5',
    backgroundColor: '#f0f4ff',
  },
  paymentMethodOptionInfo: {
    flex: 1,
  },
  paymentMethodOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  paymentMethodOptionDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#464FE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default Wallet;
