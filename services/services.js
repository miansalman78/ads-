import { apiRequest } from './api';

/**
 * Services - Creator focused (for setup/onboarding)
 */

// 8.1 Role Specific Services - influencer
export const getInfluencerServices = async () => {
  return apiRequest('/services/role/influencer', {
    method: 'GET',
  });
};

// 8.2 Role Specific Services - service_creator
export const getServiceCreatorServices = async () => {
  return apiRequest('/services/role/service_creator', {
    method: 'GET',
  });
};

// 8.3 All Services
export const getAllServices = async () => {
  return apiRequest('/services/all', {
    method: 'GET',
  });
};

// 8.4 User Current Services
export const getUserServices = async () => {
  return apiRequest('/services/user', {
    method: 'GET',
  });
};

// 8.5 User Current Services - Update
export const updateUserServices = async (services) => {
  return apiRequest('/services/user', {
    method: 'PUT',
    body: { services },
  });
};




























