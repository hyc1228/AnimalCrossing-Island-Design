// Fuzzy match a free-form item name (e.g. what the LLM returned) against
// our two local catalogs: the 60-item curated set and the 2075-item Nookipedia
// dataset. Returns up to N matches ordered by score.

import { ITEMS } from '../data/items';
import { NH_FURNITURE } from '../data/nh-furniture';
import type { CatalogMatch } from './visionTypes';

const STOPWORDS = new Set(['the', 'a', 'an', 'of']);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Score how well `candidate` matches `query`. Both are item names.
 * Returns 0..1. Aggressive on exact / substring matches.
 */
function nameScore(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) {
    // Substring match — favor shorter delta.
    const ratio = Math.min(q.length, c.length) / Math.max(q.length, c.length);
    return 0.75 + 0.2 * ratio;
  }
  const qt = new Set(tokenize(q));
  const ct = new Set(tokenize(c));
  const j = jaccard(qt, ct);
  if (j === 0) return 0;
  // Boost when one set is a subset of the other.
  let subset = 0;
  if ([...qt].every((t) => ct.has(t))) subset += 0.1;
  if ([...ct].every((t) => qt.has(t))) subset += 0.1;
  return Math.min(0.9, j * 0.8 + subset);
}

interface MatchableRow {
  catalogKey: string;
  name: string;
  nameEn: string;
  imageUrl?: string;
  size: { w: number; h: number };
}

let cachedRows: MatchableRow[] | null = null;

function buildRows(): MatchableRow[] {
  if (cachedRows) return cachedRows;
  const rows: MatchableRow[] = [];

  // Curated items: their `name` is already Chinese, `key` is English-ish.
  for (const it of ITEMS) {
    rows.push({
      catalogKey: `curated:${it.key}`,
      name: it.name,
      // No real English name on curated items; fall back to the slug.
      nameEn: it.key.replace(/_/g, ' '),
      size: { w: it.w, h: it.h },
    });
  }
  // NH items: English name only; size in NH data is tile units already (e.g. 1, 1.5, 2).
  for (const it of NH_FURNITURE) {
    rows.push({
      catalogKey: `nh:${it.wikiSlug}`,
      name: it.name,
      nameEn: it.name,
      imageUrl: it.image,
      // Round footprint to integer for the planner grid.
      size: {
        w: Math.max(1, Math.round(it.size.w)),
        h: Math.max(1, Math.round(it.size.h)),
      },
    });
  }
  cachedRows = rows;
  return rows;
}

/**
 * Find up to `limit` catalog matches for a free-form item name.
 * Anything below `minScore` is dropped.
 */
export function matchCatalog(query: string, limit = 5, minScore = 0.3): CatalogMatch[] {
  const rows = buildRows();
  const out: CatalogMatch[] = [];
  for (const r of rows) {
    const sName = nameScore(query, r.name);
    const sEn = nameScore(query, r.nameEn);
    const score = Math.max(sName, sEn);
    if (score >= minScore) {
      out.push({
        catalogKey: r.catalogKey,
        name: r.name,
        nameEn: r.nameEn,
        score,
        imageUrl: r.imageUrl,
        size: r.size,
      });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
