import { useEffect, useState } from 'react';
import { Circle, Ellipse, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva';
import type { ItemDef } from '../../types';

const CELL = 18;

// Cache of HTMLImageElements indexed by URL so the same NH icon is only
// fetched once across many placements on the canvas.
const imageCache = new Map<string, HTMLImageElement>();

function useImage(src: string | undefined): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement | undefined>(() =>
    src ? imageCache.get(src) : undefined,
  );
  useEffect(() => {
    if (!src) {
      setImg(undefined);
      return;
    }
    const cached = imageCache.get(src);
    if (cached) {
      setImg(cached);
      return;
    }
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    let cancelled = false;
    i.onload = () => {
      if (cancelled) return;
      imageCache.set(src, i);
      setImg(i);
    };
    i.onerror = () => {
      if (cancelled) return;
      setImg(undefined);
    };
    i.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return img;
}

// Darken a hex color
function darken(hex: string, amount = 0.25): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function lighten(hex: string, amount = 0.2): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * amount)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

interface ItemShapeProps {
  def: ItemDef;
  w: number; // grid width (already rotated)
  h: number; // grid height (already rotated)
  selected?: boolean;
}

export function ItemShape({ def, w, h, selected }: ItemShapeProps) {
  const W = w * CELL;
  const H = h * CELL;

  const selectedStroke = selected ? '#f59e0b' : undefined;
  const selectedShadow = selected
    ? { shadowColor: '#f59e0b', shadowBlur: 10, shadowOpacity: 0.6 }
    : {};

  if (def.imageUrl) {
    return <SpriteShape def={def} W={W} H={H} selected={selected} />;
  }

  switch (def.category) {
    case 'tree':
      return <TreeShape def={def} cellW={W} cellH={H} selected={selected} />;
    case 'flower':
      return <FlowerShape def={def} cellW={W} cellH={H} selected={selected} />;
    case 'fence':
      return <FenceShape def={def} cellW={W} cellH={H} selected={selected} />;
    case 'bridge':
      return <BridgeShape def={def} cellW={W} cellH={H} selected={selected} />;
    case 'incline':
      return <InclineShape def={def} cellW={W} cellH={H} selected={selected} />;
    case 'building':
      return <BuildingShape def={def} cellW={W} cellH={H} selected={selected} />;
    case 'furniture':
    case 'decoration':
    default:
      // Soft rounded block with shadow + emoji
      return (
        <Group>
          {/* drop shadow */}
          <Rect
            x={1.5}
            y={3}
            width={W - 3}
            height={H - 3}
            cornerRadius={6}
            fill="rgba(40, 70, 31, 0.18)"
          />
          {/* body */}
          <Rect
            width={W}
            height={H}
            cornerRadius={6}
            fill={def.color}
            stroke={selectedStroke ?? darken(def.color, 0.3)}
            strokeWidth={selected ? 2.5 : 1.2}
            {...selectedShadow}
          />
          {/* subtle top highlight */}
          <Rect
            x={2}
            y={2}
            width={W - 4}
            height={Math.max(2, H * 0.25)}
            cornerRadius={[4, 4, 0, 0]}
            fill={lighten(def.color, 0.35)}
            opacity={0.45}
            listening={false}
          />
          {def.emoji && (
            <Text
              text={def.emoji}
              fontSize={Math.min(W, H) * 0.62}
              width={W}
              height={H}
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          )}
        </Group>
      );
  }
}

interface SubProps {
  def: ItemDef;
  cellW: number;
  cellH: number;
  selected?: boolean;
}

/**
 * Renders any item that has a sprite URL (NH catalog icons). Falls back to a
 * neutral cream card with the emoji while the image is loading or if it fails.
 */
function SpriteShape({
  def,
  W,
  H,
  selected,
}: {
  def: ItemDef;
  W: number;
  H: number;
  selected?: boolean;
}) {
  const img = useImage(def.imageUrl);
  const stroke = selected ? '#f59e0b' : 'rgba(40,70,31,0.25)';
  const shadow = selected
    ? { shadowColor: '#f59e0b', shadowBlur: 10, shadowOpacity: 0.6 }
    : {};
  const pad = Math.max(1, Math.min(W, H) * 0.08);
  return (
    <Group>
      {/* drop shadow */}
      <Rect
        x={1.5}
        y={3}
        width={W - 3}
        height={H - 3}
        cornerRadius={6}
        fill="rgba(40, 70, 31, 0.18)"
        listening={false}
      />
      <Rect
        width={W}
        height={H}
        cornerRadius={6}
        fill={def.color}
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 1.2}
        {...shadow}
      />
      {img ? (
        <KonvaImage
          image={img}
          x={pad}
          y={pad}
          width={W - pad * 2}
          height={H - pad * 2}
          listening={false}
        />
      ) : (
        <Text
          text={def.emoji ?? '🪑'}
          fontSize={Math.min(W, H) * 0.55}
          width={W}
          height={H}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
    </Group>
  );
}

function TreeShape({ def, cellW, cellH, selected }: SubProps) {
  const cx = cellW / 2;
  const cy = cellH / 2;
  const baseR = Math.min(cellW, cellH) * 0.45;
  const trunk = darken(def.color, 0.45);
  const canopy = def.color;
  const canopyDark = darken(def.color, 0.25);
  const canopyHi = lighten(def.color, 0.25);

  // Special-case pine: more elongated/dark
  const isPine = def.key === 'tree_pine';
  // Bamboo: tall thin segments
  const isBamboo = def.key === 'bamboo';
  // Palm: distinctive fronds
  const isPalm = def.key === 'tree_palm';

  if (isBamboo) {
    return (
      <Group>
        <Ellipse x={cx} y={cellH * 0.9} radiusX={baseR * 0.45} radiusY={baseR * 0.14} fill="rgba(0,0,0,0.18)" listening={false} />
        {[-0.3, 0, 0.3].map((dx, i) => (
          <Rect
            key={i}
            x={cx - 1.2 + dx * baseR * 0.6}
            y={cellH * 0.18}
            width={2.4}
            height={cellH * 0.7}
            fill={canopy}
            stroke={canopyDark}
            strokeWidth={0.6}
            cornerRadius={1.2}
            listening={false}
          />
        ))}
        {/* leaf clusters at top */}
        <Circle x={cx - 2} y={cellH * 0.2} radius={baseR * 0.35} fill={canopy} stroke={canopyDark} strokeWidth={0.8} listening={false} />
        <Circle x={cx + 2} y={cellH * 0.22} radius={baseR * 0.3} fill={lighten(canopy, 0.15)} stroke={canopyDark} strokeWidth={0.8} listening={false} />
        {selected && <SelectionRing cx={cx} cy={cy} r={baseR * 1.1} />}
      </Group>
    );
  }

  if (isPalm) {
    const arms = [-90, -35, 30, 105, 170, 235].map((a) => (a * Math.PI) / 180);
    return (
      <Group>
        <Ellipse x={cx} y={cellH * 0.85} radiusX={baseR * 0.45} radiusY={baseR * 0.16} fill="rgba(0,0,0,0.2)" listening={false} />
        {/* trunk */}
        <Rect x={cx - 1.5} y={cellH * 0.45} width={3} height={cellH * 0.45} fill={trunk} cornerRadius={1.5} listening={false} />
        {/* fronds */}
        {arms.map((a, i) => (
          <Ellipse
            key={i}
            x={cx + Math.cos(a) * baseR * 0.45}
            y={cellH * 0.45 + Math.sin(a) * baseR * 0.45}
            radiusX={baseR * 0.55}
            radiusY={baseR * 0.18}
            rotation={(a * 180) / Math.PI}
            fill={i % 2 === 0 ? canopy : lighten(canopy, 0.15)}
            stroke={canopyDark}
            strokeWidth={0.6}
            listening={false}
          />
        ))}
        {/* center coconuts */}
        <Circle x={cx} y={cellH * 0.45} radius={baseR * 0.18} fill={darken(canopy, 0.3)} listening={false} />
        {selected && <SelectionRing cx={cx} cy={cy} r={baseR * 1.1} />}
      </Group>
    );
  }

  // Default tree: shadow + puffy canopy + small trunk hint
  return (
    <Group>
      <Ellipse
        x={cx + 1}
        y={cellH * 0.9}
        radiusX={baseR * 0.65}
        radiusY={baseR * 0.18}
        fill="rgba(0,0,0,0.22)"
        listening={false}
      />
      {/* puffy canopy: 1 main + 2 small offsets for cloud-like silhouette */}
      <Circle
        x={cx - baseR * 0.25}
        y={cy - baseR * 0.05}
        radius={baseR * 0.55}
        fill={canopyDark}
        listening={false}
      />
      <Circle
        x={cx + baseR * 0.25}
        y={cy + baseR * 0.05}
        radius={baseR * 0.55}
        fill={canopyDark}
        listening={false}
      />
      <Circle
        x={cx}
        y={cy - baseR * 0.15}
        radius={baseR * (isPine ? 0.75 : 0.7)}
        fill={canopy}
        stroke={canopyDark}
        strokeWidth={1.1}
        listening={false}
      />
      {/* highlight blob */}
      <Circle
        x={cx - baseR * 0.25}
        y={cy - baseR * 0.35}
        radius={baseR * 0.22}
        fill={canopyHi}
        opacity={0.55}
        listening={false}
      />
      {/* trunk hint at the base */}
      <Rect
        x={cx - 1.5}
        y={cy + baseR * 0.55}
        width={3}
        height={cellH * 0.18}
        fill={trunk}
        cornerRadius={1.5}
        listening={false}
      />
      {selected && <SelectionRing cx={cx} cy={cy} r={baseR * 1.1} />}
    </Group>
  );
}

function FlowerShape({ def, cellW, cellH, selected }: SubProps) {
  const cx = cellW / 2;
  const cy = cellH / 2;
  const r = Math.min(cellW, cellH) * 0.32;
  const petal = def.color;
  const petalDark = darken(petal, 0.22);
  const stem = '#3a6a2b';
  const isLargeBed = false; // single-tile

  return (
    <Group>
      {/* tiny shadow */}
      <Ellipse
        x={cx}
        y={cy + r * 0.85}
        radiusX={r * 0.7}
        radiusY={r * 0.18}
        fill="rgba(0,0,0,0.18)"
        listening={false}
      />
      {/* stem */}
      <Rect
        x={cx - 0.8}
        y={cy + r * 0.1}
        width={1.6}
        height={r * 0.75}
        fill={stem}
        cornerRadius={0.8}
        listening={false}
      />
      {/* 5 petals around center */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        return (
          <Circle
            key={i}
            x={cx + Math.cos(a) * r * 0.5}
            y={cy + Math.sin(a) * r * 0.5}
            radius={r * 0.45}
            fill={petal}
            stroke={petalDark}
            strokeWidth={0.7}
            listening={false}
          />
        );
      })}
      {/* center pollen */}
      <Circle
        x={cx}
        y={cy}
        radius={r * 0.32}
        fill="#fbbf24"
        stroke="#b45309"
        strokeWidth={0.6}
        listening={false}
      />
      {selected && <SelectionRing cx={cx} cy={cy} r={r * 1.7} />}
      {isLargeBed}
    </Group>
  );
}

