import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  GRID_COLS,
  GRID_ROWS,
  LAYER_ORDER,
  TERRAIN,
  type IslandDesign,
  type LayerId,
  type LayerVisibility,
  type PlacedItem,
  type Rotation,
  type ToolMode,
} from '../types';
import { canPlace, createDesign, generateId, getRotatedSize, paintCell, paintRect } from '../utils/grid';
import { saveDesign } from '../utils/storage';
import { ITEMS_BY_KEY } from '../data/items';

interface HistoryEntry {
  items: PlacedItem[];
  terrain: number[][];
}

interface CanvasState {
  design: IslandDesign;
  // Tool & UI
  tool: ToolMode;
  activeLayer: LayerId;
  selectedItemKey?: string; // when placing
  selectedTerrainCode: number; // for terrain brush
  selectedPlacedId?: string;
  layerVisibility: LayerVisibility;
  brushSize: number;
  // History
  past: HistoryEntry[];
  future: HistoryEntry[];

  // Actions
  setDesign: (design: IslandDesign) => void;
  renameDesign: (name: string) => void;

  setTool: (tool: ToolMode) => void;
  setActiveLayer: (layer: LayerId) => void;
  setSelectedItemKey: (key?: string) => void;
  setSelectedTerrainCode: (code: number) => void;
  setSelectedPlacedId: (id?: string) => void;
  setBrushSize: (n: number) => void;
  toggleLayerVisible: (layer: LayerId) => void;
  toggleLayerLocked: (layer: LayerId) => void;

  placeItem: (itemKey: string, x: number, y: number, rotation?: Rotation) => string | undefined;
  moveItem: (id: string, x: number, y: number) => boolean;
  rotateSelected: () => void;
  deleteSelected: () => void;
  deleteItem: (id: string) => void;

  paintTerrainCell: (x: number, y: number, code?: number) => void;
  paintTerrainRect: (x0: number, y0: number, x1: number, y1: number, code?: number) => void;

  loadFromDesign: (design: IslandDesign) => void;
  applyTemplateItemsAndTerrain: (items: PlacedItem[], terrain: number[][]) => void;
  appendItems: (items: PlacedItem[]) => void; // for AI partial accept
  setTerrain: (terrain: number[][]) => void;

  undo: () => void;
  redo: () => void;
  clearAll: () => void;
}

const defaultVisibility: LayerVisibility = {
  terrain: { visible: true, locked: false },
  path: { visible: true, locked: false },
  building: { visible: true, locked: false },
  decoration: { visible: true, locked: false },
};

function snapshot(d: IslandDesign): HistoryEntry {
  return { items: d.items.map((i) => ({ ...i })), terrain: d.terrain.map((r) => r.slice()) };
}

