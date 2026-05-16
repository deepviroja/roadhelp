import { create } from 'zustand';
import { ServiceRequest } from '@/types';

interface RequestState {
  activeRequest: ServiceRequest | null;
  setActiveRequest: (request: ServiceRequest | null) => void;
  clearActiveRequest: () => void;
}

export const useRequestStore = create<RequestState>((set) => ({
  activeRequest: null,
  setActiveRequest: (request) => set({ activeRequest: request }),
  clearActiveRequest: () => set({ activeRequest: null }),
}));
