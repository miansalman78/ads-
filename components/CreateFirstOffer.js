import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const CreateFirstOffer = ({ navigation, route }) => {
    const creatorData = route?.params?.creatorData || {};
    const { primaryRole, category } = creatorData;

    const [offerTitle, setOfferTitle] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('Instagram');
    const [rate, setRate] = useState('');
    const [delivery, setDelivery] = useState('7');
    const [quantity, setQuantity] = useState('1');
    const [description, setDescription] = useState('');

    const platforms = [
        { id: 'Instagram', icon: 'camera-alt' },
        { id: 'TikTok', icon: 'music-note' },
        { id: 'YouTube', icon: 'play-circle-filled' },
        { id: 'Facebook', icon: 'facebook' },
        { id: 'Twitter', icon: 'chat' },
    ];

    const handleCreateOffer = () => {
        // Save offer and navigate to Dashboard
        navigation?.navigate('AppNavigator', {
            initialTab: 'Home',
            role: 'Creator',
            creatorData: {
                ...creatorData,
                firstOffer: {
                    title: offerTitle,
                    platform: selectedPlatform,
                    rate,
                    delivery,
                    quantity,
                    description,
                    category,
                }
            }
        });
    };

    const handleSkip = () => {
        // Skip offer creation and go to Dashboard
        navigation?.navigate('AppNavigator', {
            initialTab: 'Home',
            role: 'Creator',
            creatorData
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <MaterialIcons name="celebration" size={32} color="#464FE5" />
                        <Text style={styles.headerTitle}>Create Your First Offer</Text>
                        <Text style={styles.headerSubtitle}>
                            Start earning by creating an offer for brands
                        </Text>
                    </View>
                </View>

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '100%' }]} />
                    </View>
                    <Text style={styles.progressText}>Final Step - Step 7 of 7</Text>
                </View>

                {/* Form Content */}
                <View style={styles.formContainer}>
                    {/* Offer Title */}
                    <View style={styles.section}>
                        <Text style={styles.inputLabel}>Offer Title *</Text>
                        <View style={styles.prefixInputContainer}>
                            <View style={styles.prefixButton}>
                                <Text style={styles.prefixText}>I will</Text>
                            </View>
                            <TextInput
                                style={styles.prefixTextInput}
                                placeholder={`e.g., Create ${category || 'content'} for your brand`}
                                placeholderTextColor="#9ca3af"
                                value={offerTitle}
                                onChangeText={setOfferTitle}
                            />
                        </View>
                    </View>

                    {/* Platform Selection */}
                    <View style={styles.section}>
                        <Text style={styles.inputLabel}>Platform *</Text>
                        <View style={styles.platformContainer}>
                            {platforms.map((platform) => (
                                <TouchableOpacity
                                    key={platform.id}
                                    style={[
                                        styles.platformButton,
                                        selectedPlatform === platform.id && styles.platformButtonSelected
                                    ]}
                                    onPress={() => setSelectedPlatform(platform.id)}
                                >
                                    <MaterialIcons
                                        name={platform.icon}
                                        size={20}
                                        color={selectedPlatform === platform.id ? '#464FE5' : '#6b7280'}
                                    />
                                    <Text style={[
                                        styles.platformButtonText,
                                        selectedPlatform === platform.id && styles.platformButtonTextSelected
                                    ]}>
                                        {platform.id}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Rate and Delivery */}
                    <View style={styles.section}>
                        <View style={styles.rowContainer}>
                            <View style={styles.halfInputGroup}>
                                <Text style={styles.inputLabel}>Rate ($) *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="250"
                                    placeholderTextColor="#9ca3af"
                                    value={rate}
                                    onChangeText={setRate}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.halfInputGroup}>
                                <Text style={styles.inputLabel}>Delivery (Days) *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="7"
                                    placeholderTextColor="#9ca3af"
                                    value={delivery}
                                    onChangeText={setDelivery}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Quantity */}
                    <View style={styles.section}>
                        <Text style={styles.inputLabel}>Quantity *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="1"
                            placeholderTextColor="#9ca3af"
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                        />
                        <Text style={styles.helperText}>Number of videos/items to create</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Describe what your offer includes..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <MaterialIcons name="info-outline" size={20} color="#464FE5" />
                        <Text style={styles.infoText}>
                            You can add more offers and edit this one later from your dashboard
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[
                            styles.createButton,
                            (!offerTitle || !rate) && styles.createButtonDisabled
                        ]}
                        onPress={handleCreateOffer}
                        disabled={!offerTitle || !rate}
                    >
                        <Text style={styles.createButtonText}>Create Offer & Continue</Text>
                        <MaterialIcons name="check" size={20} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipButtonText}>Skip - I'll create offers later</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2d3748',
        marginTop: 12,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        marginBottom: 16,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#22c55e',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2d3748',
        marginBottom: 8,
    },
    prefixInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
    },
    prefixButton: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
    },
    prefixText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    prefixTextInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#374151',
    },
    platformContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    platformButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 6,
    },
    platformButtonSelected: {
        backgroundColor: '#f0f4ff',
        borderColor: '#464FE5',
    },
    platformButtonText: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    platformButtonTextSelected: {
        color: '#464FE5',
    },
    rowContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInputGroup: {
        flex: 1,
    },
    textInput: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#374151',
    },
    helperText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#f0f4ff',
        borderRadius: 8,
        padding: 12,
        gap: 12,
        marginTop: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#464FE5',
        lineHeight: 18,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        marginBottom: 40,
    },
    createButton: {
        backgroundColor: '#464FE5',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    createButtonDisabled: {
        backgroundColor: '#cbd5e1',
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    skipButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '500',
    },
});

export default CreateFirstOffer;