const HISTORY_LIMIT = 50;

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    design: createDesign(),
    tool: 'select',
    activeLayer: 'decoration',
    selectedItemKey: undefined,
    selectedTerrainCode: TERRAIN.SAND,
    selectedPlacedId: undefined,
    layerVisibility: defaultVisibility,
    brushSize: 1,
    past: [],
    future: [],

    setDesign: (design) => set({ design, past: [], future: [], selectedPlacedId: undefined }),
    renameDesign: (name) => set((s) => ({ design: { ...s.design, name, updatedAt: Date.now() } })),

    setTool: (tool) => set({ tool, selectedPlacedId: undefined }),
    setActiveLayer: (layer) => set({ activeLayer: layer }),
    setSelectedItemKey: (key) => set({ selectedItemKey: key, tool: key ? 'place' : 'select' }),
    setSelectedTerrainCode: (code) => set({ selectedTerrainCode: code }),
    setSelectedPlacedId: (id) => set({ selectedPlacedId: id }),
    setBrushSize: (n) => set({ brushSize: Math.max(1, Math.min(10, Math.floor(n))) }),

    toggleLayerVisible: (layer) =>
      set((s) => ({
        layerVisibility: {
          ...s.layerVisibility,
          [layer]: { ...s.layerVisibility[layer], visible: !s.layerVisibility[layer].visible },
        },
      })),
    toggleLayerLocked: (layer) =>
      set((s) => ({
        layerVisibility: {
          ...s.layerVisibility,
          [layer]: { ...s.layerVisibility[layer], locked: !s.layerVisibility[layer].locked },
        },
      })),

    placeItem: (itemKey, x, y, rotation = 0) => {
      const def = ITEMS_BY_KEY[itemKey];
      if (!def) return undefined;
      const state = get();
      if (state.layerVisibility[def.layer].locked) return undefined;
      const newItem: PlacedItem = {
        id: generateId(),
        itemKey,
        layer: def.layer,
        x,
        y,
        w: def.w,
        h: def.h,
        rotation,
      };
      if (!canPlace(newItem, state.design.items, state.design.size.cols, state.design.size.rows)) {
        return undefined;
      }
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: {
          ...state.design,
          items: [...state.design.items, newItem],
          updatedAt: Date.now(),
        },
        past,
        future: [],
      });
      return newItem.id;
    },

    moveItem: (id, x, y) => {
      const state = get();
      const idx = state.design.items.findIndex((i) => i.id === id);
      if (idx < 0) return false;
      const current = state.design.items[idx];
      if (state.layerVisibility[current.layer].locked) return false;
      const others = state.design.items.filter((i) => i.id !== id);
      const candidate: PlacedItem = { ...current, x, y };
      if (!canPlace(candidate, others, state.design.size.cols, state.design.size.rows)) return false;
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      const items = state.design.items.slice();
      items[idx] = candidate;
      set({
        design: { ...state.design, items, updatedAt: Date.now() },
        past,
        future: [],
      });
      return true;
    },

    rotateSelected: () => {
      const state = get();
      const id = state.selectedPlacedId;
      if (!id) return;
      const idx = state.design.items.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const current = state.design.items[idx];
      const next: Rotation = (((current.rotation + 90) % 360) as Rotation);
      const others = state.design.items.filter((i) => i.id !== id);
      const candidate: PlacedItem = { ...current, rotation: next };
      const size = getRotatedSize(candidate.w, candidate.h, candidate.rotation);
      if (
        candidate.x + size.w > state.design.size.cols ||
        candidate.y + size.h > state.design.size.rows
      )
        return;
      if (others.some((o) => o.layer === candidate.layer)) {
        // recompute using canPlace
        if (!canPlace(candidate, others, state.design.size.cols, state.design.size.rows)) return;
      }
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      const items = state.design.items.slice();
      items[idx] = candidate;
      set({ design: { ...state.design, items, updatedAt: Date.now() }, past, future: [] });
    },

    deleteSelected: () => {
      const state = get();
      const id = state.selectedPlacedId;
      if (!id) return;
      get().deleteItem(id);
    },

    deleteItem: (id) => {
      const state = get();
      const item = state.design.items.find((i) => i.id === id);
      if (!item) return;
      if (state.layerVisibility[item.layer].locked) return;
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: {
          ...state.design,
          items: state.design.items.filter((i) => i.id !== id),
          updatedAt: Date.now(),
        },
        selectedPlacedId: state.selectedPlacedId === id ? undefined : state.selectedPlacedId,
        past,
        future: [],
      });
    },

    paintTerrainCell: (x, y, code) => {
      const state = get();
      if (state.layerVisibility.terrain.locked) return;
      const value = code ?? state.selectedTerrainCode;
      const next = paintCell(state.design.terrain, x, y, value);
      if (next === state.design.terrain) return;
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: { ...state.design, terrain: next, updatedAt: Date.now() },
        past,
        future: [],
      });
    },

    paintTerrainRect: (x0, y0, x1, y1, code) => {
      const state = get();
      if (state.layerVisibility.terrain.locked) return;
      const value = code ?? state.selectedTerrainCode;
      const next = paintRect(state.design.terrain, x0, y0, x1, y1, value);
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: { ...state.design, terrain: next, updatedAt: Date.now() },
        past,
        future: [],
      });
    },

    loadFromDesign: (design) =>
      set({
        design: { ...design, terrain: design.terrain.map((r) => r.slice()), items: design.items.map((i) => ({ ...i })) },
        past: [],
        future: [],
        selectedPlacedId: undefined,
      }),

    applyTemplateItemsAndTerrain: (items, terrain) => {
      const state = get();
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: {
          ...state.design,
          items: items.map((i) => ({ ...i, id: generateId() })),
          terrain: terrain.map((r) => r.slice()),
          updatedAt: Date.now(),
        },
        past,
        future: [],
      });
    },

    setTerrain: (terrain) => {
      const state = get();
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: { ...state.design, terrain: terrain.map((r) => r.slice()), updatedAt: Date.now() },
        past,
        future: [],
      });
    },

    appendItems: (items) => {
      const state = get();
      // Filter out items that don't fit (overlap / out of bounds)
      const accepted: PlacedItem[] = [];
      const existing = [...state.design.items];
      items.forEach((it) => {
        const cand: PlacedItem = { ...it, id: generateId() };
        if (canPlace(cand, existing, state.design.size.cols, state.design.size.rows)) {
          accepted.push(cand);
          existing.push(cand);
        }
      });
      if (accepted.length === 0) return;
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: {
          ...state.design,
          items: [...state.design.items, ...accepted],
          updatedAt: Date.now(),
        },
        past,
        future: [],
      });
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const future = [snapshot(state.design), ...state.future].slice(0, HISTORY_LIMIT);
      set({
        past: newPast,
        future,
        design: { ...state.design, items: previous.items, terrain: previous.terrain, updatedAt: Date.now() },
        selectedPlacedId: undefined,
      });
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      const [next, ...rest] = state.future;
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        past,
        future: rest,
        design: { ...state.design, items: next.items, terrain: next.terrain, updatedAt: Date.now() },
        selectedPlacedId: undefined,
      });
    },

    clearAll: () => {
      const state = get();
      const past = [...state.past, snapshot(state.design)].slice(-HISTORY_LIMIT);
      set({
        design: {
          ...state.design,
          items: [],
          terrain: state.design.terrain.map((r) => r.map(() => TERRAIN.GRASS)),
          updatedAt: Date.now(),
        },
        past,
        future: [],
        selectedPlacedId: undefined,
      });
    },
  })),
);

// Auto-persist with debounce
let saveTimer: number | undefined;
useCanvasStore.subscribe(
  (s) => s.design,
  (design) => {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveDesign(design);
    }, 400);
  },
);

// Re-export constants for convenience
export const GRID = { cols: GRID_COLS, rows: GRID_ROWS };
export { LAYER_ORDER };
