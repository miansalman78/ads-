import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_BASE_URL = 'https://adpartnr.onrender.com/api';

let authToken = null;

const sanitizeBaseUrl = (value) => {
  if (!value) return null;
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const getBaseURL = () => {
  const override = sanitizeBaseUrl(globalThis.__API_BASE_URL__);
  if (override) return override;

  return DEFAULT_BASE_URL;
};

const API_BASE_URL = getBaseURL();

export const apiRequest = async (path, { method = 'GET', body, token, retries = 1 } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Resolve token from explicit arg, in‑memory cache, global, or AsyncStorage (shared with axios client)
  let resolvedToken = token ?? authToken ?? globalThis.__AUTH_TOKEN__;

  if (!resolvedToken && AsyncStorage) {
    try {
      // Reuse the same storage key as apiClient.js
      resolvedToken = await AsyncStorage.getItem('@adpartnr_token');
      if (resolvedToken) {
        authToken = resolvedToken;
        globalThis.__AUTH_TOKEN__ = resolvedToken;
      }
    } catch (storageError) {
      console.error('[API] Error reading token from AsyncStorage in apiRequest:', storageError);
    }
  }

  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`;
    console.log(`[API] Token attached: ${resolvedToken.substring(0, 20)}...`);
  } else {
    console.warn(`[API] No token available for authenticated request`);
  }

  const url = `${API_BASE_URL}${path}`;
  console.log(`[API] ${method} ${url}`);

  let response;
  let lastError;
  
  // Retry logic for Render.com free tier (servers can sleep and take time to wake up)
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      console.log(`[API] Retry attempt ${attempt}/${retries}...`);
      // Wait before retry (exponential backoff: 2s, 4s, etc.)
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }

    let timeoutId;
    try {
      // Create abort controller for timeout (60 seconds for Render.com cold starts)
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const fetchPromise = fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });

      response = await fetchPromise;
      if (timeoutId) clearTimeout(timeoutId);
      
      // If we got a response, break out of retry loop
      lastError = null;
      break;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = error;
      console.error(`[API] Attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on last attempt
      if (attempt === retries) {
        let errorMessage = 'Unable to reach the server.';
        
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          errorMessage = 'Request timed out after multiple attempts. The server may be sleeping (Render.com free tier). Please try again in a few moments.';
        } else if (error.message && error.message.includes('Network request failed')) {
          errorMessage = `Network request failed after ${retries + 1} attempts. Please check:\n1. Your internet connection\n2. Backend server is running at ${API_BASE_URL}\n3. If using Render.com, wait a moment as free tier servers can take 30-60s to wake up`;
        } else if (error.message) {
          errorMessage = `Network error: ${error.message}. Please check your internet connection.`;
        } else {
          errorMessage = `Cannot connect to server at ${API_BASE_URL} after ${retries + 1} attempts.\n\nPlease ensure:\n1. You have an active internet connection\n2. The backend server is running\n3. Your device can access the server URL\n4. If using Render.com, wait 30-60 seconds for cold start`;
        }
        
        const networkError = new Error(errorMessage);
        networkError.cause = error;
        networkError.isNetworkError = true;
        throw networkError;
      }
      // Continue to retry
      continue;
    }
  }

  // If all retries failed and we don't have a response, throw error
  if (!response && lastError) {
    throw lastError;
  }

  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    data = {};
  }

  if (!response.ok || data.success === false) {
    const message = data.message || data.error || data.msg || `Server error: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    error.isNetworkError = false;
    throw error;
  }

  return data;
};

export const getApiBaseUrl = () => API_BASE_URL;

export const setAuthToken = (token) => {
  authToken = token || null;
  if (token) {
    globalThis.__AUTH_TOKEN__ = token;
  }
};

export const clearAuthToken = () => {
  authToken = null;
  delete globalThis.__AUTH_TOKEN__;
};

export const getAuthToken = () => authToken ?? globalThis.__AUTH_TOKEN__ ?? null;

