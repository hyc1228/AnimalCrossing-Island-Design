// Local-first "inspirations library": every successful image recognition is
// stored on this device so the user can browse, re-open, and re-apply later.
//
// Privacy: data never leaves the browser. We downscale uploaded images to a
// reasonable thumbnail (default 720px longest side, JPEG 0.78) before persisting
// to keep localStorage usage small. The full original RecognitionResult is kept
// minus its bulky `imageDataUrl` (that field is replaced with the thumbnail).
//
// Storage budget: with ~80 KB per inspiration we can keep ~40 entries within a
// 4 MB safety margin under the typical 5 MB localStorage quota.

import { create } from 'zustand';
import type { RecognitionResult } from '../ai/visionTypes';

export interface SavedInspiration {
  id: string;
  savedAt: number;
  /** Always a downscaled JPEG data URL. */
  thumbnail: string;
  /** Recognition result with `imageDataUrl` slot replaced by the thumbnail. */
  result: RecognitionResult;
  /** Optional user note. */
  note?: string;
}

interface InspirationsState {
  items: SavedInspiration[];
  /** Save a fresh recognition. Returns the new id. */
  add: (result: RecognitionResult) => Promise<string>;
  remove: (id: string) => void;
  updateNote: (id: string, note: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'ac_inspirations_v1';
const MAX_ENTRIES = 40;
const THUMB_LONG_EDGE = 720;
const THUMB_QUALITY = 0.78;

function loadInitial(): SavedInspiration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedInspiration[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persist(items: SavedInspiration[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    // Quota exceeded or storage unavailable: keep state in-memory.
    // We try to evict the oldest half and retry once before giving up.
    if (err instanceof DOMException && items.length > 4) {
      const trimmed = items.slice(0, Math.ceil(items.length / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // give up; in-memory only for this session
      }
    }
  }
}

function generateId(): string {
  return `insp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Downscale `srcDataUrl` so the longest edge ≤ `THUMB_LONG_EDGE` and re-encode
 * as JPEG. Returns the resulting data URL. Falls back to the original on error.
 */
async function makeThumbnail(srcDataUrl: string): Promise<string> {
  if (!srcDataUrl.startsWith('data:image/')) return srcDataUrl;
  try {
    const img = await loadImage(srcDataUrl);
    const ratio = Math.min(1, THUMB_LONG_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return srcDataUrl;
    // White matte under transparent PNGs so JPEG doesn't go black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', THUMB_QUALITY);
  } catch {
    return srcDataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export const useInspirationsStore = create<InspirationsState>((set, get) => ({
  items: loadInitial(),

  add: async (result) => {
    const thumbnail = await makeThumbnail(result.imageDataUrl);
    const id = generateId();
    const entry: SavedInspiration = {
      id,
      savedAt: Date.now(),
      thumbnail,
      result: { ...result, imageDataUrl: thumbnail },
    };
    // Newest first. Drop overflow from the tail.
    const next = [entry, ...get().items].slice(0, MAX_ENTRIES);
    persist(next);
    set({ items: next });
    return id;
  },

  remove: (id) => {
    const next = get().items.filter((it) => it.id !== id);
    persist(next);
    set({ items: next });
  },

  updateNote: (id, note) => {
    const next = get().items.map((it) => (it.id === id ? { ...it, note } : it));
    persist(next);
    set({ items: next });
  },

  clear: () => {
    persist([]);
    set({ items: [] });
  },
}));

/** Lightweight read-only helper for code paths that don't want a hook. */
export function getInspirationById(id: string): SavedInspiration | undefined {
  return useInspirationsStore.getState().items.find((it) => it.id === id);
}
