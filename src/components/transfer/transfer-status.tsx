import { motion } from 'motion/react';
import type React from 'react';
import { getChainById } from '../../config/chains';
import { useChainsStore } from '../../state/chains.store';
import { useTransferStore } from '../../state/transfer.store';

function explorerTxUrl(explorerBase: string, txHash: string): string {
  const normalized = explorerBase.replace(/\/$/, '');
  return `${normalized}/tx/${txHash}`;
}

export function TransferStatus(): React.ReactElement {
  const current = useTransferStore((s) => s.current);
  const chains = useChainsStore((s) => s.chains);

  if (!current) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl border border-border bg-background p-6"
      >
        <div className="text-sm font-medium">Transfer Status</div>
        <div className="mt-1 text-xs text-muted-foreground">No active transfer.</div>
      </motion.div>
    );
  }

  const sourceChain =
    chains.find((c) => c.id === current.sourceChainId) ??
    getChainById(current.sourceChainId);
  const destChain =
    chains.find((c) => c.id === current.destChainId) ?? getChainById(current.destChainId);

  const steps: { key: string; label: string; reached: boolean }[] = [
    {
      key: 'PENDING',
      label: 'Pending',
      reached: true,
    },
    {
      key: 'BURNED',
      label: 'Burn confirmed',
      reached: [
        'BURNED',
        'ATTESTING',
        'ATTESTED',
        'MINTING',
        'MINTED',
        'COMPLETED',
      ].includes(current.status),
    },
    {
      key: 'ATTESTED',
      label: 'Attestation received',
      reached: ['ATTESTED', 'MINTING', 'MINTED', 'COMPLETED'].includes(current.status),
    },
    {
      key: 'MINTED',
      label: 'Mint confirmed',
      reached: ['MINTED', 'COMPLETED'].includes(current.status),
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      reached: current.status === 'COMPLETED',
    },
  ];

  const isFailed = current.status === 'FAILED' || current.status === 'EXPIRED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 rounded-xl border border-border bg-background p-6"
    >
      <div>
        <div className="text-sm font-medium">Transfer Status</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Transaction ID: {current.transactionId}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          {sourceChain?.name ?? current.sourceChainId} →{' '}
          {destChain?.name ?? current.destChainId}
        </div>
        <motion.div
          key={`status:${current.status}:${current.errorMessage ?? ''}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div
            className={
              isFailed ? 'text-sm font-medium text-destructive' : 'text-sm font-medium'
            }
          >
            {isFailed ? 'Failed' : current.status}
          </div>
          {current.errorMessage ? (
            <div className="text-xs text-destructive">{current.errorMessage}</div>
          ) : null}
        </motion.div>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((s) => (
          <motion.div
            key={s.key}
            layout
            initial={false}
            animate={
              s.reached
                ? { opacity: 1, scale: 1 }
                : {
                    opacity: 0.7,
                    scale: 0.98,
                  }
            }
            transition={{ type: 'spring', stiffness: 600, damping: 45, mass: 0.6 }}
            className={
              s.reached
                ? 'rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium'
                : 'rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground'
            }
          >
            {s.label}
          </motion.div>
        ))}
      </div>

      <div className="grid gap-2 text-xs">
        {current.sourceTxHash && sourceChain?.explorerUrl ? (
          <a
            className="text-primary hover:underline"
            href={explorerTxUrl(sourceChain.explorerUrl, current.sourceTxHash)}
            target="_blank"
            rel="noreferrer"
          >
            View source tx
          </a>
        ) : null}

        {current.destTxHash && destChain?.explorerUrl ? (
          <a
            className="text-primary hover:underline"
            href={explorerTxUrl(destChain.explorerUrl, current.destTxHash)}
            target="_blank"
            rel="noreferrer"
          >
            View destination tx
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}
