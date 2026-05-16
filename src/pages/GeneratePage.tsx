import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Wand2,
  Settings,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
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
import { generateScene } from '../ai/textClient';
import { VisionError } from '../ai/visionClient';
import { applyRecognitionToNewDesign } from '../ai/applyResult';
import type { RecognitionResult } from '../ai/visionTypes';
import { STYLES } from '../ai/styles';
import type { StyleId } from '../ai/types';
import { styleName } from '../i18n/helpers';

type DensityCode = 'sparse' | 'medium' | 'dense';

export default function GeneratePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const byok = useSettingsStore((s) => s.byok);
  const addInspiration = useInspirationsStore((s) => s.add);

  const [style, setStyle] = useState<StyleId>('japanese');
  const [density, setDensity] = useState<DensityCode>('medium');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [expandedMatches, setExpandedMatches] = useState<Record<number, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasKey = byok.apiKey.length > 0;
  const locale =
    i18n.resolvedLanguage === 'ja'
      ? 'ja-JP'
      : i18n.resolvedLanguage === 'en'
        ? 'en-US'
        : 'zh-CN';

  useEffect(() => {
    if (!result) return;
    const next: Record<number, boolean> = {};
    result.items.forEach((it, i) => {
      next[i] = (it.matches[0]?.score ?? 0) >= 0.5 && it.confidence >= 0.4;
    });
    setSelected(next);
    setExpandedMatches({});
  }, [result]);

  const handleGenerate = async () => {
    if (!hasKey) {
      setSettingsOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await generateScene({ style, description, density }, byok);
      setResult(r);
      // Generated scenes also land in the inspirations library so they're
      // browsable from the same place as recognized images.
      void addInspiration(r).catch(() => {
        /* surfaced lazily by inspirations page */
      });
    } catch (e) {
      const msg = e instanceof VisionError ? e.message : (e as Error).message;
      setError(msg || t('generate.errorFallback'));
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
      `# ${t('generate.exportTitle')}`,
      `# ${t('recognize.exportGeneratedAt', { datetime: new Date(result.ranAt).toLocaleString(locale) })}`,
      `# ${t('recognize.exportStyle', {
        styles: result.topStyles
          .slice(0, 3)
          .map((s) => `${styleLabel(s.style)}(${(s.score * 100).toFixed(0)}%)`)
          .join(', '),
      })}`,
      `# ${t('generate.exportPrompt', { description: description.trim() || t('generate.descriptionEmpty') })}`,
      `# ${t('recognize.exportDensity', { density: densityLabel(result.raw.density as DensityCode) })}`,
      '',
      ...picked.flatMap((it) => {
        const best = it.matches[0];
        const name = best ? best.name : it.nameEn;
        return [`- ${name} × ${it.count}${best?.imageUrl ? `  (${best.nameEn})` : ''}`];
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ACNH-${t('generate.headerTitle')}-${result.ranAt}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyToCanvas = () => {
    if (!result) return;
    const time = new Date().toLocaleString(locale, { hour: '2-digit', minute: '2-digit' });
    const { designId } = applyRecognitionToNewDesign(result, {
      designName: t('generate.designNamePrefix', { time }),
      selected,
    });
    navigate(`/editor/${designId}`);
  };

  const examples = (t('generate.examples', { returnObjects: true }) as unknown) as string[];

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between flex-wrap gap-3 border-b-2 border-cream-200 bg-cream-50/70 backdrop-blur-sm relative z-10">
        <Link to="/" className="btn-ghost text-sm">
          <ChevronLeft size={16} /> {t('common.home')}
        </Link>
        <h1 className="text-lg font-extrabold text-leaf-800 flex items-center gap-2">
          <AIIcon name="icon-map" size={26} bounce />
          {t('generate.headerTitle')}
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
                <AIButton
                  size="small"
                  type="primary"
                  onClick={() => setSettingsOpen(true)}
                  icon={<Settings size={14} />}
                >
                  {t('recognize.noKeyCta')}
                </AIButton>
              </div>
            </div>
          </AICard>
        )}

        <div className="grid lg:grid-cols-5 gap-5">
          {/* Left: prompt builder */}
          <section className="lg:col-span-2 space-y-3">
            <AICard className="!p-4 space-y-3">
              <div>
                <label className="text-xs font-extrabold text-leaf-800 uppercase tracking-wider">
                  {t('generate.styleLabel')}
                </label>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {STYLES.map((s) => {
                    const active = style === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-2xl border-2 text-[11px] font-bold transition ${
                          active
                            ? 'border-mint-500 bg-mint-50 text-leaf-800'
                            : 'border-cream-200 bg-white text-leaf-700 hover:border-mint-300'
                        }`}
                        style={active ? { boxShadow: '0 3px 0 0 #11a89b' } : { boxShadow: '0 2px 0 0 #e0d8c0' }}
                        title={s.description}
                      >
                        <span className="text-xl leading-none">{s.emoji}</span>
                        <span className="leading-tight text-center">{styleName(s.id, t)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-leaf-800 uppercase tracking-wider">
                  {t('generate.densityLabel')}
                </label>
                <div className="mt-2 flex gap-1.5">
                  {(['sparse', 'medium', 'dense'] as const).map((d) => {
                    const active = density === d;
                    return (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={`flex-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                          active
                            ? 'border-mint-500 bg-mint-50 text-leaf-800'
                            : 'border-cream-200 bg-white text-leaf-700 hover:border-mint-300'
                        }`}
                        style={active ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
                      >
                        {densityLabel(d)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-leaf-800 uppercase tracking-wider">
                  {t('generate.descriptionLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={t('generate.descriptionPlaceholder')}
                  className="input mt-2 text-sm py-2 resize-none"
                />
                <div className="text-[10px] text-leaf-500 mt-1 text-right">
                  {description.length} / 500
                </div>
              </div>

              {Array.isArray(examples) && examples.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-leaf-700 mb-1.5">
                    {t('generate.examplesLabel')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {examples.slice(0, 5).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setDescription(ex)}
                        className="chip text-[11px] hover:-translate-y-0.5 transition-transform"
                        title={ex}
                      >
                        {ex.length > 22 ? ex.slice(0, 22) + '…' : ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </AICard>

            <AIButton
              type="primary"
              size="large"
              block
              loading={loading}
              disabled={loading}
              onClick={handleGenerate}
              icon={
                loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : result ? (
                  <RefreshCw size={16} />
                ) : (
                  <Wand2 size={16} />
                )
              }
            >
              {loading
                ? t('generate.generating')
                : result
                  ? t('generate.regenerate')
                  : t('generate.startGenerate')}
            </AIButton>

            {error && (
              <AICard color="app-red" className="!p-3 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 break-words">{error}</div>
              </AICard>
            )}

            <AICard className="!p-3 text-[11px] text-leaf-700 leading-relaxed">
              <p>
                <strong className="text-leaf-800">{t('generate.tipsTitle')}</strong>
              </p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>{t('generate.tip1')}</li>
                <li>{t('generate.tip2')}</li>
                <li>{t('generate.tip3')}</li>
              </ul>
            </AICard>
          </section>

          {/* Right: result */}
          <section className="lg:col-span-3 min-h-[400px]">
            {!result && !loading && (
              <AICard className="!p-8 h-full grid place-items-center text-center">
                <div>
                  <div className="mb-3 grid place-items-center">
                    <AIIcon name="icon-map" size={64} />
                  </div>
                  <h3 className="font-extrabold text-leaf-800">{t('generate.emptyTitle')}</h3>
                  <p className="text-sm text-leaf-600 mt-1 leading-relaxed">
                    {t('generate.emptyDesc')}
                  </p>
                </div>
              </AICard>
            )}

            {loading && (
              <AICard className="!p-8 h-full grid place-items-center text-center">
                <div>
                  <Loader2 size={28} className="text-mint-500 animate-spin mx-auto mb-3" />
                  <h3 className="font-extrabold text-leaf-800">
                    {t('generate.loadingTitle', { model: byok.model })}
                  </h3>
                  <p className="text-sm text-leaf-600 mt-1">{t('generate.loadingDesc')}</p>
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
                applyLabel={t('generate.applyToCanvas')}
              />
            )}
          </section>
        </div>

        {/* Subtle hint that the generator and recognizer share infra */}
        {!result && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-leaf-600">
            <Sparkles size={12} className="text-mint-500" />
            <span>{t('generate.sharedNote')}</span>
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-0">
        <AIFooter type="sea" />
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
