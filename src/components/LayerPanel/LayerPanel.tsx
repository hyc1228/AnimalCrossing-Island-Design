import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { LAYER_LABEL, LAYER_ORDER } from '../../types';
import { useCanvasStore } from '../../stores/canvasStore';

export default function LayerPanel() {
  const layerVisibility = useCanvasStore((s) => s.layerVisibility);
  const toggleVisible = useCanvasStore((s) => s.toggleLayerVisible);
  const toggleLocked = useCanvasStore((s) => s.toggleLayerLocked);
  const activeLayer = useCanvasStore((s) => s.activeLayer);
  const setActiveLayer = useCanvasStore((s) => s.setActiveLayer);
  const items = useCanvasStore((s) => s.design.items);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-leaf-100">
        <h3 className="font-bold text-leaf-800">图层</h3>
        <p className="text-xs text-leaf-600 mt-0.5">控制每层的显隐与锁定</p>
      </div>
      <div className="p-2 flex flex-col gap-1">
        {LAYER_ORDER.slice().reverse().map((layer) => {
          const state = layerVisibility[layer];
          const count = layer === 'terrain' ? null : items.filter((i) => i.layer === layer).length;
          return (
            <div
              key={layer}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition cursor-pointer ${
                activeLayer === layer
                  ? 'border-leaf-500 bg-leaf-50'
                  : 'border-transparent hover:bg-leaf-50/60'
              }`}
              onClick={() => setActiveLayer(layer)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisible(layer);
                }}
                className="text-leaf-700 hover:text-leaf-900"
                title={state.visible ? '隐藏' : '显示'}
              >
                {state.visible ? <Eye size={16} /> : <EyeOff size={16} className="text-leaf-400" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLocked(layer);
                }}
                className="text-leaf-700 hover:text-leaf-900"
                title={state.locked ? '解锁' : '锁定'}
              >
                {state.locked ? <Lock size={14} /> : <Unlock size={14} className="text-leaf-400" />}
              </button>
              <span className="flex-1 font-semibold text-sm text-leaf-800">{LAYER_LABEL[layer]}</span>
              {count !== null && <span className="text-xs text-leaf-600">{count}</span>}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-3 border-t border-leaf-100 text-[11px] text-leaf-600 leading-snug">
        提示：橙色边框表示当前激活图层。地形图层为最底层，依次向上是道路、建筑、装饰。
      </div>
    </div>
  );
}
