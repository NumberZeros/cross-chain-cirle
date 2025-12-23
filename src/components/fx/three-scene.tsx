import { Canvas, useFrame } from '@react-three/fiber';
import type React from 'react';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, MathUtils, type Mesh, type Points } from 'three';

function readCssHsl(varName: string): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return null;

  // raw is like: "217.2 91.2% 59.8%"
  const [h, s, l] = raw.split(/\s+/);
  if (!h || !s || !l) return null;
  return `hsl(${h}, ${s}, ${l})`;
}

function useThemeColors(): {
  primary: Color;
  ring: Color;
  mutedForeground: Color;
} | null {
  return useMemo(() => {
    const primaryHsl = readCssHsl('--primary');
    const ringHsl = readCssHsl('--ring');
    const mutedForegroundHsl = readCssHsl('--muted-foreground');
    if (!primaryHsl || !ringHsl || !mutedForegroundHsl) return null;

    return {
      primary: new Color(primaryHsl),
      ring: new Color(ringHsl),
      mutedForeground: new Color(mutedForegroundHsl),
    };
  }, []);
}

function WireKnot({
  colors,
}: {
  readonly colors: { primary: Color; ring: Color; mutedForeground: Color };
}): React.ReactElement {
  const knotRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (knotRef.current) {
      knotRef.current.rotation.x = t * 0.15;
      knotRef.current.rotation.y = t * 0.22;
    }

    if (haloRef.current) {
      haloRef.current.rotation.x = -t * 0.09;
      haloRef.current.rotation.y = t * 0.12;
      haloRef.current.scale.setScalar(1.08 + Math.sin(t * 0.6) * 0.015);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={haloRef}>
        <torusKnotGeometry args={[1.15, 0.32, 220, 18]} />
        <meshBasicMaterial
          color={colors.ring}
          transparent
          opacity={0.12}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={knotRef}>
        <torusKnotGeometry args={[1.05, 0.26, 260, 24]} />
        <meshBasicMaterial
          color={colors.primary}
          wireframe
          transparent
          opacity={0.38}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function StarField({ color }: { readonly color: Color }): React.ReactElement {
  const pointsRef = useRef<Points>(null);

  const { positions } = useMemo(() => {
    const count = 700;
    const arr = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = MathUtils.randFloat(4.5, 11.5);
      const theta = MathUtils.randFloat(0, Math.PI * 2);
      const phi = MathUtils.randFloat(0, Math.PI);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi) * 0.75;
      const z = radius * Math.sin(phi) * Math.sin(theta);

      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }

    return { positions: arr };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = t * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.012}
        sizeAttenuation
        transparent
        opacity={0.18}
        depthWrite={false}
      />
    </points>
  );
}

export default function ThreeScene(): React.ReactElement {
  const colors = useThemeColors();

  if (!colors) {
    return <></>;
  }

  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 6.2], fov: 52 }}
    >
      <StarField color={colors.mutedForeground} />
      <WireKnot colors={colors} />
    </Canvas>
  );
}
