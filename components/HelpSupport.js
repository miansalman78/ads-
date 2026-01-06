import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const HelpSupport = ({ navigation, route }) => {
  const [message, setMessage] = useState('');

  const faqs = [
    {
      id: 1,
      question: 'How do I create a campaign?',
      answer: 'Go to the Campaigns tab, tap "Create Campaign", fill in the details, and submit. Brands will be able to see and bid on your campaign.',
    },
    {
      id: 2,
      question: 'How do I get paid?',
      answer: 'Once your content is approved and published, payment will be released to your wallet. You can withdraw funds to your bank account.',
    },
    {
      id: 3,
      question: 'How do I connect my social media accounts?',
      answer: 'Go to Settings > Social Accounts and connect your Instagram, TikTok, or YouTube accounts. This helps brands see your reach and engagement.',
    },
    {
      id: 4,
      question: 'What if I have a dispute with a brand?',
      answer: 'Contact support through this screen or email support@influencerapp.com. Our team will help resolve the issue within 24-48 hours.',
    },
  ];

  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleContactSupport = () => {
    if (message.trim()) {
      alert('Your message has been sent! We\'ll get back to you within 24 hours.');
      setMessage('');
    } else {
      alert('Please enter a message');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          const returnScreen = route?.params?.returnScreen || navigation?.getParam?.('returnScreen');
          if (returnScreen === 'CreatorProfile') {
            navigation?.navigate('AppNavigator', { initialTab: 'Profile' });
          } else if (returnScreen === 'CreateOffer') {
            navigation?.navigate('CreateOffer');
          } else if (returnScreen === 'Inbox') {
            navigation?.navigate('AppNavigator', { initialTab: 'Messages' });
          } else if (returnScreen === 'ActiveOrders') {
            navigation?.navigate('AppNavigator', { initialTab: 'Orders' });
          } else if (navigation?.goBack) {
            navigation.goBack();
          }
        }}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation?.navigate('Messages')}
          >
            <MaterialIcons name="chat" size={32} color="#464FE5" />
            <Text style={styles.quickActionText}>Chat with Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => alert('Opening tutorials...')}
          >
            <MaterialIcons name="play-circle-outline" size={32} color="#464FE5" />
            <Text style={styles.quickActionText}>Tutorials</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <MaterialIcons
                  name={expandedFaq === faq.id ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#6B7280"
                />
              </View>
              {expandedFaq === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactLabel}>Describe your issue</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleContactSupport}
            >
              <Text style={styles.sendButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report Problem */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => alert('Report a problem')}
          >
            <MaterialIcons name="report-problem" size={24} color="#EF4444" />
            <Text style={styles.reportButtonText}>Report a Problem</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#464FE5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 8,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default HelpSupport;

