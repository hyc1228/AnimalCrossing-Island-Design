import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Group, Line, Circle, Ellipse } from 'react-konva';
import { useTranslation } from 'react-i18next';
import type Konva from 'konva';
import { useCanvasStore } from '../../stores/canvasStore';
import { useUIStore } from '../../stores/uiStore';
import { TERRAIN } from '../../types';
import { resolveItemDef } from '../../data/itemResolver';
import { getRotatedSize } from '../../utils/grid';
import { registerCanvasStage } from '../../utils/canvasHandle';
import { ItemShape } from './itemShapes';

const CELL = 18; // pixel size per grid cell at zoom 1

// Animal Crossing inspired palette - more saturated, warmer
const TERRAIN_COLOR: Record<number, string> = {
  [TERRAIN.GRASS]: '#8fc662',
  [TERRAIN.SAND]: '#f2dba4',
  [TERRAIN.WATER]: '#76c4e8',
  [TERRAIN.CLIFF1]: '#7fb060',
  [TERRAIN.CLIFF2]: '#6fa14a',
  [TERRAIN.CLIFF3]: '#558636',
  [TERRAIN.PATH_STONE]: '#d5cfc5',
  [TERRAIN.PATH_WOOD]: '#c9a26f',
  [TERRAIN.PATH_BRICK]: '#c66b45',
  [TERRAIN.FLOWER_BED]: '#f0c7df',
};

// Tone for terrain border / texture
const TERRAIN_DARK: Record<number, string> = {
  [TERRAIN.SAND]: '#e2c485',
  [TERRAIN.WATER]: '#4ea7ce',
  [TERRAIN.CLIFF1]: '#5b8c44',
  [TERRAIN.CLIFF2]: '#4d8336',
  [TERRAIN.CLIFF3]: '#3a6a2b',
  [TERRAIN.PATH_STONE]: '#bab4a8',
  [TERRAIN.PATH_WOOD]: '#a78054',
  [TERRAIN.PATH_BRICK]: '#a25032',
  [TERRAIN.FLOWER_BED]: '#d8a6c4',
};

// Simple deterministic hash for stable random tufts
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

interface IslandCanvasProps {
  width: number;
  height: number;
}

