import { useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { ServiceRequest, RequestStatus, RequestProposal } from '@/types';
import { useAuth } from './useAuth';

async function getAuthHeaders() {
  try {
    const user = getAuth().currentUser;
    if (user) {
      const token = await user.getIdToken(true);
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    }
  } catch (err) {
    console.warn('[useServiceRequest] Failed to fetch ID token:', err);
  }
  return { 'Content-Type': 'application/json' };
}

export function useServiceRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();

  const createRequest = useCallback(async (data: Omit<ServiceRequest, 'id' | 'createdAt' | 'isPaid' | 'status'>) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create request');
      }
      const result = await response.json();
      return result.data.id;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitProposal = useCallback(async (requestId: string, proposal: Omit<RequestProposal, 'id' | 'createdAt' | 'requestId'>) => {
    if (!profile) throw new Error('Not authenticated');
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const fullProposal = {
        ...proposal,
        providerId: profile.uid,
        providerName: profile.fullName,
        providerPhone: profile.phone,
        providerRating: profile.rating || 0.0,
        providerVehicleNumber: profile.vehicleNumber || '',
      };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/proposals`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fullProposal),
      });
      if (!response.ok) throw new Error('Failed to submit proposal');
      const result = await response.json();
      return result.data.id;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const selectProposal = useCallback(async (requestId: string, proposal: RequestProposal) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/proposals/select`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ proposal }),
      });
      if (!response.ok) throw new Error('Failed to select proposal');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateRequestStatus = useCallback(async (requestId: string, status: RequestStatus, extras?: Partial<ServiceRequest>) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, extras }),
      });
      if (!response.ok) throw new Error('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptRequest = useCallback(async (requestId: string) => {
    if (!profile) throw new Error('Not authenticated');
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/accept`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ profile }),
      });
      if (!response.ok) throw new Error('Failed to accept request');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const completeRequest = useCallback(async (requestId: string, finalPrice: number, additionalFees = 0) => {
    if (!profile) throw new Error('Not authenticated');
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/complete`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ finalPrice, additionalFees }),
      });
      if (!response.ok) throw new Error('Failed to complete request');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const processPayment = useCallback(async (requestId: string, tip: number = 0) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/payment`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tip }),
      });
      if (!response.ok) throw new Error('Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitRating = useCallback(async (requestId: string, rating: number, review: string, _providerId?: string) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/rating`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rating, review }),
      });
      if (!response.ok) throw new Error('Failed to submit rating');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCustomerRequests = useCallback(async (customerId: string): Promise<ServiceRequest[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/customer/${customerId}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch requests');
    const result = await response.json();
    return result.data;
  }, []);

  const getProviderRequests = useCallback(async (providerId: string): Promise<ServiceRequest[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/provider/${providerId}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch requests');
    const result = await response.json();
    return result.data;
  }, []);

  const getPendingRequests = useCallback(async (): Promise<ServiceRequest[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/pending`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch pending requests');
    const result = await response.json();
    return result.data;
  }, []);

  const getRequestById = useCallback(async (requestId: string): Promise<ServiceRequest | null> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data;
  }, []);

  const verifyArrivalOtp = useCallback(async (requestId: string, otp: string) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/verify-arrival-otp`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ otp }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'OTP verification failed.');
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const proposeAdditionalCosts = useCallback(async (requestId: string, proposedAdditionalFees: number, reason: string) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/propose-additional-costs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ proposedAdditionalFees, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to propose additional costs.');
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveAdditionalCosts = useCallback(async (requestId: string) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/approve-additional-costs`, {
        method: 'PUT',
        headers,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to approve additional costs.');
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    createRequest,
    submitProposal,
    selectProposal,
    updateRequestStatus,
    acceptRequest,
    completeRequest,
    processPayment,
    submitRating,
    getCustomerRequests,
    getProviderRequests,
    getPendingRequests,
    getRequestById,
    verifyArrivalOtp,
    proposeAdditionalCosts,
    approveAdditionalCosts,
  };
}
