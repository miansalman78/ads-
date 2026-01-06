import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

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

const OrderDetails = ({ navigation, route }) => {
    // Get user and role from AuthContext
    const { user } = useAuth();
    const userRole = user?.role?.toLowerCase();
    const isCreator = userRole === 'creator' || userRole === 'influencer';
    const isBrand = userRole === 'brand';

    // Order passed from previous screen (usually original API order from ActiveOrders)
    const routeOrder = route?.params?.order || null;

    // Fallback static order (used only if we have absolutely no data)
    const fallbackOrder = {
        id: 1,
        title: 'EcoWear Summer Line',
        company: 'EcoWear Co.',
        status: 'In Progress',
        statusColor: '#fbbf24',
        progress: 75,
        dueDate: 'Due in 5 days',
        creatorName: 'John Doe',
        creatorAvatar: '👩',
        creatorUsername: '@johndoe',
        budget: '$350',
        deliverables: '1 TikTok Video + 2 Instagram Stories',
        description: 'Create engaging content showcasing our sustainable summer collection. Focus on authenticity and eco-friendly messaging.',
    };

    // Local state for API-driven order details
    const [orderData, setOrderData] = useState(routeOrder);
    const [loading, setLoading] = useState(!routeOrder);
    const [error, setError] = useState(null);
    
    // State for submit deliverables modal (Creator)
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [deliverableUrls, setDeliverableUrls] = useState({});
    const [submitting, setSubmitting] = useState(false);
    
    // State for revision request (Brand)
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionNotes, setRevisionNotes] = useState('');
    const [requestingRevision, setRequestingRevision] = useState(false);
    
    // State for approve action (Brand)
    const [approving, setApproving] = useState(false);

    // State for reject order (Brand)
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Fetch order details from API if we have an order ID
    useEffect(() => {
        const fetchOrderDetails = async () => {
            const orderFromRoute = route?.params?.order;
            const orderId =
                orderFromRoute?._id ||
                orderFromRoute?.id ||
                route?.params?.orderId;

            if (!orderId) {
                // No ID to fetch with – just use route/fallback data
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const ordersService = await import('../services/orders');
                const response = await ordersService.getOrderDetails(orderId);

                if (response && response.data) {
                    setOrderData(response.data);
                } else {
                    setOrderData(orderFromRoute || null);
                }
                setError(null);
            } catch (err) {
                console.error('Failed to fetch order details:', err);
                setError(err.message || 'Failed to load order details');
                // Fallback to route data if available
                setOrderData(orderFromRoute || null);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [route?.params?.order, route?.params?.orderId]);

    // Initialize deliverable URLs when order data is loaded
    useEffect(() => {
        if (orderData?.deliverables && isCreator) {
            const urls = {};
            orderData.deliverables.forEach((deliverable, index) => {
                // If resubmitting (status is revisions), pre-fill with previous URLs if available
                if (orderData.status === 'revisions' && deliverable.url) {
                    urls[index] = deliverable.url;
                } else {
                urls[index] = '';
                }
            });
            setDeliverableUrls(urls);
        }
    }, [orderData, isCreator]);

    // Map API order object to UI-friendly shape
    const mapOrderToUI = (order) => {
        if (!order) return null;

        // Handle both populated objects and IDs - API returns populated brandId/creatorId
        const brand = order.brandId || order.brand || order.campaignId?.brandId || order.campaign?.brand || {};
        const creator = order.creatorId || order.creator || order.proposalId?.creatorId || order.proposal?.creator || {};

        const status = order.status || 'pending';
        const statusColors = {
            pending: '#fbbf24',
            in_progress: '#fbbf24',
            awaiting_approval: '#10b981',
            revisions: '#bfdbfe',
            content_creation: '#fbcfe8',
            review: '#fde68a',
            completed: '#10b981',
            cancelled: '#ef4444',
            rejected: '#ef4444',
        };

        const progressMap = {
            pending: 0,
            in_progress: 50,
            awaiting_approval: 100,
            revisions: 85,
            content_creation: 45,
            review: 60,
            completed: 100,
            rejected: 0,
            cancelled: 0,
        };

        // Handle dueDate from timeline object or direct property
        const dueDate = order.timeline?.dueDate || order.dueDate || order.endDate;
        const daysUntilDue = dueDate
            ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

        // Handle budget from compensation or payment object
        const budgetAmount = order.compensation?.amount || order.payment?.amount || order.totalAmount || order.amount;

        return {
            id: order._id || order.id,
            title: order.campaignId?.name || order.campaign?.name || order.title || 'Untitled Order',
            company: brand.name || brand.companyName || 'Unknown Brand',
            status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
            statusColor: statusColors[status] || '#6b7280',
            progress: progressMap[status] ?? 0,
            dueDate:
                daysUntilDue !== null
                    ? daysUntilDue > 0
                        ? `Due in ${daysUntilDue} days`
                        : daysUntilDue === 0
                        ? 'Due today'
                        : `Overdue by ${Math.abs(daysUntilDue)} days`
                    : 'No due date',
            creatorName: creator.name || 'Unknown Creator',
            creatorAvatar: creator.profileImage || null,
            creatorUsername: creator.username ? `@${creator.username}` : '',
            budget: budgetAmount ? `$${budgetAmount}` : 'N/A',
            deliverables:
                order.deliverables?.map((d) => `${d.quantity || 1} ${d.type || 'item'}`).join(' + ') ||
                'N/A',
            description:
                order.brief || order.description || order.campaignId?.description || order.campaign?.description || 'No description',
            _original: order,
        };
    };

    const mappedOrder = mapOrderToUI(orderData);
    const displayOrder = mappedOrder || fallbackOrder;
    const orderStatus = orderData?.status || displayOrder?.status?.toLowerCase() || 'pending';

    // Refresh order data after API calls
    const refreshOrderData = async () => {
        // Use the most current orderId - try from current orderData first, then route params
        const currentOrderId = orderData?._id || orderData?.id;
        const routeOrderId = route?.params?.order?._id || route?.params?.order?.id || route?.params?.orderId;
        const orderId = currentOrderId || routeOrderId;
        
        if (!orderId) {
            console.warn('Cannot refresh order: No order ID available');
            return;
        }
        
        try {
            const ordersService = await import('../services/orders');
            const response = await ordersService.getOrderDetails(orderId);
            if (response && response.data) {
                setOrderData(response.data);
                // Force re-render by updating the mapped order
            }
        } catch (err) {
            console.error('Failed to refresh order:', err);
        }
    };

    // Creator: Submit Deliverables
    const handleSubmitDeliverables = async () => {
        const orderId = orderData?._id || orderData?.id;
        if (!orderId) {
            Alert.alert('Error', 'Order ID not found');
            return;
        }

        // Build deliverables array from URLs
        const deliverables = [];
        if (orderData?.deliverables) {
            orderData.deliverables.forEach((deliverable, index) => {
                const url = deliverableUrls[index];
                if (url && url.trim()) {
                    // Determine type based on deliverable type or URL extension
                    let mediaType = 'video';
                    if (deliverable.type === 'story' || deliverable.type === 'post') {
                        mediaType = 'image';
                    } else if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')) {
                        mediaType = 'image';
                    } else if (url.includes('.mp4') || url.includes('.mov')) {
                        mediaType = 'video';
                    }
                    
                    deliverables.push({
                        url: url.trim(),
                        type: mediaType,
                        platform: deliverable.platform || 'instagram'
                    });
                }
            });
        }

        if (deliverables.length === 0) {
            Alert.alert('Error', 'Please provide at least one deliverable URL');
            return;
        }

        try {
            setSubmitting(true);
            const ordersService = await import('../services/orders');
            const response = await ordersService.submitDeliverables(orderId, deliverables);
            
            // Update order data immediately from response if available
            if (response && response.data) {
                setOrderData(response.data);
            }
            
            // Always refresh from API to ensure we have the latest data
            await refreshOrderData();
            
            Alert.alert('Success', 'Deliverables submitted successfully!', [
                { text: 'OK', onPress: () => {
                    setShowSubmitModal(false);
                    // Close modal first, then refresh again to be safe
                    setTimeout(() => {
                        refreshOrderData();
                    }, 100);
                }}
            ]);
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to submit deliverables');
        } finally {
            setSubmitting(false);
        }
    };

    // Brand: Approve Deliverables
    const handleApproveDeliverables = async () => {
        const orderId = orderData?._id || orderData?.id;
        if (!orderId) {
            Alert.alert('Error', 'Order ID not found');
            return;
        }

        Alert.alert(
            'Approve Deliverables',
            'Are you sure you want to approve these deliverables? The order will be marked as completed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            setApproving(true);
                            const ordersService = await import('../services/orders');
                            const response = await ordersService.approveDeliverables(orderId);
                            
                            // Update order data from response if available
                            let updatedOrderData = orderData;
                            if (response && response.data) {
                                setOrderData(response.data);
                                updatedOrderData = response.data;
                            } else {
                                // Otherwise refresh from API
                                await refreshOrderData();
                            }
                            
                            Alert.alert('Success', 'Deliverables approved and order completed!', [
                                { text: 'OK', onPress: () => {
                                    // Navigate to review screen with the order data
                                    // Use response data if available, otherwise use current orderData
                                    const orderForReview = updatedOrderData || orderData;
                                    navigation?.navigate('LeaveReview', { order: orderForReview });
                                }}
                            ]);
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to approve deliverables');
                        } finally {
                            setApproving(false);
                        }
                    }
                }
            ]
        );
    };

    // Brand: Request Revisions
    const handleRequestRevisions = async () => {
        if (!revisionNotes.trim()) {
            Alert.alert('Error', 'Please provide revision notes');
            return;
        }

        const orderId = orderData?._id || orderData?.id;
        if (!orderId) {
            Alert.alert('Error', 'Order ID not found');
            return;
        }

        try {
            setRequestingRevision(true);
            const ordersService = await import('../services/orders');
            await ordersService.requestRevisions(orderId, revisionNotes.trim());
            Alert.alert('Success', 'Revision request sent successfully!', [
                { text: 'OK', onPress: () => {
                    setShowRevisionModal(false);
                    setRevisionNotes('');
                    refreshOrderData();
                }}
            ]);
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to request revisions');
        } finally {
            setRequestingRevision(false);
        }
    };

    // Brand: Reject Order
    const handleRejectOrder = async () => {
        if (!rejectReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for rejection');
            return;
        }

        const orderId = orderData?._id || orderData?.id;
        if (!orderId) {
            Alert.alert('Error', 'Order ID not found');
            return;
        }

        Alert.alert(
            'Reject Order',
            'Are you sure you want to reject this order? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRejecting(true);
                            const ordersService = await import('../services/orders');
                            // Use updateOrder to set status to rejected
                            await ordersService.updateOrder(orderId, {
                                status: 'rejected',
                                rejectionReason: rejectReason.trim(),
                            });
                            Alert.alert('Success', 'Order rejected successfully.', [
                                { text: 'OK', onPress: () => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                    refreshOrderData();
                                }}
                            ]);
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to reject order');
                        } finally {
                            setRejecting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleChat = () => {
        navigation?.navigate('Messages');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
                        <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order Details</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading order details...</Text>
                    </View>
                )}

                {/* Error State */}
                {error && !loading && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Order Content */}
                {!loading && !error && displayOrder && (
                    <>
                        {/* Order Title & Status */}
                        <View style={styles.titleSection}>
                            <Text style={styles.orderTitle}>{displayOrder.title}</Text>
                            <Text style={styles.companyName}>{displayOrder.company}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: displayOrder.statusColor }]}>
                                <Text style={styles.statusText}>{displayOrder.status}</Text>
                            </View>
                        </View>

                        {/* Progress Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Progress</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${displayOrder.progress}%` }]} />
                            </View>
                            <View style={styles.progressInfo}>
                                <Text style={styles.progressText}>{displayOrder.progress}% Complete</Text>
                                <Text style={styles.dueDateText}>{displayOrder.dueDate}</Text>
                            </View>
                        </View>

                        {/* Creator Details */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Creator</Text>
                            <View style={styles.creatorCard}>
                                {displayOrder.creatorAvatar && typeof displayOrder.creatorAvatar === 'string' && displayOrder.creatorAvatar.startsWith('http') ? (
                                    <Image source={{ uri: displayOrder.creatorAvatar }} style={styles.creatorAvatarImage} />
                                ) : (
                                    <View style={styles.creatorAvatar}>
                                        <Text style={styles.avatarText}>
                                            {displayOrder.creatorAvatar || displayOrder.creatorName?.charAt(0)?.toUpperCase() || '👤'}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.creatorInfo}>
                                    <Text style={styles.creatorName}>{displayOrder.creatorName}</Text>
                                    <Text style={styles.creatorUsername}>{displayOrder.creatorUsername}</Text>
                                </View>
                                <TouchableOpacity style={styles.chatIconButton} onPress={handleChat}>
                                    <MaterialIcons name="chat-bubble-outline" size={24} color="#464FE5" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Order Details */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Details</Text>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Budget</Text>
                                <Text style={styles.detailValue}>{displayOrder.budget}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Deliverables</Text>
                                <Text style={styles.detailValue}>{displayOrder.deliverables}</Text>
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.descriptionText}>{displayOrder.description}</Text>
                        </View>

                        {/* Revision Notes (Creator - when status is revisions) */}
                        {isCreator && orderStatus === 'revisions' && orderData?.revisionNotes && (
                            <View style={styles.revisionNotesSection}>
                                <View style={styles.revisionNotesHeader}>
                                    <MaterialIcons name="edit" size={20} color="#464FE5" />
                                    <Text style={styles.revisionNotesTitle}>Revision Request</Text>
                                </View>
                                <Text style={styles.revisionNotesText}>{orderData.revisionNotes}</Text>
                                <Text style={styles.revisionNotesHint}>
                                    Please review the feedback above and resubmit your deliverables with the requested changes.
                                </Text>
                            </View>
                        )}

                        {/* Rejection Reason (Creator - when status is rejected) */}
                        {isCreator && orderStatus === 'rejected' && orderData?.rejectionReason && (
                            <View style={styles.rejectionSection}>
                                <View style={styles.rejectionHeader}>
                                    <MaterialIcons name="cancel" size={20} color="#ef4444" />
                                    <Text style={styles.rejectionTitle}>Rejection Reason</Text>
                                </View>
                                <Text style={styles.rejectionText}>{orderData.rejectionReason}</Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
                                <MaterialIcons name="chat-bubble" size={18} color="#0284c7" />
                                <Text style={styles.chatButtonText}>Chat</Text>
                            </TouchableOpacity>

                            {/* Creator: Submit/Resubmit Deliverables Button */}
                            {isCreator && (orderStatus === 'pending' || orderStatus === 'in_progress' || orderStatus === 'revisions') && (
                                <TouchableOpacity 
                                    style={styles.submitButton} 
                                    onPress={() => setShowSubmitModal(true)}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <>
                                            <MaterialIcons name={orderStatus === 'revisions' ? "refresh" : "cloud-upload"} size={18} color="#ffffff" />
                                            <Text style={styles.submitButtonText}>
                                                {orderStatus === 'revisions' ? 'Resubmit Deliverables' : 'Submit Deliverables'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            {/* Creator: Rejected Order Message */}
                            {isCreator && orderStatus === 'rejected' && (
                                <View style={styles.rejectedContainer}>
                                    <MaterialIcons name="cancel" size={32} color="#dc2626" />
                                    <Text style={styles.rejectedTitle}>Order Rejected</Text>
                                    <Text style={styles.rejectedMessage}>
                                        This order has been rejected by the brand. Please contact support or message the brand for more information.
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.contactButton} 
                                        onPress={handleChat}
                                    >
                                        <MaterialIcons name="chat-bubble" size={18} color="#464FE5" />
                                        <Text style={styles.contactButtonText}>Contact Brand</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Brand: Approve/Request Revision/Reject Buttons */}
                            {isBrand && orderStatus === 'awaiting_approval' && (
                                <>
                                    <TouchableOpacity 
                                        style={styles.approveButton} 
                                        onPress={handleApproveDeliverables}
                                        disabled={approving}
                                    >
                                        {approving ? (
                                            <ActivityIndicator color="#ffffff" />
                                        ) : (
                                            <>
                                                <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                                                <Text style={styles.approveButtonText}>Approve</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.revisionButton} 
                                        onPress={() => setShowRevisionModal(true)}
                                        disabled={requestingRevision}
                                    >
                                        <MaterialIcons name="edit" size={18} color="#0284c7" />
                                        <Text style={styles.revisionButtonText}>Request Revision</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.rejectOrderButton} 
                                        onPress={() => setShowRejectModal(true)}
                                        disabled={rejecting}
                                    >
                                        <MaterialIcons name="close" size={18} color="#dc2626" />
                                        <Text style={styles.rejectOrderButtonText}>Reject</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Completed order - Show review option */}
                            {orderStatus === 'completed' && (
                                <TouchableOpacity 
                                    style={styles.reviewButton} 
                                    onPress={() => navigation?.navigate('LeaveReview', { order: orderData || mappedOrder?._original })}
                                >
                                    <MaterialIcons name="star" size={18} color="#ffffff" />
                                    <Text style={styles.reviewButtonText}>Leave Review</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Submit Deliverables Modal (Creator) */}
            <Modal
                visible={showSubmitModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSubmitModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {orderStatus === 'revisions' ? 'Resubmit Deliverables' : 'Submit Deliverables'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowSubmitModal(false)}>
                                <MaterialIcons name="close" size={24} color="#2d3748" />
                            </TouchableOpacity>
                        </View>
                        
                        {orderStatus === 'revisions' && orderData?.revisionNotes && (
                            <View style={styles.modalRevisionNotice}>
                                <MaterialIcons name="info" size={18} color="#1e40af" />
                                <Text style={styles.modalRevisionNoticeText}>
                                    Revision Feedback: {orderData.revisionNotes}
                                </Text>
                            </View>
                        )}
                        
                        <ScrollView style={styles.modalBody}>
                            {orderData?.deliverables?.map((deliverable, index) => (
                                <View key={index} style={styles.deliverableInputGroup}>
                                    <Text style={styles.deliverableLabel}>
                                        {deliverable.quantity || 1}x {deliverable.type || 'Deliverable'} ({deliverable.platform || 'Platform'})
                                    </Text>
                                    <TextInput
                                        style={styles.urlInput}
                                        placeholder="Enter deliverable URL (e.g., https://cloudinary.com/video.mp4)"
                                        value={deliverableUrls[index] || ''}
                                        onChangeText={(text) => setDeliverableUrls({ ...deliverableUrls, [index]: text })}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.cancelModalButton} 
                                onPress={() => setShowSubmitModal(false)}
                            >
                                <Text style={styles.cancelModalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.submitModalButton} 
                                onPress={handleSubmitDeliverables}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.submitModalButtonText}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Request Revision Modal (Brand) */}
            <Modal
                visible={showRevisionModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRevisionModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Revision</Text>
                            <TouchableOpacity onPress={() => setShowRevisionModal(false)}>
                                <MaterialIcons name="close" size={24} color="#2d3748" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalBody}>
                            <Text style={styles.revisionLabel}>Revision Notes</Text>
                            <TextInput
                                style={styles.revisionInput}
                                placeholder="Please describe what needs to be changed..."
                                value={revisionNotes}
                                onChangeText={setRevisionNotes}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.cancelModalButton} 
                                onPress={() => {
                                    setShowRevisionModal(false);
                                    setRevisionNotes('');
                                }}
                            >
                                <Text style={styles.cancelModalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.submitModalButton} 
                                onPress={handleRequestRevisions}
                                disabled={requestingRevision || !revisionNotes.trim()}
                            >
                                {requestingRevision ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.submitModalButtonText}>Request Revision</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reject Order Modal (Brand) */}
            <Modal
                visible={showRejectModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reject Order</Text>
                            <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                                <MaterialIcons name="close" size={24} color="#2d3748" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalBody}>
                            <Text style={styles.revisionLabel}>Rejection Reason *</Text>
                            <TextInput
                                style={styles.revisionInput}
                                placeholder="Please provide a reason for rejecting this order..."
                                value={rejectReason}
                                onChangeText={setRejectReason}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />
                            <Text style={styles.modalHint}>
                                This reason will be shared with the creator. Please be specific about why the order is being rejected.
                            </Text>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.cancelModalButton} 
                                onPress={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                            >
                                <Text style={styles.cancelModalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.rejectModalButton} 
                                onPress={handleRejectOrder}
                                disabled={rejecting || !rejectReason.trim()}
                            >
                                {rejecting ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.rejectModalButtonText}>Reject Order</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
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
    titleSection: {
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    orderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    companyName: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 12,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1f2937',
    },
    section: {
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#464FE5',
        borderRadius: 4,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    dueDateText: {
        fontSize: 14,
        color: '#6b7280',
    },
    creatorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
    },
    creatorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    creatorAvatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    avatarText: {
        fontSize: 24,
    },
    creatorInfo: {
        flex: 1,
    },
    creatorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    creatorUsername: {
        fontSize: 14,
        color: '#6b7280',
    },
    chatIconButton: {
        padding: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    descriptionText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 22,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 10,
        backgroundColor: '#fff',
        marginBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    chatButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f9ff',
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#bae6fd',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chatButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0284c7',
        letterSpacing: 0.3,
    },
    deliveredButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    deliveredButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
    },
    errorContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    submitButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#464FE5',
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 6,
        shadowColor: '#464FE5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    submitButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 6,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    approveButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
    revisionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f9ff',
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#bae6fd',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    revisionButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0284c7',
        letterSpacing: 0.3,
    },
    reviewButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f59e0b',
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 6,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    reviewButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.3,
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
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalBody: {
        padding: 20,
        maxHeight: 400,
    },
    deliverableInputGroup: {
        marginBottom: 20,
    },
    deliverableLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    urlInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1f2937',
        backgroundColor: '#ffffff',
    },
    revisionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    revisionInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1f2937',
        backgroundColor: '#ffffff',
        minHeight: 120,
    },
    revisionNotesSection: {
        backgroundColor: '#eff6ff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    revisionNotesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    revisionNotesTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e40af',
    },
    revisionNotesText: {
        fontSize: 15,
        color: '#1e3a8a',
        lineHeight: 22,
        marginBottom: 12,
    },
    revisionNotesHint: {
        fontSize: 13,
        color: '#3b82f6',
        fontStyle: 'italic',
    },
    rejectionSection: {
        backgroundColor: '#fef2f2',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    rejectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    rejectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#991b1b',
    },
    rejectionText: {
        fontSize: 15,
        color: '#7f1d1d',
        lineHeight: 22,
    },
    rejectedContainer: {
        flex: 1,
        backgroundColor: '#fef2f2',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#fecaca',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 16,
    },
    rejectedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#991b1b',
        marginTop: 12,
        marginBottom: 8,
    },
    rejectedMessage: {
        fontSize: 14,
        color: '#7f1d1d',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#464FE5',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    contactButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#464FE5',
        letterSpacing: 0.3,
    },
    rejectOrderButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#fca5a5',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    rejectOrderButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#dc2626',
        letterSpacing: 0.3,
    },
    rejectModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectModalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    modalHint: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
        fontStyle: 'italic',
    },
    modalRevisionNotice: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 12,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        gap: 8,
    },
    modalRevisionNoticeText: {
        flex: 1,
        fontSize: 13,
        color: '#1e3a8a',
        lineHeight: 18,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    cancelModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelModalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    submitModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#464FE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitModalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});

export default OrderDetails;
