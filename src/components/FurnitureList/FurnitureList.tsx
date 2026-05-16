import { useMemo } from 'react';
import { Download, Coins } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';
import { ITEMS_BY_KEY, ITEM_CATEGORIES } from '../../data/items';

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
  const items = useCanvasStore((s) => s.design.items);
  const designName = useCanvasStore((s) => s.design.name);

  const aggregated = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>();
    items.forEach((it) => {
      const def = ITEMS_BY_KEY[it.itemKey];
      if (!def) return;
      const existing = map.get(it.itemKey);
      const price = def.price ?? (def.diy ? 0 : 0);
      const source = def.diy ? 'DIY 配方' : def.source ?? '商店';
      if (existing) {
        existing.count += 1;
        existing.totalPrice += price;
      } else {
        map.set(it.itemKey, {
          key: it.itemKey,
          name: def.name,
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
  }, [items]);

  const grandTotal = aggregated.reduce((s, a) => s + a.totalPrice, 0);
  const totalItems = aggregated.reduce((s, a) => s + a.count, 0);

  const handleExportText = () => {
    const lines = [
      `# ${designName} - 物品清单`,
      `# 共 ${totalItems} 件物品，估算金币 ${grandTotal.toLocaleString()}`,
      '',
      ...ITEM_CATEGORIES.flatMap((cat) => {
        const inCat = aggregated.filter((a) => a.category === cat.key);
        if (inCat.length === 0) return [];
        return [
          `## ${cat.label}`,
          ...inCat.map((a) => `- ${a.name} × ${a.count}  (${a.source}${a.unitPrice ? `, 单价 ${a.unitPrice}` : ''})`),
          '',
        ];
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${designName}-物品清单.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-leaf-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-leaf-800">物品清单</h3>
          <p className="text-xs text-leaf-600">{totalItems} 件 · 共 {aggregated.length} 类</p>
        </div>
        <button onClick={handleExportText} className="btn-secondary text-xs" disabled={items.length === 0}>
          <Download size={14} /> 导出
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {aggregated.length === 0 ? (
          <div className="p-8 text-center text-sm text-leaf-600">
            画布上还没有物品。
            <br />
            到左侧物品库选一个开始吧～
          </div>
        ) : (
          ITEM_CATEGORIES.map((cat) => {
            const inCat = aggregated.filter((a) => a.category === cat.key);
            if (inCat.length === 0) return null;
            return (
              <div key={cat.key} className="border-b border-leaf-100">
                <div className="px-3 py-2 bg-leaf-50/60 text-xs font-bold text-leaf-700">{cat.label}</div>
                {inCat.map((a) => (
                  <div key={a.key} className="px-3 py-2 flex items-center gap-2 text-sm hover:bg-leaf-50/40">
                    <div className="w-8 h-8 grid place-items-center bg-leaf-50 rounded-lg text-lg">
                      {a.emoji ?? '⬜'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-leaf-800 truncate">{a.name}</div>
                      <div className="text-[11px] text-leaf-600">{a.source}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-leaf-800">× {a.count}</div>
                      {a.totalPrice > 0 && (
                        <div className="text-[11px] text-leaf-600">
                          {a.totalPrice.toLocaleString()} 金
                        </div>
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
        <div className="p-3 border-t border-leaf-100 flex items-center justify-between bg-leaf-50/40">
          <span className="text-sm font-semibold text-leaf-800 flex items-center gap-1">
            <Coins size={14} className="text-sand-500" /> 预估总金币
          </span>
          <span className="text-lg font-extrabold text-sand-700">{grandTotal.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
