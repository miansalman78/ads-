import { apiRequest } from './api';

/**
 * Transactions Services - Creator focused
 */

// 9.1 Get Transactions
export const getTransactions = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.append('type', params.type);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);

  const queryString = queryParams.toString();
  return apiRequest(`/wallet/transactions${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

// 9.2 Get Transaction by ID
export const getTransactionById = async (transactionId) => {
  return apiRequest(`/wallet/transactions/${transactionId}`, {
    method: 'GET',
  });
};

// 9.3 Create Earning Transactions Manually
// Note: API doc says GET but name suggests POST - using GET as documented
export const createEarningTransaction = async () => {
  return apiRequest('/wallet/transactions/earning', {
    method: 'GET',
  });
};

// 9.4 Update Earning Transactions Manually
export const updateTransaction = async (transactionId, updateData) => {
  return apiRequest(`/wallet/transactions/${transactionId}`, {
    method: 'PUT',
    body: updateData,
  });
};




























