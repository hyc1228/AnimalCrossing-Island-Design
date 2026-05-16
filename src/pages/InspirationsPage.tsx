import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Trash2, Wand2, Download, Image as ImageIcon, Search, Tag as TagIcon, Plus, X as CloseIcon } from 'lucide-react';
import {
  Button as AIButton,
  Card as AICard,
  Footer as AIFooter,
  Icon as AIIcon,
  Divider as AIDivider,
  Modal as AIModal,
} from 'animal-island-ui';
import { useInspirationsStore, type SavedInspiration } from '../stores/inspirationsStore';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';
import { STYLES } from '../ai/styles';
import { styleName } from '../i18n/helpers';
import type { StyleId } from '../ai/types';
import { ITEMS_BY_KEY } from '../data/items';
import { canPlace, createDesign, generateId } from '../utils/grid';
import { saveDesign, setCurrentDesignId } from '../utils/storage';
import type { PlacedItem } from '../types';
import { findSimilar, type SimilarityHit } from '../utils/similarity';

type DensityCode = 'sparse' | 'medium' | 'dense';

export default function InspirationsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const items = useInspirationsStore((s) => s.items);
  const removeOne = useInspirationsStore((s) => s.remove);
  const clearAll = useInspirationsStore((s) => s.clear);
  const setTags = useInspirationsStore((s) => s.setTags);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedInspiration | null>(null);
  const [pendingClearAll, setPendingClearAll] = useState(false);

  // Library filters.
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Collect all tags across inspirations + their counts for the filter row.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      for (const tag of it.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  // Apply text search (description / item names / notes) and tag filter.
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (tagFilter && !(it.tags ?? []).includes(tagFilter)) return false;
      if (!q) return true;
      const hay = [
        it.result.raw.description,
        it.note ?? '',
        ...it.result.items.flatMap((i) => [i.nameEn, i.matches[0]?.name ?? '']),
        ...(it.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, tagFilter]);

  const locale =
    i18n.resolvedLanguage === 'ja' ? 'ja-JP' : i18n.resolvedLanguage === 'en' ? 'en-US' : 'zh-CN';

  const detail = useMemo(
    () => (detailId ? items.find((it) => it.id === detailId) : null),
    [detailId, items],
  );

  const applyInspiration = (insp: SavedInspiration) => {
    // Reuse the same placement strategy as RecognizePage: cluster curated matches
    // in the center of a fresh island. NH-only matches are skipped for now.
    const result = insp.result;
    const time = new Date().toLocaleString(locale, { hour: '2-digit', minute: '2-digit' });
    const design = createDesign(t('recognize.designNamePrefix', { time }));
    const placed: PlacedItem[] = [];

    const cx0 = Math.floor(design.size.cols / 2) - 12;
    const cy0 = Math.floor(design.size.rows / 2) - 8;

    let placedCount = 0;
    let skippedCount = 0;

    for (const item of result.items) {
      // We respect the user's previous "default selection" by including every
      // item with score >= 0.5 — same heuristic the recognize page used.
      const isGoodCandidate = (item.matches[0]?.score ?? 0) >= 0.5 && item.confidence >= 0.4;
      if (!isGoodCandidate) continue;

      const best = item.matches.find((m) => m.catalogKey.startsWith('curated:'));
      if (!best) {
        skippedCount += item.count;
        continue;
      }
      const curatedKey = best.catalogKey.slice('curated:'.length);
      const def = ITEMS_BY_KEY[curatedKey];
      if (!def) {
        skippedCount += item.count;
        continue;
      }
      for (let k = 0; k < item.count; k++) {
        let ok = false;
        for (let attempt = 0; attempt < 30 && !ok; attempt++) {
          const x = cx0 + Math.floor(Math.random() * 24);
          const y = cy0 + Math.floor(Math.random() * 16);
          const candidate: PlacedItem = {
            id: generateId(),
            itemKey: curatedKey,
            layer: def.layer,
            x,
            y,
            w: def.w,
            h: def.h,
            rotation: 0,
          };
          if (canPlace(candidate, placed, design.size.cols, design.size.rows)) {
            placed.push(candidate);
            ok = true;
            placedCount++;
          }
        }
        if (!ok) skippedCount++;
      }
    }

    design.items = placed;
    saveDesign(design);
    setCurrentDesignId(design.id);

    if (skippedCount > 0 || placedCount > 0) {
      try {
        sessionStorage.setItem(
          'ac_recognize_skipped',
          JSON.stringify({ placedCount, skippedCount, designId: design.id }),
        );
      } catch {
        /* ignore */
      }
    }
    navigate(`/editor/${design.id}`);
  };

  const exportShoppingList = (insp: SavedInspiration) => {
    const result = insp.result;
    const styleLabel = (s: StyleId) => {
      const def = STYLES.find((x) => x.id === s);
      return def ? `${def.emoji} ${styleName(s, t)}` : s;
    };
    const densityLabel = (d: DensityCode) => t(`recognize.density.${d}`);
    const lines = [
      `# ${t('recognize.exportTitle')}`,
      `# ${t('recognize.exportGeneratedAt', { datetime: new Date(result.ranAt).toLocaleString(locale) })}`,
      `# ${t('recognize.exportStyle', {
        styles: result.topStyles
          .slice(0, 3)
          .map((s) => `${styleLabel(s.style)}(${(s.score * 100).toFixed(0)}%)`)
          .join(', '),
      })}`,
      `# ${t('recognize.exportDescription', { description: result.raw.description })}`,
      `# ${t('recognize.exportDensity', { density: densityLabel(result.raw.density as DensityCode) })}`,
      '',
      ...result.items.flatMap((it) => {
        const best = it.matches[0];
        const name = best ? best.name : it.nameEn;
        return [`- ${name} × ${it.count}`];
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ACNH-${t('recognize.headerTitle')}-${result.ranAt}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between flex-wrap gap-3 border-b-2 border-cream-200 bg-cream-50/70 backdrop-blur-sm relative z-20">
        <Link to="/" className="btn-ghost text-sm">
          <ChevronLeft size={16} /> {t('common.home')}
        </Link>
        <h1 className="text-lg font-extrabold text-leaf-800 flex items-center gap-2">
          <AIIcon name="icon-critterpedia" size={26} bounce />
          {t('inspirations.title')}
        </h1>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <AIButton size="small" danger onClick={() => setPendingClearAll(true)} icon={<Trash2 size={14} />}>
              {t('inspirations.clearAll')}
            </AIButton>
          )}
          <LanguageSwitcher compact />
        </div>
      </header>

      <main className="flex-1 px-4 lg:px-12 py-6 pb-40 max-w-6xl mx-auto w-full relative z-10">
        <div className="text-center max-w-xl mx-auto mb-6">
          <AICard type="title" className="!px-7 !py-2 mb-3 inline-block">
            <span className="text-sm font-bold text-leaf-800">
              {t('inspirations.subtitleCount', { count: items.length })}
            </span>
          </AICard>
          <p className="text-leaf-700/85 leading-relaxed">{t('inspirations.subtitleDesc')}</p>
        </div>

        {items.length === 0 ? (
          <AICard className="!p-10 text-center max-w-md mx-auto">
            <div className="mb-3 flex justify-center">
              <AIIcon name="icon-camera" size={64} bounce />
            </div>
            <h3 className="font-extrabold text-leaf-800 mb-1">{t('inspirations.emptyTitle')}</h3>
            <p className="text-sm text-leaf-700/85 mb-5 leading-relaxed">{t('inspirations.emptyDesc')}</p>
            <AIButton type="primary" onClick={() => navigate('/recognize')} icon={<ImageIcon size={16} />}>
              {t('home.recognizeImage')}
            </AIButton>
          </AICard>
        ) : (
          <>
            <AIDivider type="wave-yellow" style={{ marginBottom: 20 }} />

            {/* Search + tag filter row */}
            <div className="mb-5 flex flex-col gap-3">
              <div className="relative max-w-md mx-auto w-full">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500 pointer-events-none"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('inspirations.searchPlaceholder')}
                  className="input w-full pl-9 text-sm py-2"
                  style={{ borderWidth: 2 }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full text-leaf-500 hover:bg-cream-100"
                    title={t('common.close')}
                  >
                    <CloseIcon size={12} />
                  </button>
                )}
              </div>

              {allTags.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs">
                  <button
                    onClick={() => setTagFilter(null)}
                    className={`px-2.5 py-1 rounded-full border-2 font-bold transition ${
                      tagFilter === null
                        ? 'border-mint-500 bg-mint-50 text-leaf-800'
                        : 'border-cream-200 bg-white text-leaf-700 hover:border-mint-300'
                    }`}
                    style={tagFilter === null ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
                  >
                    {t('inspirations.allTags')}
                  </button>
                  {allTags.map(([tag, count]) => {
                    const active = tagFilter === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => setTagFilter(active ? null : tag)}
                        className={`px-2.5 py-1 rounded-full border-2 font-bold transition inline-flex items-center gap-1 ${
                          active
                            ? 'border-mint-500 bg-mint-50 text-leaf-800'
                            : 'border-cream-200 bg-white text-leaf-700 hover:border-mint-300'
                        }`}
                        style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
                      >
                        <TagIcon size={10} />
                        {tag}
                        <span className="opacity-60 font-mono text-[10px]">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="text-center text-[11px] text-leaf-500">
                {t('inspirations.shownCount', { shown: visibleItems.length, total: items.length })}
              </div>
            </div>

            {visibleItems.length === 0 ? (
              <AICard className="!p-8 text-center max-w-md mx-auto">
                <p className="text-sm text-leaf-700/85 leading-relaxed">
                  {t('inspirations.noMatch')}
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setTagFilter(null);
                  }}
                  className="mt-3 text-xs font-bold text-mint-600 hover:text-mint-700"
                >
                  {t('inspirations.clearFilters')}
                </button>
              </AICard>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleItems.map((insp) => (
                  <InspirationCard
                    key={insp.id}
                    insp={insp}
                    locale={locale}
                    onOpen={() => setDetailId(insp.id)}
                    onApply={() => applyInspiration(insp)}
                    onDelete={() => setPendingDelete(insp)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-0">
        <AIFooter type="sea" />
      </div>

      {/* Detail modal */}
      {detail && (
        <InspirationDetailModal
          insp={detail}
          allInspirations={items}
          knownTags={allTags.map(([t]) => t)}
          onClose={() => setDetailId(null)}
          onApply={() => {
            setDetailId(null);
            applyInspiration(detail);
          }}
          onExport={() => exportShoppingList(detail)}
          onDelete={() => {
            setDetailId(null);
            setPendingDelete(detail);
          }}
          onOpenOther={(id) => setDetailId(id)}
          onSaveTags={(tags) => setTags(detail.id, tags)}
        />
      )}

      <AIModal
        open={pendingDelete !== null}
        title={t('inspirations.deleteTitle')}
        typewriter={false}
        onClose={() => setPendingDelete(null)}
        onOk={() => {
          if (pendingDelete) removeOne(pendingDelete.id);
          setPendingDelete(null);
        }}
      >
        {t('inspirations.deleteConfirm')}
      </AIModal>

      <AIModal
        open={pendingClearAll}
        title={t('inspirations.clearAllTitle')}
        typewriter={false}
        onClose={() => setPendingClearAll(false)}
        onOk={() => {
          clearAll();
          setPendingClearAll(false);
        }}
      >
        {t('inspirations.clearAllConfirm', { count: items.length })}
      </AIModal>
    </div>
  );
}

function InspirationCard({
  insp,
  locale,
  onOpen,
  onApply,
  onDelete,
}: {
  insp: SavedInspiration;
  locale: string;
  onOpen: () => void;
  onApply: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const result = insp.result;
  const topStyle = result.topStyles[0];
  const topStyleDef = topStyle && STYLES.find((s) => s.id === topStyle.style);
  const kinds = result.items.length;
  const saved = new Date(insp.savedAt).toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AICard className="!p-0 overflow-hidden flex flex-col group hover:-translate-y-1 transition-transform">
      <button onClick={onOpen} className="block w-full aspect-square bg-cream-100 overflow-hidden relative">
        <img
          src={insp.thumbnail}
          alt={result.raw.description.slice(0, 40)}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {topStyleDef && (
          <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-xs font-extrabold bg-white/90 text-leaf-800 backdrop-blur-sm">
            {topStyleDef.emoji} {Math.round(topStyle.score * 100)}%
          </span>
        )}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-mint-500 text-white">
          {t('inspirations.kindsBadge', { count: kinds })}
        </span>
      </button>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-leaf-700 leading-relaxed line-clamp-2">{result.raw.description}</p>
        {(insp.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(insp.tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full bg-cream-100 border border-cream-200 text-[9px] font-extrabold text-leaf-700 inline-flex items-center gap-0.5"
              >
                <TagIcon size={8} />
                {tag}
              </span>
            ))}
            {(insp.tags ?? []).length > 3 && (
              <span className="text-[9px] text-leaf-500 font-bold">+{(insp.tags ?? []).length - 3}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px] text-leaf-600">{saved}</span>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-leaf-500 hover:text-red-500 p-1 transition"
            title={t('common.delete')}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <AIButton size="small" type="primary" block onClick={onApply} icon={<Wand2 size={14} />}>
          {t('inspirations.applyAction')}
        </AIButton>
      </div>
    </AICard>
  );
}

function InspirationDetailModal({
  insp,
  allInspirations,
  knownTags,
  onClose,
  onApply,
  onExport,
  onDelete,
  onOpenOther,
  onSaveTags,
}: {
  insp: SavedInspiration;
  allInspirations: SavedInspiration[];
  knownTags: string[];
  onClose: () => void;
  onApply: () => void;
  onExport: () => void;
  onDelete: () => void;
  onOpenOther: (id: string) => void;
  onSaveTags: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const result = insp.result;
  const densityLabel = (d: DensityCode) => t(`recognize.density.${d}`);

  const similar = useMemo<SimilarityHit[]>(
    () => findSimilar(insp, allInspirations, 4),
    [insp, allInspirations],
  );

  // Tag editor state — initialized from the current entry and pushed back on
  // every mutation so the user doesn't have to "save" explicitly.
  const initialTags = insp.tags ?? [];
  const [tagDraft, setTagDraft] = useState('');
  const [tags, setLocalTags] = useState<string[]>(initialTags);
  const commit = (next: string[]) => {
    setLocalTags(next);
    onSaveTags(next);
  };
  const addTag = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v || v.length > 24 || tags.includes(v) || tags.length >= 8) return;
    commit([...tags, v]);
    setTagDraft('');
  };
  const removeTag = (tag: string) => commit(tags.filter((x) => x !== tag));
  const suggestions = knownTags.filter((kt) => !tags.includes(kt)).slice(0, 8);

  return (
    <AIModal
      open
      title={t('inspirations.detailTitle')}
      typewriter={false}
      width={720}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2 w-full flex-wrap">
          <AIButton danger onClick={onDelete} icon={<Trash2 size={14} />}>
            {t('common.delete')}
          </AIButton>
          <div className="flex items-center gap-2 ml-auto">
            <AIButton onClick={onExport} icon={<Download size={14} />}>
              {t('recognize.exportShoppingList')}
            </AIButton>
            <AIButton type="primary" onClick={onApply} icon={<Wand2 size={14} />}>
              {t('recognize.applyToCanvas')}
            </AIButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-left">
        <div className="rounded-2xl overflow-hidden border-2 border-cream-200 bg-cream-100 max-h-[40vh] grid place-items-center">
          <img src={insp.thumbnail} alt={result.raw.description} className="max-w-full max-h-[40vh] object-contain" />
        </div>

        <div className="text-xs text-leaf-700 leading-relaxed">
          <span className="chip-mint mr-2 align-middle">
            {t('recognize.densityChip', { density: densityLabel(result.raw.density as DensityCode) })}
          </span>
          {result.raw.description}
        </div>

        {/* Tag editor */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-leaf-800 mb-1.5">
            <TagIcon size={12} className="text-mint-500" />
            {t('inspirations.tagsTitle')}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-mint-50 border-2 border-mint-300 text-[11px] font-extrabold text-leaf-800"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="w-4 h-4 grid place-items-center rounded-full hover:bg-mint-200 text-leaf-700"
                  title={t('common.delete')}
                >
                  <CloseIcon size={10} />
                </button>
              </span>
            ))}
            {tags.length < 8 && (
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(tagDraft);
                    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
                      removeTag(tags[tags.length - 1]);
                    }
                  }}
                  placeholder={t('inspirations.addTagPlaceholder')}
                  maxLength={24}
                  className="text-[11px] px-2 py-1 rounded-full border-2 border-cream-200 focus:border-mint-400 outline-none w-32 bg-white"
                />
                <button
                  onClick={() => addTag(tagDraft)}
                  disabled={!tagDraft.trim()}
                  className="w-6 h-6 grid place-items-center rounded-full bg-mint-500 text-white hover:bg-mint-600 disabled:opacity-30 disabled:hover:bg-mint-500"
                  title={t('inspirations.addTag')}
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-leaf-500 font-bold mr-1">{t('inspirations.suggestedTags')}</span>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  onClick={() => addTag(sug)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-cream-200 bg-white text-leaf-600 hover:border-mint-300 hover:text-leaf-800"
                >
                  + {sug}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-extrabold text-leaf-800 mb-1.5">{t('recognize.stylesTitle')}</div>
          <div className="space-y-1">
            {result.topStyles.slice(0, 4).map((s) => {
              const def = STYLES.find((x) => x.id === s.style);
              const label = def ? `${def.emoji} ${styleName(s.style, t)}` : s.style;
              return (
                <div key={s.style} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-leaf-700 font-semibold truncate">{label}</div>
                  <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden border border-cream-200">
                    <div
                      className="h-full bg-mint-500 rounded-full"
                      style={{ width: `${Math.round(s.score * 100)}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-xs font-extrabold text-leaf-800">
                    {Math.round(s.score * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-extrabold text-leaf-800 mb-1.5">
            {t('inspirations.itemsHeader', { count: result.items.length })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
            {result.items.map((it, i) => {
              const best = it.matches[0];
              const noMatch = !best || best.score < 0.35;
              return (
                <div
                  key={`${it.nameEn}-${i}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 ${
                    noMatch ? 'bg-sun-500/10 border-sun-500/30' : 'bg-cream-50 border-cream-200'
                  }`}
                >
                  {best?.imageUrl ? (
                    <img src={best.imageUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
                  ) : (
                    <ImageIcon size={14} className="text-leaf-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-leaf-800 truncate flex-1">
                    {best ? best.name : it.nameEn}
                  </span>
                  <span className="text-[10px] text-leaf-600 font-bold shrink-0">× {it.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {similar.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-leaf-800 mb-1.5">
              <Search size={12} className="text-mint-500" />
              {t('inspirations.similarTitle')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {similar.map((hit) => (
                <button
                  key={hit.inspiration.id}
                  onClick={() => onOpenOther(hit.inspiration.id)}
                  className="text-left rounded-2xl border-2 border-cream-200 bg-cream-50 hover:border-mint-300 hover:-translate-y-0.5 transition overflow-hidden"
                  title={hit.inspiration.result.raw.description}
                >
                  <div className="aspect-square bg-cream-100 overflow-hidden">
                    <img
                      src={hit.inspiration.thumbnail}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-1.5">
                    <div className="text-[10px] font-extrabold text-mint-700">
                      {t('inspirations.similarMatch', { value: Math.round(hit.score * 100) })}
                    </div>
                    <div className="text-[9px] text-leaf-600 mt-0.5 line-clamp-1">
                      {t('inspirations.similarBreakdown', {
                        style: Math.round(hit.styleScore * 100),
                        items: Math.round(hit.itemScore * 100),
                      })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AIModal>
  );
}
