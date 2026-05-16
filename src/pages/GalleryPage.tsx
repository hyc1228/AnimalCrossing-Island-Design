import { lazy, Suspense, useMemo, useState } from 'react';
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

// The 3D cover pulls react-three-fiber / three into this route. Lazy so the
// gallery's initial bundle stays small; the cover renders inside a Suspense
// boundary on each card.
const TemplateCover3D = lazy(() => import('../components/Preview3D/TemplateCover3D'));

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
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between flex-wrap gap-3 relative z-20">
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

// Per-style ribbon color for the corner badge on the 3D cover.
const STYLE_RIBBON: Record<TemplateDef['style'], string> = {
  japanese: '#c25271',
  garden: '#7a9a3a',
  fairy: '#8b6cd9',
  cafe: '#b45e3f',
  modern: '#4476cf',
};

function TemplateCard({ tpl, onApply }: { tpl: TemplateDef; onApply: () => void }) {
  const { t } = useTranslation();
  const styleDef = STYLES.find((s) => s.id === tpl.style);
  const ribbon = STYLE_RIBBON[tpl.style];

  return (
    <AICard className="overflow-hidden flex flex-col !p-0 hover:-translate-y-1 transition-transform">
      {/* 3D cover — live three.js render of the template's actual layout. */}
      <div className="relative aspect-[4/3]">
        <Suspense
          fallback={
            <div
              className="absolute inset-0 grid place-items-center text-xs text-leaf-600 font-bold"
              style={{
                background: 'linear-gradient(135deg, #cfeaff 0%, #bfe4ff 100%)',
              }}
            >
              <span className="opacity-60">{t('gallery.loading3D')}</span>
            </div>
          }
        >
          <TemplateCover3D design={tpl.design} className="absolute inset-0 w-full h-full" />
        </Suspense>

        {/* Style ribbon */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold text-white flex items-center gap-1 pointer-events-none"
          style={{ background: ribbon, boxShadow: '0 2px 0 0 rgba(0,0,0,0.18)' }}
        >
          <span>{styleDef?.emoji}</span>
          <span>{styleName(tpl.style, t)}</span>
        </div>

        {/* Item count chip */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-leaf-800 bg-white/85 backdrop-blur-sm pointer-events-none"
          style={{ boxShadow: '0 2px 0 0 rgba(0,0,0,0.08)' }}
        >
          {t('gallery.itemCount', { count: tpl.design.items.length })}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-extrabold text-leaf-800 text-base leading-tight">
          {templateName(tpl.id, tpl.name, t)}
        </h3>
        <p className="text-sm text-leaf-700/85 flex-1 leading-relaxed">
          {templateDesc(tpl.id, tpl.description, t)}
        </p>
        <div className="flex items-center justify-end mt-1">
          <AIButton type="primary" size="small" onClick={onApply} icon={<Wand2 size={14} />}>
            {t('gallery.apply')}
          </AIButton>
        </div>
      </div>
    </AICard>
  );
}
