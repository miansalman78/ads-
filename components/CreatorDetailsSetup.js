import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import image picker - handle both ES6 and CommonJS
let launchCamera, launchImageLibrary;
try {
    const ImagePicker = require('react-native-image-picker');
    launchCamera = ImagePicker.launchCamera || ImagePicker.default?.launchCamera;
    launchImageLibrary = ImagePicker.launchImageLibrary || ImagePicker.default?.launchImageLibrary;

    // Fallback if still not found
    if (!launchCamera || !launchImageLibrary) {
        console.warn('Image picker not properly loaded, using fallback');
        launchCamera = () => Alert.alert('Error', 'Camera not available');
        launchImageLibrary = () => Alert.alert('Error', 'Gallery not available');
    }
} catch (error) {
    console.error('Error importing image picker:', error);
    launchCamera = () => Alert.alert('Error', 'Camera not available');
    launchImageLibrary = () => Alert.alert('Error', 'Gallery not available');
}

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

const CreatorDetailsSetup = ({ navigation, route }) => {
    const primaryRole = route?.params?.primaryRole || 'Creator';
    const roleId = route?.params?.roleId || '';

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6;

    // Form data
    const [category, setCategory] = useState('Food');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [country, setCountry] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [showLocation, setShowLocation] = useState(true); // Toggle for location visibility
    const [gender, setGender] = useState(null);
    const [profilePicture, setProfilePicture] = useState(null);
    const [portfolio, setPortfolio] = useState(null);

    const categories = [
        'Food',
        'Tech',
        'Health & Wellness',
        'Fashion',
        'Beauty',
        'Travel',
        'Fitness',
        'Lifestyle',
        'Gaming',
        'Education',
    ];

    const genderOptions = [
        { id: 'male', name: 'Male', icon: 'male' },
        { id: 'female', name: 'Female', icon: 'female' },
        { id: 'other', name: 'Other', icon: 'transgender' },
        { id: 'prefer_not_to_say', name: 'Prefer not to say', icon: 'help-outline' },
    ];

    const handleNext = () => {
        // Step 2 (Location) can be skipped
        if (currentStep === 2 && !country && !state && !city) {
            // Allow skip
        }

        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        if (currentStep === 2 || currentStep === 4 || currentStep === 5) {
            handleNext();
        }
    };

    const handleComplete = () => {
        // Save all data and navigate to CreateFirstOffer or Dashboard
        const creatorData = {
            primaryRole,
            roleId,
            category,
            location: { country, state, city },
            showLocation, // Include location visibility preference
            gender,
            profilePicture,
            portfolio,
        };

        // Navigate to CreateFirstOffer (optional step)
        navigation?.navigate('CreateFirstOffer', { creatorData });
    };

    const handleUploadProfilePicture = () => {
        Alert.alert(
            'Upload Profile Picture',
            'Choose an option',
            [
                {
                    text: 'Take Photo',
                    onPress: () => {
                        Alert.alert('Success', 'Camera will open here. Using mock image for now.');
                        setProfilePicture({
                            uri: 'https://via.placeholder.com/150/464FE5/FFFFFF?text=Profile',
                            fileName: 'camera_photo.jpg',
                            type: 'image/jpeg'
                        });
                    }
                },
                {
                    text: 'Choose from Gallery',
                    onPress: () => {
                        Alert.alert('Success', 'Gallery will open here. Using mock image for now.');
                        setProfilePicture({
                            uri: 'https://via.placeholder.com/150/22c55e/FFFFFF?text=Gallery',
                            fileName: 'gallery_photo.jpg',
                            type: 'image/jpeg'
                        });
                    }
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const handleUploadPortfolio = () => {
        Alert.alert(
            'Upload Portfolio',
            'Choose an option',
            [
                {
                    text: 'Take Photo',
                    onPress: () => {
                        Alert.alert('Success', 'Camera will open here. Using mock image for now.');
                        setPortfolio({
                            uri: 'https://via.placeholder.com/300/464FE5/FFFFFF?text=Portfolio',
                            fileName: 'camera_portfolio.jpg',
                            type: 'image/jpeg'
                        });
                    }
                },
                {
                    text: 'Choose from Gallery',
                    onPress: () => {
                        Alert.alert('Success', 'Gallery will open here. Using mock image for now.');
                        setPortfolio({
                            uri: 'https://via.placeholder.com/300/22c55e/FFFFFF?text=Portfolio',
                            fileName: 'gallery_portfolio.jpg',
                            type: 'image/jpeg'
                        });
                    }
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const getProgressPercentage = () => {
        return `${(currentStep / totalSteps) * 100}%`;
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return category !== null;
            case 2: return true; // Location is skippable
            case 3: return gender !== null;
            case 4: return true; // Profile picture is skippable
            case 5: return true; // Portfolio is skippable
            case 6: return true; // Final step
            default: return false;
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Choose Your Category</Text>
                        <Text style={styles.stepSubtitle}>Select the category that best fits your services</Text>

                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        >
                            <Text style={styles.dropdownText}>{category}</Text>
                            <MaterialIcons name="keyboard-arrow-down" size={20} color="#6b7280" />
                        </TouchableOpacity>

                        {showCategoryDropdown && (
                            <View style={styles.dropdownOptions}>
                                {categories.map((cat, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.dropdownOption}
                                        onPress={() => {
                                            setCategory(cat);
                                            setShowCategoryDropdown(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownOptionText}>{cat}</Text>
                                        {category === cat && (
                                            <MaterialIcons name="check" size={20} color="#464FE5" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Add Your Location</Text>
                        <Text style={styles.stepSubtitle}>Help brands find you (optional)</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Country</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g., United States"
                                placeholderTextColor="#9ca3af"
                                value={country}
                                onChangeText={setCountry}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>State/Province</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g., California"
                                placeholderTextColor="#9ca3af"
                                value={state}
                                onChangeText={setState}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>City</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g., Los Angeles"
                                placeholderTextColor="#9ca3af"
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.locationToggleContainer}
                            onPress={() => setShowLocation(!showLocation)}
                        >
                            <View style={[styles.checkbox, showLocation && styles.checkboxSelected]}>
                                {showLocation && <MaterialIcons name="check" size={16} color="#ffffff" />}
                            </View>
                            <Text style={styles.locationToggleText}>Show my location publicly</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipButtonText}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>What's Your Gender?</Text>
                        <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>

                        <View style={styles.genderGrid}>
                            {genderOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.genderCard,
                                        gender === option.id && styles.genderCardSelected
                                    ]}
                                    onPress={() => setGender(option.id)}
                                >
                                    <MaterialIcons
                                        name={option.icon}
                                        size={32}
                                        color={gender === option.id ? '#464FE5' : '#6b7280'}
                                    />
                                    <Text style={[
                                        styles.genderText,
                                        gender === option.id && styles.genderTextSelected
                                    ]}>
                                        {option.name}
                                    </Text>
                                    {gender === option.id && (
                                        <View style={styles.checkmark}>
                                            <MaterialIcons name="check-circle" size={20} color="#464FE5" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 4:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Upload Profile Picture</Text>
                        <Text style={styles.stepSubtitle}>Add a photo to personalize your profile</Text>

                        <TouchableOpacity
                            style={styles.uploadArea}
                            onPress={handleUploadProfilePicture}
                        >
                            {profilePicture ? (
                                <View style={styles.uploadedContainer}>
                                    <Image
                                        source={{ uri: profilePicture.uri }}
                                        style={styles.uploadedImage}
                                    />
                                    <MaterialIcons name="check-circle" size={32} color="#22c55e" style={styles.checkIcon} />
                                    <Text style={styles.uploadedText}>Profile picture uploaded!</Text>
                                    <Text style={styles.uploadedSubtext}>Tap to change</Text>
                                </View>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <MaterialIcons name="account-circle" size={80} color="#cbd5e1" />
                                    <Text style={styles.uploadText}>Tap to upload photo</Text>
                                    <Text style={styles.uploadSubtext}>Camera or Gallery</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipButtonText}>Skip - Use default avatar</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 5:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Upload Your First Portfolio Item</Text>
                        <Text style={styles.stepSubtitle}>Showcase your work to attract brands</Text>

                        <TouchableOpacity
                            style={styles.uploadArea}
                            onPress={handleUploadPortfolio}
                        >
                            {portfolio ? (
                                <View style={styles.uploadedContainer}>
                                    <Image
                                        source={{ uri: portfolio.uri }}
                                        style={styles.uploadedImage}
                                    />
                                    <MaterialIcons name="check-circle" size={32} color="#22c55e" style={styles.checkIcon} />
                                    <Text style={styles.uploadedText}>Portfolio item uploaded!</Text>
                                    <Text style={styles.uploadedSubtext}>Tap to change</Text>
                                </View>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <MaterialIcons name="collections" size={80} color="#cbd5e1" />
                                    <Text style={styles.uploadText}>Tap to upload</Text>
                                    <Text style={styles.uploadSubtext}>Camera or Gallery</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipButtonText}>Skip - Add later from profile</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 6:
                return (
                    <View style={styles.stepContent}>
                        <View style={styles.summaryContainer}>
                            <MaterialIcons name="check-circle" size={64} color="#22c55e" />
                            <Text style={styles.summaryTitle}>Almost Done!</Text>
                            <Text style={styles.summarySubtitle}>
                                Your profile is set up. Next, you can create your first offer or skip to dashboard.
                            </Text>

                            <View style={styles.summaryDetails}>
                                <View style={styles.summaryItem}>
                                    <MaterialIcons name="work" size={20} color="#464FE5" />
                                    <Text style={styles.summaryItemText}>{primaryRole}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <MaterialIcons name="category" size={20} color="#464FE5" />
                                    <Text style={styles.summaryItemText}>{category}</Text>
                                </View>
                                {gender && (
                                    <View style={styles.summaryItem}>
                                        <MaterialIcons name="person" size={20} color="#464FE5" />
                                        <Text style={styles.summaryItemText}>
                                            {genderOptions.find(g => g.id === gender)?.name}
                                        </Text>
                                    </View>
                                )}
                                {(country || city) && (
                                    <View style={styles.summaryItem}>
                                        <MaterialIcons name="location-on" size={20} color="#464FE5" />
                                        <Text style={styles.summaryItemText}>
                                            {[city, state, country].filter(Boolean).join(', ')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    {currentStep > 1 && (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>Complete Your Profile</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: getProgressPercentage() }]} />
                    </View>
                    <Text style={styles.progressText}>Step {currentStep} of {totalSteps}</Text>
                </View>

                {/* Step Content */}
                {renderStepContent()}

                {/* Navigation Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.continueButton, !canProceed() && styles.continueButtonDisabled]}
                        onPress={handleNext}
                        disabled={!canProceed()}
                    >
                        <Text style={styles.continueButtonText}>
                            {currentStep === totalSteps ? 'Complete Setup' : 'Continue'}
                        </Text>
                        <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3748',
    },
    headerSpacer: {
        width: 32,
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
        backgroundColor: '#464FE5',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
    },
    stepContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2d3748',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 24,
        lineHeight: 22,
    },
    dropdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dropdownText: {
        fontSize: 16,
        color: '#374151',
    },
    dropdownOptions: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        marginTop: 8,
        maxHeight: 300,
    },
    dropdownOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    dropdownOptionText: {
        fontSize: 15,
        color: '#374151',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#374151',
    },
    genderGrid: {
        gap: 12,
    },
    genderCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        position: 'relative',
    },
    genderCardSelected: {
        borderColor: '#464FE5',
        backgroundColor: '#f0f4ff',
    },
    genderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3748',
        marginLeft: 16,
        flex: 1,
    },
    genderTextSelected: {
        color: '#464FE5',
    },
    checkmark: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    uploadArea: {
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    uploadSubtext: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    uploadedContainer: {
        alignItems: 'center',
        position: 'relative',
    },
    uploadedImage: {
        width: 150,
        height: 150,
        borderRadius: 12,
        marginBottom: 12,
    },
    checkIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#ffffff',
        borderRadius: 16,
    },
    uploadedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#22c55e',
        marginTop: 8,
    },
    uploadedSubtext: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
    },
    skipButton: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '500',
    },
    locationToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        backgroundColor: '#464FE5',
        borderColor: '#464FE5',
    },
    locationToggleText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    summaryContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    summaryTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2d3748',
        marginTop: 16,
        marginBottom: 8,
    },
    summarySubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    summaryDetails: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        gap: 16,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    summaryItemText: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        marginBottom: 40,
    },
    continueButton: {
        backgroundColor: '#464FE5',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    continueButtonDisabled: {
        backgroundColor: '#cbd5e1',
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
    },
});

export default CreatorDetailsSetup;
