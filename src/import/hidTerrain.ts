// Rasterise HID's `drawing` payload into our 80×70 terrain grid.
//
// HID stores terrain as a dict of `<colorName>` → flat polygon points
// (`[x0,y0,x1,y1,...]`) or an array of such polygons (compound path with
// even-odd fill). Coordinates live in the same 112×96 paper.js cell grid as
// objects. To reconstruct a bitmap-style terrain we:
//
//   1. For every cell in our 80×70 grid, compute its centre in HID space.
//   2. Walk the colors in descending priority order (path > water > cliffs >
//      base grass) and pick the first one whose polygon covers that point.
//   3. Map the winning color name to our TERRAIN code.
//
// This mirrors HID's `getColorAtCoordinate` priority sampler (see
// `.research/hid/app/getColorAtCoordinate.ts`) closely enough that the
// resulting rasterisation reads as the same island, while staying free of
// any paper.js dependency.

import { GRID_COLS, GRID_ROWS, TERRAIN } from '../types';

const HID_W = 112;
const HID_H = 96;

/** HID color name → our TERRAIN code. Names not listed here are ignored. */
const HID_COLOR_TO_TERRAIN: Record<string, number> = {
  // Base land
  level1: TERRAIN.GRASS,
  level2: TERRAIN.CLIFF1,
  level3: TERRAIN.CLIFF2,
  rock: TERRAIN.CLIFF3,
  // Beach & water
  sand: TERRAIN.SAND,
  water: TERRAIN.WATER,
  waterfall: TERRAIN.WATER,
  // Paths
  pathStone: TERRAIN.PATH_STONE,
  pathDirt: TERRAIN.PATH_WOOD,
  pathSand: TERRAIN.PATH_WOOD,
  pathBrick: TERRAIN.PATH_BRICK,
  // Amenity ground tints — leave as grass (no terrain enum for them).
  campground: TERRAIN.GRASS,
  townsquare: TERRAIN.GRASS,
  // `pathEraser` cuts other paths in HID; nothing meaningful to paint here.
};

/**
 * HID priority for terrain sampling. Higher number wins on overlap. Matches
 * `pathDefinition.priority = 100` for paths and `layerDefinition.priority`
 * for terrain (level3=50, level2=40, level1=30, water v2=60).
 *
 * We use V2 priorities universally because they're already a strict superset
 * of V1 ordering for the colors we care about.
 */
const HID_PRIORITY: Record<string, number> = {
  pathStone: 100,
  pathDirt: 100,
  pathSand: 100,
  pathBrick: 100,
  waterfall: 70,
  water: 60,
  level3: 50,
  level2: 40,
  level1: 30,
  sand: 25,
  rock: 15,
  campground: 5,
  townsquare: 5,
};

