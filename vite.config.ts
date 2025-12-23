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
    // This app includes heavy 3D + wallet stacks; chunking improves caching and avoids noisy warnings.
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
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
            if (id.includes('@circle-fin')) return 'vendor-circle';
            if (id.includes('react-hook-form') || id.includes('zod')) return 'vendor-forms';
          }
        },
      },
    },
  },
});