function FenceShape({ def, cellW, cellH, selected }: SubProps) {
  // Two vertical posts with a horizontal rail
  const railColor = def.color;
  const railDark = darken(def.color, 0.35);
  const cx = cellW / 2;
  return (
    <Group>
      {/* shadow */}
      <Rect
        x={2}
        y={cellH - 3}
        width={cellW - 4}
        height={2}
        fill="rgba(0,0,0,0.18)"
        cornerRadius={1}
        listening={false}
      />
      {/* horizontal rail */}
      <Rect
        x={1}
        y={cellH * 0.4}
        width={cellW - 2}
        height={cellH * 0.22}
        fill={railColor}
        stroke={railDark}
        strokeWidth={0.6}
        cornerRadius={2}
        listening={false}
      />
      {/* two posts */}
      <Rect x={cx - cellW * 0.4} y={cellH * 0.15} width={2.4} height={cellH * 0.7} fill={railDark} cornerRadius={1} listening={false} />
      <Rect x={cx + cellW * 0.4 - 2.4} y={cellH * 0.15} width={2.4} height={cellH * 0.7} fill={railDark} cornerRadius={1} listening={false} />
      {selected && <Rect width={cellW} height={cellH} stroke="#f59e0b" strokeWidth={2} cornerRadius={3} listening={false} />}
    </Group>
  );
}

