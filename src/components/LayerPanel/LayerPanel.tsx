import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { LAYER_ORDER } from '../../types';
import { useCanvasStore } from '../../stores/canvasStore';

export default function LayerPanel() {
  const { t } = useTranslation();
  const layerVisibility = useCanvasStore((s) => s.layerVisibility);
  const toggleVisible = useCanvasStore((s) => s.toggleLayerVisible);
  const toggleLocked = useCanvasStore((s) => s.toggleLayerLocked);
  const activeLayer = useCanvasStore((s) => s.activeLayer);
  const setActiveLayer = useCanvasStore((s) => s.setActiveLayer);
  const items = useCanvasStore((s) => s.design.items);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b-2 border-cream-200">
        <h3 className="font-extrabold text-leaf-800">{t('layers.title')}</h3>
        <p className="text-xs text-leaf-600 mt-0.5">{t('layers.subtitle')}</p>
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        {LAYER_ORDER.slice().reverse().map((layer) => {
          const state = layerVisibility[layer];
          const active = activeLayer === layer;
          const count = layer === 'terrain' ? null : items.filter((i) => i.layer === layer).length;
          return (
            <div
              key={layer}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border-2 transition cursor-pointer ${
                active
                  ? 'border-mint-500 bg-mint-50'
                  : 'border-cream-200 hover:bg-cream-50'
              }`}
              style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
              onClick={() => setActiveLayer(layer)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisible(layer);
                }}
                className="text-leaf-700 hover:text-leaf-900"
                title={state.visible ? t('layers.hide') : t('layers.show')}
              >
                {state.visible ? <Eye size={16} /> : <EyeOff size={16} className="text-leaf-400" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLocked(layer);
                }}
                className="text-leaf-700 hover:text-leaf-900"
                title={state.locked ? t('layers.unlock') : t('layers.lock')}
              >
                {state.locked ? <Lock size={14} /> : <Unlock size={14} className="text-leaf-400" />}
              </button>
              <span className="flex-1 font-bold text-sm text-leaf-800">
                {t(`layers.names.${layer}`)}
              </span>
              {count !== null && (
                <span className="text-xs font-bold text-leaf-600 bg-cream-100 px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-3 border-t-2 border-cream-200 text-[11px] text-leaf-600 leading-snug bg-cream-50/50">
        {t('layers.hint')}
      </div>
    </div>
  );
}
