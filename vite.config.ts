import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
      '@protobufjs/inquire': fileURLToPath(
        new URL('./src/shims/protobufjs-inquire.ts', import.meta.url),
      ),
    },
  },
  build: {
    // Important: avoids injecting the modulepreload polyfill helper into a vendor chunk,
    // which could be evaluated before our Buffer polyfills.
    modulePreload: false,
    // This app includes heavy 3D + wallet stacks; chunking improves caching and avoids noisy warnings.
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        banner(chunk) {
          // Ensure the Circle vendor chunk can always access Buffer at module-eval time.
          if (chunk.name === 'vendor-circle') {
            return "import { Buffer as __Buffer } from 'buffer';";
          }
          return '';
        },
        intro(chunk) {
          if (chunk.name === 'vendor-circle') {
            return [
              'globalThis.Buffer ??= __Buffer;',
              'globalThis.global ??= globalThis;',
              'globalThis.process ??= { env: {} };',
            ].join('\n');
          }
          return '';
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Keep Buffer polyfill separate so it can initialize globals before heavy vendors evaluate.
            if (
              id.includes('/node_modules/buffer/') ||
              id.includes('/node_modules/.pnpm/buffer@')
            ) {
              return 'vendor-buffer';
            }

            if (id.includes('/three/')) return 'vendor-three';
            if (id.includes('@react-three')) return 'vendor-three-react';
            if (id.includes('/viem/')) return 'vendor-viem';
            if (id.includes('/wagmi/')) return 'vendor-wagmi';
            if (id.includes('@rainbow-me')) return 'vendor-rainbowkit';
            if (id.includes('@tanstack/react-query')) return 'vendor-react-query';

            if (id.includes('@solana/web3.js')) return 'vendor-solana-web3';
            if (id.includes('@solana/spl-token')) return 'vendor-solana-spl';
            if (id.includes('wallet-adapter')) return 'vendor-solana-wallet-adapter';

            if (id.includes('@circle-fin')) return 'vendor-circle';
            if (id.includes('react-hook-form') || id.includes('zod')) return 'vendor-forms';
          }
        },
      },
    },
  },
});
