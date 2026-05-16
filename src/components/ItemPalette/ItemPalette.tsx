import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ITEMS, ITEM_CATEGORIES } from '../../data/items';
import { useCanvasStore } from '../../stores/canvasStore';
import type { ItemDef } from '../../types';

export default function ItemPalette() {
  const [activeCat, setActiveCat] = useState<ItemDef['category']>('building');
  const [query, setQuery] = useState('');
  const selectedItemKey = useCanvasStore((s) => s.selectedItemKey);
  const setSelectedItemKey = useCanvasStore((s) => s.setSelectedItemKey);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter((it) => {
      if (!q && it.category !== activeCat) return false;
      if (q) {
        const matchName = it.name.toLowerCase().includes(q) || it.nameEn?.toLowerCase().includes(q);
        if (!matchName) return false;
      }
      return true;
    });
  }, [query, activeCat]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-leaf-100">
        <h3 className="font-bold text-leaf-800 mb-2">物品库</h3>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-leaf-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索物品..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-leaf-100 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-300 bg-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-leaf-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!query && (
        <div className="px-3 pt-2 flex flex-wrap gap-1 border-b border-leaf-100 pb-2">
          {ITEM_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeCat === cat.key
                  ? 'bg-leaf-500 text-white'
                  : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center text-sm text-leaf-600 py-12">没有找到匹配的物品</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((it) => (
              <button
                key={it.key}
                onClick={() => setSelectedItemKey(selectedItemKey === it.key ? undefined : it.key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition text-left ${
                  selectedItemKey === it.key
                    ? 'border-leaf-500 bg-leaf-50 ring-2 ring-leaf-200'
                    : 'border-leaf-100 hover:bg-leaf-50/60 bg-white'
                }`}
                title={`${it.name} · ${it.w}×${it.h}`}
              >
                <div
                  className="w-10 h-10 rounded-lg grid place-items-center text-2xl shadow-soft"
                  style={{ background: it.color }}
                >
                  <span>{it.emoji ?? '⬜'}</span>
                </div>
                <div className="text-[11px] font-semibold text-leaf-800 leading-tight text-center line-clamp-1">
                  {it.name}
                </div>
                <div className="text-[10px] text-leaf-600">
                  {it.w}×{it.h}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-leaf-100 text-[11px] text-leaf-600 leading-snug">
        提示：点击物品后到画布上点击放置。再次点击物品取消。
      </div>
    </div>
  );
}
