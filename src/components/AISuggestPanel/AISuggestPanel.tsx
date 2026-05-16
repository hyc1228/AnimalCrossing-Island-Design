import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, RefreshCcw, Check, X } from 'lucide-react';
import { STYLES } from '../../ai/styles';
import type { StyleId, GenerateOptions } from '../../ai/types';
import { generateLayout } from '../../ai/generator';
import { useCanvasStore } from '../../stores/canvasStore';
import type { PlacedItem } from '../../types';
import { styleDesc, styleName } from '../../i18n/helpers';

export default function AISuggestPanel() {
  const { t } = useTranslation();
  const [styleId, setStyleId] = useState<StyleId>('japanese');
  const [density, setDensity] = useState<'sparse' | 'medium' | 'dense'>('medium');
  const [scope, setScope] = useState<'full' | 'area'>('full');
  const [areaX0, setAreaX0] = useState(10);
  const [areaY0, setAreaY0] = useState(10);
  const [areaX1, setAreaX1] = useState(50);
  const [areaY1, setAreaY1] = useState(40);
  const [preview, setPreview] = useState<{ items: PlacedItem[]; terrain?: number[][] } | null>(null);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 999999));

  const design = useCanvasStore((s) => s.design);
  const appendItems = useCanvasStore((s) => s.appendItems);
  const setTerrain = useCanvasStore((s) => s.setTerrain);

  const handleGenerate = (newSeed?: number) => {
    const usedSeed = newSeed ?? seed;
    const opts: GenerateOptions = {
      styleId,
      density,
      seed: usedSeed,
      area:
        scope === 'area'
          ? { x0: areaX0, y0: areaY0, x1: areaX1, y1: areaY1 }
          : undefined,
    };
    const result = generateLayout(opts, design.items, design.terrain);
    setPreview(result);
  };

  const handleRegenerate = () => {
    const ns = Math.floor(Math.random() * 999999);
    setSeed(ns);
    handleGenerate(ns);
  };

  const handleAcceptAll = () => {
    if (!preview) return;
    if (preview.terrain) setTerrain(preview.terrain);
    appendItems(preview.items);
    setPreview(null);
  };

  const handleAcceptPartial = (fraction: number) => {
    if (!preview) return;
    const take = Math.max(1, Math.floor(preview.items.length * fraction));
    const subset = preview.items.slice(0, take);
    appendItems(subset);
    setPreview({ ...preview, items: preview.items.slice(take) });
  };

  const handleDiscard = () => setPreview(null);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b-2 border-cream-200">
        <h3 className="font-extrabold text-leaf-800 flex items-center gap-2">
          <Sparkles size={16} className="text-mint-500" /> {t('ai.title')}
        </h3>
        <p className="text-xs text-leaf-600 mt-0.5">{t('ai.subtitle')}</p>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto no-scrollbar flex-1">
        <div>
          <label className="text-xs font-bold text-leaf-700">{t('ai.style')}</label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {STYLES.map((s) => {
              const active = styleId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  className={`p-2 rounded-2xl border-2 text-left transition ${
                    active
                      ? 'border-mint-500 bg-mint-50'
                      : 'border-cream-200 hover:border-mint-300 bg-white hover:bg-cream-50'
                  }`}
                  style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : { boxShadow: '0 2px 0 0 #e0d8c0' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{s.emoji}</span>
                    <span className="text-sm font-bold text-leaf-800">{styleName(s.id, t)}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-leaf-600 mt-1.5">{styleDesc(styleId, t)}</p>
        </div>

        <div>
          <label className="text-xs font-bold text-leaf-700">{t('ai.density')}</label>
          <div className="flex gap-1.5 mt-1.5">
            {(['sparse', 'medium', 'dense'] as const).map((d) => {
              const active = density === d;
              return (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${
                    active ? 'bg-mint-500 text-white' : 'bg-cream-100 text-leaf-700 hover:bg-mint-500/15'
                  }`}
                  style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
                >
                  {d === 'sparse'
                    ? t('ai.densitySparse')
                    : d === 'medium'
                      ? t('ai.densityMedium')
                      : t('ai.densityDense')}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-leaf-700">{t('ai.scope')}</label>
          <div className="flex gap-1.5 mt-1.5">
            {(['full', 'area'] as const).map((s) => {
              const active = scope === s;
              return (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${
                    active ? 'bg-mint-500 text-white' : 'bg-cream-100 text-leaf-700 hover:bg-mint-500/15'
                  }`}
                  style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
                >
                  {s === 'full' ? t('ai.scopeFull') : t('ai.scopeArea')}
                </button>
              );
            })}
          </div>
          {scope === 'area' && (
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <NumberInput label="X0" value={areaX0} onChange={setAreaX0} />
              <NumberInput label="Y0" value={areaY0} onChange={setAreaY0} />
              <NumberInput label="X1" value={areaX1} onChange={setAreaX1} />
              <NumberInput label="Y1" value={areaY1} onChange={setAreaY1} />
            </div>
          )}
        </div>

        <button onClick={() => handleGenerate()} className="btn-mint w-full">
          <Sparkles size={16} /> {t('ai.generate')}
        </button>

        {preview && (
          <div className="card p-3 space-y-2 border-2 border-mint-300">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-leaf-800">{t('ai.previewTitle')}</div>
              <span className="chip-mint">
                {t('ai.previewCount', { count: preview.items.length })}
              </span>
            </div>
            <p className="text-[11px] text-leaf-600">{t('ai.previewHint')}</p>
            <div className="flex flex-col gap-1.5">
              <button onClick={handleAcceptAll} className="btn-sun text-xs">
                <Check size={14} /> {t('ai.acceptAll')}
              </button>
              <div className="flex gap-1.5">
                <button onClick={() => handleAcceptPartial(0.5)} className="btn-secondary text-xs flex-1">
                  {t('ai.acceptHalf')}
                </button>
                <button onClick={() => handleAcceptPartial(0.25)} className="btn-secondary text-xs flex-1">
                  {t('ai.acceptQuarter')}
                </button>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleRegenerate} className="btn-secondary text-xs flex-1">
                  <RefreshCcw size={14} /> {t('ai.regenerate')}
                </button>
                <button onClick={handleDiscard} className="btn-ghost text-xs flex-1 text-red-600">
                  <X size={14} /> {t('ai.discard')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t-2 border-cream-200 text-[11px] text-leaf-600 leading-snug bg-cream-50/50">
        {t('ai.footer')}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-leaf-600 w-5 font-bold">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="input flex-1 min-w-0 px-2.5 py-1 text-xs"
        style={{ borderWidth: 2, boxShadow: '0 2px 0 0 #d4c9b4' }}
      />
    </label>
  );
}
