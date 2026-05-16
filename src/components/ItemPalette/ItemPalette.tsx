import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Sparkles, Star } from 'lucide-react';
import { ITEMS, ITEM_CATEGORIES } from '../../data/items';
import { NH_FURNITURE, type NHFurnitureEntry } from '../../data/nh-furniture';
import { useCanvasStore } from '../../stores/canvasStore';
import type { ItemDef } from '../../types';
import { itemName } from '../../i18n/helpers';
import { nhKeyFor } from '../../data/itemResolver';

type PaletteMode = 'curated' | 'nh';

// Visible rows we render around the scroll viewport — enough to fully cover a
// typical 600px tall panel without paying for 2000 mounted DOM nodes.
const ROW_HEIGHT = 92; // px per palette tile (button + gap)
const ROW_BUFFER = 4; // overscan above/below

export default function ItemPalette() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PaletteMode>('curated');
  const [activeCat, setActiveCat] = useState<ItemDef['category']>('building');
  const [query, setQuery] = useState('');
  const selectedItemKey = useCanvasStore((s) => s.selectedItemKey);
  const setSelectedItemKey = useCanvasStore((s) => s.setSelectedItemKey);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b-2 border-cream-200">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="font-extrabold text-leaf-800 text-base">{t('palette.title')}</h3>
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-cream-100">
            <ModeToggle
              label={t('palette.modeCurated')}
              icon={<Star size={12} />}
              active={mode === 'curated'}
              onClick={() => {
                setMode('curated');
                setQuery('');
              }}
            />
            <ModeToggle
              label={t('palette.modeNh', { count: NH_FURNITURE.length })}
              icon={<Sparkles size={12} />}
              active={mode === 'nh'}
              onClick={() => {
                setMode('nh');
                setQuery('');
              }}
            />
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500 z-10" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'nh' ? t('palette.searchNh') : t('palette.search')}
            className="input pl-9 pr-8 py-1.5 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-leaf-500 z-10"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {mode === 'curated' ? (
        <CuratedView
          activeCat={activeCat}
          setActiveCat={setActiveCat}
          query={query}
          selectedKey={selectedItemKey}
          onSelect={(k) => setSelectedItemKey(selectedItemKey === k ? undefined : k)}
        />
      ) : (
        <NhView
          query={query}
          selectedKey={selectedItemKey}
          onSelect={(k) => setSelectedItemKey(selectedItemKey === k ? undefined : k)}
        />
      )}

      <div className="p-3 border-t-2 border-cream-200 text-[11px] text-leaf-600 leading-snug bg-cream-50/50">
        {mode === 'nh' ? t('palette.hintNh') : t('palette.hint')}
      </div>
    </div>
  );
}

