import { Buffer } from 'buffer';

// Ensure Node-compatible globals exist before other deps evaluate.
// Some crypto/wallet deps expect these in the browser.
(globalThis as unknown as { Buffer?: typeof Buffer }).Buffer ??= Buffer;

// A few deps may reference `global` or `process`.
(globalThis as unknown as { global?: unknown }).global ??= globalThis;
(globalThis as unknown as { process?: { env?: Record<string, string> } }).process ??= {
  env: {},
};
