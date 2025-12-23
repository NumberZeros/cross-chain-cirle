import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * Plugin to ensure Buffer globals are initialized immediately after imports.
 * This prevents "Buffer is not defined" errors in vendor-circle and other chunks.
 */
function injectBufferPolyfill(): Plugin {
  return {
    name: 'inject-buffer-polyfill',
    enforce: 'post',
    generateBundle(_, bundle) {
      // Find the entry chunk (index-*.js)
      const entryChunk = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk' && chunk.isEntry,
      );

      if (entryChunk && entryChunk.type === 'chunk') {
        // Find the vendor-buffer import pattern
        // The import uses 't as X' pattern, we need to use X to call the Buffer export
        const vendorBufferImportMatch = entryChunk.code.match(
          /import\{[^}]*\bt as ([a-z]+)[^}]*\}from"\.\/vendor-buffer-[^"]+\.js";?/
        );
        
        if (vendorBufferImportMatch) {
          const [vendorBufferImport, importName] = vendorBufferImportMatch;
          
          // Create Buffer initialization code using the import name
          const bufferInit = `var __buf=${importName}();globalThis.Buffer??=__buf.Buffer,globalThis.global??=globalThis,globalThis.process??={env:{}};`;
          
          // Replace the import with: import + Buffer init
          const replacement = `${vendorBufferImport}${bufferInit}`;
          
          entryChunk.code = entryChunk.code.replace(vendorBufferImport, replacement);
          
          console.log('[inject-buffer-polyfill] Successfully injected Buffer initialization');
        } else {
          console.warn('[inject-buffer-polyfill] Could not find vendor-buffer import');
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    injectBufferPolyfill(),
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
