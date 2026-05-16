import type { IslandDesign } from '../types';

const STORAGE_KEY = 'ac_island_planner_v1';
const CURRENT_KEY = 'ac_island_planner_current_v1';

interface StorageShape {
  designs: Record<string, IslandDesign>;
}

function readAll(): StorageShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { designs: {} };
    const parsed = JSON.parse(raw) as StorageShape;
    return { designs: parsed.designs ?? {} };
  } catch {
    return { designs: {} };
  }
}

function writeAll(data: StorageShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage write failed', e);
  }
}

export function loadAllDesigns(): IslandDesign[] {
  const { designs } = readAll();
  return Object.values(designs).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadDesign(id: string): IslandDesign | undefined {
  return readAll().designs[id];
}

export function saveDesign(design: IslandDesign): void {
  const all = readAll();
  all.designs[design.id] = { ...design, updatedAt: Date.now() };
  writeAll(all);
}

export function deleteDesign(id: string): void {
  const all = readAll();
  delete all.designs[id];
  writeAll(all);
}

export function setCurrentDesignId(id: string): void {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // ignore
  }
}

export function getCurrentDesignId(): string | undefined {
  try {
    return localStorage.getItem(CURRENT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