function ModeToggle({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
        active ? 'bg-mint-500 text-white' : 'text-leaf-700 hover:text-mint-600'
      }`}
      style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Curated mode (original 60 items)                                           */
/* -------------------------------------------------------------------------- */

function CuratedView({
  activeCat,
  setActiveCat,
  query,
  selectedKey,
  onSelect,
}: {
  activeCat: ItemDef['category'];
  setActiveCat: (c: ItemDef['category']) => void;
  query: string;
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter((it) => {
      if (!q && it.category !== activeCat) return false;
      if (q) {
        const localized = itemName(it, t).toLowerCase();
        const matchName =
          it.name.toLowerCase().includes(q) ||
          localized.includes(q) ||
          it.nameEn?.toLowerCase().includes(q) ||
          it.key.toLowerCase().includes(q);
        if (!matchName) return false;
      }
      return true;
    });
  }, [query, activeCat, t]);

  return (
    <>
      {!query && (
        <div className="px-3 pt-2.5 flex flex-wrap gap-1.5 border-b-2 border-cream-200 pb-2.5">
          {ITEM_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                activeCat === cat.key
                  ? 'bg-mint-500 text-white'
                  : 'bg-cream-100 text-leaf-700 hover:bg-mint-500/15'
              }`}
              style={activeCat === cat.key ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
            >
              {t(`palette.categories.${cat.key}`)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center text-sm text-leaf-600 py-12">{t('palette.empty')}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((it) => {
              const name = itemName(it, t);
              const active = selectedKey === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => onSelect(it.key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition text-left ${
                    active
                      ? 'border-mint-500 bg-mint-50'
                      : 'border-cream-200 hover:border-mint-300 hover:bg-cream-50 bg-white'
                  }`}
                  style={active ? { boxShadow: '0 3px 0 0 #11a89b' } : { boxShadow: '0 2px 0 0 #e0d8c0' }}
                  title={`${name} · ${it.w}×${it.h}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center text-2xl border-2 border-black/5"
                    style={{ background: it.color }}
                  >
                    <span>{it.emoji ?? '⬜'}</span>
                  </div>
                  <div className="text-[11px] font-bold text-leaf-800 leading-tight text-center line-clamp-1">
                    {name}
                  </div>
                  <div className="text-[10px] text-leaf-600">
                    {it.w}×{it.h}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* NH 2075-item mode with virtualized list                                    */
/* -------------------------------------------------------------------------- */

const NH_THEMES = ['All', 'Cute', 'Cool', 'Elegant', 'Modern', 'Music', 'Party', 'Civic', 'Asian', 'Outdoorsy'] as const;
type NhTheme = (typeof NH_THEMES)[number];

function NhView({
  query,
  selectedKey,
  onSelect,
}: {
  query: string;
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<NhTheme>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NH_FURNITURE.filter((it) => {
      if (q) {
        return (
          it.name.toLowerCase().includes(q) ||
          (it.hhaThemes.some((tm) => tm.toLowerCase().includes(q)))
        );
      }
      if (theme === 'All') return true;
      return it.hhaThemes.some((tm) => tm.toLowerCase() === theme.toLowerCase());
    });
  }, [query, theme]);

  return (
    <>
      {!query && (
        <div className="px-3 pt-2.5 flex flex-wrap gap-1.5 border-b-2 border-cream-200 pb-2.5">
          {NH_THEMES.map((tm) => (
            <button
              key={tm}
              onClick={() => setTheme(tm)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                theme === tm
                  ? 'bg-mint-500 text-white'
                  : 'bg-cream-100 text-leaf-700 hover:bg-mint-500/15'
              }`}
              style={theme === tm ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
            >
              {t(`palette.nhThemes.${tm.toLowerCase()}`, { defaultValue: tm })}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 py-1.5 text-[11px] text-leaf-600 font-semibold border-b-2 border-cream-200 bg-cream-50/40">
        {t('palette.nhCount', { shown: filtered.length, total: NH_FURNITURE.length })}
      </div>

      <NhVirtualList items={filtered} selectedKey={selectedKey} onSelect={onSelect} />
    </>
  );
}

function NhVirtualList({
  items,
  selectedKey,
  onSelect,
}: {
  items: NHFurnitureEntry[];
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight || 600);
    measure();
    // Resize the viewport in response to layout changes.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset scroll when the underlying list changes so users always start at top.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
  }, [items]);

  // Two columns per row.
  const colsPerRow = 2;
  const rowCount = Math.ceil(items.length / colsPerRow);
  const totalH = rowCount * ROW_HEIGHT;
  const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - ROW_BUFFER);
  const lastRow = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + ROW_BUFFER,
  );

  if (items.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar text-center text-sm text-leaf-600 py-12">
        {t('palette.empty')}
      </div>
    );
  }

  const visibleRows: number[] = [];
  for (let r = firstRow; r <= lastRow; r++) visibleRows.push(r);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto no-scrollbar"
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: totalH, position: 'relative' }}>
        {visibleRows.map((r) => (
          <div
            key={r}
            style={{
              position: 'absolute',
              top: r * ROW_HEIGHT,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              padding: '4px 8px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            {[0, 1].map((c) => {
              const idx = r * colsPerRow + c;
              const it = items[idx];
              if (!it) return <div key={c} />;
              const key = nhKeyFor(it.wikiSlug);
              const active = selectedKey === key;
              const w = Math.max(1, Math.ceil(it.size.w));
              const h = Math.max(1, Math.ceil(it.size.h));
              return (
                <button
                  key={c}
                  onClick={() => onSelect(key)}
                  className={`flex items-center gap-2 p-1.5 rounded-2xl border-2 transition text-left ${
                    active
                      ? 'border-mint-500 bg-mint-50'
                      : 'border-cream-200 hover:border-mint-300 hover:bg-cream-50 bg-white'
                  }`}
                  style={active ? { boxShadow: '0 3px 0 0 #11a89b' } : { boxShadow: '0 2px 0 0 #e0d8c0' }}
                  title={`${it.name} · ${w}×${h}`}
                >
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-cream-100 grid place-items-center border-2 border-cream-200 overflow-hidden">
                    <img
                      src={it.image}
                      alt={it.name}
                      loading="lazy"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-leaf-800 leading-tight line-clamp-2">
                      {it.name}
                    </div>
                    <div className="text-[10px] text-leaf-600 mt-0.5 flex items-center gap-1.5">
                      <span>
                        {w}×{h}
                      </span>
                      {it.buy != null && (
                        <span className="text-sun-700 font-bold">{it.buy}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
