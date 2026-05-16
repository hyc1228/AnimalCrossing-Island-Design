// Shared types for the "image recognition" pipeline.
// One screenshot of an ACNH island/area in, structured analysis out.

import type { StyleId } from './types';

/** Where on the image the item visually appears (loose hint, not a grid coord). */
export type ItemRegion =
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'scattered';

/** One item the LLM thinks it sees in the picture, before catalog matching. */
export interface RawDetectedItem {
  /** Lowercase English name as it would appear on Nookipedia (e.g. "stone lantern"). */
  nameEn: string;
  /** Visible count; defaults to 1 if uncertain. */
  count: number;
  /** Model's confidence 0..1. */
  confidence: number;
  /** Optional rough spatial hint. */
  region?: ItemRegion;
  /** Free-form note ("near the entrance", "next to pond"…) — optional. */
  note?: string;
}

/** Raw structured output expected back from the multimodal LLM. */
export interface RawVisionResponse {
  /** Soft style scores; all keys present, values 0..1. */
  styleScores: Record<StyleId, number>;
  /** 1–2 sentence Chinese description of the scene. */
  description: string;
  /** Crowding level. */
  density: 'sparse' | 'medium' | 'dense';
  /** Detected items, ordered by salience. */
  items: RawDetectedItem[];
}

/** A LLM-detected item enriched with our local catalog matches. */
export interface MatchedItem extends RawDetectedItem {
  /** Best matches from the unified catalog (NH + curated), ordered by score. */
  matches: CatalogMatch[];
}

export interface CatalogMatch {
  /** unifiedCatalog key. */
  catalogKey: string;
  /** Display name (zh when available, else en). */
  name: string;
  /** English name (always). */
  nameEn: string;
  /** Match score 0..1 (fuzzy name match). */
  score: number;
  /** Image URL if available (NH items have one). */
  imageUrl?: string;
  /** Tile footprint. */
  size: { w: number; h: number };
}

/** Final result handed to the UI / editor. */
export interface RecognitionResult {
  /** Original image as a data URL (kept in memory only). */
  imageDataUrl: string;
  /** Provider used. */
  provider: 'gemini' | 'openai' | 'anthropic';
  /** Model name. */
  model: string;
  /** When the recognition ran (epoch ms). */
  ranAt: number;
  /** Dominant styles sorted by score, descending. */
  topStyles: Array<{ style: StyleId; score: number }>;
  /** Original LLM response. */
  raw: RawVisionResponse;
  /** Items with catalog matches resolved. */
  items: MatchedItem[];
  /** Approximate token usage if the provider reports it. */
  usage?: { in: number; out: number };
}
