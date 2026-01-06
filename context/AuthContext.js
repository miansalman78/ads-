/**
 * Auth Context for Authentication State Management
 * 
 * This context provides:
 * - user: Current authenticated user object
 * - token: JWT authentication token
 * - loading: Loading state for async operations
 * - signUp: Function to register new user
 * - signIn: Function to login user
 * - signOut: Function to logout user
 * - restoreSession: Function to restore session from AsyncStorage
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import apiClient, { getToken, getUser, setToken, setUser, clearAuthData, setAuthLogoutCallback } from '../services/apiClient';
import { setAuthToken, clearAuthToken } from '../services/api';

// Create Auth Context
export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  restoreSession: async () => {},
  refreshUser: async () => {},
});

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state and methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Sign Up Function
   * Calls POST /auth/signup API
   * Saves token and user in AsyncStorage
   * Updates context state
   */
  const signUp = useCallback(async (payload) => {
    try {
      setLoading(true);
      console.log('[Auth] Signing up with payload:', payload);
      
      // Call signup API
      const response = await apiClient.post('/auth/signup', payload);
      
      // Extract token and user from response
      // Backend returns: { success: true, message: "...", data: { user: {...}, token: "..." } }
      // Axios response: response.data = { success: true, message: "...", data: { user: {...}, token: "..." } }
      const responseData = response.data;
      
      // Check if request was successful
      if (responseData?.success === false) {
        const errorMessage = responseData?.message || 'Signup failed';
        throw new Error(errorMessage);
      }
      
      // Extract token and user from response.data.data
      const authToken = responseData?.data?.token;
      const userData = responseData?.data?.user;
      
      if (!authToken || !userData) {
        console.error('[Auth] Invalid response structure:', JSON.stringify(responseData, null, 2));
        throw new Error(responseData?.message || 'Invalid response from server');
      }
      
      // Save token and user to AsyncStorage
      await setToken(authToken);
      await setUser(userData);
      
      // Update token in api.js (for fetch-based API calls)
      setAuthToken(authToken);
      
      // Update context state
      setTokenState(authToken);
      setUserState(userData);
      
      console.log('[Auth] Signup successful:', userData);
      
      return {
        token: authToken,
        user: userData,
        message: responseData?.message || 'Account created successfully',
      };
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign In Function
   * Calls POST /auth/login API
   * Saves token and user in AsyncStorage
   * Updates context state
   */
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      console.log('[Auth] Signing in with email:', email);
      
      // Call login API
      const response = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      
      // Extract token and user from response
      // Backend returns: { success: true, message: "...", data: { user: {...}, token: "..." } }
      // Axios response: response.data = { success: true, message: "...", data: { user: {...}, token: "..." } }
      const responseData = response.data;
      
      // Check if request was successful
      if (responseData?.success === false) {
        const errorMessage = responseData?.message || 'Login failed';
        throw new Error(errorMessage);
      }
      
      // Extract token and user from response.data.data
      const authToken = responseData?.data?.token;
      const userData = responseData?.data?.user;
      
      if (!authToken || !userData) {
        console.error('[Auth] Invalid response structure:', JSON.stringify(responseData, null, 2));
        throw new Error(responseData?.message || 'Invalid response from server');
      }
      
      // Save token and user to AsyncStorage
      await setToken(authToken);
      await setUser(userData);
      
      // Update token in api.js (for fetch-based API calls)
      setAuthToken(authToken);
      
      // Update context state
      setTokenState(authToken);
      setUserState(userData);
      
      console.log('[Auth] Login successful:', userData);
      
      return {
        token: authToken,
        user: userData,
        message: responseData?.message || 'Login successful',
      };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign Out Function
   * Clears token and user from AsyncStorage
   * Updates context state
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Auth] Signing out');
      
      // Clear token and user from AsyncStorage
      await clearAuthData();
      
      // Clear token from api.js (for fetch-based API calls)
      clearAuthToken();
      
      // Update context state
      setTokenState(null);
      setUserState(null);
      
      console.log('[Auth] Signout successful');
    } catch (error) {
      console.error('[Auth] Signout error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Restore Session Function
   * Gets token and user from AsyncStorage
   * Validates token by calling GET /auth/me
   * Updates context state
   */
  const restoreSession = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Auth] Restoring session');
      
      // Get token and user from AsyncStorage
      const storedToken = await getToken();
      const storedUser = await getUser();
      
      if (!storedToken || !storedUser) {
        console.log('[Auth] No stored session found');
        setTokenState(null);
        setUserState(null);
        return false;
      }
      
      // Validate token by calling /auth/me
      try {
        // Token is already set in axios interceptor from AsyncStorage
        const response = await apiClient.get('/auth/me');
        
        // Extract user data from response
        // Backend returns: { success: true, data: user } or { success: true, data: { user } }
        const responseData = response.data;
        
        // Check if request was successful
        if (responseData?.success === false) {
          throw new Error(responseData?.message || 'Token validation failed');
        }
        
        // Extract user from response.data.data or response.data
        const userData = responseData?.data?.user || responseData?.data || responseData?.user || responseData;
        
        if (!userData || !userData.email) {
          throw new Error('No user data in response');
        }
        
        // Update token in api.js (for fetch-based API calls)
        setAuthToken(storedToken);
        
        // Update context state with validated token and user
        setTokenState(storedToken);
        setUserState(userData);
        
        // Update stored user data (in case it changed on server)
        await setUser(userData);
        
        console.log('[Auth] Session restored successfully');
        return true;
      } catch (error) {
        // Token is invalid, clear stored data
        console.log('[Auth] Token validation failed:', error.message || error);
        await clearAuthData();
        clearAuthToken();
        setTokenState(null);
        setUserState(null);
        return false;
      }
    } catch (error) {
      console.error('[Auth] Restore session error:', error);
      clearAuthToken();
      setTokenState(null);
      setUserState(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Set up logout callback for 401 errors
   * This will be called when token expires
   */
  useEffect(() => {
    setAuthLogoutCallback(() => {
      console.log('[Auth] Token expired, logging out');
      signOut();
    });
  }, [signOut]);

  /**
   * Refresh User Profile
   * Fetches the latest user profile from the server and updates context state
   */
  const refreshUser = useCallback(async () => {
    try {
      const userService = await import('../services/user');
      const profileResponse = await userService.getMyProfile();
      
      if (profileResponse && profileResponse.data) {
        const userData = profileResponse.data;
        setUserState(userData);
        await setUser(userData);
        console.log('[Auth] User profile refreshed');
        return userData;
      }
      return null;
    } catch (error) {
      console.error('[Auth] Error refreshing user profile:', error);
      return null;
    }
  }, []);

  /**
   * Value object for context
   */
  const value = {
    user,
    token,
    loading,
    signUp,
    signIn,
    signOut,
    restoreSession,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

