// Headless 3D scene for an `IslandDesign`. Used by:
//   - `Preview3D` (full editor preview, with controls + Sky)
//   - `TemplateCover3D` (small static thumbnails on the Gallery)
//
// Everything camera- and lighting-related that's shared between callers lives
// here; the actual `<Canvas>` and `<OrbitControls>` / `<Sky>` are owned by the
// outer component so they can be sized + interacted with independently.

import { useMemo } from 'react';
import { resolveItemDef } from '../../data/itemResolver';
import { TERRAIN, type LayerVisibility, type PlacedItem } from '../../types';
import { getRotatedSize } from '../../utils/grid';

/**
 * Minimal subset of `IslandDesign` the 3D scene actually consumes. Lets us
 * pass either a full `IslandDesign` (from `useCanvasStore`) or the partial
 * shape stored in template definitions.
 */
export interface SceneDesign {
  size: { cols: number; rows: number };
  items: PlacedItem[];
  terrain: number[][];
}

const TERRAIN_COLOR_3D: Record<number, string> = {
  [TERRAIN.GRASS]: '#8fc662',
  [TERRAIN.SAND]: '#f2dba4',
  [TERRAIN.WATER]: '#5fb6e0',
  [TERRAIN.CLIFF1]: '#7fb060',
  [TERRAIN.CLIFF2]: '#6fa14a',
  [TERRAIN.CLIFF3]: '#558636',
  [TERRAIN.PATH_STONE]: '#d5cfc5',
  [TERRAIN.PATH_WOOD]: '#c9a26f',
  [TERRAIN.PATH_BRICK]: '#c66b45',
  [TERRAIN.FLOWER_BED]: '#f0c7df',
};

function itemHeight(category: string): number {
  switch (category) {
    case 'building':
      return 4;
    case 'tree':
      return 3;
    case 'bridge':
      return 0.4;
    case 'incline':
      return 1.2;
    case 'fence':
      return 0.6;
    case 'furniture':
      return 0.8;
    case 'decoration':
      return 1.2;
    case 'flower':
      return 0.3;
    default:
      return 1;
  }
}

interface IslandSceneProps {
  design: SceneDesign;
  /** Optional layer visibility mask; when undefined every layer renders. */
  layerVisibility?: Partial<LayerVisibility>;
  /**
   * Shadow map size for the directional light. Set lower (e.g. 512) for
   * thumbnail-grade scenes to keep memory low when many canvases coexist.
   */
  shadowMapSize?: number;
}

export default function IslandScene({
  design,
  layerVisibility,
  shadowMapSize = 2048,
}: IslandSceneProps) {
  const cols = design.size.cols;
  const rows = design.size.rows;
  const cx = cols / 2;
  const cz = rows / 2;

  const terrainBlocks = useMemo(() => {
    const blocks: { x: number; z: number; color: string; h: number; isWater: boolean }[] = [];
    for (let y = 0; y < design.terrain.length; y++) {
      for (let x = 0; x < design.terrain[y].length; x++) {
        const code = design.terrain[y][x];
        if (code === TERRAIN.GRASS) continue;
        let h = 0.06;
        let isWater = false;
        if (code === TERRAIN.CLIFF1) h = 1;
        if (code === TERRAIN.CLIFF2) h = 2;
        if (code === TERRAIN.CLIFF3) h = 3;
        if (code === TERRAIN.WATER) {
          h = 0.04;
          isWater = true;
        }
        blocks.push({ x, z: y, color: TERRAIN_COLOR_3D[code] ?? '#aaaaaa', h, isWater });
      }
    }
    return blocks;
  }, [design.terrain]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[40, 60, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-cols}
        shadow-camera-right={cols}
        shadow-camera-top={rows}
        shadow-camera-bottom={-rows}
      />
      <hemisphereLight args={['#cfeaff', '#3a6a2b', 0.4]} />

      {/* Grass base */}
      <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[cols + 0.4, 0.2, rows + 0.4]} />
        <meshStandardMaterial color={TERRAIN_COLOR_3D[TERRAIN.GRASS]} roughness={0.9} />
      </mesh>
      {/* Soil rim */}
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <boxGeometry args={[cols + 0.2, 0.5, rows + 0.2]} />
        <meshStandardMaterial color="#7a5230" roughness={1} />
      </mesh>

      {/* Terrain blocks */}
      {terrainBlocks.map((b, i) => (
        <mesh
          key={i}
          position={[b.x - cx + 0.5, b.h / 2, b.z - cz + 0.5]}
          receiveShadow
          castShadow={!b.isWater}
        >
          <boxGeometry args={[1, b.h, 1]} />
          <meshStandardMaterial
            color={b.color}
            transparent={b.isWater}
            opacity={b.isWater ? 0.85 : 1}
            metalness={b.isWater ? 0.2 : 0}
            roughness={b.isWater ? 0.2 : 0.9}
          />
        </mesh>
      ))}

      {/* Items */}
      {design.items.map((it) => {
        if (layerVisibility && layerVisibility[it.layer]?.visible === false) return null;
        const def = resolveItemDef(it.itemKey);
        if (!def) return null;
        const size = getRotatedSize(it.w, it.h, it.rotation);
        const px = it.x - cx + size.w / 2;
        const pz = it.y - cz + size.h / 2;

        if (def.category === 'tree') {
          return <TreeNode key={it.id} x={px} z={pz} color={def.color} keyName={def.key} />;
        }
        if (def.category === 'flower') {
          return <FlowerNode key={it.id} x={px} z={pz} color={def.color} />;
        }
        if (def.category === 'building') {
          return <BuildingNode key={it.id} x={px} z={pz} w={size.w} d={size.h} color={def.color} />;
        }
        if (def.category === 'fence') {
          return <FenceNode key={it.id} x={px} z={pz} color={def.color} />;
        }
        const h = itemHeight(def.category);
        return (
          <mesh key={it.id} position={[px, h / 2, pz]} castShadow receiveShadow>
            <boxGeometry args={[size.w * 0.88, h, size.h * 0.88]} />
            <meshStandardMaterial color={def.color} roughness={0.7} />
          </mesh>
        );
      })}
    </>
  );
}

