// Core domain types for the island planner

export type LayerId = 'terrain' | 'path' | 'building' | 'decoration';

export type Rotation = 0 | 90 | 180 | 270;

// Terrain enum stored as integer in 2D array for compactness
export const TERRAIN = {
  EMPTY: 0, // grass (default)
  GRASS: 0,
  SAND: 1,
  WATER: 2,
  CLIFF1: 3, // cliff level 1
  CLIFF2: 4,
  CLIFF3: 5,
  PATH_STONE: 6, // simple built-in path option
  PATH_WOOD: 7,
  PATH_BRICK: 8,
  FLOWER_BED: 9,
} as const;
export type TerrainCode = (typeof TERRAIN)[keyof typeof TERRAIN];

export interface ItemDef {
  key: string;
  name: string;
  nameEn?: string;
  category: 'building' | 'bridge' | 'incline' | 'furniture' | 'tree' | 'flower' | 'fence' | 'decoration';
  layer: LayerId;
  w: number; // grid width
  h: number; // grid height
  color: string; // base color for 2D fill
  emoji?: string; // emoji used as icon in 2D rendering
  /**
   * Optional sprite URL (e.g. Nookipedia icon). When present, ItemShape will
   * render this image inside a soft card instead of the emoji block.
   */
  imageUrl?: string;
  source?: string; // how to obtain in game
  price?: number; // approximate bell cost
  diy?: boolean;
  tags?: string[]; // style tags for AI selection (japanese, garden, fairy, cafe, modern)
}

export interface PlacedItem {
  id: string;
  itemKey: string;
  layer: LayerId;
  x: number; // grid col
  y: number; // grid row
  w: number;
  h: number;
  rotation: Rotation;
}

export interface IslandDesign {
  id: string;
  name: string;
  size: { cols: number; rows: number };
  items: PlacedItem[];
  terrain: number[][]; // [rows][cols] of TerrainCode
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // base64 dataURL
}

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  style: 'japanese' | 'garden' | 'fairy' | 'cafe' | 'modern';
  thumbnail?: string;
  design: Omit<IslandDesign, 'id' | 'createdAt' | 'updatedAt' | 'name'>;
}

export type ToolMode =
  | 'select'
  | 'place'
  | 'terrain-brush'
  | 'terrain-rect'
  | 'erase'
  | 'pan';

export type LayerVisibility = Record<LayerId, { visible: boolean; locked: boolean }>;

export const GRID_COLS = 80;
export const GRID_ROWS = 70;

export const LAYER_ORDER: LayerId[] = ['terrain', 'path', 'building', 'decoration'];

export const LAYER_LABEL: Record<LayerId, string> = {
  terrain: '地形',
  path: '道路',
  building: '建筑',
  decoration: '装饰',
};
