import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Wand2 } from 'lucide-react';
import { getTemplates } from '../data/templates';
import { createDesign } from '../utils/grid';
import { saveDesign, setCurrentDesignId } from '../utils/storage';
import type { TemplateDef } from '../types';
import { STYLES } from '../ai/styles';

export default function GalleryPage() {
  const navigate = useNavigate();
  const [filterStyle, setFilterStyle] = useState<TemplateDef['style'] | 'all'>('all');

  const templates = useMemo(() => getTemplates(), []);
  const filtered = templates.filter((t) => filterStyle === 'all' || t.style === filterStyle);

  const applyTemplate = (tpl: TemplateDef) => {
    const d = createDesign(tpl.name);
    d.items = tpl.design.items.map((i) => ({ ...i }));
    d.terrain = tpl.design.terrain.map((r) => r.slice());
    saveDesign(d);
    setCurrentDesignId(d.id);
    navigate(`/editor/${d.id}`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="btn-ghost">
          <ChevronLeft size={16} /> 首页
        </Link>
        <h1 className="text-xl font-extrabold text-leaf-800">模板库</h1>
        <div className="w-16" />
      </header>

      <main className="px-6 lg:px-12 pb-12 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-leaf-900">挑一个起点</h2>
          <p className="mt-2 text-leaf-700/80">每个模板都是完整的方案，套用后可在编辑器中自由调整。</p>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          <FilterChip active={filterStyle === 'all'} onClick={() => setFilterStyle('all')}>
            全部风格
          </FilterChip>
          {STYLES.map((s) => (
            <FilterChip
              key={s.id}
              active={filterStyle === s.id}
              onClick={() => setFilterStyle(s.id)}
            >
              {s.emoji} {s.name}
            </FilterChip>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tpl) => (
            <TemplateCard key={tpl.id} tpl={tpl} onApply={() => applyTemplate(tpl)} />
          ))}
        </div>
      </main>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
        active ? 'bg-leaf-500 text-white shadow-soft' : 'bg-white text-leaf-700 border border-leaf-100 hover:bg-leaf-50'
      }`}
    >
      {children}
    </button>
  );
}

function TemplateCard({ tpl, onApply }: { tpl: TemplateDef; onApply: () => void }) {
  const styleDef = STYLES.find((s) => s.id === tpl.style);
  return (
    <div className="card overflow-hidden flex flex-col">
      <ThumbnailPreview tpl={tpl} />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{styleDef?.emoji}</span>
          <h3 className="font-bold text-leaf-800">{tpl.name}</h3>
        </div>
        <p className="text-sm text-leaf-700/80 flex-1 leading-relaxed">{tpl.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="chip bg-leaf-50 text-leaf-700">{tpl.design.items.length} 个物品</span>
          <button onClick={onApply} className="btn-primary text-sm">
            <Wand2 size={14} /> 套用到画布
          </button>
        </div>
      </div>
    </div>
  );
}

function ThumbnailPreview({ tpl }: { tpl: TemplateDef }) {
  // Render a tiny preview using svg
  const cols = tpl.design.size.cols;
  const rows = tpl.design.size.rows;
  const W = 320;
  const H = (W * rows) / cols;
  const cellSize = W / cols;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full aspect-[8/7] bg-leaf-200" preserveAspectRatio="none">
      <rect x={0} y={0} width={W} height={H} fill="#8fc662" rx={6} />
      {/* terrain non-grass */}
      {tpl.design.terrain.map((row, y) =>
        row.map((code, x) => {
          if (code === 0) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill={terrainHex(code)}
            />
          );
        }),
      )}
      {/* items */}
      {tpl.design.items.map((it) => (
        <rect
          key={it.id}
          x={it.x * cellSize}
          y={it.y * cellSize}
          width={Math.max(1, it.w * cellSize)}
          height={Math.max(1, it.h * cellSize)}
          fill={itemColor(it.itemKey)}
          opacity={0.95}
        />
      ))}
    </svg>
  );
}

function terrainHex(code: number): string {
  // Mirrors IslandCanvas TERRAIN_COLOR
  const map: Record<number, string> = {
    1: '#f2dba4',
    2: '#76c4e8',
    3: '#7fb060',
    4: '#6fa14a',
    5: '#558636',
    6: '#d5cfc5',
    7: '#c9a26f',
    8: '#c66b45',
    9: '#f0c7df',
  };
  return map[code] ?? '#cccccc';
}

function itemColor(_key: string): string {
  // Fallback - imported items color requires full import, but for thumbnails this gives variety
  // We'll use a deterministic color from the key
  let hash = 0;
  for (let i = 0; i < _key.length; i++) hash = (hash * 31 + _key.charCodeAt(i)) >>> 0;
  const palette = ['#d9a35b', '#b08968', '#e07a5f', '#f4a261', '#3a6a2b', '#2f5a23', '#f7b5c4', '#6b8e23', '#d94c4c', '#f1c40f', '#5b9bd5', '#8b5a2b', '#6d4c41', '#a0744f', '#888888', '#a0522d'];
  return palette[hash % palette.length];
}
