import { create } from 'zustand';

import { getAllChains } from '../config/chains';
import { chainsApi } from '../services/chains';
import type { Chain } from '../types';

interface ChainsState {
  chains: Chain[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useChainsStore = create<ChainsState>((set) => ({
  chains: [],
  isLoading: false,
  error: null,
  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const chains = await chainsApi.listSupportedChains();
      set({ chains, isLoading: false });
    } catch (error: unknown) {
      const fallback = getAllChains(true);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch supported chains';
      set({ chains: fallback, isLoading: false, error: message });
    }
  },
}));
