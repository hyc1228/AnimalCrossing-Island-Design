// Build URLs that fully encode an IslandDesign in the hash fragment so it can
// be shared peer-to-peer without any backend. The format is:
//
//   https://example.com/#design=<base64lz>
//
// Where `<base64lz>` is `LZString.compressToEncodedURIComponent` of a
// minified JSON view of the design. Encoded via `compressToEncodedURIComponent`
// so the result is safe to put in URL hashes without further escaping.
//
// Terrain (80×70) compresses extremely well because most cells are zero (grass).

import LZString from 'lz-string';
import type { IslandDesign, PlacedItem, Rotation } from '../types';
import { generateId } from './grid';

const VERSION = 1;

// We keep the wire format compact: short keys, no thumbnails, no timestamps.
interface Wire {
  v: number;
  n: string; // name
  s: [number, number]; // cols, rows
  t: number[][]; // terrain
  i: WireItem[];
}

interface WireItem {
  k: string; // itemKey
  l: string; // layer
  x: number;
  y: number;
  w: number;
  h: number;
  r: Rotation;
}

export function toWire(design: IslandDesign): Wire {
  return {
    v: VERSION,
    n: design.name,
    s: [design.size.cols, design.size.rows],
    t: design.terrain,
    i: design.items.map(
      (it) =>
        ({
          k: it.itemKey,
          l: it.layer,
          x: it.x,
          y: it.y,
          w: it.w,
          h: it.h,
          r: it.rotation,
        }) satisfies WireItem,
    ),
  };
}

export function fromWire(wire: Wire): IslandDesign {
  const items: PlacedItem[] = (wire.i ?? []).map((it) => ({
    id: generateId(),
    itemKey: it.k,
    layer: it.l as PlacedItem['layer'],
    x: it.x,
    y: it.y,
    w: it.w,
    h: it.h,
    rotation: it.r,
  }));
  const now = Date.now();
  return {
    id: generateId(),
    name: wire.n,
    size: { cols: wire.s[0], rows: wire.s[1] },
    items,
    terrain: wire.t,
    createdAt: now,
    updatedAt: now,
  };
}

export function encodeDesign(design: IslandDesign): string {
  const wire = toWire(design);
  return LZString.compressToEncodedURIComponent(JSON.stringify(wire));
}

export function decodeDesign(encoded: string): IslandDesign | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const wire = JSON.parse(json) as Wire;
    if (typeof wire !== 'object' || wire === null) return null;
    if (wire.v !== VERSION) return null;
    if (!Array.isArray(wire.s) || wire.s.length !== 2) return null;
    if (!Array.isArray(wire.t) || !Array.isArray(wire.i)) return null;
    return fromWire(wire);
  } catch {
    return null;
  }
}

/** Build a full shareable URL pinned to the current origin. */
export function buildShareUrl(design: IslandDesign): string {
  const encoded = encodeDesign(design);
  // Anchor to the home page so the HomePage hash detector picks it up.
  const base = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}`;
  return `${base}#design=${encoded}`;
}

/**
 * Extract a shared design from the current URL hash (if any). Mutating side
 * effect: also clears the hash so reloading doesn't double-import.
 */
export function consumeSharedDesignFromHash(): IslandDesign | null {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#design=')) return null;
  const encoded = hash.slice('#design='.length);
  const design = decodeDesign(encoded);
  // Clear the hash regardless so we don't re-import on subsequent navigation.
  try {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    // ignore — non-critical
  }
  return design;
}
