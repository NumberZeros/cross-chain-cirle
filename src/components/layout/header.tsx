import type React from 'react';

import { useAuthStore } from '../../state/auth.store';

function truncateAddress(address: string, visible = 6): string {
  if (address.length <= visible * 2 + 3) return address;
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

export function Header(): React.ReactElement {
  const accessToken = useAuthStore((s) => s.accessToken);
  const address = useAuthStore((s) => s.address);
  const chainType = useAuthStore((s) => s.chainType);

  return (
    <header className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-base font-semibold">Cross-chain USDC</div>
        <div className="text-xs text-muted-foreground">CCTP v2 transfer console</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {accessToken && address && chainType ? (
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-foreground">
            Session: {chainType} · {truncateAddress(address)}
          </span>
        ) : (
          <span className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
            Not signed in
          </span>
        )}
      </div>
    </header>
  );
}
