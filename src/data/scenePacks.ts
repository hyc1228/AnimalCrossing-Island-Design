// Hand-curated "scene packs" — small relative layouts of a handful of
// curated items that the player can drop on the canvas as a starting point
// (think: stamps in a vector editor).
//
// Each pack uses item-relative grid coordinates. When the user picks a pack,
// the layout is translated so its top-left lands at the requested anchor
// (defaults to canvas center). `canvasStore.appendItems` then silently skips
// any item that doesn't fit, so it's safe to drop a pack into an already
// populated area.

import type { PlacedItem } from '../types';
import { ITEMS_BY_KEY } from './items';
import { generateId } from '../utils/grid';
import type { StyleId } from '../ai/types';

export interface ScenePack {
  /** Stable id, also the i18n key suffix (e.g. `scenes.cafeCorner.name`). */
  id: string;
  /** Camel-case i18n suffix matching `scenes.<id>.{name,desc}`. */
  i18nId: string;
  /** Emoji + short label fallback if i18n missing. */
  emoji: string;
  /** Bounding box (cells). */
  w: number;
  h: number;
  /** Which style family the pack feels most like (used for filtering). */
  style?: StyleId;
  /** Items with offsets relative to the pack's top-left. */
  items: Array<{ itemKey: string; x: number; y: number }>;
}

/** Curated layouts. Coordinates verified not to overlap inside their bbox. */
export const SCENE_PACKS: ScenePack[] = [
  {
    id: 'cafeCorner',
    i18nId: 'cafeCorner',
    emoji: '☕',
    w: 5,
    h: 4,
    style: 'cafe',
    items: [
      { itemKey: 'parasol', x: 0, y: 0 },
      { itemKey: 'tea_table', x: 2, y: 0 },
      { itemKey: 'cafe_chair', x: 3, y: 0 },
      { itemKey: 'cafe_chair', x: 3, y: 1 },
      { itemKey: 'cafe_chair', x: 2, y: 2 },
      { itemKey: 'streetlight', x: 4, y: 0 },
      { itemKey: 'mailbox', x: 4, y: 2 },
      { itemKey: 'planter_box', x: 0, y: 3 },
      { itemKey: 'planter_box', x: 3, y: 3 },
    ],
  },
  {
    id: 'zenCorner',
    i18nId: 'zenCorner',
    emoji: '⛩️',
    w: 6,
    h: 5,
    style: 'japanese',
    items: [
      { itemKey: 'torii_gate', x: 2, y: 0 },
      { itemKey: 'stone_lantern', x: 0, y: 1 },
      { itemKey: 'stone_lantern', x: 5, y: 1 },
      { itemKey: 'koi_pond', x: 1, y: 2 },
      { itemKey: 'rock_garden', x: 4, y: 2 },
      { itemKey: 'bamboo', x: 0, y: 4 },
      { itemKey: 'bamboo', x: 5, y: 4 },
      { itemKey: 'flower_lily_white', x: 0, y: 3 },
      { itemKey: 'flower_mum_white', x: 5, y: 3 },
    ],
  },
  {
    id: 'kidsPlayground',
    i18nId: 'kidsPlayground',
    emoji: '🪣',
    w: 6,
    h: 4,
    style: 'garden',
    items: [
      { itemKey: 'sandbox', x: 0, y: 0 },
      { itemKey: 'swing', x: 3, y: 0 },
      { itemKey: 'planter_box', x: 4, y: 0 },
      { itemKey: 'windmill', x: 3, y: 2 },
      { itemKey: 'log_bench', x: 0, y: 3 },
      { itemKey: 'log_bench', x: 2, y: 3 },
      { itemKey: 'shrub', x: 5, y: 3 },
    ],
  },
  {
    id: 'campground',
    i18nId: 'campground',
    emoji: '⛺',
    w: 5,
    h: 4,
    style: 'fairy',
    items: [
      { itemKey: 'tent', x: 0, y: 0 },
      { itemKey: 'campfire', x: 3, y: 0 },
      { itemKey: 'log_bench', x: 2, y: 2 },
      { itemKey: 'log_bench', x: 0, y: 3 },
      { itemKey: 'mushroom_deco', x: 4, y: 1 },
      { itemKey: 'tree_pine', x: 4, y: 3 },
      { itemKey: 'shrub', x: 3, y: 3 },
    ],
  },
  {
    id: 'modernPlaza',
    i18nId: 'modernPlaza',
    emoji: '⛲',
    w: 6,
    h: 6,
    style: 'modern',
    items: [
      { itemKey: 'fountain', x: 1, y: 1 },
      { itemKey: 'modern_sculpture', x: 0, y: 0 },
      { itemKey: 'modern_sculpture', x: 5, y: 0 },
      { itemKey: 'streetlight', x: 0, y: 5 },
      { itemKey: 'flag_pole', x: 5, y: 5 },
      { itemKey: 'bench_wooden', x: 0, y: 3 },
      { itemKey: 'bench_wooden', x: 4, y: 3 },
      { itemKey: 'flower_hyacinth_blue', x: 5, y: 2 },
      { itemKey: 'flower_rose_white', x: 0, y: 2 },
    ],
  },
  {
    id: 'farmYard',
    i18nId: 'farmYard',
    emoji: '🌾',
    w: 5,
    h: 5,
    style: 'garden',
    items: [
      { itemKey: 'windmill', x: 3, y: 0 },
      { itemKey: 'water_well', x: 0, y: 0 },
      { itemKey: 'planter_box', x: 2, y: 2 },
      { itemKey: 'tree_fruit_apple', x: 0, y: 3 },
      { itemKey: 'tree_fruit_apple', x: 1, y: 3 },
      { itemKey: 'bench_wooden', x: 3, y: 3 },
      { itemKey: 'flower_tulip_yellow', x: 2, y: 4 },
      { itemKey: 'flower_cosmos_pink', x: 0, y: 4 },
    ],
  },
  {
    id: 'cherryPath',
    i18nId: 'cherryPath',
    emoji: '🌸',
    w: 5,
    h: 4,
    style: 'japanese',
    items: [
      { itemKey: 'tree_cherry', x: 0, y: 0 },
      { itemKey: 'tree_cherry', x: 0, y: 3 },
      { itemKey: 'tree_cherry', x: 4, y: 0 },
      { itemKey: 'tree_cherry', x: 4, y: 3 },
      { itemKey: 'lamp_post_garden', x: 0, y: 1 },
      { itemKey: 'lamp_post_garden', x: 4, y: 1 },
      { itemKey: 'bench_wooden', x: 2, y: 1 },
      { itemKey: 'flower_cosmos_pink', x: 2, y: 0 },
      { itemKey: 'flower_lily_white', x: 2, y: 3 },
    ],
  },
];

/**
 * Materialize a `ScenePack` into placeable items anchored at the given top-left
 * grid coordinate. Returns items with all required `PlacedItem` fields except
 * `id` — the canvas store will mint ids when calling `appendItems`.
 */
export function packToPlacedItems(
  pack: ScenePack,
  anchorX: number,
  anchorY: number,
): PlacedItem[] {
  const out: PlacedItem[] = [];
  for (const it of pack.items) {
    const def = ITEMS_BY_KEY[it.itemKey];
    if (!def) continue;
    out.push({
      id: generateId(),
      itemKey: it.itemKey,
      layer: def.layer,
      x: anchorX + it.x,
      y: anchorY + it.y,
      w: def.w,
      h: def.h,
      rotation: 0,
    });
  }
  return out;
}
