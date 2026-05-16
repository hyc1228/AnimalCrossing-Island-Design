import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Wand2 } from 'lucide-react';
import { Button as AIButton, Card as AICard, Footer as AIFooter, Divider as AIDivider, Icon as AIIcon } from 'animal-island-ui';
import { getTemplates } from '../data/templates';
import { createDesign } from '../utils/grid';
import { saveDesign, setCurrentDesignId } from '../utils/storage';
import { ITEMS_BY_KEY } from '../data/items';
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

// Per-style visual theme for the template card cover.
const STYLE_THEME: Record<
  TemplateDef['style'],
  { gradient: string; ring: string; ribbon: string }
> = {
  japanese: {
    gradient: 'linear-gradient(135deg, #fde2e4 0%, #fef6e4 55%, #d6efff 100%)',
    ring: '#d94c8a',
    ribbon: '#c25271',
  },
  garden: {
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #ecfccb 55%, #d1fae5 100%)',
    ring: '#94c45a',
    ribbon: '#7a9a3a',
  },
  fairy: {
    gradient: 'linear-gradient(135deg, #ede9fe 0%, #fef6e4 55%, #fde2e4 100%)',
    ring: '#a78bfa',
    ribbon: '#8b6cd9',
  },
  cafe: {
    gradient: 'linear-gradient(135deg, #ffedd5 0%, #fff7ed 55%, #ffe4e6 100%)',
    ring: '#d97757',
    ribbon: '#b45e3f',
  },
  modern: {
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #f1f5f9 55%, #ede9fe 100%)',
    ring: '#60a5fa',
    ribbon: '#4476cf',
  },
};

/**
 * Pick a handful of representative item keys for a template by ranking each
 * key by occurrence count, with curated preference: primaryItems from the
 * style palette come first, then accents, then trees / flowers / decoration.
 * Limited to `max` distinct keys.
 */
function pickRepresentativeItems(tpl: TemplateDef, max = 5): string[] {
  const counts = new Map<string, number>();
  for (const it of tpl.design.items) {
    counts.set(it.itemKey, (counts.get(it.itemKey) ?? 0) + 1);
  }
  const styleDef = STYLES.find((s) => s.id === tpl.style);
  const priority = new Set<string>([
    ...(styleDef?.palette.primaryItems ?? []),
    ...(styleDef?.palette.accentItems ?? []),
    ...(styleDef?.palette.trees ?? []),
    ...(styleDef?.palette.flowers ?? []),
  ]);

  const all = Array.from(counts.entries())
    .filter(([key]) => ITEMS_BY_KEY[key])
    .sort((a, b) => {
      const ap = priority.has(a[0]) ? 1 : 0;
      const bp = priority.has(b[0]) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return b[1] - a[1];
    });

  return all.slice(0, max).map(([key]) => key);
}

function TemplateCard({ tpl, onApply }: { tpl: TemplateDef; onApply: () => void }) {
  const { t } = useTranslation();
  const styleDef = STYLES.find((s) => s.id === tpl.style);
  const theme = STYLE_THEME[tpl.style];
  const reps = useMemo(() => pickRepresentativeItems(tpl, 5), [tpl]);

  return (
    <AICard className="overflow-hidden flex flex-col !p-0 hover:-translate-y-1 transition-transform">
      {/* Collage cover — pastel gradient + scattered item bubbles */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: theme.gradient }}>
        {/* Soft decorative orbs */}
        <span
          className="absolute -top-6 -left-6 w-32 h-32 rounded-full"
          style={{ background: 'rgba(255,255,255,0.45)' }}
        />
        <span
          className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full"
          style={{ background: 'rgba(255,255,255,0.35)' }}
        />

        {/* Style ribbon */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold text-white flex items-center gap-1 shadow-sm"
          style={{ background: theme.ribbon, boxShadow: '0 2px 0 0 rgba(0,0,0,0.12)' }}
        >
          <span>{styleDef?.emoji}</span>
          <span>{styleName(tpl.style, t)}</span>
        </div>

        {/* Item count chip */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-leaf-800 bg-white/85 backdrop-blur-sm"
          style={{ boxShadow: '0 2px 0 0 rgba(0,0,0,0.08)' }}
        >
          {t('gallery.itemCount', { count: tpl.design.items.length })}
        </div>

        {/* Emoji collage — overlapping bubbles in a gentle arc */}
        <ItemCollage itemKeys={reps} ringColor={theme.ring} />
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

/**
 * Render up to 5 item emoji bubbles in a balanced arc. The center bubble is
 * largest (the "hero" item). Falls back to a leaf emoji when nothing matches.
 */
function ItemCollage({ itemKeys, ringColor }: { itemKeys: string[]; ringColor: string }) {
  const slots = itemKeys.slice(0, 5);
  // Reorder so the most prominent emoji ends up in the center.
  const ordered: (string | undefined)[] = [
    slots[1], // left
    slots[3], // far-left
    slots[0], // center (hero)
    slots[4], // far-right
    slots[2], // right
  ];
  // Positions (top%, left%) and sizes (px) tuned for a 4:3 cover.
  const layout = [
    { top: 56, left: 18, size: 56, rot: -8 },
    { top: 28, left: 30, size: 44, rot: -14 },
    { top: 38, left: 50, size: 78, rot: 0 },
    { top: 28, left: 70, size: 44, rot: 14 },
    { top: 56, left: 82, size: 56, rot: 8 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {layout.map((p, i) => {
        const key = ordered[i];
        const def = key ? ITEMS_BY_KEY[key] : undefined;
        const emoji = def?.emoji ?? '🌿';
        const name = def?.name ?? '';
        return (
          <div
            key={i}
            className="absolute grid place-items-center rounded-full bg-white/90 border-2"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              borderColor: ringColor,
              transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
              boxShadow: '0 4px 0 0 rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.6)',
              fontSize: p.size * 0.55,
              lineHeight: 1,
            }}
            title={name}
          >
            <span style={{ transform: `rotate(${-p.rot}deg)` }}>{emoji}</span>
          </div>
        );
      })}
    </div>
  );
}
