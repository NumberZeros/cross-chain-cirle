import '@rainbow-me/rainbowkit/styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { useMemo } from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { arbitrum, base, mainnet, polygon, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [mainnet, polygon, arbitrum, base, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
});

export function AppProviders(props: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const { children } = props;

  const solanaEndpoint =
    import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  const solanaWallets = useMemo(() => {
    return [new PhantomWalletAdapter()];
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider>
          <ConnectionProvider endpoint={solanaEndpoint}>
            <WalletProvider wallets={solanaWallets} autoConnect>
              <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
