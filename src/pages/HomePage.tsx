import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Plus, Trash2, ChevronRight, Camera, BookHeart, FileImage } from 'lucide-react';
import {
  Button as AIButton,
  Card as AICard,
  Footer as AIFooter,
  Icon as AIIcon,
  Time as AITime,
  Divider as AIDivider,
  Modal as AIModal,
} from 'animal-island-ui';
import { createDesign } from '../utils/grid';
import { deleteDesign, getCurrentDesignId, loadAllDesigns, saveDesign, setCurrentDesignId } from '../utils/storage';
import { useInspirationsStore } from '../stores/inspirationsStore';
import { consumeSharedDesignFromHash } from '../utils/shareDesign';
import type { IslandDesign } from '../types';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';

export default function HomePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [designs, setDesigns] = useState<IslandDesign[]>([]);
  const [currentId, setCurId] = useState<string | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<IslandDesign | null>(null);
  const inspirationCount = useInspirationsStore((s) => s.items.length);

  useEffect(() => {
    // Check for a shared design in the URL hash first. If present, import
    // it into local storage and jump straight to the editor — no extra clicks.
    const shared = consumeSharedDesignFromHash();
    if (shared) {
      saveDesign(shared);
      setCurrentDesignId(shared.id);
      navigate(`/editor/${shared.id}`);
      return;
    }
    setDesigns(loadAllDesigns());
    setCurId(getCurrentDesignId());
  }, [navigate]);

  const handleNewDesign = () => {
    const d = createDesign(t('home.newIslandName', { index: designs.length + 1 }));
    saveDesign(d);
    setCurrentDesignId(d.id);
    navigate(`/editor/${d.id}`);
  };

  const handleContinue = () => {
    if (currentId) {
      navigate(`/editor/${currentId}`);
    } else if (designs[0]) {
      navigate(`/editor/${designs[0].id}`);
    } else {
      handleNewDesign();
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteDesign(pendingDelete.id);
    setDesigns(loadAllDesigns());
    setPendingDelete(null);
  };

  const locale = i18n.resolvedLanguage === 'ja' ? 'ja-JP' : i18n.resolvedLanguage === 'en' ? 'en-US' : 'zh-CN';

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between flex-wrap gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-mint-500" style={{ boxShadow: '0 4px 0 0 #11a89b' }}>
            <AIIcon name="icon-helicopter" size={28} style={{ filter: 'brightness(0) invert(1)' }} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-leaf-800">{t('app.name')}</h1>
            <p className="text-xs text-leaf-600 -mt-0.5">{t('app.tagline')}</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/inspirations" className="btn-ghost relative">
            <BookHeart size={16} /> {t('inspirations.title')}
            {inspirationCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-mint-500 text-white">
                {inspirationCount}
              </span>
            )}
          </Link>
          <Link to="/gallery" className="btn-ghost">
            <LayoutGrid size={16} /> {t('gallery.title')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </header>

      <main className="flex-1 px-6 lg:px-12 pb-32 relative z-10">
        <section className="max-w-6xl mx-auto mt-6 lg:mt-10">
          {/* Hero: title card + clock */}
          <div className="flex flex-col items-center text-center">
            <AICard type="title" className="!px-8 !py-3 mb-5">
              <span className="text-base font-bold text-leaf-800">{t('home.tag')}</span>
            </AICard>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-leaf-800 leading-tight max-w-2xl">
              {t('home.heroLine1')}
              <br />
              {t('home.heroLine2')} <span className="text-mint-600">{t('home.heroAccent')}</span>
            </h2>
            <p className="mt-4 text-leaf-700/80 text-lg max-w-2xl">{t('home.subtitle')}</p>

            <div className="mt-8">
              <AITime />
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <AIButton type="primary" size="large" onClick={() => navigate('/recognize')} icon={<Camera size={18} />}>
                {t('home.recognizeImage')}
              </AIButton>
              <AIButton size="large" onClick={handleNewDesign} icon={<Plus size={18} />}>
                {t('home.newIsland')}
              </AIButton>
              <AIButton size="large" onClick={handleContinue} disabled={designs.length === 0}>
                {t('home.continueLast')} <ChevronRight size={18} />
              </AIButton>
              <AIButton size="large" type="dashed" onClick={() => navigate('/gallery')} icon={<LayoutGrid size={18} />}>
                {t('home.browseTemplates')}
              </AIButton>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
              {inspirationCount > 0 && (
                <button
                  onClick={() => navigate('/inspirations')}
                  className="chip chip-mint hover:-translate-y-0.5 transition-transform inline-flex items-center gap-1.5"
                >
                  <BookHeart size={14} />
                  {t('home.inspirationsChip', { count: inspirationCount })}
                  <ChevronRight size={14} />
                </button>
              )}
              <button
                onClick={() => navigate('/import-hid')}
                className="chip hover:-translate-y-0.5 transition-transform inline-flex items-center gap-1.5"
              >
                <FileImage size={14} />
                {t('home.importHidChip')}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <AIDivider type="wave-yellow" style={{ marginTop: 48, marginBottom: 32 }} />

          {/* Features: colorful AI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              iconName="icon-camera"
              color="app-pink"
              title={t('home.features.recognize.title')}
              desc={t('home.features.recognize.desc')}
              onClick={() => navigate('/recognize')}
              badge={t('home.features.recognize.badge')}
            />
            <FeatureCard
              iconName="icon-design"
              color="app-teal"
              title={t('home.features.canvas.title')}
              desc={t('home.features.canvas.desc')}
            />
            <FeatureCard
              iconName="icon-miles"
              color="app-yellow"
              title={t('home.features.ai.title')}
              desc={t('home.features.ai.desc')}
            />
            <FeatureCard
              iconName="icon-map"
              color="app-blue"
              title={t('home.features.preview.title')}
              desc={t('home.features.preview.desc')}
            />
          </div>

          {designs.length > 0 && (
            <>
              <AIDivider type="line-teal" style={{ marginTop: 56, marginBottom: 24 }} />
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="text-xl font-bold text-leaf-800 flex items-center gap-2">
                    <AIIcon name="icon-critterpedia" size={28} bounce /> {t('home.myDesigns')}
                  </h3>
                  <span className="text-sm text-leaf-600 font-semibold">
                    {t('home.designCount', { count: designs.length })}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {designs.map((d) => (
                    <DesignCard
                      key={d.id}
                      design={d}
                      locale={locale}
                      onOpen={() => {
                        setCurrentDesignId(d.id);
                        navigate(`/editor/${d.id}`);
                      }}
                      onDelete={() => setPendingDelete(d)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Decorative tree silhouette at the bottom */}
      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-0">
        <AIFooter type="tree" />
      </div>

      <div className="relative z-10 text-center text-xs text-leaf-600/80 pb-3 font-semibold">
        {t('home.footer')}
      </div>

      <AIModal
        open={pendingDelete !== null}
        title={t('common.delete')}
        typewriter={false}
        onClose={() => setPendingDelete(null)}
        onOk={confirmDelete}
      >
        {t('home.deleteConfirm')}
        {pendingDelete && (
          <div className="mt-2 font-bold text-leaf-800">「{pendingDelete.name}」</div>
        )}
      </AIModal>
    </div>
  );
}

