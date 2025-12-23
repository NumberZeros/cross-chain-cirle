import { zodResolver } from '@hookform/resolvers/zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useMemo, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useConnectorClient } from 'wagmi';
import { z } from 'zod';

import { useChainsStore } from '../../state/chains.store';
import { useTransferStore } from '../../state/transfer.store';

// Address validation patterns
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const isValidAddress = (address: string): boolean => {
  return EVM_ADDRESS_PATTERN.test(address) || SOLANA_ADDRESS_PATTERN.test(address);
};

const isEvmAddress = (address: string): boolean => EVM_ADDRESS_PATTERN.test(address);

const schema = z.object({
  fromAddress: z
    .string()
    .min(1, 'From address is required')
    .refine(
      isValidAddress,
      'Invalid address format. Expected EVM (0x...) or Solana (base58) address',
    ),
  fromChainId: z.string().min(1, 'From chain is required'),
  toAddress: z
    .string()
    .min(1, 'To address is required')
    .refine(
      isValidAddress,
      'Invalid address format. Expected EVM (0x...) or Solana (base58) address',
    ),
  toChainId: z.string().min(1, 'To chain is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(/^\d+(\.\d+)?$/, 'Invalid amount format')
    .refine((value) => {
      const [, decimals = ''] = value.split('.');
      return decimals.length <= 6;
    }, 'USDC supports max 6 decimals')
    .refine((value) => Number(value) > 0, 'Amount must be greater than 0'),
  sourceTxHash: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SolanaWindow {
  solana?: unknown;
}

export function TransferForm(): React.ReactElement {
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const initiateTransfer = useTransferStore((s) => s.initiateTransfer);
  const recoverTransfer = useTransferStore((s) => s.recoverTransfer);
  const isSubmitting = useTransferStore((s) => s.isSubmitting);

  const chains = useChainsStore((s) => s.chains);
  const refreshChains = useChainsStore((s) => s.refresh);

  // Get wallet providers from hooks
  const { data: connectorClient } = useConnectorClient();
  const { wallet } = useWallet();

  const allChains = useMemo(
    () => chains.filter((c) => c.isActive && c.cctpEnabled),
    [chains],
  );

  useEffect(() => {
    void refreshChains();
  }, [refreshChains]);

  const form = useForm<FormValues>({
    // @hookform/resolvers currently types against Zod v3; we use Zod v4.
    // Cast through unknown to keep runtime behavior while satisfying TS.
    resolver: zodResolver(
      schema as unknown as Parameters<typeof zodResolver>[0],
    ) as unknown as Resolver<FormValues>,
    defaultValues: {
      fromAddress: '',
      fromChainId: '',
      toAddress: '',
      toChainId: '',
      amount: '',
      sourceTxHash: '',
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = form;

  const fromAddress = watch('fromAddress');
  const fromChainId = watch('fromChainId');
  const toAddress = watch('toAddress');
  const toChainId = watch('toChainId');

  // Determine chain types from addresses
  const sourceChainType =
    fromAddress && isEvmAddress(fromAddress) ? 'EVM' : fromAddress ? 'SOLANA' : null;
  const destChainType =
    toAddress && isEvmAddress(toAddress) ? 'EVM' : toAddress ? 'SOLANA' : null;

  // Filter available chains by address type
  const availableSourceChains = useMemo(() => {
    if (!sourceChainType) return [];
    return allChains.filter((c) => c.type === sourceChainType);
  }, [allChains, sourceChainType]);

  const availableDestChains = useMemo(() => {
    if (!destChainType) return [];
    return allChains.filter((c) => c.type === destChainType && c.id !== fromChainId);
  }, [allChains, destChainType, fromChainId]);

  const sourceChain = useMemo(() => {
    return allChains.find((c) => c.id === fromChainId) || null;
  }, [allChains, fromChainId]);

  const destChain = useMemo(() => {
    return allChains.find((c) => c.id === toChainId) || null;
  }, [allChains, toChainId]);

  const onSubmit = async (data: FormValues): Promise<void> => {
    if (data.fromChainId === data.toChainId) {
      toast.error('Source and destination must be different chains');
      return;
    }

    // Extract providers
    const evmProvider = connectorClient;
    const solanaProvider =
      (wallet?.adapter as unknown as { _provider?: unknown })?._provider ||
      (window as unknown as SolanaWindow).solana;

    if (isRecoveryMode) {
      if (!data.sourceTxHash) {
        toast.error('Source Transaction Hash is required for recovery');
        return;
      }

      await recoverTransfer({
        sourceTxHash: data.sourceTxHash,
        sourceChainId: data.fromChainId,
        destChainId: data.toChainId,
        amount: data.amount,
        evmProvider,
        solanaProvider,
      });
      return;
    }

    try {
      await initiateTransfer({
        sourceChainId: data.fromChainId,
        destChainId: data.toChainId,
        amount: data.amount,
        recipientAddress: data.toAddress,
        evmProvider,
        solanaProvider,
      });
      reset();
    } catch {
      // Error is already handled by the toast notification in initiateTransfer
    }
  };

  return (
    <motion.form
      className="space-y-4 rounded-xl border border-border bg-background p-6"
      onSubmit={handleSubmit(onSubmit)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold tracking-tight">
            {isRecoveryMode ? 'Recover Stuck Transfer' : 'New Transfer'}
          </div>
          <div className="text-xs text-muted-foreground">
            {isRecoveryMode
              ? 'Resume a transfer from the bridge step.'
              : 'Bridge USDC across chains using Circle Bridge Kit.'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsRecoveryMode(!isRecoveryMode);
            // Optionally clear errors when switching
          }}
          className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors"
        >
          {isRecoveryMode ? 'Back to Bridge' : 'Recovery Mode'}
        </button>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {isRecoveryMode && (
          <motion.div
            key="recovery-input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-2">
              <div className="text-xs font-medium text-blue-400">
                Source Transaction Hash
              </div>
              <input
                {...register('sourceTxHash')}
                placeholder="0x..."
                className="w-full rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {errors.sourceTxHash && (
                <p className="text-[10px] text-destructive">
                  {errors.sourceTxHash.message}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Enter the hash of the burn transaction on the source chain.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <label className="block space-y-1">
        <div className="text-xs font-medium">From Address</div>
        <input
          placeholder="0x... or Solana address"
          className="w-full rounded-lg border border-input bg-background px-4 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('fromAddress')}
          disabled={isSubmitting}
        />
        {errors.fromAddress && (
          <p className="text-[10px] text-destructive">{errors.fromAddress.message}</p>
        )}
        {sourceChainType && (
          <p className="text-[10px] text-muted-foreground">
            ✓ Address type: {sourceChainType}
          </p>
        )}
      </label>

      <label className="block space-y-1">
        <div className="text-xs font-medium">From Chain</div>
        <select
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('fromChainId')}
          disabled={isSubmitting || !sourceChainType}
        >
          <option value="">Select chain...</option>
          {availableSourceChains.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.fromChainId && (
          <p className="text-[10px] text-destructive">{errors.fromChainId.message}</p>
        )}
      </label>

      <label className="block space-y-1">
        <div className="text-xs font-medium">To Address</div>
        <input
          placeholder="0x... or Solana address"
          className="w-full rounded-lg border border-input bg-background px-4 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('toAddress')}
          disabled={isSubmitting}
        />
        {errors.toAddress && (
          <p className="text-[10px] text-destructive">{errors.toAddress.message}</p>
        )}
        {destChainType && (
          <p className="text-[10px] text-muted-foreground">
            ✓ Address type: {destChainType}
          </p>
        )}
      </label>

      <label className="block space-y-1">
        <div className="text-xs font-medium">To Chain</div>
        <select
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('toChainId')}
          disabled={isSubmitting || !destChainType}
        >
          <option value="">Select chain...</option>
          {availableDestChains.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.toChainId && (
          <p className="text-[10px] text-destructive">{errors.toChainId.message}</p>
        )}
      </label>

      <label className="block space-y-1">
        <div className="text-xs font-medium">Amount (USDC)</div>
        <input
          placeholder="0.00"
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('amount')}
          disabled={isSubmitting}
        />
        {errors.amount && (
          <p className="text-[10px] text-destructive">{errors.amount.message}</p>
        )}
      </label>

      <button
        type="submit"
        disabled={isSubmitting || !sourceChain || !destChain}
        className="relative w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSubmitting ? (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              <span>{isRecoveryMode ? 'Recovering...' : 'Processing...'}</span>
            </motion.div>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isRecoveryMode ? 'Recover Transfer' : 'Initiate Transfer'}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.form>
  );
}