export default function IslandCanvas({ width, height }: IslandCanvasProps) {
  const { t } = useTranslation();
  const design = useCanvasStore((s) => s.design);
  const tool = useCanvasStore((s) => s.tool);
  const selectedItemKey = useCanvasStore((s) => s.selectedItemKey);
  const selectedTerrainCode = useCanvasStore((s) => s.selectedTerrainCode);
  const selectedPlacedId = useCanvasStore((s) => s.selectedPlacedId);
  const layerVisibility = useCanvasStore((s) => s.layerVisibility);
  const brushSize = useCanvasStore((s) => s.brushSize);
  const placeItem = useCanvasStore((s) => s.placeItem);
  const moveItem = useCanvasStore((s) => s.moveItem);
  const paintTerrainCell = useCanvasStore((s) => s.paintTerrainCell);
  const paintTerrainRect = useCanvasStore((s) => s.paintTerrainRect);
  const setSelectedPlacedId = useCanvasStore((s) => s.setSelectedPlacedId);
  const deleteItem = useCanvasStore((s) => s.deleteItem);
  const showGrid = useUIStore((s) => s.showGrid);

  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 20, y: 20 });
  const [isPainting, setIsPainting] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  useEffect(() => {
    const cw = design.size.cols * CELL;
    const ch = design.size.rows * CELL;
    const sx = (width - cw) / 2;
    const sy = (height - ch) / 2;
    setStagePos({ x: Math.max(20, sx), y: Math.max(20, sy) });
  }, [width, height, design.size.cols, design.size.rows]);

  const pointerToCell = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const x = Math.floor((pointer.x - stagePos.x) / (CELL * scale));
    const y = Math.floor((pointer.y - stagePos.y) / (CELL * scale));
    if (x < 0 || x >= design.size.cols || y < 0 || y >= design.size.rows) return null;
    return { x, y };
  }, [scale, stagePos.x, stagePos.y, design.size.cols, design.size.rows]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scaleBy = 1.08;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.4, Math.min(3, direction > 0 ? oldScale * scaleBy : oldScale / scaleBy));
    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // ----- Touch / pinch support -----
  // We use refs (not state) to avoid render churn on every touchmove.
  const pinchLastDistRef = useRef<number | null>(null);
  const pinchActiveRef = useRef(false);

  const touchDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    pinchActiveRef.current = true;

    const t1 = touches[0];
    const t2 = touches[1];
    const dist = touchDistance(t1, t2);
    if (pinchLastDistRef.current == null) {
      pinchLastDistRef.current = dist;
      return;
    }

    const ratio = dist / pinchLastDistRef.current;
    if (Math.abs(ratio - 1) < 0.005) return;

    const box = stage.container().getBoundingClientRect();
    const centerClient = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
    const pointer = { x: centerClient.x - box.left, y: centerClient.y - box.top };

    const oldScale = scale;
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    const newScale = Math.max(0.4, Math.min(3, oldScale * ratio));
    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    pinchLastDistRef.current = dist;
  };

  const handleTouchEnd = (e: Konva.KonvaEventObject<TouchEvent>) => {
    // Reset when fewer than two fingers remain.
    if (e.evt.touches.length < 2) {
      pinchLastDistRef.current = null;
    }
    if (e.evt.touches.length === 0) {
      // Small delay so a tap after pinch doesn't get treated as a place/select.
      window.setTimeout(() => {
        pinchActiveRef.current = false;
      }, 80);
    }
  };

  const applyBrush = useCallback(
    (cx: number, cy: number) => {
      const half = Math.floor(brushSize / 2);
      const x0 = cx - half;
      const y0 = cy - half;
      const x1 = x0 + brushSize - 1;
      const y1 = y0 + brushSize - 1;
      if (brushSize === 1) {
        paintTerrainCell(cx, cy);
      } else {
        paintTerrainRect(x0, y0, x1, y1);
      }
    },
    [brushSize, paintTerrainCell, paintTerrainRect],
  );

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || e.evt.button === 2) return;
    if (pinchActiveRef.current) return;
    const cell = pointerToCell();
    if (!cell) return;

    if (tool === 'terrain-brush') {
      setIsPainting(true);
      applyBrush(cell.x, cell.y);
    } else if (tool === 'terrain-rect') {
      setRectStart(cell);
    } else if (tool === 'erase') {
      paintTerrainCell(cell.x, cell.y, TERRAIN.GRASS);
    } else if (tool === 'place' && selectedItemKey) {
      placeItem(selectedItemKey, cell.x, cell.y);
    } else if (tool === 'select') {
      const hit = hitTest(cell.x, cell.y);
      setSelectedPlacedId(hit?.id);
    }
  };

  const handleMouseMove = () => {
    const cell = pointerToCell();
    setHoverCell(cell);
    if (!cell) return;

    if (isPainting && tool === 'terrain-brush') {
      applyBrush(cell.x, cell.y);
    }
  };

  const handleMouseUp = () => {
    if (rectStart && tool === 'terrain-rect') {
      const end = pointerToCell();
      if (end) paintTerrainRect(rectStart.x, rectStart.y, end.x, end.y);
      setRectStart(null);
    }
    setIsPainting(false);
  };

  function hitTest(x: number, y: number) {
    const order = ['decoration', 'building', 'path'] as const;
    for (const layer of order) {
      if (!layerVisibility[layer].visible) continue;
      for (let i = design.items.length - 1; i >= 0; i--) {
        const it = design.items[i];
        if (it.layer !== layer) continue;
        const size = getRotatedSize(it.w, it.h, it.rotation);
        if (x >= it.x && x < it.x + size.w && y >= it.y && y < it.y + size.h) {
          return it;
        }
      }
    }
    return undefined;
  }

  // Memoized terrain rendering (non-grass cells, grouped by code)
  const terrainCells = useMemo(() => {
    const cells: { x: number; y: number; code: number }[] = [];
    for (let y = 0; y < design.terrain.length; y++) {
      for (let x = 0; x < design.terrain[y].length; x++) {
        const code = design.terrain[y][x];
        if (code !== TERRAIN.GRASS) {
          cells.push({ x, y, code });
        }
      }
    }
    return cells;
  }, [design.terrain]);

  // Grass tufts - sparse scattered darker green dots/blades for AC-style texture
  const grassTufts = useMemo(() => {
    const tufts: { x: number; y: number; kind: 0 | 1; rot: number }[] = [];
    for (let y = 0; y < design.size.rows; y++) {
      for (let x = 0; x < design.size.cols; x++) {
        const v = hash(x, y);
        if (v < 0.06) {
          tufts.push({ x, y, kind: v < 0.03 ? 0 : 1, rot: v * 360 });
        }
      }
    }
    return tufts;
  }, [design.size.cols, design.size.rows]);

  // Water wave decorations - sparse
  const waterWaves = useMemo(() => {
    return terrainCells
      .filter((c) => c.code === TERRAIN.WATER && hash(c.x + 7, c.y + 13) < 0.25)
      .map((c) => ({ x: c.x, y: c.y, off: hash(c.x, c.y) }));
  }, [terrainCells]);

  // Sand stipple
  const sandSpeckles = useMemo(() => {
    return terrainCells
      .filter((c) => c.code === TERRAIN.SAND && hash(c.x + 3, c.y + 5) < 0.3)
      .map((c) => ({ x: c.x, y: c.y, off: hash(c.x + 11, c.y + 17) }));
  }, [terrainCells]);

  // Grid lines (sparse, optional)
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines: { points: number[]; major: boolean }[] = [];
    for (let x = 0; x <= design.size.cols; x++) {
      const major = x % 8 === 0;
      if (x % 2 !== 0 && !major) continue;
      lines.push({ points: [x * CELL, 0, x * CELL, design.size.rows * CELL], major });
    }
    for (let y = 0; y <= design.size.rows; y++) {
      const major = y % 8 === 0;
      if (y % 2 !== 0 && !major) continue;
      lines.push({ points: [0, y * CELL, design.size.cols * CELL, y * CELL], major });
    }
    return lines;
  }, [design.size.cols, design.size.rows, showGrid]);

  // Items grouped by layer
  const itemsByLayer = useMemo(() => {
    const out: Record<string, typeof design.items> = { path: [], building: [], decoration: [] };
    design.items.forEach((it) => {
      if (!out[it.layer]) out[it.layer] = [];
      out[it.layer].push(it);
    });
    return out;
  }, [design.items]);

  const handleItemDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const x = Math.round(node.x() / CELL);
    const y = Math.round(node.y() / CELL);
    const success = moveItem(id, x, y);
    if (!success) {
      const orig = design.items.find((i) => i.id === id);
      if (orig) node.position({ x: orig.x * CELL, y: orig.y * CELL });
    }
    setDraggedItemId(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPlacedId && document.activeElement?.tagName !== 'INPUT') {
          deleteItem(selectedPlacedId);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedPlacedId, deleteItem]);

  // Expose the stage for ad-hoc consumers (PNG export, etc.).
  useEffect(() => {
    registerCanvasStage(stageRef.current);
    return () => registerCanvasStage(null);
  }, []);

  const cursorStyle = useMemo(() => {
    if (tool === 'pan') return 'grab';
    if (tool === 'place' || tool === 'terrain-brush' || tool === 'terrain-rect') return 'crosshair';
    if (tool === 'erase') return 'cell';
    return 'default';
  }, [tool]);

  const previewItem = useMemo(() => {
    if (tool !== 'place' || !selectedItemKey || !hoverCell) return null;
    const def = resolveItemDef(selectedItemKey);
    if (!def) return null;
    return { def, x: hoverCell.x, y: hoverCell.y };
  }, [tool, selectedItemKey, hoverCell]);

  const rectPreview = useMemo(() => {
    if (!rectStart || tool !== 'terrain-rect' || !hoverCell) return null;
    const x0 = Math.min(rectStart.x, hoverCell.x);
    const y0 = Math.min(rectStart.y, hoverCell.y);
    const x1 = Math.max(rectStart.x, hoverCell.x);
    const y1 = Math.max(rectStart.y, hoverCell.y);
    return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }, [rectStart, hoverCell, tool]);

  const islandW = design.size.cols * CELL;
  const islandH = design.size.rows * CELL;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        cursor: cursorStyle,
        background:
          'radial-gradient(ellipse at center, #cfeaff 0%, #bfe4ff 60%, #aedbf7 100%)',
        // iOS Safari otherwise hands two-finger gestures to the system page
        // zoom while we're trying to pinch-zoom the canvas. Force the browser
        // to leave touch events to us so the in-canvas pinch logic stays in
        // control.
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        // Disable the iOS "tap-and-hold" callout that interferes with rapid
        // strokes.
        WebkitTouchCallout: 'none',
        overscrollBehavior: 'contain',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={tool === 'pan'}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoverCell(null);
          setIsPainting(false);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Island shadow (soft drop) */}
        <Layer listening={false}>
          <Rect
            x={-6}
            y={4}
            width={islandW + 12}
            height={islandH + 12}
            cornerRadius={28}
            fill="rgba(40, 70, 31, 0.25)"
            shadowColor="rgba(40,70,31,0.4)"
            shadowBlur={24}
            shadowOpacity={0.9}
          />
        </Layer>

        {/* Terrain Layer */}
        <Layer listening={false} visible={layerVisibility.terrain.visible}>
          {/* Base grass background with rounded corners (island look) */}
          <Rect
            x={0}
            y={0}
            width={islandW}
            height={islandH}
            fill={TERRAIN_COLOR[TERRAIN.GRASS]}
            cornerRadius={20}
          />
          {/* Subtle inner highlight on top of grass */}
          <Rect
            x={0}
            y={0}
            width={islandW}
            height={islandH * 0.4}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: islandH * 0.4 }}
            fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.18)', 1, 'rgba(255,255,255,0)']}
            cornerRadius={[20, 20, 0, 0]}
          />

          {/* Grass tufts texture */}
          {grassTufts.map((t, i) => (
            <Ellipse
              key={i}
              x={t.x * CELL + CELL / 2}
              y={t.y * CELL + CELL / 2}
              radiusX={t.kind === 0 ? 2.2 : 3}
              radiusY={t.kind === 0 ? 1 : 1.5}
              rotation={t.rot}
              fill="#6fa94d"
              opacity={0.55}
              perfectDrawEnabled={false}
              listening={false}
            />
          ))}

          {/* Non-grass terrain cells */}
          {terrainCells.map((c, i) => (
            <Rect
              key={i}
              x={c.x * CELL}
              y={c.y * CELL}
              width={CELL}
              height={CELL}
              fill={TERRAIN_COLOR[c.code] ?? '#cccccc'}
              perfectDrawEnabled={false}
              listening={false}
            />
          ))}

          {/* Water wave caps */}
          {waterWaves.map((w, i) => (
            <Line
              key={`w-${i}`}
              points={[
                w.x * CELL + 3,
                w.y * CELL + CELL * 0.4,
                w.x * CELL + CELL / 2,
                w.y * CELL + CELL * 0.55,
                w.x * CELL + CELL - 3,
                w.y * CELL + CELL * 0.4,
              ]}
              stroke="#ffffff"
              strokeWidth={1.2}
              tension={0.5}
              opacity={0.7}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}

          {/* Sand speckles */}
          {sandSpeckles.map((s, i) => (
            <Circle
              key={`s-${i}`}
              x={s.x * CELL + CELL * (0.3 + s.off * 0.4)}
              y={s.y * CELL + CELL * (0.3 + (1 - s.off) * 0.4)}
              radius={0.8}
              fill={TERRAIN_DARK[TERRAIN.SAND]}
              opacity={0.7}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}

          {/* Island outline / "shore" */}
          <Rect
            x={0}
            y={0}
            width={islandW}
            height={islandH}
            cornerRadius={20}
            stroke="rgba(40,70,31,0.35)"
            strokeWidth={2}
          />
        </Layer>

        {/* Optional Grid lines (default off) */}
        {showGrid && (
          <Layer listening={false}>
            {gridLines.map((g, i) => (
              <Line
                key={i}
                points={g.points}
                stroke={g.major ? 'rgba(40,70,31,0.28)' : 'rgba(40,70,31,0.1)'}
                strokeWidth={g.major ? 1 : 0.5}
                perfectDrawEnabled={false}
              />
            ))}
          </Layer>
        )}

        {/* Items Layers */}
        {(['path', 'building', 'decoration'] as const).map((layer) => (
          <Layer key={layer} visible={layerVisibility[layer].visible}>
            {itemsByLayer[layer]?.map((it) => {
              const def = resolveItemDef(it.itemKey);
              if (!def) return null;
              const size = getRotatedSize(it.w, it.h, it.rotation);
              const isSelected = selectedPlacedId === it.id;
              const isDraggable = tool === 'select' && !layerVisibility[layer].locked;
              return (
                <Group
                  key={it.id}
                  x={it.x * CELL}
                  y={it.y * CELL}
                  draggable={isDraggable}
                  onDragStart={() => setDraggedItemId(it.id)}
                  onDragEnd={(e) => handleItemDragEnd(it.id, e)}
                  onClick={() => {
                    if (tool === 'select') setSelectedPlacedId(it.id);
                  }}
                  onTap={() => {
                    if (tool === 'select') setSelectedPlacedId(it.id);
                  }}
                  opacity={draggedItemId === it.id ? 0.7 : 1}
                >
                  <ItemShape def={def} w={size.w} h={size.h} selected={isSelected} />
                </Group>
              );
            })}
          </Layer>
        ))}

        {/* Hover/preview overlay */}
        <Layer listening={false}>
          {previewItem && (
            <Group x={previewItem.x * CELL} y={previewItem.y * CELL} opacity={0.65}>
              <ItemShape def={previewItem.def} w={previewItem.def.w} h={previewItem.def.h} />
              <Rect
                width={previewItem.def.w * CELL}
                height={previewItem.def.h * CELL}
                stroke="#0e90f7"
                strokeWidth={1.5}
                dash={[4, 3]}
                cornerRadius={4}
              />
            </Group>
          )}
          {rectPreview && (
            <Rect
              x={rectPreview.x0 * CELL}
              y={rectPreview.y0 * CELL}
              width={rectPreview.w * CELL}
              height={rectPreview.h * CELL}
              fill={TERRAIN_COLOR[selectedTerrainCode]}
              opacity={0.5}
              stroke="#0e90f7"
              strokeWidth={2}
              dash={[6, 4]}
            />
          )}
          {hoverCell && tool === 'terrain-brush' && (
            <Rect
              x={(hoverCell.x - Math.floor(brushSize / 2)) * CELL}
              y={(hoverCell.y - Math.floor(brushSize / 2)) * CELL}
              width={brushSize * CELL}
              height={brushSize * CELL}
              stroke="#0e90f7"
              strokeWidth={1.5}
              dash={[4, 3]}
              fill={TERRAIN_COLOR[selectedTerrainCode]}
              opacity={0.4}
              cornerRadius={3}
            />
          )}
        </Layer>
      </Stage>

      {/* Coordinate / zoom info */}
      <div className="absolute bottom-3 left-3 panel px-3 py-1.5 text-xs text-leaf-700 flex items-center gap-4">
        <span>{t('canvas.zoom', { value: (scale * 100).toFixed(0) })}</span>
        {hoverCell && (
          <span>{t('canvas.coord', { x: hoverCell.x, y: hoverCell.y })}</span>
        )}
        <span>{t('canvas.size', { cols: design.size.cols, rows: design.size.rows })}</span>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button
          className="panel w-9 h-9 grid place-items-center font-bold text-leaf-700 hover:text-mint-600 hover:bg-mint-500/12 transition"
          onClick={() => setScale((s) => Math.min(3, s * 1.2))}
          title={t('canvas.zoomIn')}
        >
          +
        </button>
        <button
          className="panel w-9 h-9 grid place-items-center font-bold text-leaf-700 hover:text-mint-600 hover:bg-mint-500/12 transition"
          onClick={() => setScale((s) => Math.max(0.4, s / 1.2))}
          title={t('canvas.zoomOut')}
        >
          −
        </button>
        <button
          className="panel w-9 h-9 grid place-items-center text-[10px] font-bold text-leaf-700 hover:text-mint-600 hover:bg-mint-500/12 transition"
          onClick={() => {
            setScale(1);
            const cw = design.size.cols * CELL;
            const ch = design.size.rows * CELL;
            setStagePos({ x: (width - cw) / 2, y: (height - ch) / 2 });
          }}
          title={t('canvas.reset')}
        >
          1:1
        </button>
      </div>
    </div>
  );
}