function FeatureCard({
  iconName,
  color,
  title,
  desc,
  onClick,
  badge,
}: {
  iconName: 'icon-design' | 'icon-miles' | 'icon-map' | 'icon-camera' | 'icon-diy';
  color: 'app-teal' | 'app-yellow' | 'app-blue' | 'app-pink' | 'app-orange';
  title: string;
  desc: string;
  onClick?: () => void;
  badge?: string;
}) {
  const interactive = !!onClick;
  return (
    <AICard
      color={color}
      onClick={onClick}
      className={`!p-6 flex flex-col gap-3 transition-transform relative ${interactive ? 'cursor-pointer hover:-translate-y-1' : 'hover:-translate-y-1'}`}
    >
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/90 text-leaf-800 tracking-wide">
          {badge}
        </span>
      )}
      <AIIcon name={iconName} size={56} bounce />
      <h4 className="font-extrabold text-lg" style={{ color: 'inherit' }}>{title}</h4>
      <p className="text-sm leading-relaxed opacity-90" style={{ color: 'inherit' }}>{desc}</p>
    </AICard>
  );
}

function DesignCard({
  design,
  locale,
  onOpen,
  onDelete,
}: {
  design: IslandDesign;
  locale: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const itemCount = design.items.length;
  const updated = new Date(design.updatedAt).toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <AICard className="!p-4 flex flex-col gap-3 hover:-translate-y-1 transition-transform group">
      <button
        onClick={onOpen}
        className="aspect-video rounded-2xl bg-gradient-to-br from-mint-100 via-cream-100 to-sun-500/20 grid place-items-center text-5xl border-2 border-cream-200"
      >
        🏝️
      </button>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-leaf-800 truncate">{design.name}</h4>
          <p className="text-xs text-leaf-600 mt-0.5">
            {t('home.designMeta', { count: itemCount, updated })}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-leaf-500 hover:text-red-500 p-1 transition"
          title={t('common.delete')}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <AIButton type="primary" size="small" onClick={onOpen} block>
        {t('home.openEdit')} <ChevronRight size={14} />
      </AIButton>
    </AICard>
  );
}
