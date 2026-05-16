// Hand-curated mapping from HappyIslandDesigner `category_type` strings to our
// curated itemKey catalog. HID's vocabulary covers ~5 categories (structures,
// amenities, construction, tree, flower) totalling ~150 distinct types; we map
// the ones that have a clear analogue in our 60-item catalog. Anything not in
// this table is reported as "skipped" so the user can see the gap.
//
// Coordinate translation: HID stores positions in a 112×96 paper.js grid
// (origin top-left, x→right, y→down). Our canvas is 80×70 cells. `scaleHidXY`
// performs the linear remap.

import { GRID_COLS, GRID_ROWS } from '../types';

const HID_W = 112;
const HID_H = 96;

/**
 * Map of `${hidCategory}_${hidType}` → our `itemKey`. Some HID types have no
 * 1:1 analog (e.g. raster vs vector duplicates for the same building); we map
 * both variants to the same itemKey when that's the right thing.
 */
export const HID_TO_ITEMKEY: Record<string, string> = {
  // ===== Amenities (services & town facilities) =====
  amenities_townhallIcon: 'resident_services',
  amenities_townhallSprite: 'resident_services',
  amenities_centerIcon: 'resident_services',
  amenities_museumIcon: 'museum',
  amenities_museumSprite: 'museum',
  amenities_nookIcon: 'nooks_cranny',
  amenities_nookSprite: 'nooks_cranny',
  amenities_ableIcon: 'tailor_shop',
  amenities_ableSprite: 'tailor_shop',
  amenities_campsiteSprite: 'campsite',
  amenities_tentIcon: 'tent',
  amenities_dock: 'parasol', // closest beach decoration available

  // ===== Structures (houses & tents) =====
  structures_playerHouseIcon: 'house_player',
  structures_playerhouseSprite: 'house_player',
  structures_playerTentIcon: 'tent',
  structures_houseIcon: 'house_villager',
  structures_houseSprite: 'house_villager',
  structures_house: 'house_villager',
  structures_hut: 'house_villager',
  structures_building: 'house_villager',
  structures_tentSprite: 'tent',
  structures_tentRound: 'tent',
  structures_tentTriangle: 'tent',
  structures_tentTrapezoid: 'tent',
  // Legacy tree sprites that got saved under `structures` historically.
  structures_treePineSprite: 'tree_pine',
  structures_treePalmSprite: 'tree_palm',
  structures_treeFruitSprite: 'tree_fruit_apple',

  // ===== Construction (bridges & inclines) =====
  // All bridge orientations roll up into our two bridge variants.
  construction_bridgeStoneVertical: 'bridge_stone',
  construction_bridgeStoneHorizontal: 'bridge_stone',
  construction_bridgeStoneTLBR: 'bridge_stone',
  construction_bridgeStoneTRBL: 'bridge_stone',
  construction_bridgeWoodVertical: 'bridge_wooden',
  construction_bridgeWoodHorizontal: 'bridge_wooden',
  construction_bridgeWoodTLBR: 'bridge_wooden',
  construction_bridgeWoodTRBL: 'bridge_wooden',
  construction_bridgeVerticalSprite: 'bridge_wooden',
  construction_bridgeHorizontalSprite: 'bridge_wooden',
  construction_stairsStoneUp: 'incline_stone',
  construction_stairsStoneDown: 'incline_stone',
  construction_stairsStoneLeft: 'incline_stone',
  construction_stairsStoneRight: 'incline_stone',
  construction_stairsWoodUp: 'incline_wood',
  construction_stairsWoodDown: 'incline_wood',
  construction_stairsWoodLeft: 'incline_wood',
  construction_stairsWoodRight: 'incline_wood',
  // Schematic icons collapse to the same buckets (3/4/5 = span).
  construction_bridgeIconVertical3: 'bridge_wooden',
  construction_bridgeIconVertical4: 'bridge_wooden',
  construction_bridgeIconVertical5: 'bridge_wooden',
  construction_bridgeIconHorizontal3: 'bridge_wooden',
  construction_bridgeIconHorizontal4: 'bridge_wooden',
  construction_bridgeIconHorizontal5: 'bridge_wooden',
  construction_bridgeIconTLBR3: 'bridge_wooden',
  construction_bridgeIconTLBR4: 'bridge_wooden',
  construction_bridgeIconTLBR5: 'bridge_wooden',
  construction_bridgeIconTRBL3: 'bridge_wooden',
  construction_bridgeIconTRBL4: 'bridge_wooden',
  construction_bridgeIconTRBL5: 'bridge_wooden',
  construction_stairsIconUp: 'incline_stone',
  construction_stairsIconDown: 'incline_stone',
  construction_stairsIconLeft: 'incline_stone',
  construction_stairsIconRight: 'incline_stone',

  // ===== Trees =====
  tree_tree: 'tree_oak',
  tree_treeApple: 'tree_fruit_apple',
  tree_treeOrange: 'tree_fruit_apple',
  tree_treePear: 'tree_fruit_apple',
  tree_treePeach: 'tree_fruit_apple',
  tree_treeCherry: 'tree_cherry',
  tree_treeAutumn: 'tree_oak',
  tree_treeSakura: 'tree_cherry',
  tree_pine: 'tree_pine',
  tree_palm: 'tree_palm',
  tree_bamboo: 'bamboo',
  // Flat stylised variants — map to nearest match.
  tree_flatBush: 'shrub',
  tree_flatTree: 'tree_oak',
  tree_flatPalm: 'tree_palm',
  tree_flatPine: 'tree_pine',

  // ===== Flowers =====
  // Roses
  flower_roseRed: 'flower_rose_red',
  flower_roseWhite: 'flower_rose_white',
  flower_rosePink: 'flower_rose_red',
  flower_roseYellow: 'flower_tulip_yellow',
  flower_roseOrange: 'flower_rose_red',
  flower_rosePurple: 'flower_rose_red',
  flower_roseBlack: 'flower_rose_red',
  flower_roseBlue: 'flower_hyacinth_blue',
  flower_roseGold: 'flower_tulip_yellow',
  // Tulips
  flower_tulipRed: 'flower_tulip_pink',
  flower_tulipPink: 'flower_tulip_pink',
  flower_tulipYellow: 'flower_tulip_yellow',
  flower_tulipWhite: 'flower_rose_white',
  flower_tulipOrange: 'flower_tulip_yellow',
  flower_tulipBlack: 'flower_tulip_pink',
  flower_tulipPurple: 'flower_tulip_pink',
  // Lilies
  flower_lilyRed: 'flower_rose_red',
  flower_lilyWhite: 'flower_lily_white',
  flower_lilyPink: 'flower_tulip_pink',
  flower_lilyYellow: 'flower_tulip_yellow',
  flower_lilyOrange: 'flower_tulip_yellow',
  flower_lilyBlack: 'flower_lily_white',
  flower_lilyOfTheValley: 'flower_lily_white',
  // Cosmos
  flower_cosmosRed: 'flower_cosmos_pink',
  flower_cosmosPink: 'flower_cosmos_pink',
  flower_cosmosOrange: 'flower_cosmos_pink',
  flower_cosmosYellow: 'flower_tulip_yellow',
  flower_cosmosWhite: 'flower_rose_white',
  flower_cosmosBlack: 'flower_cosmos_pink',
  // Hyacinths
  flower_hyacinthRed: 'flower_hyacinth_blue',
  flower_hyacinthWhite: 'flower_rose_white',
  flower_hyacinthPink: 'flower_hyacinth_blue',
  flower_hyacinthYellow: 'flower_hyacinth_blue',
  flower_hyacinthOrange: 'flower_hyacinth_blue',
  flower_hyacinthBlue: 'flower_hyacinth_blue',
  flower_hyacinthPurple: 'flower_hyacinth_blue',
  // Mums (chrysanthemums)
  flower_chrysanthemumRed: 'flower_mum_white',
  flower_chrysanthemumWhite: 'flower_mum_white',
  flower_chrysanthemumPink: 'flower_mum_white',
  flower_chrysanthemumYellow: 'flower_mum_white',
  flower_chrysanthemumPurple: 'flower_mum_white',
  flower_chrysanthemumGreen: 'flower_mum_white',
  // Pansies
  flower_palsyRed: 'flower_tulip_pink',
  flower_palsyWhite: 'flower_rose_white',
  flower_palsyYellow: 'flower_tulip_yellow',
  flower_palsyOrange: 'flower_tulip_yellow',
  flower_palsyBlue: 'flower_hyacinth_blue',
  flower_palsyPurple: 'flower_tulip_pink',
  // Windflowers (HID uses `poppy*`)
  flower_poppyRed: 'flower_cosmos_pink',
  flower_poppyWhite: 'flower_rose_white',
  flower_poppyPink: 'flower_cosmos_pink',
  flower_poppyOrange: 'flower_cosmos_pink',
  flower_poppyBlue: 'flower_hyacinth_blue',
  flower_poppyPurple: 'flower_cosmos_pink',
  // Weeds — present them as shrubs for visual fill
  flower_weedBrush: 'shrub',
  flower_weedBush: 'shrub',
  flower_weedCattail: 'shrub',
  flower_weedClover: 'flower_lily_white',
  flower_weedDandelion: 'flower_tulip_yellow',
};

