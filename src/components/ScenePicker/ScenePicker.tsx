// Modal grid of curated "scene packs" — small relative layouts the user can
// stamp onto the canvas with one click. Picks the first style-filter that
// matches the current state, then drops the pack near canvas center.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { SCENE_PACKS, packToPlacedItems, type ScenePack } from '../../data/scenePacks';
import { useCanvasStore } from '../../stores/canvasStore';
import { ITEMS_BY_KEY } from '../../data/items';
import { canPlace } from '../../utils/grid';
import type { PlacedItem } from '../../types';
import type { StyleId } from '../../ai/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional callback after a pack is successfully placed (toast text). */
  onPlaced?: (msg: string) => void;
}

const STYLE_FILTERS: Array<{ id: 'all' | StyleId; emoji: string }> = [
  { id: 'all', emoji: '✨' },
  { id: 'japanese', emoji: '⛩️' },
  { id: 'garden', emoji: '🌻' },
  { id: 'fairy', emoji: '🍄' },
  { id: 'cafe', emoji: '☕' },
  { id: 'modern', emoji: '🏙️' },
];

export default function ScenePicker({ open, onClose, onPlaced }: Props) {
  const { t } = useTranslation();
  const design = useCanvasStore((s) => s.design);
  const appendItems = useCanvasStore((s) => s.appendItems);
  const [styleFilter, setStyleFilter] = useState<'all' | StyleId>('all');

  const filtered = useMemo(() => {
    if (styleFilter === 'all') return SCENE_PACKS;
    return SCENE_PACKS.filter((p) => p.style === styleFilter);
  }, [styleFilter]);

  if (!open) return null;

  const handlePick = (pack: ScenePack) => {
    // Find a center-ish anchor that fits the pack. If the pack doesn't fit at
    // center, search outward in a small spiral — but in practice 80x70 +
    // ≤6x6 packs always fit at center.
    const cols = design.size.cols;
    const rows = design.size.rows;
    const cx = Math.max(0, Math.floor((cols - pack.w) / 2));
    const cy = Math.max(0, Math.floor((rows - pack.h) / 2));

    // Try a few offsets to dodge overlaps with already-placed items.
    const offsets: Array<[number, number]> = [
      [0, 0],
      [4, 0], [-4, 0], [0, 4], [0, -4],
      [8, 0], [-8, 0], [0, 8], [0, -8],
      [6, 6], [-6, -6], [6, -6], [-6, 6],
    ];

    let placed: PlacedItem[] = [];
    for (const [dx, dy] of offsets) {
      const anchorX = cx + dx;
      const anchorY = cy + dy;
      if (anchorX < 0 || anchorY < 0) continue;
      if (anchorX + pack.w > cols || anchorY + pack.h > rows) continue;
      const candidate = packToPlacedItems(pack, anchorX, anchorY);
      // Quick check: any candidate item collides with existing items?
      const existing = [...design.items];
      let ok = true;
      for (const cand of candidate) {
        if (!canPlace(cand, existing, cols, rows)) {
          ok = false;
          break;
        }
        existing.push(cand);
      }
      if (ok) {
        placed = candidate;
        break;
      }
    }

    if (placed.length === 0) {
      // Fallback: drop everything at center and let appendItems silently skip
      // collisions; user still gets a partial pack.
      placed = packToPlacedItems(pack, cx, cy);
    }

    appendItems(placed);
    onPlaced?.(t('scenes.placedToast', { name: t(`scenes.${pack.i18nId}.name`), count: placed.length }));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-[fadeUp_0.18s_ease-out]"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-3xl p-5 relative max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full text-leaf-600 hover:bg-cream-100"
          title={t('common.close', { defaultValue: 'Close' })}
        >
          <X size={16} />
        </button>

        <h2 className="text-lg font-extrabold text-leaf-800 mb-1 flex items-center gap-2">
          <span className="text-2xl">🧩</span> {t('scenes.title')}
        </h2>
        <p className="text-xs text-leaf-600 leading-relaxed">{t('scenes.subtitle')}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STYLE_FILTERS.map((f) => {
            const active = styleFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setStyleFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition ${
                  active
                    ? 'border-mint-500 bg-mint-50 text-leaf-800'
                    : 'border-cream-200 bg-white text-leaf-700 hover:border-mint-300'
                }`}
                style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
              >
                <span className="mr-1">{f.emoji}</span>
                {f.id === 'all'
                  ? t('scenes.filterAll')
                  : t(`styles.${f.id}` as 'styles.japanese')}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex-1 overflow-y-auto -mx-2 px-2 no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((pack) => (
              <PackCard key={pack.id} pack={pack} onPick={() => handlePick(pack)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-leaf-600">{t('scenes.empty')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PackCard({ pack, onPick }: { pack: ScenePack; onPick: () => void }) {
  const { t } = useTranslation();
  // Tiny SVG preview: 12px per cell — enough to read the layout shape.
  const CELL = 14;
  return (
    <button
      onClick={onPick}
      className="text-left rounded-2xl border-2 border-cream-200 bg-white p-3 hover:border-mint-400 hover:-translate-y-0.5 transition group"
      style={{ boxShadow: '0 3px 0 0 #e0d8c0' }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="font-extrabold text-sm text-leaf-800 truncate">
          <span className="mr-1">{pack.emoji}</span>
          {t(`scenes.${pack.i18nId}.name`)}
        </span>
        <span className="text-[10px] text-leaf-500 font-mono shrink-0">
          {pack.w}×{pack.h}
        </span>
      </div>
      <p className="text-[11px] text-leaf-600 mb-2 leading-snug line-clamp-2">
        {t(`scenes.${pack.i18nId}.desc`)}
      </p>
      <div
        className="rounded-xl bg-mint-50 border-2 border-mint-200 grid place-items-center overflow-hidden p-1.5"
        style={{ minHeight: 88 }}
      >
        <svg
          width={pack.w * CELL}
          height={pack.h * CELL}
          viewBox={`0 0 ${pack.w * CELL} ${pack.h * CELL}`}
        >
          {/* Faint grid */}
          {Array.from({ length: pack.w }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * CELL}
              y1={0}
              x2={i * CELL}
              y2={pack.h * CELL}
              stroke="#cdebd2"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: pack.h }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * CELL}
              x2={pack.w * CELL}
              y2={i * CELL}
              stroke="#cdebd2"
              strokeWidth={0.5}
            />
          ))}
          {pack.items.map((it, i) => {
            const def = ITEMS_BY_KEY[it.itemKey];
            if (!def) return null;
            const color = def.color || '#7ad58c';
            return (
              <g key={i}>
                <rect
                  x={it.x * CELL + 1}
                  y={it.y * CELL + 1}
                  width={def.w * CELL - 2}
                  height={def.h * CELL - 2}
                  rx={3}
                  fill={color}
                  fillOpacity={0.85}
                  stroke="#1f3a1f"
                  strokeOpacity={0.35}
                  strokeWidth={0.8}
                />
                {def.w >= 1 && def.h >= 1 && (
                  <text
                    x={it.x * CELL + (def.w * CELL) / 2}
                    y={it.y * CELL + (def.h * CELL) / 2 + 3}
                    fontSize={Math.min(def.w, def.h) * CELL * 0.55}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    {def.emoji}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 text-[11px] text-mint-700 font-bold opacity-0 group-hover:opacity-100 transition">
        {t('scenes.placeHint')}
      </div>
    </button>
  );
}
