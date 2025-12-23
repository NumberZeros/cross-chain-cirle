import type { Chain } from '../types';
import { getAllChains } from '../config/chains';

export interface ListChainsResponse {
  chains: Chain[];
}

export const chainsApi = {
  async listSupportedChains(): Promise<Chain[]> {
    // Since we no longer have a backend, return local chain config
    return getAllChains(true); // true = include testnets
  },
};
