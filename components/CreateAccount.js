import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "./Toast";
import { useAuth } from "../hooks/useAuth";

const { width } = Dimensions.get("window");

// Import Ionicons - handle both ES6 and CommonJS
let Ionicons;
try {
  const IoniconsModule = require('react-native-vector-icons/Ionicons');
  Ionicons = IoniconsModule.default || IoniconsModule;
  if (typeof Ionicons !== 'function') {
    console.warn('Ionicons is not a function, creating fallback');
    Ionicons = ({ name, size, color, style }) => (
      <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
    );
  }
} catch (error) {
  console.error('Error importing Ionicons:', error);
  Ionicons = ({ name, size, color, style }) => (
    <Text style={[{ fontSize: size || 20, color: color || '#000' }, style]}>?</Text>
  );
}

const CreateAccount = ({ navigation, route }) => {
  // Get signUp function from AuthContext
  // This will handle API call, save token/user to AsyncStorage, and update context
  const { signUp, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [brandName, setBrandName] = useState("");
  const [creatorRole, setCreatorRole] = useState("");
  const [city, setCity] = useState("");
  const [countryName, setCountryName] = useState("");
  const [stateName, setStateName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "error" });

  const role = route?.params?.role || navigation?.getParam?.('role');

  const showToast = (message, type = "error") => {
    setToast({ visible: true, message, type });
  };

  const handleCreateAccount = async () => {
    // Validation
    if (!name.trim()) {
      showToast("Please enter your name", "error");
      return;
    }
    if (!email.trim()) {
      showToast("Please enter your email", "error");
      return;
    }
    if (!email.includes("@")) {
      showToast("Please enter a valid email", "error");
      return;
    }
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    // Determine role (creator or brand)
    const apiRole = role || "creator"; // Backend accepts 'creator' or 'brand'
    const isBrandRole = apiRole === "brand";

    // Build payload matching backend structure
    // Location is optional - only include if user provides at least city
    const signupPayload = {
      name: isBrandRole ? (brandName.trim() || name.trim()) : name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: apiRole,
    };

    // Only include location if user provides at least city
    // Location fields are optional - user can skip them
    const cityName = city.trim();
    const stateNameTrimmed = stateName.trim();
    const countryNameTrimmed = countryName.trim();

    if (cityName || stateNameTrimmed || countryNameTrimmed) {
      // Format state name - ensure it includes "State" suffix if not already present
      // Example: "Lagos" -> "Lagos State", "Lagos State" -> "Lagos State"
      let formattedState = stateNameTrimmed;
      if (formattedState && !formattedState.toLowerCase().includes("state")) {
        formattedState = `${formattedState} State`;
      }

      signupPayload.location = {};
      
      if (cityName) {
        signupPayload.location.city = cityName;
      }
      if (formattedState) {
        signupPayload.location.state = formattedState;
      }
      if (countryNameTrimmed) {
        signupPayload.location.country = countryNameTrimmed;
      }
      // Coordinates are optional - can be added later via geolocation or user input
    }

    // Only add creatorRole for creators (must be 'influencer' or 'service_creator')
    if (!isBrandRole) {
      // Map user input to valid backend values
      const userCreatorRole = creatorRole.trim().toLowerCase();
      if (userCreatorRole === 'service_creator' || userCreatorRole === 'service creator') {
        signupPayload.creatorRole = 'service_creator';
      } else {
        // Default to 'influencer' for any other value
        signupPayload.creatorRole = 'influencer';
      }
    }

    // Log payload for debugging
    console.log('[CreateAccount] Signup payload:', JSON.stringify(signupPayload, null, 2));

    try {
      setIsSubmitting(true);

      // Call signUp from AuthContext
      // This will:
      // 1. Call POST /auth/signup API via axios
      // 2. Save token and user to AsyncStorage
      // 3. Update AuthContext state
      const response = await signUp(signupPayload);

      // Get user role from response
      const apiRole = response?.user?.role;
      const normalizedRole =
        apiRole === "brand"
          ? "brand"
          : apiRole === "creator" || apiRole === "influencer"
            ? "creator"
            : signupPayload.role === "brand"
              ? "brand"
              : "creator";

      // Show success message
      showToast(response?.message || "Account created successfully", "success");

      // Navigate to appropriate screen based on role
      // Token and user are already saved in AsyncStorage by AuthContext
      if (normalizedRole === "brand") {
        // Brands go directly to their dashboard
        navigation?.navigate('DashboardNew', { role: normalizedRole, user: response?.user });
      } else {
        // Creators go through the setup flow first
        navigation?.navigate('ChoosePrimaryRole', { role: normalizedRole, user: response?.user });
      }
    } catch (error) {
      // Handle errors from API
      const validationMessage = error?.data?.errors?.[0]?.message || error?.data?.errors?.[0]?.msg;
      const errorMessage = error?.isNetworkError
        ? "Cannot reach server. Please ensure the backend is running and reachable."
        : validationMessage || error?.message || error?.data?.message || "Unable to create account. Please try again.";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        {/* Logo/Image Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/undefined.jpeg")}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Let's get started!</Text>
          <Text style={styles.subtitle}>
            Create your account to join our community of brands and creators.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. John Doe"
                placeholderTextColor="#8A8A8A"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor="#8A8A8A"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#8A8A8A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#8A8A8A"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Confirm your password"
                placeholderTextColor="#8A8A8A"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#8A8A8A"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Brand Name */}
          {role === "brand" && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Brand Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="storefront-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your brand name"
                  placeholderTextColor="#8A8A8A"
                  value={brandName}
                  onChangeText={setBrandName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Creator Role/Specialization */}
          {role !== "brand" && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Specialization</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="briefcase-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. influencer, content creator"
                  placeholderTextColor="#8A8A8A"
                  value={creatorRole}
                  onChangeText={setCreatorRole}
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.helperText}>
                Leave empty to use default: "influencer"
              </Text>
            </View>
          )}

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your city"
                placeholderTextColor="#8A8A8A"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.row}>
            <View style={[styles.rowItem, styles.rowItemSpacer]}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>State (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Lagos"
                    placeholderTextColor="#8A8A8A"
                    value={stateName}
                    onChangeText={setStateName}
                    autoCapitalize="words"
                  />
                </View>
                <Text style={styles.helperText}>
                  "State" will be added automatically
                </Text>
              </View>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Country (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="earth-outline" size={20} color="#8A8A8A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Nigeria"
                    placeholderTextColor="#8A8A8A"
                    value={countryName}
                    onChangeText={setCountryName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </View>

        {/* Create Account Button */}
        <TouchableOpacity
          style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
          onPress={handleCreateAccount}
          disabled={isSubmitting}
        >
          <Text style={styles.createButtonText}>
            {isSubmitting ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
};

export default CreateAccount;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: "stretch",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  headerSpacer: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  logoImage: {
    width: width * 0.8,
    height: width * 0.8 * 1.1,
    borderRadius: 15,
  },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#8A8A8A",
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  formContainer: {
    paddingHorizontal: 20,
    width: "100%",
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  rowItem: {
    flex: 1,
    minWidth: 0,
  },
  rowItemSpacer: {
    marginRight: 12,
  },
  inputGroup: {
    marginBottom: 20,
    width: "100%",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  helperText: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 4,
    fontStyle: "italic",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
    alignSelf: "center",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  eyeIcon: {
    padding: 4,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  termsContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: "#8A8A8A",
    lineHeight: 18,
    textAlign: "center",
  },
  termsLink: {
    color: "#464FE5",
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#464FE5",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: "#464FE5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  loginText: {
    fontSize: 14,
    color: "#8A8A8A",
  },
  loginLink: {
    fontSize: 14,
    color: "#464FE5",
    fontWeight: "600",
  },
});
