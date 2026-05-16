// Re-exports the full Nookipedia New Horizons furniture catalogue with types.
// Source: https://nookipedia.com/wiki/Furniture/New_Horizons/All_furniture
// Regenerate via: `node scripts/parse-nookipedia-furniture.mjs`

import rawData from './nh-furniture.json';

export interface NHFurnitureEntry {
  /** Row index from the Nookipedia table (not a stable Nintendo item id). */
  id: number;
  /** Display name in English. */
  name: string;
  /** Slug of the Nookipedia wiki page (e.g. "Item:1-Up_Mushroom_(New_Horizons)"). */
  wikiSlug: string;
  /** Direct URL to the 64px (or larger) item icon hosted on dodo.ac. */
  image: string;
  /** Buy price in Bells; null when "Not for sale". */
  buy: number | null;
  /** Sell price in Bells; null when unknown. */
  sell: number | null;
  /**
   * Where the item is obtained, e.g. "Nook Shopping", "Crafting", "Able Sisters",
   * a villager name, or a slash-joined list.
   */
  availableFrom: string;
  /** Happy Home Academy themes (zero, one, or multiple). */
  hhaThemes: string[];
  /** Interact description such as "Sit", "Lie down"; null when none. */
  interact: string | null;
  /** Whether the item is customizable at a workbench. */
  customizable: boolean;
  /** Tile footprint in 1.0 = one in-game tile. */
  size: { w: number; h: number };
}

export const NH_FURNITURE: NHFurnitureEntry[] = rawData as NHFurnitureEntry[];

export const NH_FURNITURE_BY_SLUG: Record<string, NHFurnitureEntry> = Object.fromEntries(
  NH_FURNITURE.map((it) => [it.wikiSlug, it]),
);

export const NH_FURNITURE_BY_NAME: Record<string, NHFurnitureEntry> = Object.fromEntries(
  NH_FURNITURE.map((it) => [it.name.toLowerCase(), it]),
);

/** Convenience filter: return items whose tile footprint matches the predicate. */
export function filterByFootprint(
  predicate: (w: number, h: number) => boolean,
): NHFurnitureEntry[] {
  return NH_FURNITURE.filter((it) => predicate(it.size.w, it.size.h));
}
