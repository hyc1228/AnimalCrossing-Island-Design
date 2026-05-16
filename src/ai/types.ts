export type StyleId = 'japanese' | 'garden' | 'fairy' | 'cafe' | 'modern';

export interface StyleDef {
  id: StyleId;
  name: string;
  emoji: string;
  description: string;
  palette: {
    primaryItems: string[]; // most prominent
    accentItems: string[];
    flowers: string[];
    fences: string[];
    trees: string[];
  };
  terrainPalette: {
    base: number; // ground
    path: number;
    accent?: number; // e.g. water/sand
  };
}

export interface GenerateOptions {
  styleId: StyleId;
  area?: { x0: number; y0: number; x1: number; y1: number };
  density?: 'sparse' | 'medium' | 'dense';
  seed?: number;
}
