import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import type React from 'react';

const ThreeScene = lazy(() => import('./three-scene'));

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => setReducedMotion(Boolean(mediaQuery.matches));

    onChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    // Safari
    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  return reducedMotion;
}

export function AmbientBackdrop(): React.ReactElement {
  const reducedMotion = usePrefersReducedMotion();

  const gradientStyle = useMemo<React.CSSProperties>(
    () => ({
      background:
        'radial-gradient(900px circle at 20% 10%, hsl(var(--primary) / 0.18), transparent 60%),\n' +
        'radial-gradient(700px circle at 80% 30%, hsl(var(--ring) / 0.16), transparent 55%),\n' +
        'radial-gradient(850px circle at 60% 90%, hsl(var(--primary) / 0.12), transparent 62%)',
    }),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0" style={gradientStyle} />

      {/* soft glow blobs (token-based colors only) */}
      <div
        className="absolute -left-32 top-12 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--primary) / 0.10)' }}
      />
      <div
        className="absolute -right-40 top-40 h-[620px] w-[620px] rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--ring) / 0.10)' }}
      />
      <div
        className="absolute left-1/3 top-[60%] h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--primary) / 0.08)' }}
      />

      {!reducedMotion ? (
        <div className="absolute inset-0 opacity-40">
          <Suspense fallback={null}>
            <ThreeScene />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
