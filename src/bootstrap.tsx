import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';

import App from './App.tsx';
import { AppProviders } from './app/app-providers';
import './index.css';

// Suppress noisy JSON-RPC subscription errors after transactions complete
// These errors occur when CCTP provider's internal subscriptions cleanup
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = String(args[0]);

  // Suppress known harmless errors from CCTP provider cleanup
  if (
    message.includes('JSON-RPC error calling `signatureSubscribe`') ||
    message.includes('signatureSubscribe') ||
    (message.includes('Received') && message.includes('error calling'))
  ) {
    return;
  }

  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
      <Toaster richColors closeButton />
    </AppProviders>
  </StrictMode>,
);
