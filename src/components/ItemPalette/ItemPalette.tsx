import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { ITEMS, ITEM_CATEGORIES } from '../../data/items';
import { useCanvasStore } from '../../stores/canvasStore';
import type { ItemDef } from '../../types';
import { itemName } from '../../i18n/helpers';

export default function ItemPalette() {
  const { t } = useTranslation();
  const [activeCat, setActiveCat] = useState<ItemDef['category']>('building');
  const [query, setQuery] = useState('');
  const selectedItemKey = useCanvasStore((s) => s.selectedItemKey);
  const setSelectedItemKey = useCanvasStore((s) => s.setSelectedItemKey);

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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b-2 border-cream-200">
        <h3 className="font-extrabold text-leaf-800 mb-2 text-base">{t('palette.title')}</h3>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500 z-10" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('palette.search')}
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
              const active = selectedItemKey === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => setSelectedItemKey(active ? undefined : it.key)}
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

      <div className="p-3 border-t-2 border-cream-200 text-[11px] text-leaf-600 leading-snug bg-cream-50/50">
        {t('palette.hint')}
      </div>
    </div>
  );
}
