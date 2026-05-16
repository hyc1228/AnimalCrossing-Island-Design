import { ITEMS_BY_KEY } from '../data/items';
import { GRID_COLS, GRID_ROWS, type PlacedItem, type Rotation } from '../types';
import { canPlace, generateId, getRotatedSize, paintRect } from '../utils/grid';
import { STYLES_BY_ID } from './styles';
import type { GenerateOptions } from './types';

// Simple mulberry32 PRNG for reproducible variants
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

interface GenerateResult {
  items: PlacedItem[];
  terrain?: number[][]; // optional terrain overlay
}

export function generateLayout(
  options: GenerateOptions,
  existingItems: PlacedItem[],
  existingTerrain: number[][],
): GenerateResult {
  const style = STYLES_BY_ID[options.styleId];
  if (!style) return { items: [] };
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);
  const rnd = mulberry32(seed);
  const area = options.area ?? { x0: 4, y0: 4, x1: GRID_COLS - 5, y1: GRID_ROWS - 5 };
  const cols = GRID_COLS;
  const rows = GRID_ROWS;
  const density = options.density ?? 'medium';

  const newItems: PlacedItem[] = [];
  const collectivelyExisting: PlacedItem[] = [...existingItems];

  // Helper to try placing an item key at (x, y), accumulating into newItems
  const tryPlace = (itemKey: string, x: number, y: number, rotation: Rotation = 0): boolean => {
    const def = ITEMS_BY_KEY[itemKey];
    if (!def) return false;
    const candidate: PlacedItem = {
      id: generateId(),
      itemKey,
      layer: def.layer,
      x,
      y,
      w: def.w,
      h: def.h,
      rotation,
    };
    if (!canPlace(candidate, collectivelyExisting, cols, rows)) return false;
    const size = getRotatedSize(def.w, def.h, rotation);
    if (x < area.x0 || y < area.y0 || x + size.w > area.x1 + 1 || y + size.h > area.y1 + 1) return false;
    newItems.push(candidate);
    collectivelyExisting.push(candidate);
    return true;
  };

  // 1. Paint a base path corridor through center of area (horizontal)
  let terrain: number[][] | undefined;
  const pathY = Math.floor((area.y0 + area.y1) / 2);
  terrain = paintRect(existingTerrain, area.x0, pathY, area.x1, pathY + 1, style.terrainPalette.path);

  // Add some accent terrain (e.g. water pond) if accent defined
  if (style.terrainPalette.accent !== undefined && rnd() < 0.7) {
    const pondCx = area.x0 + 4 + Math.floor(rnd() * Math.max(1, area.x1 - area.x0 - 8));
    const pondCy = pathY - 5 - Math.floor(rnd() * 3);
    const pw = 3 + Math.floor(rnd() * 3);
    const ph = 2 + Math.floor(rnd() * 2);
    terrain = paintRect(terrain, pondCx, pondCy, pondCx + pw, pondCy + ph, style.terrainPalette.accent);
  }

  // 2. Place a few primary anchor items near path
  const densityCount: Record<string, number> = { sparse: 3, medium: 5, dense: 8 };
  const primaryCount = densityCount[density];
  for (let i = 0; i < primaryCount; i++) {
    const key = pick(style.palette.primaryItems, rnd);
    const def = ITEMS_BY_KEY[key];
    if (!def) continue;
    let placed = false;
    for (let attempt = 0; attempt < 20 && !placed; attempt++) {
      const above = rnd() < 0.5;
      const offsetY = above ? -3 - Math.floor(rnd() * 4) : 3 + Math.floor(rnd() * 4);
      const x = area.x0 + 2 + Math.floor(rnd() * Math.max(1, area.x1 - area.x0 - def.w - 3));
      const y = pathY + offsetY;
      placed = tryPlace(key, x, y);
    }
  }

  // 3. Place accents
  const accentCount: Record<string, number> = { sparse: 4, medium: 8, dense: 14 };
  for (let i = 0; i < accentCount[density]; i++) {
    const key = pick(style.palette.accentItems, rnd);
    for (let attempt = 0; attempt < 15; attempt++) {
      const x = area.x0 + 1 + Math.floor(rnd() * Math.max(1, area.x1 - area.x0 - 2));
      const y = area.y0 + 1 + Math.floor(rnd() * Math.max(1, area.y1 - area.y0 - 2));
      if (tryPlace(key, x, y)) break;
    }
  }

  // 4. Sprinkle trees along edges and corners
  const treeCount: Record<string, number> = { sparse: 8, medium: 14, dense: 22 };
  for (let i = 0; i < treeCount[density]; i++) {
    const key = pick(style.palette.trees, rnd);
    for (let attempt = 0; attempt < 15; attempt++) {
      // Bias toward area edges
      const edge = rnd();
      let x: number;
      let y: number;
      if (edge < 0.25) {
        x = area.x0 + Math.floor(rnd() * 3);
        y = area.y0 + Math.floor(rnd() * (area.y1 - area.y0));
      } else if (edge < 0.5) {
        x = area.x1 - Math.floor(rnd() * 3);
        y = area.y0 + Math.floor(rnd() * (area.y1 - area.y0));
      } else if (edge < 0.75) {
        x = area.x0 + Math.floor(rnd() * (area.x1 - area.x0));
        y = area.y0 + Math.floor(rnd() * 3);
      } else {
        x = area.x0 + Math.floor(rnd() * (area.x1 - area.x0));
        y = area.y1 - Math.floor(rnd() * 3);
      }
      // avoid path band
      if (Math.abs(y - pathY) <= 1) continue;
      if (tryPlace(key, x, y)) break;
    }
  }

  // 5. Flowers around primary items and along path edges
  const flowerCount: Record<string, number> = { sparse: 10, medium: 22, dense: 36 };
  for (let i = 0; i < flowerCount[density]; i++) {
    const key = pick(style.palette.flowers, rnd);
    for (let attempt = 0; attempt < 12; attempt++) {
      // bias near path
      const nearPath = rnd() < 0.6;
      const y = nearPath ? pathY + (rnd() < 0.5 ? -2 : 3) + Math.floor(rnd() * 2) : area.y0 + Math.floor(rnd() * (area.y1 - area.y0));
      const x = area.x0 + Math.floor(rnd() * (area.x1 - area.x0));
      if (tryPlace(key, x, y)) break;
    }
  }

  // 6. Fences along part of border (simple line) - optional
  if (rnd() < 0.6 && style.palette.fences[0]) {
    const fenceKey = style.palette.fences[0];
    const startX = area.x0 + 1;
    const endX = Math.min(area.x1 - 1, startX + 8 + Math.floor(rnd() * 8));
    const fy = pathY + (rnd() < 0.5 ? -4 : 4);
    for (let x = startX; x <= endX; x++) {
      tryPlace(fenceKey, x, fy);
    }
  }

  return { items: newItems, terrain };
}