export interface MappedHidObject {
  /** Our itemKey. */
  itemKey: string;
  /** Position in OUR grid (already scaled & clamped). */
  x: number;
  y: number;
  /** Original HID key for debugging. */
  source: string;
}

export interface HidMappingStats {
  mapped: number;
  unmapped: number;
  /** Top unmapped `category_type` keys by count (for "things we'd like to add"). */
  topUnmapped: Array<{ key: string; count: number }>;
}

export interface HidMappingResult {
  objects: MappedHidObject[];
  stats: HidMappingStats;
}

/**
 * Convert a flat HID position into our canvas grid space. HID maps span
 * roughly 112×96 paper.js units with the origin at top-left.
 */
export function scaleHidXY(hidX: number, hidY: number): { x: number; y: number } {
  const x = Math.round((hidX / HID_W) * GRID_COLS);
  const y = Math.round((hidY / HID_H) * GRID_ROWS);
  return {
    x: Math.max(0, Math.min(GRID_COLS - 1, x)),
    y: Math.max(0, Math.min(GRID_ROWS - 1, y)),
  };
}

/**
 * Walk a decoded HID map's object groups and produce a list of placement
 * candidates against our catalog. Skipped types are tallied in `stats`.
 */
export function mapHidObjects(
  groups: Array<{ key: string; category: string; type: string; count: number; positions?: number[] }>,
  rawObjects: Record<string, unknown>,
): HidMappingResult {
  const objects: MappedHidObject[] = [];
  const unmappedCounts = new Map<string, number>();
  let mappedCount = 0;
  let unmappedTotal = 0;

  for (const group of groups) {
    const positions = (rawObjects[group.key] as number[] | undefined) ?? [];
    const itemKey = HID_TO_ITEMKEY[group.key];
    if (!itemKey) {
      unmappedTotal += group.count;
      unmappedCounts.set(group.key, (unmappedCounts.get(group.key) ?? 0) + group.count);
      continue;
    }
    for (let i = 0; i + 1 < positions.length; i += 2) {
      const { x, y } = scaleHidXY(positions[i], positions[i + 1]);
      objects.push({ itemKey, x, y, source: group.key });
      mappedCount += 1;
    }
  }

  const topUnmapped = [...unmappedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, count]) => ({ key, count }));

  return {
    objects,
    stats: { mapped: mappedCount, unmapped: unmappedTotal, topUnmapped },
  };
}
