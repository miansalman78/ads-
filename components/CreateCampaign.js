import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { USER_PROFILE_CATEGORIES, mapCategoryToUserProfile, mapBackendCategoryToUI } from '../utils/apiConstants';

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

// Static option lists
const serviceTypes = [
  'Influencer Service',
  'Service Creator',
  'UGC Creator',
  'Other',
];

const followerRanges = [
  '1k - 10k (Nano)',
  '10k - 50k (Micro)',
  '50k - 250k (Mid-tier)',
  '250k - 1M (Macro)',
  '1M+ (Mega)',
];

const CreateCampaign = ({ navigation, route }) => {
  // Check if we're in edit mode
  const isEditMode = route?.params?.isEdit || false;
  const campaignData = route?.params?.campaign || null;
  const campaignId = route?.params?.campaignId || campaignData?._id || campaignData?.id || null;

  const [selectedGoals, setSelectedGoals] = useState(['Brand Awareness']); // Multiple goals
  const [selectedCompensation, setSelectedCompensation] = useState('Paid');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['Instagram']); // Multiple platforms
  const [selectedDate, setSelectedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [date, setDate] = useState(new Date());
  // Initialize due date to 7 days after current date (should be after application deadline)
  const [dueDateObj, setDueDateObj] = useState(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    return futureDate;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [pickingApplicationDeadline, setPickingApplicationDeadline] = useState(true);
  const [selectedFollowerRange, setSelectedFollowerRange] = useState('1k - 10k (Nano)');
  const [showFollowerDropdown, setShowFollowerDropdown] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState('Influencer Service');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Fashion');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedDeliverables, setSelectedDeliverables] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [tags, setTags] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD'); // Currency selection

  const [loading, setLoading] = useState(false);
  // Additional state for inputs not currently tracked
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [visibilityDuration, setVisibilityDuration] = useState('');
  const [budget, setBudget] = useState('');

  const handleServiceTypePress = () => {
    setShowServiceDropdown((prev) => !prev);
  };

  const selectServiceType = (service) => {
    setSelectedServiceType(service);
    setShowServiceDropdown(false);
  };

  const handleFollowerRangePress = () => {
    setShowFollowerDropdown((prev) => !prev);
  };

  const selectFollowerRange = (range) => {
    setSelectedFollowerRange(range);
    setShowFollowerDropdown(false);
  };

  const handleCategoryPress = () => {
    setShowCategoryDropdown((prev) => !prev);
  };

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
  };

  // Map UI category to backend niche category
  const getNicheCategory = (uiCategory) => {
    return mapCategoryToUserProfile(uiCategory);
  };

  // Map follower range to backend format with min/max
  const mapFollowerRange = (range) => {
    const mapping = {
      '1k - 10k (Nano)': { range: 'nano', min: 1000, max: 10000 },
      '10k - 50k (Micro)': { range: 'micro', min: 10000, max: 50000 },
      '50k - 250k (Mid-tier)': { range: 'mid-tier', min: 50000, max: 250000 },
      '250k - 1M (Macro)': { range: 'macro', min: 250000, max: 1000000 },
      '1M+ (Mega)': { range: 'mega', min: 1000000, max: 10000000 },
    };
    return mapping[range] || { range: 'micro', min: 10000, max: 50000 };
  };

  // Reverse map follower range from backend to UI
  const reverseMapFollowerRange = (backendRange) => {
    if (!backendRange) return '1k - 10k (Nano)';
    const range = backendRange.range || backendRange;
    const min = backendRange.min;
    
    // Try to match by range string first
    if (range === 'nano') return '1k - 10k (Nano)';
    if (range === 'micro') return '10k - 50k (Micro)';
    if (range === 'mid-tier') return '50k - 250k (Mid-tier)';
    if (range === 'macro') return '250k - 1M (Macro)';
    if (range === 'mega') return '1M+ (Mega)';
    
    // Fallback: match by min value
    if (min <= 10000) return '1k - 10k (Nano)';
    if (min <= 50000) return '10k - 50k (Micro)';
    if (min <= 250000) return '50k - 250k (Mid-tier)';
    if (min <= 1000000) return '250k - 1M (Macro)';
    return '1M+ (Mega)';
  };

  // Map service type to backend format
  const mapServiceType = (uiServiceType) => {
    const mapping = {
      'Influencer Service': 'influencer_service',
      'Service Creator': 'service_creator',
      'UGC Creator': 'ugc_creator',
      'Other': 'other',
    };
    return mapping[uiServiceType] || 'influencer_service';
  };

  // Reverse map service type from backend to UI
  const reverseMapServiceType = (backendType) => {
    const mapping = {
      'influencer_service': 'Influencer Service',
      'service_creator': 'Service Creator',
      'ugc_creator': 'UGC Creator',
      'other': 'Other',
    };
    return mapping[backendType] || 'Influencer Service';
  };

  // Map goal to backend format - only valid enum values are brand_awareness and engagement
  const mapGoalToBackend = (goal) => {
    const goalMapping = {
      'Brand Awareness': 'brand_awareness',
      'Engagement': 'engagement',
      // Map invalid goals to valid alternatives
      'Sales': 'brand_awareness', // Sales is not a valid enum, map to brand_awareness
      'Lead Generation': 'brand_awareness', // Lead generation not a valid enum, map to brand_awareness
      'Content Creation': 'engagement', // Content creation not a valid enum, map to engagement
    };
    return goalMapping[goal] || 'brand_awareness'; // Default fallback
  };

  // Reverse map goal from backend to UI
  const reverseMapGoal = (backendGoal) => {
    const mapping = {
      'brand_awareness': 'Brand Awareness',
      'engagement': 'Engagement',
    };
    return mapping[backendGoal] || 'Brand Awareness';
  };

  // Toggle goal selection (multiple allowed)
  const toggleGoal = (goal) => {
    setSelectedGoals(prev => {
      if (prev.includes(goal)) {
        return prev.filter(g => g !== goal);
      } else {
        return [...prev, goal];
      }
    });
  };

  // Toggle platform selection (multiple allowed)
  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  // Toggle deliverable selection
  const toggleDeliverable = (deliverable) => {
    setSelectedDeliverables(prev => {
      if (prev.includes(deliverable)) {
        return prev.filter(d => d !== deliverable);
      } else {
        return [...prev, deliverable];
      }
    });
  };

  // Toggle location selection
  const toggleLocation = (location) => {
    setSelectedLocations(prev => {
      if (prev.includes(location)) {
        return prev.filter(l => l !== location);
      } else {
        return [...prev, location];
      }
    });
  };

  // Toggle gender selection
  const toggleGender = (gender) => {
    setSelectedGenders(prev => {
      if (prev.includes(gender)) {
        return prev.filter(g => g !== gender);
      } else {
        return [...prev, gender];
      }
    });
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    return `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(
      dateObj.getDate()
    ).padStart(2, '0')}/${dateObj.getFullYear()}`;
  };

  const handleDatePress = () => {
    setPickingApplicationDeadline(true);
    setShowDatePicker(true);
  };

  const handleDueDatePress = () => {
    setPickingApplicationDeadline(false);
    setShowDueDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowDueDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      if (pickingApplicationDeadline) {
        setDate(selectedDate);
        setSelectedDate(formatDate(selectedDate));
        // Auto-adjust due date to be at least 7 days after application deadline
        const newDueDate = new Date(selectedDate);
        newDueDate.setDate(newDueDate.getDate() + 7);
        if (newDueDate > dueDateObj || !dueDate) {
          setDueDateObj(newDueDate);
          setDueDate(formatDate(newDueDate));
        }
      } else {
        // Validate that due date is after application deadline
        const minDueDate = new Date(date);
        minDueDate.setDate(minDueDate.getDate() + 1);
        if (selectedDate < minDueDate) {
          Alert.alert('Invalid Date', 'Due date must be at least 1 day after the application deadline.');
          return;
        }
        setDueDateObj(selectedDate);
        setDueDate(formatDate(selectedDate));
      }
    }
    
    if (Platform.OS === 'ios') {
      // On iOS, keep picker open until user confirms/cancels via buttons
      return;
    }
  };

  const confirmDatePicker = () => {
    setShowDatePicker(false);
    setShowDueDatePicker(false);
  };

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (isEditMode && campaignData) {
      const campaign = campaignData;
      
      // Basic fields
      setCampaignName(campaign.name || campaign.title || '');
      setDescription(campaign.description || '');
      setDuration(campaign.campaignDuration || '');
      setVisibilityDuration(campaign.postVisibilityDuration || '');
      setBudget(campaign.budget?.toString() || '');
      setSelectedCurrency(campaign.currency || 'USD');
      
      // Budget range
      if (campaign.budgetRange) {
        if (campaign.budgetRange.min) setBudgetMin(campaign.budgetRange.min.toString());
        if (campaign.budgetRange.max) setBudgetMax(campaign.budgetRange.max.toString());
      }
      
      // Service type
      if (campaign.serviceType) {
        setSelectedServiceType(reverseMapServiceType(campaign.serviceType));
      }
      
      // Goals
      if (campaign.goals && Array.isArray(campaign.goals)) {
        const uiGoals = campaign.goals.map(reverseMapGoal).filter(Boolean);
        if (uiGoals.length > 0) setSelectedGoals(uiGoals);
      } else if (campaign.mainGoal) {
        setSelectedGoals([reverseMapGoal(campaign.mainGoal)]);
      }
      
      // Platforms
      if (campaign.platform && Array.isArray(campaign.platform)) {
        const uiPlatforms = campaign.platform.map(p => p.charAt(0).toUpperCase() + p.slice(1));
        if (uiPlatforms.length > 0) setSelectedPlatforms(uiPlatforms);
      }
      
      // Compensation type
      if (campaign.compensationType === 'product') {
        setSelectedCompensation('Free Product');
      } else if (campaign.compensationType === 'both') {
        setSelectedCompensation('Both');
      } else {
        setSelectedCompensation('Paid');
      }
      
      // Category
      if (campaign.requirements?.niche && campaign.requirements.niche.length > 0) {
        const backendCategory = campaign.requirements.niche[0];
        const uiCategory = mapBackendCategoryToUI ? mapBackendCategoryToUI(backendCategory) : 'Fashion';
        setSelectedCategory(uiCategory);
      }
      
      // Follower range
      if (campaign.requirements?.followerRange) {
        setSelectedFollowerRange(reverseMapFollowerRange(campaign.requirements.followerRange));
      }
      
      // Deliverables
      if (campaign.deliverables && Array.isArray(campaign.deliverables)) {
        const uiDeliverables = campaign.deliverables.map(d => {
          if (typeof d === 'string') {
            // Convert backend format to UI format
            const mapping = {
              'short_video': 'Short Video',
              'story': 'Story',
              'post': 'Post',
              'reel': 'Reel',
              'igtv': 'IGTV',
            };
            return mapping[d] || d.charAt(0).toUpperCase() + d.slice(1).replace(/_/g, ' ');
          }
          return d;
        });
        setSelectedDeliverables(uiDeliverables);
      }
      
      // Locations
      if (campaign.requirements?.location && Array.isArray(campaign.requirements.location)) {
        setSelectedLocations(campaign.requirements.location);
      }
      
      // Genders
      if (campaign.requirements?.gender && Array.isArray(campaign.requirements.gender)) {
        const uiGenders = campaign.requirements.gender.map(g => g.charAt(0).toUpperCase() + g.slice(1));
        setSelectedGenders(uiGenders);
      }
      
      // Tags
      if (campaign.tags && Array.isArray(campaign.tags)) {
        setTags(campaign.tags.join(', '));
      }
      
      // Dates
      if (campaign.applicationDeadline) {
        const deadlineDate = new Date(campaign.applicationDeadline);
        setDate(deadlineDate);
        setSelectedDate(formatDate(deadlineDate));
      }
      
      if (campaign.dueDate) {
        const dueDateDate = new Date(campaign.dueDate);
        setDueDateObj(dueDateDate);
        setDueDate(formatDate(dueDateDate));
      }
    }
  }, [isEditMode, campaignData]);

  const handlePostCampaign = async () => {
    if (!campaignName || !campaignName.trim()) {
      Alert.alert('Error', 'Please enter a campaign name');
      return;
    }

    if (!description || !description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!budget || budget.trim() === '' || isNaN(parseFloat(budget))) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    if (selectedGoals.length === 0) {
      Alert.alert('Error', 'Please select at least one goal');
      return;
    }

    if (selectedPlatforms.length === 0) {
      Alert.alert('Error', 'Please select at least one platform');
      return;
    }

    try {
      setLoading(true);

      // Build payload matching exact structure provided
      const followerRangeData = mapFollowerRange(selectedFollowerRange);
      const nicheCategory = getNicheCategory(selectedCategory);

      // Map main goal (first selected goal or primary goal)
      const mainGoal = mapGoalToBackend(selectedGoals[0]);

      // Map all goals to backend format
      const goalsArray = selectedGoals.map(mapGoalToBackend);

      // Map platforms to lowercase array
      const platformsArray = selectedPlatforms.map(p => p.toLowerCase());

      // Map deliverables to backend format
      const deliverablesArray = selectedDeliverables.map(d => {
        const mapping = {
          'Short Video': 'short_video',
          'Story': 'story',
          'Post': 'post',
          'Reel': 'reel',
          'IGTV': 'igtv',
        };
        return mapping[d] || d.toLowerCase().replace(/\s+/g, '_');
      });

      // Map compensation type
      let compensationType = 'paid';
      if (selectedCompensation === 'Free Product') {
        compensationType = 'product';
      } else if (selectedCompensation === 'Both') {
        compensationType = 'both';
      }

      // Build tags array from comma-separated string
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

      // Build budgetRange only if at least one value is provided
      const budgetRangeObj = {};
      if (budgetMin && budgetMin.trim() !== '' && !isNaN(parseFloat(budgetMin))) {
        budgetRangeObj.min = parseFloat(budgetMin);
      }
      if (budgetMax && budgetMax.trim() !== '' && !isNaN(parseFloat(budgetMax))) {
        budgetRangeObj.max = parseFloat(budgetMax);
      }

      // Build requirements object
      const requirementsObj = {
        followerRange: {
          range: followerRangeData.range,
          min: followerRangeData.min,
          max: followerRangeData.max,
        },
        niche: [nicheCategory],
      };

      if (selectedLocations.length > 0) {
        requirementsObj.location = selectedLocations;
      }

      if (selectedGenders.length > 0) {
        requirementsObj.gender = selectedGenders.map(g => g.toLowerCase());
      }

      const payload = {
        name: campaignName.trim(),
        description: description.trim(),
        mainGoal: mainGoal,
        goals: goalsArray,
        serviceType: mapServiceType(selectedServiceType),
        platform: platformsArray,
        compensationType: compensationType,
        budget: parseFloat(budget) || 0,
        currency: selectedCurrency, // Add currency to payload
        ...(Object.keys(budgetRangeObj).length > 0 && { budgetRange: budgetRangeObj }),
        deliverables: deliverablesArray.length > 0 ? deliverablesArray : [],
        campaignDuration: duration && duration.trim() !== '' ? duration.trim() : '3 weeks',
        postVisibilityDuration: visibilityDuration && visibilityDuration.trim() !== '' ? visibilityDuration.trim() : '30 days on page',
        applicationDeadline: date.toISOString(),
        // Ensure due date is at least 1 day after application deadline
        dueDate: (() => {
          const deadline = new Date(date);
          const due = new Date(dueDateObj);
          // If due date is before or equal to deadline, set it to 7 days after deadline
          if (due <= deadline) {
            const adjustedDue = new Date(deadline);
            adjustedDue.setDate(adjustedDue.getDate() + 7);
            return adjustedDue.toISOString();
          }
          return due.toISOString();
        })(),
        requirements: requirementsObj,
        tags: tagsArray.length > 0 ? tagsArray : [],
        status: 'open',
        isPublic: true,
      };

      console.log('Campaign payload:', JSON.stringify(payload, null, 2));

      const campaignsService = await import('../services/campaigns');
      const response = isEditMode && campaignId
        ? await campaignsService.updateCampaign(campaignId, payload)
        : await campaignsService.createCampaign(payload);

      if (response && (response.success || response.data)) {
        Alert.alert('Success', isEditMode ? 'Campaign updated successfully!' : 'Campaign created successfully!', [
          { text: 'OK', onPress: () => navigation?.navigate('Campaigns', { refresh: true }) }
        ]);
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create campaign';
      console.error('Error details:', error?.response?.data || error);
      Alert.alert('Error', String(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation?.goBack) {
                navigation.goBack();
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2d3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Campaign' : 'Create Campaign'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Campaign Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Campaign Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Summer Fashion Launch"
              placeholderTextColor="#9ca3af"
              value={campaignName}
              onChangeText={setCampaignName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your campaign objectives and what you're promoting."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Main Goal Section - Multiple Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals (Select Multiple)</Text>
          <Text style={styles.inputHint}>First selected goal will be the main goal</Text>
          <View style={styles.goalGrid}>
            {['Brand Awareness', 'Engagement'].map((goal) => {
              const isSelected = selectedGoals.includes(goal);
              return (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalButton, isSelected && styles.goalButtonSelected]}
                  onPress={() => toggleGoal(goal)}
                >
                  <Text style={[styles.goalButtonText, isSelected && styles.goalButtonTextSelected]}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Service Details & Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details & Requirements</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Type</Text>
            <TouchableOpacity style={styles.dropdownContainer} onPress={handleServiceTypePress}>
              <Text style={styles.dropdownText}>{selectedServiceType}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#6b7280" />
            </TouchableOpacity>

            {showServiceDropdown && (
              <View style={styles.dropdownOptions}>
                {serviceTypes.map((service, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dropdownOption}
                    onPress={() => selectServiceType(service)}
                  >
                    <Text style={styles.dropdownOptionText}>{service}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Campaign Duration</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 3 weeks"
              placeholderTextColor="#9ca3af"
              value={duration}
              onChangeText={setDuration}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Post Visibility Duration</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 30 days on page"
              placeholderTextColor="#9ca3af"
              value={visibilityDuration}
              onChangeText={setVisibilityDuration}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Application Deadline</Text>
            <TouchableOpacity style={styles.dateInputContainer} onPress={handleDatePress}>
              <Text style={styles.dateInput}>
                {selectedDate || 'mm/dd/yyyy'}
              </Text>
              <MaterialIcons name="event" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Due Date</Text>
            <Text style={styles.inputHint}>Must be at least 1 day after application deadline</Text>
            <TouchableOpacity style={styles.dateInputContainer} onPress={handleDueDatePress}>
              <Text style={styles.dateInput}>
                {dueDate || 'mm/dd/yyyy'}
              </Text>
              <MaterialIcons name="event" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Deliverables (Select Multiple)</Text>
            <View style={styles.goalGrid}>
              {['Short Video', 'Story', 'Post', 'Reel', 'IGTV'].map((deliverable) => {
                const isSelected = selectedDeliverables.includes(deliverable);
                return (
                  <TouchableOpacity
                    key={deliverable}
                    style={[styles.goalButton, isSelected && styles.goalButtonSelected]}
                    onPress={() => toggleDeliverable(deliverable)}
                  >
                    <Text style={[styles.goalButtonText, isSelected && styles.goalButtonTextSelected]}>
                      {deliverable}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Budget & Compensation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget & Compensation</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Total Budget</Text>
            <View style={styles.budgetInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.budgetInput}
                placeholder="5000"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Budget Range (Optional)</Text>
            <View style={styles.budgetRangeContainer}>
              <View style={styles.budgetRangeInput}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Min (200)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                />
              </View>
              <Text style={styles.budgetRangeSeparator}>-</Text>
              <View style={styles.budgetRangeInput}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Max (500)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Compensation Type</Text>
            <View style={styles.compensationContainer}>
              <TouchableOpacity
                style={[styles.compensationButton, selectedCompensation === 'Paid' && styles.compensationButtonSelected]}
                onPress={() => setSelectedCompensation('Paid')}
              >
                <Text style={[styles.compensationButtonText, selectedCompensation === 'Paid' && styles.compensationButtonTextSelected]}>
                  Paid
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compensationButton, selectedCompensation === 'Free Product' && styles.compensationButtonSelected]}
                onPress={() => setSelectedCompensation('Free Product')}
              >
                <Text style={[styles.compensationButtonText, selectedCompensation === 'Free Product' && styles.compensationButtonTextSelected]}>
                  Free Product
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compensationButton, selectedCompensation === 'Both' && styles.compensationButtonSelected]}
                onPress={() => setSelectedCompensation('Both')}
              >
                <Text style={[styles.compensationButtonText, selectedCompensation === 'Both' && styles.compensationButtonTextSelected]}>
                  Both
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Currency</Text>
            <View style={styles.currencyButtons}>
              <TouchableOpacity
                style={[styles.currencyButton, selectedCurrency === 'NGN' && styles.currencyButtonSelected]}
                onPress={() => setSelectedCurrency('NGN')}
              >
                <Text style={[styles.currencyButtonText, selectedCurrency === 'NGN' && styles.currencyButtonTextSelected]}>
                  NGN (₦)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.currencyButton, selectedCurrency === 'USD' && styles.currencyButtonSelected]}
                onPress={() => setSelectedCurrency('USD')}
              >
                <Text style={[styles.currencyButtonText, selectedCurrency === 'USD' && styles.currencyButtonTextSelected]}>
                  USD ($)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Creator Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creator Requirements</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Platforms (Select Multiple)</Text>
            <View style={styles.platformContainer}>
              {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter'].map((p) => {
                const isSelected = selectedPlatforms.includes(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.platformButton, isSelected && styles.platformButtonSelected]}
                    onPress={() => togglePlatform(p)}
                  >
                    <MaterialIcons
                      name={p === 'Instagram' ? 'camera-alt' : p === 'TikTok' ? 'music-note' : p === 'YouTube' ? 'play-circle-filled' : p === 'Twitter' ? 'chat' : 'facebook'}
                      size={20}
                      color={isSelected ? '#464FE5' : '#6b7280'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Follower Range</Text>
            <TouchableOpacity style={styles.dropdownContainer} onPress={handleFollowerRangePress}>
              <Text style={styles.dropdownText}>{selectedFollowerRange}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#6b7280" />
            </TouchableOpacity>

            {showFollowerDropdown && (
              <View style={styles.dropdownOptions}>
                {followerRanges.map((range, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dropdownOption}
                    onPress={() => selectFollowerRange(range)}
                  >
                    <Text style={styles.dropdownOptionText}>{range}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category/Niche *</Text>
            <Text style={styles.inputHint}>This categorizes which influencers can see your campaign</Text>
            <TouchableOpacity style={styles.dropdownContainer} onPress={handleCategoryPress}>
              <Text style={styles.dropdownText}>{selectedCategory}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#6b7280" />
            </TouchableOpacity>

            {showCategoryDropdown && (
              <View style={styles.dropdownOptions}>
                {['Food', 'Tech', 'Health & Wellness', 'Fashion', 'Beauty', 'Travel', 'Fitness', 'Lifestyle', 'Gaming', 'Education'].map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dropdownOption}
                    onPress={() => selectCategory(category)}
                  >
                    <Text style={styles.dropdownOptionText}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location Requirements (Optional)</Text>
            <View style={styles.goalGrid}>
              {['United States', 'Canada', 'United Kingdom', 'Australia', 'All'].map((location) => {
                const isSelected = selectedLocations.includes(location);
                return (
                  <TouchableOpacity
                    key={location}
                    style={[styles.goalButton, isSelected && styles.goalButtonSelected]}
                    onPress={() => toggleLocation(location)}
                  >
                    <Text style={[styles.goalButtonText, isSelected && styles.goalButtonTextSelected]}>
                      {location}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender Requirements (Optional)</Text>
            <View style={styles.goalGrid}>
              {['Female', 'Male', 'All'].map((gender) => {
                const isSelected = selectedGenders.includes(gender);
                return (
                  <TouchableOpacity
                    key={gender}
                    style={[styles.goalButton, isSelected && styles.goalButtonSelected]}
                    onPress={() => toggleGender(gender)}
                  >
                    <Text style={[styles.goalButtonText, isSelected && styles.goalButtonTextSelected]}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tags (comma-separated)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., sustainable, fashion, summer"
              placeholderTextColor="#9ca3af"
              value={tags}
              onChangeText={setTags}
            />
            <Text style={styles.inputHint}>Separate tags with commas</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.postCampaignButton, loading && { opacity: 0.7 }]}
            onPress={handlePostCampaign}
            disabled={loading}
          >
            <Text style={styles.postCampaignButtonText}>
              {loading 
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? 'Update Campaign' : 'Post Campaign')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveDraftButton}>
            <Text style={styles.saveDraftText}>Save as Draft</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Date Picker Modals */}
      {(showDatePicker || showDueDatePicker) && (
        Platform.OS === 'ios' ? (
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowDueDatePicker(false); }}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>
                  {pickingApplicationDeadline ? 'Select Application Deadline' : 'Select Due Date'}
                </Text>
                <TouchableOpacity onPress={confirmDatePicker}>
                  <Text style={styles.datePickerConfirm}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickingApplicationDeadline ? date : dueDateObj}
                mode="date"
                display="spinner"
                minimumDate={pickingApplicationDeadline ? new Date() : new Date(date.getTime() + 24 * 60 * 60 * 1000)}
                onChange={onDateChange}
                style={styles.datePickerIOS}
              />
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={pickingApplicationDeadline ? date : dueDateObj}
            mode="date"
            display="default"
            minimumDate={pickingApplicationDeadline ? new Date() : new Date(date.getTime() + 24 * 60 * 60 * 1000)}
            onChange={onDateChange}
          />
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 120,
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
  headerSpacer: {
    width: 32,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#374151',
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 0,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dollarSign: {
    fontSize: 16,
    color: '#374151',
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  goalButtonSelected: {
    backgroundColor: '#464FE5',
    borderColor: '#464FE5',
  },
  goalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  goalButtonTextSelected: {
    color: '#ffffff',
  },
  compensationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  budgetRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetRangeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  budgetRangeSeparator: {
    fontSize: 16,
    color: '#6b7280',
    marginHorizontal: 4,
  },
  compensationButton: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  compensationButtonSelected: {
    backgroundColor: '#464FE5',
    borderColor: '#464FE5',
  },
  compensationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  compensationButtonTextSelected: {
    color: '#ffffff',
  },
  platformContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  platformButton: {
    width: 48,
    height: 48,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformButtonSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#464FE5',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginBottom: 100,
  },
  postCampaignButton: {
    backgroundColor: '#464FE5',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  postCampaignButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveDraftButton: {
    alignItems: 'center',
  },
  saveDraftText: {
    fontSize: 14,
    color: '#6b7280',
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  currencyButtonSelected: {
    borderColor: '#464FE5',
    backgroundColor: '#f0f4ff',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  currencyButtonTextSelected: {
    color: '#464FE5',
  },
  bottomNav: {
    position: 'absolute',
    bottom: -20,
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
  dropdownOptions: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  datePickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#6b7280',
  },
  datePickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#464FE5',
  },
  datePickerIOS: {
    height: 200,
  },
});

export default CreateCampaign;
