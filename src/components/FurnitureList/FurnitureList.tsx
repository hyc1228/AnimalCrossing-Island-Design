import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Coins } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';
import { ITEM_CATEGORIES } from '../../data/items';
import { resolveItemDef } from '../../data/itemResolver';
import { itemName, itemSource } from '../../i18n/helpers';

interface AggregatedItem {
  key: string;
  name: string;
  emoji?: string;
  category: string;
  count: number;
  unitPrice: number;
  totalPrice: number;
  source: string;
}

export default function FurnitureList() {
  const { t } = useTranslation();
  const items = useCanvasStore((s) => s.design.items);
  const designName = useCanvasStore((s) => s.design.name);

  const aggregated = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>();
    items.forEach((it) => {
      const def = resolveItemDef(it.itemKey);
      if (!def) return;
      const existing = map.get(it.itemKey);
      const price = def.price ?? 0;
      const source = itemSource(def, t);
      if (existing) {
        existing.count += 1;
        existing.totalPrice += price;
      } else {
        map.set(it.itemKey, {
          key: it.itemKey,
          name: itemName(def, t),
          emoji: def.emoji,
          category: def.category,
          count: 1,
          unitPrice: price,
          totalPrice: price,
          source,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [items, t]);

  const grandTotal = aggregated.reduce((s, a) => s + a.totalPrice, 0);
  const totalItems = aggregated.reduce((s, a) => s + a.count, 0);

  const handleExportText = () => {
    const lines = [
      `# ${t('shopping.exportTitle', { name: designName })}`,
      `# ${t('shopping.exportHead', { count: totalItems, gold: grandTotal.toLocaleString() })}`,
      '',
      ...ITEM_CATEGORIES.flatMap((cat) => {
        const inCat = aggregated.filter((a) => a.category === cat.key);
        if (inCat.length === 0) return [];
        return [
          `## ${t(`palette.categories.${cat.key}`)}`,
          ...inCat.map((a) => `- ${a.name} × ${a.count}  (${a.source}${a.unitPrice ? `, ${a.unitPrice}` : ''})`),
          '',
        ];
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${designName}-${t('shopping.title')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b-2 border-cream-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-extrabold text-leaf-800">{t('shopping.title')}</h3>
          <p className="text-xs text-leaf-600">
            {t('shopping.subtitle', { count: totalItems, kinds: aggregated.length })}
          </p>
        </div>
        <button onClick={handleExportText} className="btn-secondary text-xs shrink-0" disabled={items.length === 0}>
          <Download size={14} /> {t('common.export')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {aggregated.length === 0 ? (
          <div className="p-8 text-center text-sm text-leaf-600 whitespace-pre-line">
            {t('shopping.empty')}
          </div>
        ) : (
          ITEM_CATEGORIES.map((cat) => {
            const inCat = aggregated.filter((a) => a.category === cat.key);
            if (inCat.length === 0) return null;
            return (
              <div key={cat.key} className="border-b-2 border-cream-200/70">
                <div className="px-3 py-2 bg-cream-100 text-xs font-extrabold text-leaf-700 tracking-wide uppercase">
                  {t(`palette.categories.${cat.key}`)}
                </div>
                {inCat.map((a) => (
                  <div key={a.key} className="px-3 py-2 flex items-center gap-2 text-sm hover:bg-cream-50">
                    <div className="w-9 h-9 grid place-items-center bg-cream-100 rounded-xl text-lg border-2 border-cream-200">
                      {a.emoji ?? '⬜'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-leaf-800 truncate">{a.name}</div>
                      <div className="text-[11px] text-leaf-600">{a.source}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-leaf-800">× {a.count}</div>
                      {a.totalPrice > 0 && (
                        <div className="text-[11px] text-sand-700 font-semibold">{a.totalPrice.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {grandTotal > 0 && (
        <div className="p-3 border-t-2 border-cream-200 flex items-center justify-between bg-sun-500/10">
          <span className="text-sm font-bold text-leaf-800 flex items-center gap-1.5">
            <Coins size={16} className="text-sand-600" /> {t('shopping.totalGold')}
          </span>
          <span className="text-lg font-extrabold text-sand-700">{grandTotal.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
