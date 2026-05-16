// Single point of truth for looking up an `ItemDef` by `itemKey` regardless of
// whether it lives in our curated catalog or in the Nookipedia (NH) 2000+
// dataset. NH items are synthesised on demand: their key is `nh:${wikiSlug}`,
// they always render via their icon URL, and they default to the `decoration`
// layer with a footprint inferred from the Nookipedia size field.
//
// This indirection lets the rest of the app (canvas store, placement,
// shopping list, recognition mapping) stay agnostic to the data source.

import type { ItemDef } from '../types';
import { ITEMS_BY_KEY } from './items';
import { NH_FURNITURE_BY_SLUG, type NHFurnitureEntry } from './nh-furniture';

export const NH_KEY_PREFIX = 'nh:';

const nhCache = new Map<string, ItemDef>();

function ceilSize(n: number): number {
  // NH stores fractional tiles (e.g. 0.5, 1.5). Clamp to ≥1 and round up so a
  // 0.5-tile chair still gets a 1×1 visual footprint and never collapses to 0.
  return Math.max(1, Math.ceil(n));
}

function buildFromNh(entry: NHFurnitureEntry, key: string): ItemDef {
  return {
    key,
    name: entry.name,
    nameEn: entry.name,
    category: 'decoration',
    layer: 'decoration',
    w: ceilSize(entry.size.w),
    h: ceilSize(entry.size.h),
    color: '#f3e9d3',
    emoji: '🪑',
    imageUrl: entry.image,
    source: entry.availableFrom,
    price: entry.buy ?? undefined,
    tags: entry.hhaThemes.map((t) => t.toLowerCase()),
  };
}

/** Look up an `ItemDef` for any itemKey (curated or NH). Returns `undefined` if unknown. */
export function resolveItemDef(itemKey: string | undefined): ItemDef | undefined {
  if (!itemKey) return undefined;
  const curated = ITEMS_BY_KEY[itemKey];
  if (curated) return curated;
  if (itemKey.startsWith(NH_KEY_PREFIX)) {
    const cached = nhCache.get(itemKey);
    if (cached) return cached;
    const slug = itemKey.slice(NH_KEY_PREFIX.length);
    const entry = NH_FURNITURE_BY_SLUG[slug];
    if (!entry) return undefined;
    const built = buildFromNh(entry, itemKey);
    nhCache.set(itemKey, built);
    return built;
  }
  return undefined;
}

/** Build the NH itemKey for a wiki slug. */
export function nhKeyFor(slug: string): string {
  return `${NH_KEY_PREFIX}${slug}`;
}
