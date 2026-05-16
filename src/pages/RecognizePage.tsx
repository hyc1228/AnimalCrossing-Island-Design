import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Upload,
  Sparkles,
  Settings,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Button as AIButton,
  Card as AICard,
  Icon as AIIcon,
  Footer as AIFooter,
} from 'animal-island-ui';
import SettingsDialog from '../components/SettingsDialog/SettingsDialog';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';
import ResultPanel from '../components/RecognitionResult/ResultPanel';
import { useSettingsStore } from '../stores/settingsStore';
import { useInspirationsStore } from '../stores/inspirationsStore';
import { recognizeImage, VisionError } from '../ai/visionClient';
import { applyRecognitionToNewDesign } from '../ai/applyResult';
import type { RecognitionResult } from '../ai/visionTypes';
import { STYLES } from '../ai/styles';
import type { StyleId } from '../ai/types';
import { styleName } from '../i18n/helpers';

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
    const time = new Date().toLocaleString(locale, { hour: '2-digit', minute: '2-digit' });
    const { designId } = applyRecognitionToNewDesign(result, {
      designName: t('recognize.designNamePrefix', { time }),
      selected,
    });
    navigate(`/editor/${designId}`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between flex-wrap gap-3 border-b-2 border-cream-200 bg-cream-50/70 backdrop-blur-sm relative z-20">
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

// Result rendering moved to components/RecognitionResult/ResultPanel.tsx so
// the generation page can share the exact same UI.
