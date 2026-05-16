import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Wand2 } from 'lucide-react';
import { Button as AIButton, Card as AICard, Footer as AIFooter, Divider as AIDivider, Icon as AIIcon } from 'animal-island-ui';
import { getTemplates } from '../data/templates';
import { createDesign } from '../utils/grid';
import { saveDesign, setCurrentDesignId } from '../utils/storage';
import type { TemplateDef } from '../types';
import { STYLES } from '../ai/styles';
import { styleName, templateDesc, templateName } from '../i18n/helpers';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';

export default function GalleryPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filterStyle, setFilterStyle] = useState<TemplateDef['style'] | 'all'>('all');

  const templates = useMemo(() => getTemplates(), []);
  const filtered = templates.filter((tpl) => filterStyle === 'all' || tpl.style === filterStyle);

  const applyTemplate = (tpl: TemplateDef) => {
    const d = createDesign(templateName(tpl.id, tpl.name, t));
    d.items = tpl.design.items.map((i) => ({ ...i }));
    d.terrain = tpl.design.terrain.map((r) => r.slice());
    saveDesign(d);
    setCurrentDesignId(d.id);
    navigate(`/editor/${d.id}`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between flex-wrap gap-3 relative z-10">
        <Link to="/" className="btn-ghost">
          <ChevronLeft size={16} /> {t('common.home')}
        </Link>
        <h1 className="text-xl font-extrabold text-leaf-800 flex items-center gap-2">
          <AIIcon name="icon-map" size={28} /> {t('gallery.title')}
        </h1>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 px-6 lg:px-12 pb-40 max-w-6xl mx-auto w-full relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <AICard type="title" className="!px-7 !py-2 mb-4">
            <span className="text-sm font-bold text-leaf-800">{t('gallery.subtitle')}</span>
          </AICard>
          <p className="text-leaf-700/85 max-w-xl">{t('gallery.subtitleDesc')}</p>
        </div>

        <AIDivider type="wave-yellow" style={{ marginBottom: 24 }} />

        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          <FilterChip active={filterStyle === 'all'} onClick={() => setFilterStyle('all')}>
            {t('gallery.filterAll')}
          </FilterChip>
          {STYLES.map((s) => (
            <FilterChip
              key={s.id}
              active={filterStyle === s.id}
              onClick={() => setFilterStyle(s.id)}
            >
              {s.emoji} {styleName(s.id, t)}
            </FilterChip>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tpl) => (
            <TemplateCard key={tpl.id} tpl={tpl} onApply={() => applyTemplate(tpl)} />
          ))}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-0">
        <AIFooter type="sea" />
      </div>
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
    <AIButton
      size="small"
      type={active ? 'primary' : 'default'}
      onClick={onClick}
    >
      {children}
    </AIButton>
  );
}

function TemplateCard({ tpl, onApply }: { tpl: TemplateDef; onApply: () => void }) {
  const { t } = useTranslation();
  const styleDef = STYLES.find((s) => s.id === tpl.style);
  return (
    <AICard className="overflow-hidden flex flex-col !p-0 hover:-translate-y-1 transition-transform">
      <ThumbnailPreview tpl={tpl} />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{styleDef?.emoji}</span>
          <h3 className="font-bold text-leaf-800">{templateName(tpl.id, tpl.name, t)}</h3>
        </div>
        <p className="text-sm text-leaf-700/85 flex-1 leading-relaxed">{templateDesc(tpl.id, tpl.description, t)}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="chip-mint">
            {t('gallery.itemCount', { count: tpl.design.items.length })}
          </span>
          <AIButton type="primary" size="small" onClick={onApply} icon={<Wand2 size={14} />}>
            {t('gallery.apply')}
          </AIButton>
        </div>
      </div>
    </AICard>
  );
}

function ThumbnailPreview({ tpl }: { tpl: TemplateDef }) {
  const cols = tpl.design.size.cols;
  const rows = tpl.design.size.rows;
  const W = 320;
  const H = (W * rows) / cols;
  const cellSize = W / cols;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full aspect-[8/7] bg-leaf-200" preserveAspectRatio="none">
      <rect x={0} y={0} width={W} height={H} fill="#8fc662" rx={6} />
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
  let hash = 0;
  for (let i = 0; i < _key.length; i++) hash = (hash * 31 + _key.charCodeAt(i)) >>> 0;
  const palette = ['#d9a35b', '#b08968', '#e07a5f', '#f4a261', '#3a6a2b', '#2f5a23', '#f7b5c4', '#6b8e23', '#d94c4c', '#f1c40f', '#5b9bd5', '#8b5a2b', '#6d4c41', '#a0744f', '#888888', '#a0522d'];
  return palette[hash % palette.length];
}
