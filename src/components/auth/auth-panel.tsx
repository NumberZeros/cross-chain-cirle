import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

import { useAuthStore } from '../../state/auth.store';
import type { ChainType } from '../../types';

export function AuthPanel(): React.ReactElement {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();

  const { publicKey, connected: isSolConnected } = useWallet();

  const accessToken = useAuthStore((s) => s.accessToken);
  const authedAddress = useAuthStore((s) => s.address);
  const chainType = useAuthStore((s) => s.chainType);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  const [selectedChainType, setSelectedChainType] = useState<ChainType | null>(null);

  const solAddress = publicKey?.toBase58() ?? null;

  const activeMode = useMemo<ChainType | null>(() => {
    if (accessToken && chainType) return chainType;
    return selectedChainType;
  }, [accessToken, chainType, selectedChainType]);

  // Check if wallet is connected (for the selected chain type)
  const isWalletConnected =
    activeMode === 'EVM'
      ? Boolean(isEvmConnected && evmAddress)
      : activeMode === 'SOLANA'
        ? Boolean(isSolConnected && solAddress)
        : false;

  // With Bridge Kit, we don't need a separate "sign in" step with backend
  // Just connecting the wallet is enough.
  // We'll "authenticate" locally when a wallet is connected.
  const onConnect = (): void => {
    if (activeMode === 'EVM' && evmAddress) {
      setAuth({
        accessToken: 'local', // No backend token, just a marker
        userId: evmAddress,
        address: evmAddress,
        chainType: 'EVM',
      });
      toast.success('Wallet connected');
    } else if (activeMode === 'SOLANA' && solAddress) {
      setAuth({
        accessToken: 'local',
        userId: solAddress,
        address: solAddress,
        chainType: 'SOLANA',
      });
      toast.success('Wallet connected');
    }
  };

  const onLogout = async (): Promise<void> => {
    try {
      await logout();
      toast.message('Logged out');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 rounded-xl border border-border bg-background p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-base font-semibold tracking-tight">Wallet Connection</div>
          <div className="text-xs text-muted-foreground">
            Connect your wallet to use Bridge Kit
          </div>
        </div>

        {accessToken ? (
          <button
            type="button"
            className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground hover:opacity-90"
            onClick={onLogout}
          >
            Disconnect
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={
            activeMode === 'EVM'
              ? 'rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground'
              : 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50'
          }
          disabled={Boolean(accessToken)}
          onClick={() => setSelectedChainType('EVM')}
        >
          EVM
        </button>

        <button
          type="button"
          className={
            activeMode === 'SOLANA'
              ? 'rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground'
              : 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50'
          }
          disabled={Boolean(accessToken)}
          onClick={() => setSelectedChainType('SOLANA')}
        >
          Solana
        </button>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {!accessToken && !activeMode ? (
          <motion.div
            key="mode-hint"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground"
          >
            Choose a wallet type first. Then connect that wallet.
          </motion.div>
        ) : null}

        {!accessToken && activeMode === 'EVM' ? (
          <motion.div
            key="evm-connect"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-3"
          >
            <div className="text-xs text-muted-foreground">
              Connected wallet:{' '}
              <span className="text-foreground">{evmAddress ?? 'not connected'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ConnectButton />
            </div>
          </motion.div>
        ) : null}

        {!accessToken && activeMode === 'SOLANA' ? (
          <motion.div
            key="sol-connect"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-3"
          >
            <div className="text-xs text-muted-foreground">
              Connected wallet:{' '}
              <span className="text-foreground">{solAddress ?? 'not connected'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <WalletMultiButton />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div>
          Session:{' '}
          {accessToken && chainType && authedAddress ? (
            <span className="text-foreground">
              connected ({chainType}: {authedAddress})
            </span>
          ) : (
            'not connected'
          )}
        </div>
        {accessToken ? (
          <div className="text-xs text-muted-foreground">
            Disconnect to switch wallet type.
          </div>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {!accessToken && isWalletConnected ? (
          <motion.button
            key="connect-btn"
            type="button"
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={onConnect}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            whileTap={{ scale: 0.98 }}
          >
            Use this wallet
          </motion.button>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
