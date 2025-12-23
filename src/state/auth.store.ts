import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ChainType } from '../types';

interface AuthState {
  readonly accessToken: string | null;
  readonly userId: string | null;
  readonly address: string | null;
  readonly chainType: ChainType | null;

  readonly setAuth: (data: {
    accessToken: string;
    userId: string;
    address: string;
    chainType: ChainType;
  }) => void;

  readonly logout: () => Promise<void>;
  readonly clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userId: null,
      address: null,
      chainType: null,

      setAuth: ({ accessToken, userId, address, chainType }) => {
        set({ accessToken, userId, address, chainType });
      },

      logout: async () => {
        set({ accessToken: null, userId: null, address: null, chainType: null });
      },

      clearAuth: () => {
        set({ accessToken: null, userId: null, address: null, chainType: null });
      },
    }),
    {
      name: 'cctp_auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        userId: state.userId,
        address: state.address,
        chainType: state.chainType,
      }),
    },
  ),
);
