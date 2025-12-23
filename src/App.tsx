import { motion } from 'motion/react';
import type React from 'react';
import { AmbientBackdrop } from './components/fx/ambient-backdrop';
import { Header } from './components/layout/header';
import { TransferForm } from './components/transfer/transfer-form';
import { TransferNotifications } from './components/transfer/transfer-notifications';
import { TransferStatus } from './components/transfer/transfer-status';

export default function App(): React.ReactElement {
  return (
    <motion.div
      className="relative min-h-dvh bg-muted/30 text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <AmbientBackdrop />
      <Header />
      <TransferNotifications />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="space-y-6">
            <TransferForm />
          </div>

          <div className="space-y-6">
            <TransferStatus />
          </div>
        </div>
      </main>
    </motion.div>
  );
}