function TreeNode({ x, z, color, keyName }: { x: number; z: number; color: string; keyName: string }) {
  const isPine = keyName === 'tree_pine';
  const isBamboo = keyName === 'bamboo';
  const isPalm = keyName === 'tree_palm';

  if (isBamboo) {
    return (
      <group position={[x, 0, z]}>
        {[-0.15, 0, 0.15].map((dx, i) => (
          <mesh key={i} position={[dx, 1, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 2, 6]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 2.2, 0]} castShadow>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (isPalm) {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.16, 2.4, 8]} />
          <meshStandardMaterial color="#8b6b3e" roughness={0.9} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i * Math.PI * 2) / 6;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.6, 2.5, Math.sin(a) * 0.6]}
              rotation={[0, a, -0.5]}
              castShadow
            >
              <coneGeometry args={[0.18, 1.2, 6]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    );
  }

  const canopyY = isPine ? 1.8 : 1.5;
  const trunkH = isPine ? 1.2 : 1;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, trunkH, 8]} />
        <meshStandardMaterial color="#7a5230" roughness={0.95} />
      </mesh>
      <mesh position={[0, canopyY, 0]} castShadow>
        <sphereGeometry args={[isPine ? 0.7 : 0.78, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, canopyY + 0.25, 0.1]} castShadow>
        <sphereGeometry args={[isPine ? 0.45 : 0.55, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-0.25, canopyY + 0.1, -0.2]} castShadow>
        <sphereGeometry args={[isPine ? 0.4 : 0.5, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  );
}

function FlowerNode({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
        <meshStandardMaterial color="#3a6a2b" />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.4} emissive="#f59e0b" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

function FenceNode({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.12, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[-0.35, 0.3, 0]} castShadow>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0.35, 0.3, 0]} castShadow>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

function BuildingNode({
  x,
  z,
  w,
  d,
  color,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
}) {
  const wallH = 2.4;
  const roofH = 1.4;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.92, wallH, d * 0.92]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, wallH + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(w, d) * 0.78, roofH, 4]} />
        <meshStandardMaterial color="#a04734" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.6, d * 0.46]} castShadow>
        <boxGeometry args={[Math.min(0.7, w * 0.25), 1.2, 0.05]} />
        <meshStandardMaterial color="#5a3520" roughness={0.7} />
      </mesh>
      {w > 3 && (
        <>
          <mesh position={[-w * 0.28, 1.5, d * 0.46]}>
            <boxGeometry args={[0.5, 0.5, 0.05]} />
            <meshStandardMaterial color="#bce7ff" emissive="#bce7ff" emissiveIntensity={0.25} roughness={0.3} />
          </mesh>
          <mesh position={[w * 0.28, 1.5, d * 0.46]}>
            <boxGeometry args={[0.5, 0.5, 0.05]} />
            <meshStandardMaterial color="#bce7ff" emissive="#bce7ff" emissiveIntensity={0.25} roughness={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}
