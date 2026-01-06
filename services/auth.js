import { apiRequest, setAuthToken } from './api';

const mapRoleForApi = (role) => {
  if (role === 'brand') {
    return 'brand';
  }
  return role === 'creator' ? 'creator' : 'influencer';
};

export const register = async ({
  firstName,
  lastName,
  email,
  password,
  role,
  creatorRole,
  city,
  state,
  country,
  latitude,
  longitude,
}) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0];
  const apiRole = mapRoleForApi(role || 'creator');

  const payload = {
    name: fullName,
    email: email.trim().toLowerCase(),
    password,
    role: apiRole,
    ...((apiRole !== 'brand') && {
      creatorRole: creatorRole || (apiRole === 'creator' ? 'Content Creator' : 'Influencer')
    }),
  };

  // Only include location if at least city is provided
  // Location is optional - user can provide it or skip
  if (city || state || country || (latitude && longitude)) {
    payload.location = {
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

  const response = await apiRequest('/auth/signup', {
    method: 'POST',
    body: payload,
  });

  // Backend returns { data: { token, user }, message }
  if (response?.data?.token) {
    setAuthToken(response.data.token);
  }

  // Normalize response to match expected format
  return {
    token: response?.data?.token,
    user: response?.data?.user,
    message: response?.message || 'Account created successfully',
  };
};

export const login = async ({ email, password }) => {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  });

  // Backend returns { data: { token, user }, message }
  if (response?.data?.token) {
    setAuthToken(response.data.token);
  }

  // Normalize response to match expected format
  return {
    token: response?.data?.token,
    user: response?.data?.user,
    message: response?.message || 'Login successful',
  };
};

export const getCurrentUser = async (token) => {
  return apiRequest('/auth/me', {
    method: 'GET',
    token,
  });
};

export const forgotPassword = async ({ email }) => {
  const response = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
  });

  return {
    success: response?.success || response?.data?.success,
    message: response?.message || 'Password reset link sent to your email',
  };
};

export const resetPassword = async ({ token, password }) => {
  const response = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });

  return {
    success: response?.success || response?.data?.success,
    message: response?.message || 'Password reset successfully',
  };
};

