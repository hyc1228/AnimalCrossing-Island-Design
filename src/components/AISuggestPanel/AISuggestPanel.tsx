import { useState } from 'react';
import { Sparkles, RefreshCcw, Check, X } from 'lucide-react';
import { STYLES } from '../../ai/styles';
import type { StyleId, GenerateOptions } from '../../ai/types';
import { generateLayout } from '../../ai/generator';
import { useCanvasStore } from '../../stores/canvasStore';
import type { PlacedItem } from '../../types';

export default function AISuggestPanel() {
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
    if (preview.terrain) {
      setTerrain(preview.terrain);
    }
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
      <div className="p-3 border-b border-leaf-100">
        <h3 className="font-bold text-leaf-800 flex items-center gap-2">
          <Sparkles size={16} className="text-leaf-500" /> AI 智能建议
        </h3>
        <p className="text-xs text-leaf-600 mt-0.5">选个风格让 AI 给你出方案</p>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto no-scrollbar flex-1">
        <div>
          <label className="text-xs font-semibold text-leaf-700">风格</label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className={`p-2 rounded-lg border text-left transition ${
                  styleId === s.id
                    ? 'border-leaf-500 bg-leaf-50'
                    : 'border-leaf-100 hover:bg-leaf-50/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-sm font-semibold text-leaf-800">{s.name}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-leaf-600 mt-1">{STYLES.find((s) => s.id === styleId)?.description}</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-leaf-700">密度</label>
          <div className="flex gap-1.5 mt-1">
            {(['sparse', 'medium', 'dense'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  density === d ? 'bg-leaf-500 text-white' : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
                }`}
              >
                {d === 'sparse' ? '稀疏' : d === 'medium' ? '适中' : '密集'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-leaf-700">范围</label>
          <div className="flex gap-1.5 mt-1">
            <button
              onClick={() => setScope('full')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                scope === 'full' ? 'bg-leaf-500 text-white' : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
              }`}
            >
              整岛
            </button>
            <button
              onClick={() => setScope('area')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                scope === 'area' ? 'bg-leaf-500 text-white' : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
              }`}
            >
              指定区域
            </button>
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

        <button onClick={() => handleGenerate()} className="btn-primary w-full">
          <Sparkles size={16} /> 生成方案
        </button>

        {preview && (
          <div className="card p-3 space-y-2 border border-leaf-300/50">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-leaf-800">预览方案</div>
              <span className="chip bg-leaf-100 text-leaf-700">
                {preview.items.length} 个新物品
              </span>
            </div>
            <p className="text-[11px] text-leaf-600">
              方案已生成但尚未应用，可以重新生成变体，或全量/部分接受。
            </p>
            <div className="flex flex-col gap-1.5">
              <button onClick={handleAcceptAll} className="btn-primary text-xs">
                <Check size={14} /> 全部接受
              </button>
              <div className="flex gap-1.5">
                <button onClick={() => handleAcceptPartial(0.5)} className="btn-secondary text-xs flex-1">
                  接受 50%
                </button>
                <button onClick={() => handleAcceptPartial(0.25)} className="btn-secondary text-xs flex-1">
                  接受 25%
                </button>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleRegenerate} className="btn-secondary text-xs flex-1">
                  <RefreshCcw size={14} /> 换一个
                </button>
                <button onClick={handleDiscard} className="btn-ghost text-xs flex-1 text-red-600">
                  <X size={14} /> 放弃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-leaf-100 text-[11px] text-leaf-600 leading-snug">
        当前为规则式生成（MVP）。后续可接入 GPT/Claude API 生成更灵活的方案。
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
      <span className="text-leaf-600 w-5">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="flex-1 min-w-0 px-2 py-1 rounded border border-leaf-100 text-leaf-800 focus:outline-none focus:ring-1 focus:ring-leaf-400"
      />
    </label>
  );
}
