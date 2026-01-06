import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyProposals, withdrawProposal } from '../services/proposals';
import { useAuth } from '../hooks/useAuth';

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

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(p => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const MyProposals = ({ navigation, route }) => {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || route?.params?.role?.toLowerCase();
  const isCreator = userRole === 'creator' || userRole === 'influencer';
  
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    if (!isCreator) {
      Alert.alert('Access Denied', 'This page is only available for creators.', [
        { text: 'OK', onPress: () => navigation?.goBack() }
      ]);
    }
  }, [isCreator]);

  useEffect(() => {
    loadProposals();
  }, [selectedStatus]);

  React.useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadProposals();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'All') {
        params.status = selectedStatus.toLowerCase();
      }
      const response = await getMyProposals(params);
      
      if (response && response.data) {
        const proposalsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.proposals || response.data.items || []);
        setProposals(proposalsData);
      } else {
        setProposals([]);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      Alert.alert('Error', 'Failed to load proposals. Please try again.');
      setProposals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProposals();
  };

  const handleWithdraw = (proposalId) => {
    Alert.alert(
      'Withdraw Proposal',
      'Are you sure you want to withdraw this proposal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setWithdrawingId(proposalId);
              await withdrawProposal(proposalId);
              Alert.alert('Success', 'Proposal withdrawn successfully.');
              loadProposals();
            } catch (error) {
              console.error('Error withdrawing proposal:', error);
              Alert.alert('Error', 'Failed to withdraw proposal. Please try again.');
            } finally {
              setWithdrawingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      case 'withdrawn':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const statusOptions = ['All', 'Pending', 'Accepted', 'Rejected', 'Withdrawn'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Proposals</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonSelected
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextSelected
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <View style={styles.refreshControl}>
            {refreshing && <ActivityIndicator size="small" color="#464FE5" />}
          </View>
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#464FE5" />
            <Text style={styles.loadingText}>Loading proposals...</Text>
          </View>
        ) : proposals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="description" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No proposals found</Text>
            <Text style={styles.emptySubtext}>
              {selectedStatus === 'All' 
                ? 'You haven\'t submitted any proposals yet.'
                : `No ${selectedStatus.toLowerCase()} proposals found.`}
            </Text>
          </View>
        ) : (
          <View style={styles.proposalsList}>
            {proposals.map((proposal) => {
              const campaign = proposal.campaignId && typeof proposal.campaignId === 'object'
                ? proposal.campaignId
                : (proposal.campaign || {});
              const campaignId = campaign._id || campaign.id || proposal.campaignId;
              const campaignTitle = campaign.title || campaign.name || 'Campaign';
              const status = proposal.status || 'pending';
              const canWithdraw = status?.toLowerCase() === 'pending';

              return (
                <View key={proposal._id || proposal.id} style={styles.proposalCard}>
                  <TouchableOpacity
                    onPress={() => navigation?.navigate('ProposalDetails', { 
                      proposal, 
                      campaign,
                      isMyProposal: true 
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.proposalHeader}>
                      <View style={styles.proposalInfo}>
                        <Text style={styles.campaignTitle} numberOfLines={2}>
                          {campaignTitle}
                        </Text>
                        <Text style={styles.proposalDate}>
                          {proposal.createdAt 
                            ? new Date(proposal.createdAt).toLocaleDateString()
                            : 'Date not available'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                        <Text style={styles.statusText}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.proposalMessage} numberOfLines={3}>
                      {proposal.message || 'No proposal message'}
                    </Text>

                    <View style={styles.compensationRow}>
                      {proposal.compensation?.type === 'product' ? (
                        <View style={styles.compensationBadge}>
                          <MaterialIcons name="card-giftcard" size={16} color="#10b981" />
                          <Text style={styles.compensationText}>In-kind</Text>
                        </View>
                      ) : (
                        <Text style={styles.compensationAmount}>
                          {(() => {
                            const currency = campaign?.currency || 'USD';
                            const symbol = currency === 'USD' ? '$' : '₦';
                            return `${symbol}${proposal.compensation?.amount || 0}`;
                          })()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {canWithdraw && (
                    <TouchableOpacity
                      style={styles.withdrawButton}
                      onPress={() => handleWithdraw(proposal._id || proposal.id)}
                      disabled={withdrawingId === (proposal._id || proposal.id)}
                    >
                      {withdrawingId === (proposal._id || proposal.id) ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <>
                          <MaterialIcons name="cancel" size={16} color="#ef4444" />
                          <Text style={styles.withdrawButtonText}>Withdraw</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
  placeholder: {
    width: 32,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#464FE5',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextSelected: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  refreshControl: {
    padding: 10,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  proposalsList: {
    padding: 16,
  },
  proposalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  proposalInfo: {
    flex: 1,
    marginRight: 12,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  proposalDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  proposalMessage: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 12,
  },
  compensationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compensationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compensationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  compensationAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});

export default MyProposals;

