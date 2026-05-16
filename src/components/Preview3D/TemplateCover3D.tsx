// Lightweight 3D cover for the template gallery. One r3f canvas per card,
// but:
//   - `frameloop="demand"` so we render exactly one frame per design,
//     then the GPU goes idle (no animated re-paints).
//   - lazy-mounted via `IntersectionObserver` so off-screen cards never spin
//     up a WebGL context (the browser typically caps at ~16 concurrent ones).
//   - low DPR + tiny shadow map keep VRAM under control across many cards.

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import IslandScene, { type SceneDesign } from './IslandScene';

interface TemplateCover3DProps {
  /**
   * Anything shaped like an island — the template gallery passes a partial
   * `IslandDesign` (no id / name / timestamps), so we only require the
   * geometry-relevant fields.
   */
  design: SceneDesign;
  /** Optional CSS background applied to the wrapper until the canvas mounts. */
  fallbackBackground?: string;
  /** Stable id used for the React key — defaults to undefined (parent decides). */
  className?: string;
}

export default function TemplateCover3D({
  design,
  fallbackBackground = 'linear-gradient(135deg, #cfeaff 0%, #bfe4ff 100%)',
  className,
}: TemplateCover3DProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    // Older browsers without IntersectionObserver fall back to "always render"
    // so the gallery still shows previews — they pay the WebGL cost up-front.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cols = design.size.cols;
  const rows = design.size.rows;

  // Slightly tilted isometric-ish camera. The position scales with the
  // design footprint so every template fits the frame without needing
  // OrbitControls auto-fit.
  const camPos: [number, number, number] = [cols * 0.78, cols * 0.85, rows * 1.05];

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        background: fallbackBackground,
        overflow: 'hidden',
      }}
    >
      {visible && (
        <Canvas
          shadows
          dpr={[1, 1.5]}
          frameloop="demand"
          gl={{ antialias: true, preserveDrawingBuffer: false, powerPreference: 'low-power' }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Solid sky-blue clear so we don't pay for `<Sky />` per card. */}
          <color attach="background" args={['#cfeaff']} />
          <PerspectiveCamera makeDefault position={camPos} fov={36} />
          {/* Static aim at island center. */}
          <CameraLookAt target={[0, 0, 0]} />

          <Suspense fallback={null}>
            <IslandScene design={design} shadowMapSize={512} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}

/** One-shot camera aim — we don't need OrbitControls in covers. */
function CameraLookAt({ target }: { target: [number, number, number] }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.lookAt(target[0], target[1], target[2]);
    // Demand-frame mode: schedule a single render after the look-at is applied.
    invalidate();
  }, [camera, target, invalidate]);
  return null;
}
