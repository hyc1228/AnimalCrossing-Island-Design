import { GRID_COLS, GRID_ROWS, TERRAIN, type IslandDesign, type PlacedItem, type Rotation } from '../types';

export function emptyTerrain(cols = GRID_COLS, rows = GRID_ROWS): number[][] {
  return Array.from({ length: rows }, () => new Array(cols).fill(TERRAIN.GRASS));
}

export function createDesign(name = '新岛屿', cols = GRID_COLS, rows = GRID_ROWS): IslandDesign {
  const now = Date.now();
  return {
    id: `design_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    size: { cols, rows },
    items: [],
    terrain: emptyTerrain(cols, rows),
    createdAt: now,
    updatedAt: now,
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function getRotatedSize(w: number, h: number, rotation: Rotation): { w: number; h: number } {
  if (rotation === 90 || rotation === 270) return { w: h, h: w };
  return { w, h };
}

export function itemsOverlap(a: PlacedItem, b: PlacedItem): boolean {
  if (a.layer !== b.layer) return false;
  const aSize = getRotatedSize(a.w, a.h, a.rotation);
  const bSize = getRotatedSize(b.w, b.h, b.rotation);
  return !(
    a.x + aSize.w <= b.x ||
    b.x + bSize.w <= a.x ||
    a.y + aSize.h <= b.y ||
    b.y + bSize.h <= a.y
  );
}

export function withinBounds(
  x: number,
  y: number,
  w: number,
  h: number,
  cols = GRID_COLS,
  rows = GRID_ROWS,
): boolean {
  return x >= 0 && y >= 0 && x + w <= cols && y + h <= rows;
}

export function canPlace(
  item: Omit<PlacedItem, 'id'>,
  others: PlacedItem[],
  cols = GRID_COLS,
  rows = GRID_ROWS,
): boolean {
  const size = getRotatedSize(item.w, item.h, item.rotation);
  if (!withinBounds(item.x, item.y, size.w, size.h, cols, rows)) return false;
  const a = { ...item, id: '__check__' } as PlacedItem;
  return !others.some((o) => itemsOverlap(a, o));
}

export function generateId(): string {
  return `pi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Fill a rectangle in terrain grid in-place (returns a new grid for immutability)
export function paintRect(
  grid: number[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  code: number,
): number[][] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const xMin = clamp(Math.min(x0, x1), 0, cols - 1);
  const xMax = clamp(Math.max(x0, x1), 0, cols - 1);
  const yMin = clamp(Math.min(y0, y1), 0, rows - 1);
  const yMax = clamp(Math.max(y0, y1), 0, rows - 1);
  const next = grid.map((row) => row.slice());
  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      next[y][x] = code;
    }
  }
  return next;
}

export function paintCell(grid: number[][], x: number, y: number, code: number): number[][] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (x < 0 || x >= cols || y < 0 || y >= rows) return grid;
  if (grid[y][x] === code) return grid;
  const next = grid.map((row) => row.slice());
  next[y][x] = code;
  return next;
}
