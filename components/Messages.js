import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { sendMessage, subscribeToMessages } from '../services/chat';

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

const Messages = ({ navigation, route }) => {
  // Get conversation data from route params
  const conversation = route?.params?.conversation || navigation?.getParam?.('conversation');
  const { user } = useContext(AuthContext);

  // Default conversation data if not provided (should be provided by Inbox)
  const defaultConversation = {
    id: 'temp',
    name: 'User',
    avatar: '👤',
    subtitle: ''
  };

  const currentConversation = conversation || defaultConversation;

  // Get IDs from user object safely
  const userId = user?._id || user?.id; // backend uses _id usually
  const userRole = user?.role?.toLowerCase() || 'creator'; // 'brand' or 'creator'/'influencer'

  // Get first letter of name for avatar text
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!currentConversation?.id) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToMessages(currentConversation.id, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);

      // Scroll to bottom on new messages
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [currentConversation?.id]);

  const getCurrentTime = (date) => {
    if (!date) return '';
    const now = date instanceof Date ? date : new Date(date);
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    // Optimistic UI update could be added here, 
    // but Firestore is fast enough usually

    try {
      const textToSend = messageText.trim();
      setMessageText(''); // Clear input immediately

      // If we don't have a valid conversation ID yet (e.g. creating new chat), we might need to create it first
      // For now, assuming conversation exists passed from Inbox

      await sendMessage(
        currentConversation.id,
        {
          text: textToSend,
          isOffer: false,
          isUser: true // This is just for local UI logic if we weren't using senderId check
        },
        userId,
        userRole
      );

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleFileAttachment = async () => {
    // File attachment logic to be implemented with Firebase Storage
    Alert.alert('Coming Soon', 'File attachments will be available soon.');
  };

  // Helper to check if message is from current user
  const isMessageFromUser = (message) => {
    return message.senderId === userId;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation?.goBack) {
              navigation.goBack();
            } else if (navigation?.navigate) {
              navigation.navigate('AppNavigator', { initialTab: 'Messages' });
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}>
              {currentConversation.avatar && currentConversation.avatar.length < 5 ? (
                <Text style={styles.profileImageEmoji}>{currentConversation.avatar}</Text>
              ) : (
                <Text style={styles.profileImageText}>{getInitials(currentConversation.name)}</Text>
              )}
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentConversation.name}</Text>
            <Text style={styles.profileTitle}>
              {currentConversation.subtitle || 'User'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={24} color="#2d3748" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#464FE5" style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Date Separator */}
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>Today</Text>
            </View>

            {/* Messages */}
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            ) : (
              messages.map((message) => {
                const isUser = isMessageFromUser(message);
                return (
                  <View key={message.id} style={styles.messageContainer}>
                    {message.isFile ? (
                      <View style={[
                        styles.messageBubble,
                        styles.userMessage,
                        styles.fileMessage
                      ]}>
                        <View style={styles.fileContainer}>
                          <MaterialIcons name="attach-file" size={20} color="#464FE5" />
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName}>{message.fileName}</Text>
                            <Text style={styles.fileSize}>
                              {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.messageTime, styles.userMessageTime]}>
                          {getCurrentTime(message.createdAt)}
                        </Text>
                      </View>
                    ) : message.isOffer ? (
                      <View style={styles.offerCard}>
                        <View style={styles.offerImageContainer}>
                          <Text style={styles.offerImageText}>{message.offerData.image}</Text>
                        </View>
                        <View style={styles.offerDetails}>
                          <Text style={styles.offerTitle}>{message.offerData.title}</Text>
                          <Text style={styles.offerBudget}>Budget: {message.offerData.budget}</Text>
                          <Text style={styles.offerDescription}>{message.offerData.description}</Text>
                          <TouchableOpacity
                            style={styles.hireButton}
                            onPress={() => {
                              Alert.alert(
                                'Hire Creator',
                                'Do you want to hire this creator for this offer?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Hire',
                                    onPress: () => {
                                      navigation?.navigate('ActiveOrders');
                                      Alert.alert('Success', 'Creator hired successfully!');
                                    }
                                  }
                                ]
                              );
                            }}
                          >
                            <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                            <Text style={styles.hireButtonText}>Purchase / Hire</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={[
                        styles.messageBubble,
                        isUser ? styles.userMessage : styles.senderMessage
                      ]}>
                        <Text style={[
                          styles.messageText,
                          isUser ? styles.userMessageText : styles.senderMessageText
                        ]}>
                          {message.text}
                        </Text>
                        <Text style={[
                          styles.messageTime,
                          isUser ? styles.userMessageTime : styles.senderMessageTime
                        ]}>
                          {getCurrentTime(message.createdAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachmentButton} onPress={handleFileAttachment}>
          <MaterialIcons name="attach-file" size={24} color="#6b7280" />
        </TouchableOpacity>

        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && { backgroundColor: '#cbd5e1' }]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        >
          <MaterialIcons name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#464FE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileImageEmoji: {
    fontSize: 20,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileInfo: {
    marginLeft: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  profileTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    color: '#6b7280',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 20,
    fontSize: 14,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: '#464FE5',
    alignSelf: 'flex-end',
  },
  senderMessage: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  senderMessageText: {
    color: '#2d3748',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#ffffff',
    opacity: 0.8,
  },
  senderMessageTime: {
    color: '#6b7280',
  },
  offerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  offerImageText: {
    fontSize: 24,
  },
  offerDetails: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  offerBudget: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 20,
    marginBottom: 12,
  },
  hireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  hireButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#464FE5',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMessage: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#464FE5',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  fileSize: {
    fontSize: 12,
    color: '#464FE5',
    marginTop: 2,
  },
});

export default Messages;
