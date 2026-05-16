// Decoder for HappyIslandDesigner (HID) PNG export files.
//
// HID encodes the full island JSON into the alpha channel of the exported PNG
// using LSB steganography, then LZ-String compresses it. We reverse both steps
// here so users can peek at what's inside a HID share image and (eventually)
// import it onto our own canvas.
//
// File format reference: `.research/hid/app/save.ts`.
//
// Status: read-only summary today; mapping HID's category/type vocabulary to
// our item catalog is tracked as a follow-up in docs/PLAN.md.

import LZString from 'lz-string';
import { decodeAlphaSteganography } from './steganography';

export interface HidObjectGroup {
  /** Original key from HID, e.g. "amenities_house". */
  key: string;
  /** Category portion (the part before the first `_`). */
  category: string;
  /** Type portion. */
  type: string;
  /** Placement count for this category/type. */
  count: number;
}

export interface HidEdgeTiles {
  /** 24 numbers in CCW order, each is an asset index. */
  indices: number[];
}

export interface HidDecodedMap {
  /** Detected format version: 'v1' (legacy) or 'v2' (with edge tiles). */
  version: 'v1' | 'v2';
  /** Aggregated object placements grouped by category_type. */
  objectGroups: HidObjectGroup[];
  /** Total object count across all groups. */
  totalObjects: number;
  /** Distinct drawing layers (terrain/path colours) present. */
  drawingLayers: string[];
  /**
   * Raw `drawing` payload — color name → polygon vertices (`number[]` for a
   * single closed path, `number[][]` for compound paths). Kept verbatim so
   * downstream consumers can rasterise the shapes into their own grid.
   */
  rawDrawing: Record<string, unknown>;
  /** Optional V2 edge tile asset indices. */
  edgeTiles?: HidEdgeTiles;
  /** Raw JSON payload (post-decompression), for advanced users / debugging. */
  rawJson: string;
  /**
   * Raw `objects` map keyed by `category_type` → flat `[x0,y0,x1,y1,...]`
   * positions array. Preserved verbatim so downstream consumers can map
   * into their own coordinate spaces.
   */
  rawObjects: Record<string, number[]>;
}

export class HidDecodeError extends Error {
  code: 'NO_PAYLOAD' | 'BAD_LZ' | 'BAD_JSON' | 'IMAGE_LOAD';
  constructor(code: HidDecodeError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'HidDecodeError';
  }
}

/** Top-level: read a File (uploaded PNG) and return the decoded map. */
export async function decodeHidPng(source: File | Blob | string): Promise<HidDecodedMap> {
  const dataUrl = typeof source === 'string' ? source : await readAsDataURL(source);
  const img = await loadImage(dataUrl);
  const { data } = drawToImageData(img);
  const message = decodeAlphaSteganography(data);
  if (!message) {
    throw new HidDecodeError(
      'NO_PAYLOAD',
      'No HID payload found. This PNG was not exported from HappyIslandDesigner, or it was re-saved (e.g. as JPEG / via a screenshot tool) which destroyed the hidden data.',
    );
  }

  // HID always LZ-String compresses with `compressToUTF16`. Try that first;
  // very old exports may have been raw JSON, so fall back.
  let json: string | null = LZString.decompressFromUTF16(message);
  if (!json || json.length === 0) {
    json = message;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new HidDecodeError('BAD_JSON', 'Embedded payload is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new HidDecodeError('BAD_JSON', 'Embedded payload is not a HID map.');
  }

  return summarise(parsed as Record<string, unknown>, json);
}

function summarise(raw: Record<string, unknown>, rawJson: string): HidDecodedMap {
  const version: 'v1' | 'v2' = raw.version === 'v2' ? 'v2' : 'v1';

  const objectsRaw = (raw.objects ?? {}) as Record<string, unknown>;
  const objectGroups: HidObjectGroup[] = [];
  const rawObjects: Record<string, number[]> = {};
  let totalObjects = 0;
  for (const [key, value] of Object.entries(objectsRaw)) {
    // HID encodes positions as a flat [x0,y0,x1,y1,...] array, so the count
    // is the array length / 2. Some legacy maps stored a map of id→object;
    // tolerate that shape as a "size of values" count.
    let count = 0;
    if (Array.isArray(value) && value.every((v) => typeof v === 'number')) {
      count = Math.floor(value.length / 2);
      rawObjects[key] = value as number[];
    } else if (value && typeof value === 'object') {
      count = Object.keys(value as Record<string, unknown>).length;
    }
    if (count === 0) continue;
    const [category, ...rest] = key.split('_');
    objectGroups.push({
      key,
      category,
      type: rest.join('_'),
      count,
    });
    totalObjects += count;
  }
  // Sort by count desc for nice display.
  objectGroups.sort((a, b) => b.count - a.count);

  const drawingRaw = (raw.drawing ?? {}) as Record<string, unknown>;
  const drawingLayers = Object.keys(drawingRaw);

  let edgeTiles: HidEdgeTiles | undefined;
  if (Array.isArray(raw.edgeTiles) && raw.edgeTiles.every((n) => typeof n === 'number')) {
    edgeTiles = { indices: raw.edgeTiles as number[] };
  }

  return {
    version,
    objectGroups,
    totalObjects,
    drawingLayers,
    rawDrawing: drawingRaw,
    edgeTiles,
    rawJson,
    rawObjects,
  };
}

function readAsDataURL(blob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new HidDecodeError('IMAGE_LOAD', 'Could not read file.'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new HidDecodeError('IMAGE_LOAD', 'Could not decode image.'));
    img.src = src;
  });
}

function drawToImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new HidDecodeError('IMAGE_LOAD', 'Canvas 2D context unavailable.');
  }
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
