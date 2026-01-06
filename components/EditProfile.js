import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { USER_PROFILE_CATEGORIES, VALID_PLATFORMS } from '../utils/apiConstants';

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

const EditProfile = ({ navigation, route }) => {
  // Get basic user info from AuthContext as a fallback/pre-fill source
  const { user } = useAuth();
  // Get user role from navigation params
  // Check multiple possible formats: 'Creator', 'creator', 'Brand', 'brand'
  let userRoleParam = route?.params?.role || navigation?.getParam?.('role');

  // If role not found in params, try to determine from navigation state
  if (!userRoleParam) {
    // Check if we can determine from navigation state or screen history
    // This is a fallback - ideally role should be passed as param
    userRoleParam = 'Creator'; // Default fallback
  }

  // Determine role - normalize to lowercase for comparison
  const roleLower = userRoleParam?.toLowerCase() || 'creator';
  const isCreator = roleLower === 'creator';
  const isBrand = roleLower === 'brand';

  // Debug log to help identify the issue
  console.log('EditProfile - Role detection:', { userRoleParam, roleLower, isCreator, isBrand });

  // Use the normalized role
  const userRole = isBrand ? 'Brand' : 'Creator';

  // Personal Details State (start empty, filled from API)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Social Media State
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [twitter, setTwitter] = useState('');
  const [facebook, setFacebook] = useState('');

  // Creator-specific State
  const [categories, setCategories] = useState([]);
  const [platformMetrics, setPlatformMetrics] = useState([]);

  // Brand-specific State
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [campaignBudget, setCampaignBudget] = useState('');
  const [brandTagline, setBrandTagline] = useState('');

  // Payment Details (Creator only)
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [paystackEmail, setPaystackEmail] = useState('');

  // Profile Images (blank until loaded from API)
  const [profileImage, setProfileImage] = useState('');
  const [bannerImage, setBannerImage] = useState('');

  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    social: true,
    roleSpecific: true,
    payment: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleImagePicker = () => {
    // TODO: Implement image picker
    Alert.alert('Image Picker', 'Select from Camera or Gallery', [
      { text: 'Camera', onPress: () => console.log('Open camera') },
      { text: 'Gallery', onPress: () => console.log('Open gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setSaving(true);
    console.log('[EditProfile] Saving profile...');

    // Prepare profile data based on role - matching API structure exactly as provided
    const profileData = {
      name: fullName,
      phone: phone || undefined,
      bio: bio || undefined,
      website: website || undefined,
      profileImage: profileImage || undefined,
      bannerImage: bannerImage || undefined,
      isPublic: isPublic,
    };

    // Location structure matching API - includes coordinates
    if (city || state || country || (latitude && longitude)) {
      profileData.location = {
        ...(city && { city: city.trim() }),
        ...(state && { state: state.trim() }),
        ...(country && { country: country.trim() }),
        ...((latitude && longitude) && {
          coordinates: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
        }),
      };
    }

    // Social Media - only include if at least one field has value
    const socialMediaObj = {};
    if (instagram) socialMediaObj.instagram = instagram.trim();
    if (tiktok) socialMediaObj.tiktok = tiktok.trim();
    if (youtube) socialMediaObj.youtube = youtube.trim();
    if (twitter) socialMediaObj.twitter = twitter.trim();
    if (facebook) socialMediaObj.facebook = facebook.trim();
    if (Object.keys(socialMediaObj).length > 0) {
      profileData.socialMedia = socialMediaObj;
    }

    // Tags - convert comma-separated string to array
    if (tags) {
      profileData.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    if (isCreator) {
      // Categories: Validate and ensure all are valid backend enum values
      if (categories.length > 0) {
        const validCategories = categories.filter(cat => USER_PROFILE_CATEGORIES.includes(cat));
        if (validCategories.length > 0) {
          profileData.categories = validCategories;
        }
      }
      // platformMetrics structure: [{ platform, followers, engagementRate, avgViews, verified }]
      // Ensure platform values are valid enum values (lowercase)
      if (platformMetrics.length > 0) {
        profileData.platformMetrics = platformMetrics.map(metric => {
          const platform = metric.platform?.toLowerCase() || '';
          return {
            platform: VALID_PLATFORMS.includes(platform) ? platform : metric.platform, // Backend will validate
            followers: metric.followers || metric.count || 0,
            engagementRate: metric.engagementRate || metric.rate || 0,
            avgViews: metric.avgViews || 0,
            verified: metric.verified || false,
          };
        });
      }
      // Payment details - only include if at least one field has value
      if (bankName || accountNumber || accountHolderName || paystackEmail) {
        profileData.payment = {
          ...(bankName && { bankName }),
          ...(accountNumber && { accountNumber }),
          ...(accountHolderName && { accountHolderName }),
          ...(paystackEmail && { paystackEmail }),
        };
      }
    } else {
      // Brand specific fields
      if (companyName) profileData.companyName = companyName;
      if (industry) profileData.industry = industry;
      if (brandTagline) profileData.brandTagline = brandTagline;
      if (campaignBudget) profileData.campaignBudget = campaignBudget;
    }

    // Remove undefined values to keep payload clean
    Object.keys(profileData).forEach(key => {
      if (profileData[key] === undefined) {
        delete profileData[key];
      }
    });

    console.log('[EditProfile] Update payload:', JSON.stringify(profileData, null, 2));

    try {
      const { updateProfile } = await import('../services/user');
      const response = await updateProfile(profileData);
      console.log('[EditProfile] Update response:', JSON.stringify(response, null, 2));

      if (response && (response.success !== false)) {
        // Refetch profile data to display updated values
        try {
          const { getMyProfile } = await import('../services/user');
          const refreshResponse = await getMyProfile();
          const refreshedProfile = refreshResponse?.data || refreshResponse;
          
          if (refreshedProfile) {
            // Update social media - check if it's a valid object with at least one key
            if (refreshedProfile.socialMedia && typeof refreshedProfile.socialMedia === 'object' && Object.keys(refreshedProfile.socialMedia).length > 0) {
              setInstagram(refreshedProfile.socialMedia.instagram || '');
              setTiktok(refreshedProfile.socialMedia.tiktok || '');
              setYoutube(refreshedProfile.socialMedia.youtube || '');
              setTwitter(refreshedProfile.socialMedia.twitter || '');
              setFacebook(refreshedProfile.socialMedia.facebook || '');
            } else {
              // If socialMedia is null/undefined/empty object, keep existing values or reset if needed
              // Don't reset to empty - keep what user just saved in case API hasn't updated yet
              console.log('[EditProfile] Social media not found in refreshed profile, keeping existing values');
            }
            
            // Update payment details if creator
            if (isCreator && refreshedProfile.payment && typeof refreshedProfile.payment === 'object') {
              setBankName(refreshedProfile.payment.bankName || '');
              setAccountNumber(refreshedProfile.payment.accountNumber || '');
              setAccountHolderName(refreshedProfile.payment.accountHolderName || '');
              setPaystackEmail(refreshedProfile.payment.paystackEmail || '');
            }
          }
        } catch (refreshError) {
          console.error('[EditProfile] Error refreshing profile after save:', refreshError);
          // Continue with success message even if refresh fails
        }
        
        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              navigation?.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', response?.message || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('[EditProfile] Update error:', error?.message || error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Fetch Profile Data Function
  const fetchProfileData = async () => {
    console.log('[EditProfile] Fetching profile data...');
    setLoading(true);
    let hasProfileData = false;
    try {
        const { getMyProfile } = await import('../services/user');
        const response = await getMyProfile();
        console.log('[EditProfile] API Response:', JSON.stringify(response, null, 2));
        
        // Handle different response structures
        const p = response?.data || response;
        
        if (p) {
          console.log('[EditProfile] Profile data found:', p.name, p.email);
          hasProfileData = true;
          setFullName(p.name || '');
          setUsername(p.username || '');
          setEmail(p.email || '');
          setPhone(p.phone || '');
          setBio(p.bio || '');
          setWebsite(p.website || '');

          if (p.location) {
            if (typeof p.location === 'string') {
              // Handle string location format
              const parts = p.location.split(',');
              setCity(parts[0]?.trim() || '');
              setState(parts[1]?.trim() || '');
              setCountry(parts[2]?.trim() || '');
            } else {
              // Handle object location format
              setCity(p.location.city || '');
              setState(p.location.state || '');
              setCountry(p.location.country || '');
              // Extract coordinates if available
              if (p.location.coordinates) {
                setLatitude(p.location.coordinates.latitude || null);
                setLongitude(p.location.coordinates.longitude || null);
              }
            }
          }
          
          if (p.isPublic !== undefined) {
            setIsPublic(p.isPublic);
          }

          if (p.tags && Array.isArray(p.tags)) {
            setTags(p.tags.join(', '));
          } else if (p.tags) {
            setTags(p.tags);
          }

          // Social Media - load for all users (creators and brands)
          if (p.socialMedia && typeof p.socialMedia === 'object' && Object.keys(p.socialMedia).length > 0) {
            // Only update if socialMedia is a non-empty object
            setInstagram(p.socialMedia.instagram || '');
            setTiktok(p.socialMedia.tiktok || '');
            setYoutube(p.socialMedia.youtube || '');
            setTwitter(p.socialMedia.twitter || '');
            setFacebook(p.socialMedia.facebook || '');
          } else {
            // Reset if socialMedia is not present, is null, or is empty object
            setInstagram('');
            setTiktok('');
            setYoutube('');
            setTwitter('');
            setFacebook('');
          }

          if (p.profileImage) {
            setProfileImage(p.profileImage);
          }

          if (p.bannerImage) {
            setBannerImage(p.bannerImage);
          }

          if (isCreator) {
            // Categories: Backend sends enum values, keep as-is (they're already in backend format)
            if (p.categories && Array.isArray(p.categories)) {
              // Validate and filter to only valid backend enum values
              const validCategories = p.categories.filter(cat => USER_PROFILE_CATEGORIES.includes(cat));
              setCategories(validCategories);
            } else if (p.categories) {
              const validCategories = USER_PROFILE_CATEGORIES.includes(p.categories) ? [p.categories] : [];
              setCategories(validCategories);
            }
            
            // Load all platform metrics from API - ensure platform values are valid
            if (p.platformMetrics && Array.isArray(p.platformMetrics)) {
              const validatedMetrics = p.platformMetrics.map(metric => ({
                ...metric,
                platform: VALID_PLATFORMS.includes(metric.platform?.toLowerCase()) 
                  ? metric.platform.toLowerCase() 
                  : metric.platform, // Keep original if invalid, backend will validate
              }));
              setPlatformMetrics(validatedMetrics);
            }

            // Payment details - only for creators
            if (p.payment && typeof p.payment === 'object') {
              setBankName(p.payment.bankName || '');
              setAccountNumber(p.payment.accountNumber || '');
              setAccountHolderName(p.payment.accountHolderName || '');
              setPaystackEmail(p.payment.paystackEmail || '');
            } else {
              // Reset if payment is not present or is null
              setBankName('');
              setAccountNumber('');
              setAccountHolderName('');
              setPaystackEmail('');
            }
          } else {
            setCompanyName(p.companyName || p.name || '');
            setIndustry(p.industry || '');
            setWebsite(p.website || '');
            setCampaignBudget(p.campaignBudget || '');
            setBrandTagline(p.brandTagline || '');
          }
        } else {
          console.warn('[EditProfile] No profile data in response');
        }
      } catch (error) {
        console.error('[EditProfile] Failed to fetch profile:', error?.message || error);
        Alert.alert('Error', 'Failed to load profile. Please try again.');
      } finally {
        // If no profile data was loaded from API, fall back to basic user info from AuthContext
        if (!hasProfileData && user) {
          console.log('[EditProfile] Falling back to AuthContext user data');
          if (user.name) setFullName(prev => prev || user.name);
          if (user.email) setEmail(prev => prev || user.email);
          if (user.phone) setPhone(prev => prev || user.phone);

          if (user.location) {
            if (typeof user.location === 'string') {
              const parts = user.location.split(',');
              setCity(prev => prev || parts[0]?.trim() || '');
              setState(prev => prev || parts[1]?.trim() || '');
              setCountry(prev => prev || parts[2]?.trim() || '');
            } else {
              setCity(prev => prev || user.location.city || '');
              setState(prev => prev || user.location.state || '');
              setCountry(prev => prev || user.location.country || '');
              if (user.location.coordinates) {
                setLatitude(user.location.coordinates.latitude || null);
                setLongitude(user.location.coordinates.longitude || null);
              }
            }
          }
        }
        setLoading(false);
      }
  };

  // Fetch Profile Data on Mount and when screen comes into focus
  useEffect(() => {
    fetchProfileData();
  }, [isCreator]);

  // Refetch when screen comes into focus (when user returns to this screen)
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('[EditProfile] Screen focused, refetching profile...');
      fetchProfileData();
    });

    return unsubscribe;
  }, [navigation, isCreator]);

  const handleCancel = () => {
    navigation?.goBack();
  };

  // Category mapping: Display labels with backend enum values
  const categoryOptions = [
    { label: 'Fashion & Beauty', value: 'fashion_beauty' },
    { label: 'Tech & Gadgets', value: 'tech_gadgets' },
    { label: 'Fitness & Health', value: 'fitness_health' },
    { label: 'Travel & Lifestyle', value: 'travel_lifestyle' },
    { label: 'Food & Drink', value: 'food_drink' },
    { label: 'Entertainment & Media', value: 'entertainment_media' },
    { label: 'Sports', value: 'sports' },
    { label: 'Education', value: 'education' },
    { label: 'Business', value: 'business' },
    { label: 'Parenting', value: 'parenting' },
    { label: 'Automotive', value: 'automotive' },
    { label: 'Gaming', value: 'gaming' },
    { label: 'Music', value: 'music' },
    { label: 'Art & Design', value: 'art_design' },
  ];
  
  const industries = ['Fashion', 'Technology', 'Food & Beverage', 'Beauty', 'Fitness', 'Travel', 'Other'];

  // Show loading indicator while fetching profile
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#464FE5" />
        <Text style={{ marginTop: 16, color: '#6B7280' }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} disabled={saving}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#464FE5" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.profilePhotoSection}>
          <TouchableOpacity onPress={handleImagePicker} style={styles.imageContainer}>
            <Image
              source={
                profileImage
                  ? { uri: profileImage }
                  : require('../assets/app-icon.png')
              }
              style={styles.profileImage}
            />
            <View style={styles.editImageOverlay}>
              <MaterialIcons name="camera-alt" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>Tap to change profile photo</Text>
          
          {/* Banner Image */}
          <View style={styles.bannerImageContainer}>
            <TouchableOpacity onPress={handleImagePicker} style={styles.bannerImageWrapper}>
              <Image
                source={
                  bannerImage
                    ? { uri: bannerImage }
                    : require('../assets/app-icon.png')
                }
                style={styles.bannerImage}
                resizeMode="cover"
              />
              <View style={styles.editBannerOverlay}>
                <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
                <Text style={styles.bannerHint}>Banner</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.imageHint}>Tap to change banner image</Text>
          </View>
        </View>

        {/* Personal Details Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('personal')}
        >
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <MaterialIcons
            name={expandedSections.personal ? 'expand-less' : 'expand-more'}
            size={24}
            color="#6B7280"
          />
        </TouchableOpacity>
        {expandedSections.personal && (
          <View style={styles.sectionContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username / Brand Name *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder={isCreator ? "Enter your username" : "Enter brand name"}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                onChangeText={setEmail}
                editable={true}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Enter your city"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="Enter your state"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={country}
                onChangeText={setCountry}
                placeholder="Enter your country"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="e.g., #Fashion, #Beauty, #Lifestyle"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.helperText}>Separate tags with commas</Text>
            </View>
          </View>
        )}

        {/* Social Media Links Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('social')}
        >
          <Text style={styles.sectionTitle}>Social Media Links</Text>
          <MaterialIcons
            name={expandedSections.social ? 'expand-less' : 'expand-more'}
            size={24}
            color="#6B7280"
          />
        </TouchableOpacity>
        {expandedSections.social && (
          <View style={styles.sectionContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={instagram}
                onChangeText={setInstagram}
                placeholder="Enter your Instagram username"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TikTok</Text>
              <TextInput
                style={styles.input}
                value={tiktok}
                onChangeText={setTiktok}
                placeholder="Enter your TikTok username"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>YouTube</Text>
              <TextInput
                style={styles.input}
                value={youtube}
                onChangeText={setYoutube}
                placeholder="Enter your YouTube channel URL"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>X (Twitter)</Text>
              <TextInput
                style={styles.input}
                value={twitter}
                onChangeText={setTwitter}
                placeholder="Enter your Twitter handle"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={styles.input}
                value={facebook}
                onChangeText={setFacebook}
                placeholder="Enter your Facebook page URL"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        )}

        {/* Role-Specific Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('roleSpecific')}
        >
          <Text style={styles.sectionTitle}>
            {isCreator ? 'Creator Details' : 'Brand Details'}
          </Text>
          <MaterialIcons
            name={expandedSections.roleSpecific ? 'expand-less' : 'expand-more'}
            size={24}
            color="#6B7280"
          />
        </TouchableOpacity>
        {expandedSections.roleSpecific && (
          <View style={styles.sectionContent}>
            {isCreator ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Categories</Text>
                  <View style={styles.pickerContainer}>
                    {categoryOptions.map((option) => {
                      const isSelected = categories.includes(option.value);
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.pickerOption,
                            isSelected && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setCategories(categories.filter(c => c !== option.value));
                            } else {
                              setCategories([...categories, option.value]);
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              isSelected && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.helperText}>Select multiple categories ({categories.length} selected)</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Platform Metrics</Text>
                  <Text style={styles.helperText}>
                    Platform metrics are managed through your profile. Current: {platformMetrics.length} platform(s) configured.
                  </Text>
                  {platformMetrics.length > 0 && (
                    <View style={styles.metricsList}>
                      {platformMetrics.map((metric, index) => {
                        const platformName = metric.platform 
                          ? metric.platform.charAt(0).toUpperCase() + metric.platform.slice(1)
                          : 'Unknown';
                        return (
                          <View key={index} style={styles.metricItem}>
                            <Text style={styles.metricText}>
                              {platformName}: {metric.followers?.toLocaleString() || 0} followers, 
                              {metric.engagementRate || 0}% engagement
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Company Name</Text>
                  <TextInput
                    style={styles.input}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Enter company name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Industry</Text>
                  <View style={styles.pickerContainer}>
                    {industries.map((ind) => (
                      <TouchableOpacity
                        key={ind}
                        style={[
                          styles.pickerOption,
                          industry === ind && styles.pickerOptionSelected,
                        ]}
                        onPress={() => setIndustry(ind)}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            industry === ind && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {ind}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Website</Text>
                  <TextInput
                    style={styles.input}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="Enter website URL"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="url"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Average Campaign Budget</Text>
                  <TextInput
                    style={styles.input}
                    value={campaignBudget}
                    onChangeText={setCampaignBudget}
                    placeholder="e.g., $5,000 - $10,000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Brand Tagline</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={brandTagline}
                    onChangeText={setBrandTagline}
                    placeholder="Enter your brand tagline"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}
          </View>
        )}

        {/* Payment Details Section (Creator only) */}
        {isCreator && (
          <>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('payment')}
            >
              <Text style={styles.sectionTitle}>Payment Details</Text>
              <MaterialIcons
                name={expandedSections.payment ? 'expand-less' : 'expand-more'}
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
            {expandedSections.payment && (
              <View style={styles.sectionContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="Enter bank name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Enter account number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Holder Name</Text>
                  <TextInput
                    style={styles.input}
                    value={accountHolderName}
                    onChangeText={setAccountHolderName}
                    placeholder="Enter account holder name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Paystack Email</Text>
                  <TextInput
                    style={styles.input}
                    value={paystackEmail}
                    onChangeText={setPaystackEmail}
                    placeholder="Enter Paystack email"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButtonLarge, saving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#464FE5',
  },
  scrollView: {
    flex: 1,
  },
  profilePhotoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#464FE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  imageHint: {
    fontSize: 14,
    color: '#6B7280',
  },
  bannerImageContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  bannerImageWrapper: {
    width: '90%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  editBannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  metricsList: {
    marginTop: 8,
    gap: 8,
  },
  metricItem: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  metricText: {
    fontSize: 14,
    color: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerOptionSelected: {
    backgroundColor: '#464FE5',
    borderColor: '#464FE5',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButtonLarge: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#464FE5',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EditProfile;

