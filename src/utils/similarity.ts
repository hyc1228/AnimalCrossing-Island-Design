// Similarity between two saved inspirations:
//   score = 0.55 * cosine(styleScores) + 0.45 * jaccard(item nameEn sets)
//
// Both inputs are in [0,1]; their weighted sum stays in [0,1]. The split favours
// style a touch over item overlap because two japanese-zen inspirations with
// totally different specific furniture should still rank above a japanese-zen
// and a cafe-street that happen to share a couple of generic chairs.

import type { RecognitionResult } from '../ai/visionTypes';
import type { SavedInspiration } from '../stores/inspirationsStore';
import type { StyleId } from '../ai/types';

const STYLE_KEYS: StyleId[] = ['japanese', 'garden', 'fairy', 'cafe', 'modern'];

function styleVector(result: RecognitionResult): number[] {
  // result.raw.styleScores has every key present, but be defensive.
  return STYLE_KEYS.map((k) => result.raw.styleScores[k] ?? 0);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function itemSet(result: RecognitionResult): Set<string> {
  const s = new Set<string>();
  for (const it of result.items) {
    const key = it.nameEn.toLowerCase().trim();
    if (key) s.add(key);
  }
  return s;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersect = 0;
  for (const v of a) if (b.has(v)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

export interface SimilarityHit {
  inspiration: SavedInspiration;
  score: number;
  styleScore: number;
  itemScore: number;
}

/**
 * Rank every `candidates` entry by similarity to `target`. The target itself
 * is excluded from results. Returns the top `limit` matches sorted desc.
 */
export function findSimilar(
  target: SavedInspiration,
  candidates: SavedInspiration[],
  limit = 4,
): SimilarityHit[] {
  const targetVec = styleVector(target.result);
  const targetItems = itemSet(target.result);

  const ranked = candidates
    .filter((c) => c.id !== target.id)
    .map<SimilarityHit>((c) => {
      const sv = styleVector(c.result);
      const is = itemSet(c.result);
      const styleScore = cosine(targetVec, sv);
      const itemScore = jaccard(targetItems, is);
      const score = 0.55 * styleScore + 0.45 * itemScore;
      return { inspiration: c, score, styleScore, itemScore };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit);
}