interface Polygon {
  /** Flat `[x0, y0, x1, y1, ...]` vertex list. */
  pts: number[];
  /** Axis-aligned bounding box, for early rejection. */
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface ColorLayer {
  name: string;
  terrainCode: number;
  priority: number;
  /** Compound paths: even-odd fill across subpaths. Single paths = 1 entry. */
  subpaths: Polygon[];
}

function computeBbox(pts: number[]): Polygon['bbox'] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < pts.length; i += 2) {
    const x = pts[i];
    const y = pts[i + 1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

function pointInPolygon(px: number, py: number, poly: Polygon): boolean {
  const { bbox, pts } = poly;
  // Early bbox reject.
  if (px < bbox.x0 || px > bbox.x1 || py < bbox.y0 || py > bbox.y1) return false;
  let inside = false;
  const n = pts.length;
  // Even-odd ray cast — standard implementation, but operating on flat array.
  for (let i = 0, j = n - 2; i < n; i += 2) {
    const xi = pts[i];
    const yi = pts[i + 1];
    const xj = pts[j];
    const yj = pts[j + 1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

function pointInCompound(px: number, py: number, subs: Polygon[]): boolean {
  // Even-odd rule across subpaths to mimic paper.js CompoundPath fill.
  let inside = false;
  for (const p of subs) {
    if (pointInPolygon(px, py, p)) inside = !inside;
  }
  return inside;
}

/**
 * Build the sorted color-layer array from the raw `drawing` JSON. Layers with
 * no recognisable terrain mapping or no vertices are dropped. Result is
 * sorted by descending priority so callers can short-circuit on first hit.
 */
function buildLayers(drawing: Record<string, unknown>): ColorLayer[] {
  const out: ColorLayer[] = [];
  for (const [name, raw] of Object.entries(drawing)) {
    const terrainCode = HID_COLOR_TO_TERRAIN[name];
    if (terrainCode === undefined) continue;
    if (!Array.isArray(raw) || raw.length === 0) continue;

    const subpaths: Polygon[] = [];
    if (typeof raw[0] === 'number') {
      // Single closed path.
      const pts = raw as number[];
      if (pts.length >= 6) subpaths.push({ pts, bbox: computeBbox(pts) });
    } else if (Array.isArray(raw[0])) {
      // Compound path: array of vertex arrays.
      for (const sub of raw as unknown[]) {
        if (Array.isArray(sub) && sub.length >= 6 && typeof sub[0] === 'number') {
          const pts = sub as number[];
          subpaths.push({ pts, bbox: computeBbox(pts) });
        }
      }
    }
    if (subpaths.length === 0) continue;

    out.push({
      name,
      terrainCode,
      priority: HID_PRIORITY[name] ?? 0,
      subpaths,
    });
  }

  out.sort((a, b) => b.priority - a.priority);
  return out;
}

export interface HidTerrainStats {
  /** Number of cells our 80×70 grid received a non-grass value for. */
  paintedCells: number;
  /** Count of cells per terrain code (debug / preview info). */
  byCode: Record<number, number>;
  /** Color names we encountered but had no terrain mapping for. */
  unknownColors: string[];
}

export interface HidTerrainResult {
  /** Fresh 80×70 terrain array, fully populated with TERRAIN.* codes. */
  terrain: number[][];
  stats: HidTerrainStats;
}

/**
 * Decode HID `drawing` into a fresh 80×70 terrain grid. Cells default to
 * `TERRAIN.GRASS`. Returns stats so the UI can surface how many cells were
 * actually painted from the source.
 */
export function decodeHidTerrain(drawing: Record<string, unknown>): HidTerrainResult {
  const layers = buildLayers(drawing);
  const unknownColors = Object.keys(drawing).filter((k) => !(k in HID_COLOR_TO_TERRAIN));

  const terrain: number[][] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    const row: number[] = new Array(GRID_COLS).fill(TERRAIN.GRASS);
    terrain.push(row);
  }

  const byCode: Record<number, number> = {};
  let paintedCells = 0;

  // Sample at cell centres in HID space.
  const sx = HID_W / GRID_COLS;
  const sy = HID_H / GRID_ROWS;
  for (let cy = 0; cy < GRID_ROWS; cy++) {
    const py = (cy + 0.5) * sy;
    for (let cx = 0; cx < GRID_COLS; cx++) {
      const px = (cx + 0.5) * sx;
      // Highest priority wins — layers is pre-sorted.
      for (const layer of layers) {
        const hit =
          layer.subpaths.length === 1
            ? pointInPolygon(px, py, layer.subpaths[0])
            : pointInCompound(px, py, layer.subpaths);
        if (hit) {
          if (layer.terrainCode !== TERRAIN.GRASS) {
            terrain[cy][cx] = layer.terrainCode;
            paintedCells++;
            byCode[layer.terrainCode] = (byCode[layer.terrainCode] ?? 0) + 1;
          }
          break;
        }
      }
    }
  }

  return { terrain, stats: { paintedCells, byCode, unknownColors } };
}
