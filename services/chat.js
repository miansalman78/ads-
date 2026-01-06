import { db } from './firebase';
import firestore from '@react-native-firebase/firestore';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/**
 * Send a message in a conversation
 * @param {string} conversationId 
 * @param {object} messageData 
 * @param {string} senderId 
 * @param {string} senderRole 
 */
export const sendMessage = async (conversationId, messageData, senderId, senderRole) => {
    try {
        const timestamp = firestore.FieldValue.serverTimestamp();

        // Add message to messages subcollection
        await db.collection(CONVERSATIONS_COLLECTION)
            .doc(conversationId)
            .collection(MESSAGES_COLLECTION)
            .add({
                ...messageData,
                senderId,
                senderRole,
                timestamp,
                isRead: false,
            });

        // Update conversation last message
        await db.collection(CONVERSATIONS_COLLECTION)
            .doc(conversationId)
            .update({
                lastMessage: messageData.text || (messageData.isFile ? '📎 File attached' : 'Message'),
                lastMessageTime: timestamp,
                lastMessageSenderId: senderId,
                [`unreadCount.${senderRole === 'brand' ? 'influencer' : 'brand'}`]: firestore.FieldValue.increment(1),
            });

        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

/**
 * Subscribe to messages in a conversation
 * @param {string} conversationId 
 * @param {function} callback 
 * @returns {function} unsubscribe function
 */
export const subscribeToMessages = (conversationId, callback) => {
    return db.collection(CONVERSATIONS_COLLECTION)
        .doc(conversationId)
        .collection(MESSAGES_COLLECTION)
        .orderBy('timestamp', 'asc')
        .onSnapshot(
            (snapshot) => {
                const messages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Convert timestamp to Date object if it exists
                    createdAt: doc.data().timestamp?.toDate(),
                }));
                callback(messages);
            },
            (error) => {
                console.error('Error subscribing to messages:', error);
            }
        );
};

/**
 * Get (or create) a conversation between a brand and an influencer
 * @param {string} brandId 
 * @param {string} influencerId 
 * @param {object} initialData - Optional data like names and avatars
 */
export const getOrCreateConversation = async (brandId, influencerId, initialData = {}) => {
    try {
        // Check if conversation exists
        // We construct ID deterministically to avoid querying
        // ID format: brandId_influencerId
        // Note: In a real app, you might want to query by participants array

        // Simple deterministic ID for now
        // Ensure IDs are valid key strings
        if (!brandId || !influencerId) throw new Error('Brand ID and Influencer ID are required');

        // Using a query to find existing conversation or create new one
        const querySnapshot = await db.collection(CONVERSATIONS_COLLECTION)
            .where('brandId', '==', brandId)
            .where('influencerId', '==', influencerId)
            .limit(1)
            .get();

        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }

        // Create new conversation
        const conversationData = {
            brandId,
            influencerId,
            brandName: initialData.brandName || 'Brand',
            influencerName: initialData.influencerName || 'Creator',
            brandAvatar: initialData.brandAvatar || '',
            influencerAvatar: initialData.influencerAvatar || '',
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
            unreadCount: {
                brand: 0,
                influencer: 0
            }
        };

        const docRef = await db.collection(CONVERSATIONS_COLLECTION).add(conversationData);
        return { id: docRef.id, ...conversationData };
    } catch (error) {
        console.error('Error getting/creating conversation:', error);
        throw error;
    }
};

/**
 * Subscribe to list of conversations for a user
 * @param {string} userId 
 * @param {string} role - 'brand' or 'influencer'
 * @param {function} callback 
 */
export const subscribeToConversations = (userId, role, callback) => {
    // Determine which field to query based on role
    // If user is brand, we look for brandId == userId
    // If user is influencer, we look for influencerId == userId

    // Normalized role to lower case
    const normalizedRole = role.toLowerCase();
    const queryField = normalizedRole === 'brand' ? 'brandId' : 'influencerId';

    return db.collection(CONVERSATIONS_COLLECTION)
        .where(queryField, '==', userId)
        .orderBy('lastMessageTime', 'desc')
        .onSnapshot(
            (snapshot) => {
                const conversations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    lastMessageTime: doc.data().lastMessageTime?.toDate(),
                }));
                callback(conversations);
            },
            (error) => {
                console.error('Error subscribing to conversations:', error);
            }
        );
};

/**
 * Mark messages in a conversation as read
 * @param {string} conversationId 
 * @param {string} userRole - 'brand' or 'influencer'
 */
export const markConversationAsRead = async (conversationId, userRole) => {
    try {
        const normalizedRole = userRole.toLowerCase();

        // Update unread count for this user to 0
        await db.collection(CONVERSATIONS_COLLECTION)
            .doc(conversationId)
            .update({
                [`unreadCount.${normalizedRole}`]: 0
            });

        // Note: Ideally we would also update individual messages isRead flag,
        // but for performance, just updating the conversation metadata is often enough
        // for the UI notification badges.
    } catch (error) {
        console.error('Error marking conversation as read:', error);
    }
};
