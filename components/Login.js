import React, { useState } from "react";
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

const Login = ({ navigation, route }) => {
  // Get signIn function from AuthContext
  // This will handle API call, save token/user to AsyncStorage, and update context
  const { signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "error" });

  const role = route?.params?.role || navigation?.getParam?.('role');

  const showToast = (message, type = "error") => {
    setToast({ visible: true, message, type });
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      showToast("Please enter your email", "error");
      return;
    }
    if (!email.includes("@")) {
      showToast("Please enter a valid email", "error");
      return;
    }
    if (!password.trim()) {
      showToast("Please enter your password", "error");
      return;
    }
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Call signIn from AuthContext
      // This will:
      // 1. Call POST /auth/login API via axios
      // 2. Save token and user to AsyncStorage
      // 3. Update AuthContext state
      const response = await signIn(email, password);
      
      // Get user role from response - check both role and creatorRole
      // Backend response structure: { user: { role: "creator", creatorRole: "influencer" }, token, message }
      const apiRole = response?.user?.role;
      const creatorRole = response?.user?.creatorRole;
      
      console.log('[Login] API Role:', apiRole, 'Creator Role:', creatorRole);
      
      // Determine navigation role based on API response
      // Brand goes to DashboardNew, Creator/Influencer goes to AppNavigator
      let userRole;
      if (apiRole === "brand") {
        userRole = "brand";
      } else if (apiRole === "creator" || apiRole === "influencer" || creatorRole === "influencer" || creatorRole === "creator") {
        userRole = "creator"; // All creators/influencers use AppNavigator
      } else {
        userRole = apiRole || role || "creator"; // Default to creator
      }
      
      console.log('[Login] Determined userRole:', userRole);
      console.log('[Login] Navigating to:', userRole === "brand" ? "DashboardNew" : "AppNavigator");

      // Show appropriate message
      if (role && userRole && role !== userRole) {
        showToast(`You selected ${role}, but this account is registered as ${userRole}.`, "info");
      } else {
        showToast(response?.message || "Login successful", "success");
      }

      // Navigate to appropriate screen based on role from API response
      // Token and user are already saved in AsyncStorage by AuthContext
      if (userRole === "brand") {
        navigation?.navigate('DashboardNew', { role: userRole, user: response.user });
      } else {
        // Creator or Influencer - navigate to AppNavigator
        navigation?.navigate('AppNavigator', { role: userRole, user: response.user });
      }
    } catch (error) {
      // Handle errors from API
      const errorMessage = error?.isNetworkError
        ? "Cannot reach server. Please ensure the backend is running and reachable."
        : error?.message || error?.data?.message || "Login failed. Please check your credentials.";
      showToast(errorMessage, "error");
      if (error?.hint) {
        console.warn(error.hint);
      }
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
            source={require("../assets/Storyset _ Freepik.jpeg")}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>
            Sign in to continue to your account and connect with brands & creators.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          {/* Email Input */}
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

          {/* Forgot Password Link */}
          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => navigation?.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          <Text style={styles.loginButtonText}>{isSubmitting ? "Logging in..." : "Login"}</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login Buttons */}
        <View style={styles.socialContainer}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => console.log("Google login pressed")}
          >
            <View style={styles.socialIconContainer}>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            </View>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, styles.appleButton, { marginTop: 12 }]}
            onPress={() => console.log("Apple login pressed")}
          >
            <View style={styles.socialIconContainer}>
              <Ionicons name="logo-apple" size={20} color="#fff" />
            </View>
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Create Account Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('CreateAccount')}>
            <Text style={styles.signupLink}>Create Account</Text>
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

export default Login;

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
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: -10,
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#464FE5",
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#464FE5",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 10,
    shadowColor: "#464FE5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: "#8A8A8A",
    fontWeight: "500",
  },
  socialContainer: {
    paddingHorizontal: 20,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  socialIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: "center",
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  appleButtonText: {
    color: "#fff",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  signupText: {
    fontSize: 14,
    color: "#8A8A8A",
  },
  signupLink: {
    fontSize: 14,
    color: "#464FE5",
    fontWeight: "600",
  },
});

