import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Sky } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCanvasStore } from '../../stores/canvasStore';
import IslandScene from './IslandScene';

export default function Preview3D() {
  const { t } = useTranslation();
  const design = useCanvasStore((s) => s.design);
  const layerVisibility = useCanvasStore((s) => s.layerVisibility);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [azimuthDeg, setAzimuthDeg] = useState(0);

  const cols = design.size.cols;
  const rows = design.size.rows;

  const resetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.reset();
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-sky-100 relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[cols * 0.55, cols * 0.7, rows * 0.9]} fov={42} />
        <OrbitControls
          ref={controlsRef}
          target={[0, 0, 0]}
          enablePan
          maxPolarAngle={Math.PI / 2.2}
          minDistance={10}
          maxDistance={250}
        />
        <CameraAzimuthTracker onChange={setAzimuthDeg} />

        <Sky distance={450} sunPosition={[60, 40, 30]} inclination={0.5} azimuth={0.25} />

        <Suspense fallback={null}>
          <IslandScene design={design} layerVisibility={layerVisibility} />
        </Suspense>
      </Canvas>

      {/* N (north) compass HUD — rotates with camera azimuth */}
      <button
        onClick={resetCamera}
        title={t('preview3d.resetCamera')}
        className="absolute top-3 right-3 w-12 h-12 rounded-full bg-white/90 backdrop-blur border-2 border-cream-200 grid place-items-center hover:bg-white transition shadow-soft"
        style={{ boxShadow: '0 3px 0 0 #d4c9b4' }}
      >
        <div
          className="relative w-7 h-7"
          style={{ transform: `rotate(${-azimuthDeg}deg)`, transition: 'transform 0.08s linear' }}
        >
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '12px solid #e05a5a',
            }}
          />
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '12px solid #c4b89e',
            }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[10px] font-extrabold text-leaf-800 leading-none">N</span>
          </div>
        </div>
      </button>
    </div>
  );
}

/** Tracks camera horizontal rotation (azimuth) and reports it in degrees. */
function CameraAzimuthTracker({ onChange }: { onChange: (deg: number) => void }) {
  const lastRef = useRef(0);
  useFrame(({ camera }) => {
    const azimuth = Math.atan2(camera.position.x, camera.position.z) * (180 / Math.PI);
    if (Math.abs(azimuth - lastRef.current) > 0.5) {
      lastRef.current = azimuth;
      onChange(azimuth);
    }
  });
  return null;
}