function BridgeShape({ def, cellW, cellH, selected }: SubProps) {
  const base = def.color;
  const dark = darken(def.color, 0.35);
  return (
    <Group>
      <Rect x={0} y={2} width={cellW} height={cellH - 4} fill="rgba(0,0,0,0.2)" cornerRadius={3} listening={false} />
      <Rect width={cellW} height={cellH} fill={base} stroke={dark} strokeWidth={1.2} cornerRadius={4} listening={false} />
      {/* plank stripes */}
      {Array.from({ length: Math.floor(cellW / CELL) }, (_, i) => i).map((i) => (
        <Line
          key={i}
          points={[(i + 1) * CELL, 2, (i + 1) * CELL, cellH - 2]}
          stroke={dark}
          strokeWidth={0.8}
          opacity={0.5}
          listening={false}
        />
      ))}
      {/* rails top & bottom */}
      <Rect x={0} y={0} width={cellW} height={cellH * 0.22} fill={dark} cornerRadius={[3, 3, 0, 0]} listening={false} />
      <Rect x={0} y={cellH * 0.78} width={cellW} height={cellH * 0.22} fill={dark} cornerRadius={[0, 0, 3, 3]} listening={false} />
      {selected && <Rect width={cellW} height={cellH} stroke="#f59e0b" strokeWidth={2.5} cornerRadius={4} listening={false} />}
    </Group>
  );
}

