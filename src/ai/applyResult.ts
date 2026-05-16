// Shared logic for turning a `RecognitionResult` (whether from vision or
// text generation) into a brand-new design with the selected items placed.
// Both RecognizePage and GeneratePage go through here so the behaviour is
// guaranteed identical (random placement attempts, NH→curated fallback,
// the `ac_recognize_skipped` session toast handed to EditorPage).

import type { RecognitionResult, MatchedItem } from './visionTypes';
import type { PlacedItem } from '../types';
import { ITEMS_BY_KEY } from '../data/items';
import { canPlace, createDesign, generateId } from '../utils/grid';
import { saveDesign, setCurrentDesignId } from '../utils/storage';

export interface ApplyOptions {
  /** Localized design name (e.g. "图像识别 14:25"). */
  designName: string;
  /** Which item indices the user accepted. */
  selected: Record<number, boolean>;
  /** Optional pre-seed terrain (HID import path); defaults to empty grass. */
  initialTerrain?: number[][];
}

export interface ApplyResult {
  /** Newly-created design id (also set as current). */
  designId: string;
  /** How many tiles were actually placed. */
  placedCount: number;
  /** Items dropped because they had no curated match or no free space. */
  skippedCount: number;
}

/**
 * Pick the first match whose `catalogKey` starts with `curated:`. We currently
 * only auto-place curated items because they have hand-tuned footprints and
 * colors — NH catalog matches still surface in the picker but are skipped
 * during placement (with a count toward `skippedCount`).
 */
function bestCuratedKey(item: MatchedItem): string | undefined {
  const m = item.matches.find((x) => x.catalogKey.startsWith('curated:'));
  if (!m) return undefined;
  return m.catalogKey.slice('curated:'.length);
}

export function applyRecognitionToNewDesign(
  result: RecognitionResult,
  opts: ApplyOptions,
): ApplyResult {
  const design = createDesign(opts.designName);
  if (opts.initialTerrain) {
    design.terrain = opts.initialTerrain;
  }

  const picked = result.items.filter((_, i) => opts.selected[i]);
  const placed: PlacedItem[] = [];

  let placedCount = 0;
  let skippedCount = 0;

  const cx0 = Math.floor(design.size.cols / 2) - 12;
  const cy0 = Math.floor(design.size.rows / 2) - 8;

  for (const item of picked) {
    const curatedKey = bestCuratedKey(item);
    if (!curatedKey) {
      skippedCount += item.count;
      continue;
    }
    const def = ITEMS_BY_KEY[curatedKey];
    if (!def) {
      skippedCount += item.count;
      continue;
    }
    for (let k = 0; k < item.count; k++) {
      let ok = false;
      for (let attempt = 0; attempt < 30 && !ok; attempt++) {
        const x = cx0 + Math.floor(Math.random() * 24);
        const y = cy0 + Math.floor(Math.random() * 16);
        const candidate: PlacedItem = {
          id: generateId(),
          itemKey: curatedKey,
          layer: def.layer,
          x,
          y,
          w: def.w,
          h: def.h,
          rotation: 0,
        };
        if (canPlace(candidate, placed, design.size.cols, design.size.rows)) {
          placed.push(candidate);
          ok = true;
          placedCount++;
        }
      }
      if (!ok) skippedCount++;
    }
  }

  design.items = placed;
  saveDesign(design);
  setCurrentDesignId(design.id);

  if (skippedCount > 0 || placedCount > 0) {
    try {
      sessionStorage.setItem(
        'ac_recognize_skipped',
        JSON.stringify({ placedCount, skippedCount, designId: design.id }),
      );
    } catch {
      /* ignore quota */
    }
  }

  return { designId: design.id, placedCount, skippedCount };
}
