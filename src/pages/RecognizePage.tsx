import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Upload,
  Sparkles,
  Settings,
  AlertCircle,
  Loader2,
  Download,
  Wand2,
  Eye,
  EyeOff,
  Camera,
} from 'lucide-react';
import {
  Button as AIButton,
  Card as AICard,
  Icon as AIIcon,
  Footer as AIFooter,
  Divider as AIDivider,
} from 'animal-island-ui';
import SettingsDialog from '../components/SettingsDialog/SettingsDialog';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';
import { useSettingsStore } from '../stores/settingsStore';
import { useInspirationsStore } from '../stores/inspirationsStore';
import { recognizeImage, VisionError } from '../ai/visionClient';
import type { MatchedItem, RecognitionResult } from '../ai/visionTypes';
import { STYLES } from '../ai/styles';
import type { StyleId } from '../ai/types';
import { styleName } from '../i18n/helpers';
import { createDesign } from '../utils/grid';
import { saveDesign, setCurrentDesignId } from '../utils/storage';
import { ITEMS_BY_KEY } from '../data/items';
import type { PlacedItem } from '../types';
import { canPlace, generateId } from '../utils/grid';

type DensityCode = 'sparse' | 'medium' | 'dense';

export default function RecognizePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const byok = useSettingsStore((s) => s.byok);
  const addInspiration = useInspirationsStore((s) => s.add);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [expandedMatches, setExpandedMatches] = useState<Record<number, boolean>>({});
  const [showImage, setShowImage] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasKey = byok.apiKey.length > 0;
  const locale =
    i18n.resolvedLanguage === 'ja' ? 'ja-JP' : i18n.resolvedLanguage === 'en' ? 'en-US' : 'zh-CN';

  // When a result arrives, default-select every item whose best match is reasonable.
  useEffect(() => {
    if (!result) return;
    const next: Record<number, boolean> = {};
    result.items.forEach((it, i) => {
      next[i] = (it.matches[0]?.score ?? 0) >= 0.5 && it.confidence >= 0.4;
    });
    setSelected(next);
    setExpandedMatches({});
  }, [result]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t('recognize.errorNotImage'));
      return;
    }
    setError(null);
    setResult(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  // Clean up object URL on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleRecognize = async () => {
    if (!imageFile) return;
    if (!hasKey) {
      setSettingsOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await recognizeImage(imageFile, byok);
      setResult(r);
      // Auto-save to the local inspirations library (downscaled thumbnail).
      // Fire-and-forget: never block the UI even if storage fails.
      void addInspiration(r).catch(() => {
        /* quota or other errors are surfaced lazily by the inspirations page */
      });
    } catch (e) {
      const msg = e instanceof VisionError ? e.message : (e as Error).message;
      setError(msg || t('recognize.errorFallback'));
    } finally {
      setLoading(false);
    }
  };

  const densityLabel = (d: DensityCode) => t(`recognize.density.${d}`);

  const styleLabel = (s: StyleId): string => {
    const def = STYLES.find((x) => x.id === s);
    return def ? `${def.emoji} ${styleName(s, t)}` : s;
  };

  const exportShoppingList = () => {
    if (!result) return;
    const picked = result.items.filter((_, i) => selected[i]);
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
      ...picked.flatMap((it) => {
        const best = it.matches[0];
        const name = best ? best.name : it.nameEn;
        return [
          `- ${name} × ${it.count}${best?.imageUrl ? `  (${best.nameEn})` : ''}`,
        ];
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

  const applyToCanvas = () => {
    if (!result) return;
    const picked = result.items.filter((_, i) => selected[i]);

    const time = new Date().toLocaleString(locale, { hour: '2-digit', minute: '2-digit' });
    const design = createDesign(t('recognize.designNamePrefix', { time }));
    const placed: PlacedItem[] = [];

    let placedCount = 0;
    let skippedCount = 0;

    const cx0 = Math.floor(design.size.cols / 2) - 12;
    const cy0 = Math.floor(design.size.rows / 2) - 8;

    for (const item of picked) {
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

    if (skippedCount > 0) {
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

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between flex-wrap gap-3 border-b-2 border-cream-200 bg-cream-50/70 backdrop-blur-sm relative z-10">
        <Link to="/" className="btn-ghost text-sm">
          <ChevronLeft size={16} /> {t('common.home')}
        </Link>
        <h1 className="text-lg font-extrabold text-leaf-800 flex items-center gap-2">
          <AIIcon name="icon-camera" size={26} bounce />
          {t('recognize.headerTitle')}
        </h1>
        <div className="flex items-center gap-2">
          <AIButton size="small" onClick={() => setSettingsOpen(true)} icon={<Settings size={14} />}>
            {hasKey ? t('recognize.headerSettingsShort') : t('recognize.headerSettings')}
          </AIButton>
          <LanguageSwitcher compact />
        </div>
      </header>

      <main className="flex-1 px-4 lg:px-12 py-6 pb-40 max-w-6xl mx-auto w-full relative z-10">
        {!hasKey && (
          <AICard color="app-yellow" className="!p-4 flex items-start gap-3 mb-5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-sm">{t('recognize.noKeyTitle')}</h3>
              <p className="text-xs mt-0.5 leading-relaxed opacity-90">{t('recognize.noKeyDesc')}</p>
              <div className="mt-2">
                <AIButton size="small" type="primary" onClick={() => setSettingsOpen(true)} icon={<Settings size={14} />}>
                  {t('recognize.noKeyCta')}
                </AIButton>
              </div>
            </div>
          </AICard>
        )}

        <div className="grid lg:grid-cols-5 gap-5">
          {/* Left: upload + preview */}
          <section className="lg:col-span-2 space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`card cursor-pointer overflow-hidden transition-all ${
                dragOver ? 'ring-2 ring-mint-300 -translate-y-0.5' : ''
              }`}
              style={dragOver ? { borderColor: '#19c8b9' } : undefined}
            >
              {previewUrl && showImage ? (
                <div className="relative">
                  <img src={previewUrl} alt="preview" className="w-full max-h-[420px] object-contain bg-cream-100" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowImage(false);
                    }}
                    className="absolute top-2 right-2 panel w-9 h-9 grid place-items-center text-leaf-700 hover:text-mint-600"
                    title={t('recognize.hideImage')}
                  >
                    <EyeOff size={14} />
                  </button>
                </div>
              ) : previewUrl ? (
                <div className="relative h-32 bg-cream-100 grid place-items-center">
                  <AIButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowImage(true);
                    }}
                    icon={<Eye size={14} />}
                  >
                    {t('recognize.showImage')}
                  </AIButton>
                </div>
              ) : (
                <div className="aspect-[4/3] grid place-items-center text-center p-6">
                  <div>
                    <div className="w-14 h-14 rounded-full bg-mint-100 text-mint-600 grid place-items-center mx-auto mb-3">
                      <Upload size={22} />
                    </div>
                    <p className="font-extrabold text-leaf-800 text-base">{t('recognize.uploadPrompt')}</p>
                    <p className="text-xs text-leaf-600 mt-2 whitespace-pre-line leading-relaxed">
                      {t('recognize.uploadDesc')}
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </div>

            <AIButton
              type="primary"
              size="large"
              block
              loading={loading}
              disabled={!imageFile || loading}
              onClick={handleRecognize}
              icon={loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            >
              {loading ? t('recognize.recognizing') : t('recognize.startRecognize')}
            </AIButton>

            {error && (
              <AICard color="app-red" className="!p-3 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 break-words">{error}</div>
              </AICard>
            )}

            <AICard className="!p-3 text-[11px] text-leaf-700 leading-relaxed">
              <p>
                <strong className="text-leaf-800">{t('recognize.tipsTitle')}</strong>
              </p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>{t('recognize.tip1')}</li>
                <li>{t('recognize.tip2')}</li>
                <li>{t('recognize.tip3')}</li>
                <li>{t('recognize.tip4')}</li>
              </ul>
            </AICard>
          </section>

          {/* Right: result */}
          <section className="lg:col-span-3 min-h-[400px]">
            {!result && !loading && (
              <AICard className="!p-8 h-full grid place-items-center text-center">
                <div>
                  <div className="mb-3 grid place-items-center">
                    <AIIcon name="icon-camera" size={64} />
                  </div>
                  <h3 className="font-extrabold text-leaf-800">{t('recognize.emptyTitle')}</h3>
                  <p className="text-sm text-leaf-600 mt-1 leading-relaxed">{t('recognize.emptyDesc')}</p>
                </div>
              </AICard>
            )}

            {loading && (
              <AICard className="!p-8 h-full grid place-items-center text-center">
                <div>
                  <Loader2 size={28} className="text-mint-500 animate-spin mx-auto mb-3" />
                  <h3 className="font-extrabold text-leaf-800">{t('recognize.loadingTitle', { model: byok.model })}</h3>
                  <p className="text-sm text-leaf-600 mt-1">{t('recognize.loadingDesc')}</p>
                </div>
              </AICard>
            )}

            {result && !loading && (
              <ResultPanel
                result={result}
                selected={selected}
                onToggle={(i) => setSelected((s) => ({ ...s, [i]: !s[i] }))}
                expandedMatches={expandedMatches}
                onToggleExpand={(i) => setExpandedMatches((s) => ({ ...s, [i]: !s[i] }))}
                onExport={exportShoppingList}
                onApply={applyToCanvas}
                densityLabel={densityLabel}
                styleLabel={styleLabel}
              />
            )}
          </section>
        </div>
      </main>

      {/* Decorative bottom band */}
      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-0">
        <AIFooter type="sea" />
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

interface ResultPanelProps {
  result: RecognitionResult;
  selected: Record<number, boolean>;
  onToggle: (i: number) => void;
  expandedMatches: Record<number, boolean>;
  onToggleExpand: (i: number) => void;
  onExport: () => void;
  onApply: () => void;
  densityLabel: (d: DensityCode) => string;
  styleLabel: (s: StyleId) => string;
}

function ResultPanel({
  result,
  selected,
  onToggle,
  expandedMatches,
  onToggleExpand,
  onExport,
  onApply,
  densityLabel,
  styleLabel,
}: ResultPanelProps) {
  const { t } = useTranslation();
  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );
  const totalCount = useMemo(
    () =>
      result.items.reduce(
        (sum, it, i) => (selected[i] ? sum + it.count : sum),
        0,
      ),
    [result.items, selected],
  );

  return (
    <AICard className="overflow-hidden flex flex-col h-full !p-0">
      {/* Style bars */}
      <div className="p-4 border-b-2 border-cream-200">
        <h3 className="font-extrabold text-leaf-800 mb-2 text-sm flex items-center gap-1.5">
          <Sparkles size={14} className="text-mint-500" /> {t('recognize.stylesTitle')}
        </h3>
        <div className="space-y-1.5">
          {result.topStyles.slice(0, 5).map((s) => (
            <div key={s.style} className="flex items-center gap-2">
              <div className="w-24 text-xs text-leaf-700 font-semibold truncate">{styleLabel(s.style)}</div>
              <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden border border-cream-200">
                <div
                  className="h-full bg-mint-500 rounded-full transition-all"
                  style={{ width: `${Math.round(s.score * 100)}%` }}
                />
              </div>
              <div className="w-10 text-right text-xs font-extrabold text-leaf-800">
                {Math.round(s.score * 100)}%
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-leaf-700 mt-3 leading-relaxed">
          <span className="chip-mint mr-1.5 align-middle">
            {t('recognize.densityChip', { density: densityLabel(result.raw.density as DensityCode) })}
          </span>
          {result.raw.description}
        </p>
      </div>

      <AIDivider type="line-teal" />

      {/* Items */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 py-2 bg-cream-100 flex items-center justify-between text-xs text-leaf-700 sticky top-0 z-10">
          <span>
            {t('recognize.itemsHeader', {
              kinds: result.items.length,
              selectedKinds: selectedCount,
              totalCount,
            })}
          </span>
          {result.usage && (
            <span className="text-leaf-500 font-mono">
              {result.usage.in}↑ {result.usage.out}↓ tokens
            </span>
          )}
        </div>

        {result.items.length === 0 && (
          <div className="p-8 text-center text-sm text-leaf-600">{t('recognize.itemsEmpty')}</div>
        )}

        {result.items.map((it, i) => (
          <ItemRow
            key={`${it.nameEn}-${i}`}
            item={it}
            checked={!!selected[i]}
            onToggle={() => onToggle(i)}
            expanded={!!expandedMatches[i]}
            onToggleExpand={() => onToggleExpand(i)}
          />
        ))}
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t-2 border-cream-200 bg-cream-50 flex flex-wrap gap-2">
        <AIButton onClick={onExport} disabled={selectedCount === 0} icon={<Download size={14} />}>
          {t('recognize.exportShoppingList')}
        </AIButton>
        <div className="flex-1 min-w-[12rem]">
          <AIButton
            type="primary"
            block
            onClick={onApply}
            disabled={selectedCount === 0}
            icon={<Wand2 size={14} />}
          >
            {t('recognize.applyToCanvas')}
          </AIButton>
        </div>
      </div>
    </AICard>
  );
}

function ItemRow({
  item,
  checked,
  onToggle,
  expanded,
  onToggleExpand,
}: {
  item: MatchedItem;
  checked: boolean;
  onToggle: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t } = useTranslation();
  const best = item.matches[0];
  const noMatch = !best || best.score < 0.35;
  return (
    <div className={`border-b-2 border-cream-200/60 ${noMatch ? 'bg-sun-500/8' : ''}`}>
      <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream-50 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 accent-mint-500"
        />
        <div className="w-10 h-10 rounded-xl bg-cream-100 border-2 border-cream-200 grid place-items-center overflow-hidden shrink-0">
          {best?.imageUrl ? (
            <img src={best.imageUrl} alt={best.name} className="w-full h-full object-contain" />
          ) : (
            <Camera size={16} className="text-leaf-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-leaf-800 truncate">
              {best ? best.name : item.nameEn}
            </span>
            <span className="chip-mint">× {item.count}</span>
            {noMatch && (
              <span className="chip-sun" title={t('recognize.unmatchedTooltip')}>
                {t('recognize.unmatched')}
              </span>
            )}
          </div>
          <div className="text-[11px] text-leaf-600 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{t('recognize.recognized', { value: Math.round(item.confidence * 100) })}</span>
            {best && <span>{t('recognize.matched', { value: Math.round(best.score * 100) })}</span>}
            {item.region && <span>· {item.region}</span>}
            {item.note && <span>· {item.note}</span>}
          </div>
        </div>
        {item.matches.length > 1 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleExpand();
            }}
            className="text-xs text-mint-600 hover:text-mint-700 font-bold whitespace-nowrap px-2 py-0.5 rounded-full hover:bg-mint-500/10 transition"
          >
            {expanded
              ? t('recognize.matchCollapse')
              : t('recognize.matchExpand', { count: item.matches.length - 1 })}
          </button>
        )}
      </label>
      {expanded && item.matches.length > 1 && (
        <div className="pl-14 pr-3 pb-2 flex flex-wrap gap-2 text-[11px]">
          {item.matches.slice(1).map((m) => (
            <div
              key={m.catalogKey}
              className="flex items-center gap-1.5 bg-white border-2 border-cream-200 rounded-full px-2.5 py-1"
              title={`${m.nameEn} · ${Math.round(m.score * 100)}%`}
            >
              {m.imageUrl ? (
                <img src={m.imageUrl} alt={m.name} className="w-5 h-5 object-contain" />
              ) : (
                <Camera size={10} className="text-leaf-500" />
              )}
              <span className="text-leaf-700 font-semibold">{m.name}</span>
              <span className="text-mint-600 font-bold">{Math.round(m.score * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