function InclineShape({ def, cellW, cellH, selected }: SubProps) {
  const base = def.color;
  const dark = darken(def.color, 0.35);
  // Vertical steps
  return (
    <Group>
      <Rect width={cellW} height={cellH} fill={base} stroke={dark} strokeWidth={1.2} cornerRadius={3} listening={false} />
      {Array.from({ length: 5 }, (_, i) => (
        <Line
          key={i}
          points={[2, (cellH * (i + 1)) / 6, cellW - 2, (cellH * (i + 1)) / 6]}
          stroke={dark}
          strokeWidth={0.9}
          opacity={0.6}
          listening={false}
        />
      ))}
      {selected && <Rect width={cellW} height={cellH} stroke="#f59e0b" strokeWidth={2.5} cornerRadius={3} listening={false} />}
    </Group>
  );
}

function BuildingShape({ def, cellW, cellH, selected }: SubProps) {
  const wall = def.color;
  const wallDark = darken(wall, 0.3);
  const wallHi = lighten(wall, 0.18);
  // Roof color: derive from wall hue but warmer
  const roofColor = def.key === 'museum' ? '#7a4a2a' : def.key === 'tailor_shop' ? '#9b3a3a' : '#a04734';
  const roofDark = darken(roofColor, 0.3);

  const roofH = cellH * 0.4;
  const bodyY = roofH;
  const bodyH = cellH - bodyY;
  const doorW = Math.min(cellW * 0.18, CELL * 0.9);
  const doorH = bodyH * 0.55;

  return (
    <Group>
      {/* drop shadow */}
      <Rect x={2} y={6} width={cellW - 4} height={cellH - 6} fill="rgba(40,70,31,0.22)" cornerRadius={6} listening={false} />
      {/* body */}
      <Rect
        y={bodyY}
        width={cellW}
        height={bodyH}
        fill={wall}
        stroke={wallDark}
        strokeWidth={1.2}
        cornerRadius={[2, 2, 6, 6]}
        listening={false}
      />
      {/* body highlight stripe */}
      <Rect
        x={2}
        y={bodyY + 2}
        width={cellW - 4}
        height={bodyH * 0.25}
        fill={wallHi}
        opacity={0.5}
        cornerRadius={[2, 2, 0, 0]}
        listening={false}
      />
      {/* triangular roof: trapezoid look using line polygon */}
      <Line
        points={[
          0, bodyY + 2,
          cellW * 0.18, 0,
          cellW * 0.82, 0,
          cellW, bodyY + 2,
        ]}
        closed
        fill={roofColor}
        stroke={roofDark}
        strokeWidth={1.2}
        listening={false}
      />
      {/* roof highlight */}
      <Line
        points={[
          cellW * 0.22, 2,
          cellW * 0.5, 2,
          cellW * 0.18 + 4, bodyY + 1,
        ]}
        closed
        fill={lighten(roofColor, 0.2)}
        opacity={0.6}
        listening={false}
      />
      {/* door */}
      <Rect
        x={(cellW - doorW) / 2}
        y={cellH - doorH}
        width={doorW}
        height={doorH}
        fill={darken(wall, 0.45)}
        stroke={darken(wall, 0.55)}
        strokeWidth={0.8}
        cornerRadius={[doorW * 0.4, doorW * 0.4, 0, 0]}
        listening={false}
      />
      {/* windows: 2 small */}
      {cellW > CELL * 3 && (
        <>
          <Rect
            x={cellW * 0.18}
            y={bodyY + bodyH * 0.28}
            width={cellW * 0.13}
            height={cellH * 0.18}
            fill="#bce7ff"
            stroke={wallDark}
            strokeWidth={0.8}
            cornerRadius={1.5}
            listening={false}
          />
          <Rect
            x={cellW * 0.69}
            y={bodyY + bodyH * 0.28}
            width={cellW * 0.13}
            height={cellH * 0.18}
            fill="#bce7ff"
            stroke={wallDark}
            strokeWidth={0.8}
            cornerRadius={1.5}
            listening={false}
          />
        </>
      )}
      {selected && (
        <Rect
          width={cellW}
          height={cellH}
          stroke="#f59e0b"
          strokeWidth={2.5}
          cornerRadius={6}
          listening={false}
          shadowColor="#f59e0b"
          shadowBlur={10}
          shadowOpacity={0.6}
        />
      )}
    </Group>
  );
}

function SelectionRing({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <Circle
      x={cx}
      y={cy}
      radius={r}
      stroke="#f59e0b"
      strokeWidth={2}
      dash={[3, 2]}
      listening={false}
      shadowColor="#f59e0b"
      shadowBlur={8}
      shadowOpacity={0.5}
    />
  );
}
