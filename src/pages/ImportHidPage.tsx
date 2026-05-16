import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Upload, AlertCircle, Download, FileText, Sparkles } from 'lucide-react';
import {
  Button as AIButton,
  Card as AICard,
  Icon as AIIcon,
  Footer as AIFooter,
  Divider as AIDivider,
} from 'animal-island-ui';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';
import { decodeHidPng, HidDecodeError, type HidDecodedMap } from '../import/hidDecoder';

export default function ImportHidPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HidDecodedMap | null>(null);

  const handleFile = async (f: File) => {
    setError(null);
    setResult(null);
    if (!f.type.includes('png') && !f.name.toLowerCase().endsWith('.png')) {
      setError(t('importHid.errorNotPng'));
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setLoading(true);
    try {
      const decoded = await decodeHidPng(f);
      setResult(decoded);
    } catch (e) {
      if (e instanceof HidDecodeError) {
        if (e.code === 'NO_PAYLOAD') setError(t('importHid.errorNoPayload'));
        else if (e.code === 'BAD_LZ' || e.code === 'BAD_JSON') setError(t('importHid.errorCorrupt'));
        else setError(t('importHid.errorImage'));
      } else {
        setError((e as Error).message || t('importHid.errorImage'));
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([result.rawJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HID-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between flex-wrap gap-3 border-b-2 border-cream-200 bg-cream-50/70 backdrop-blur-sm relative z-10">
        <Link to="/" className="btn-ghost text-sm">
          <ChevronLeft size={16} /> {t('common.home')}
        </Link>
        <h1 className="text-lg font-extrabold text-leaf-800 flex items-center gap-2">
          <AIIcon name="icon-map" size={26} bounce />
          {t('importHid.headerTitle')}
        </h1>
        <LanguageSwitcher compact />
      </header>

      <main className="flex-1 px-4 lg:px-12 py-6 pb-40 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <AICard type="title" className="!px-7 !py-2 mb-3 inline-block">
            <span className="text-sm font-bold text-leaf-800">{t('importHid.subtitle')}</span>
          </AICard>
          <p className="text-leaf-700/85 leading-relaxed">{t('importHid.subtitleDesc')}</p>
        </div>

        <AICard color="app-yellow" className="!p-4 flex items-start gap-3 mb-5 max-w-2xl mx-auto">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-sm">{t('importHid.previewOnlyTitle')}</h3>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">{t('importHid.previewOnlyDesc')}</p>
          </div>
        </AICard>

        <div className="grid lg:grid-cols-5 gap-5">
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
                if (f) void handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`card cursor-pointer overflow-hidden transition-all ${
                dragOver ? 'ring-2 ring-mint-300 -translate-y-0.5' : ''
              }`}
              style={dragOver ? { borderColor: '#19c8b9' } : undefined}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="HID preview"
                  className="w-full max-h-[420px] object-contain bg-cream-100"
                />
              ) : (
                <div className="p-10 grid place-items-center text-center">
                  <Upload size={44} className="text-mint-500 mb-3" />
                  <h3 className="font-extrabold text-leaf-800 mb-1">{t('importHid.uploadPrompt')}</h3>
                  <p className="text-xs text-leaf-700/85 whitespace-pre-line leading-relaxed">
                    {t('importHid.uploadDesc')}
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </div>

            {file && (
              <div className="text-xs text-leaf-700/85 text-center">
                <FileText size={12} className="inline mr-1" />
                {file.name}
              </div>
            )}

            <AICard className="!p-4 text-xs text-leaf-700/85 leading-relaxed">
              <h4 className="font-extrabold text-leaf-800 mb-1.5 text-sm flex items-center gap-1.5">
                <Sparkles size={14} className="text-mint-500" />
                {t('importHid.tipsTitle')}
              </h4>
              <ul className="space-y-0.5 list-disc pl-5">
                <li>{t('importHid.tip1')}</li>
                <li>{t('importHid.tip2')}</li>
                <li>{t('importHid.tip3')}</li>
              </ul>
            </AICard>
          </section>

          <section className="lg:col-span-3">
            {error && (
              <AICard color="app-red" className="!p-4 flex items-start gap-3 mb-4">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-sm leading-relaxed">{error}</div>
              </AICard>
            )}

            {!result && !error && !loading && (
              <AICard className="!p-10 text-center">
                <div className="mb-3 flex justify-center">
                  <AIIcon name="icon-map" size={56} bounce />
                </div>
                <h3 className="font-extrabold text-leaf-800 mb-1">{t('importHid.emptyTitle')}</h3>
                <p className="text-sm text-leaf-700/85">{t('importHid.emptyDesc')}</p>
              </AICard>
            )}

            {loading && (
              <AICard className="!p-10 text-center">
                <Sparkles size={36} className="text-mint-500 mx-auto mb-2 animate-pulse" />
                <p className="font-bold text-leaf-800">{t('importHid.loading')}</p>
              </AICard>
            )}

            {result && (
              <AICard className="!p-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="chip chip-mint">{t('importHid.version', { version: result.version.toUpperCase() })}</span>
                    <span className="chip chip-sun">
                      {t('importHid.totalObjects', { count: result.totalObjects })}
                    </span>
                    {result.drawingLayers.length > 0 && (
                      <span className="chip">
                        {t('importHid.drawingLayers', { count: result.drawingLayers.length })}
                      </span>
                    )}
                    {result.edgeTiles && (
                      <span className="chip chip-sun">
                        {t('importHid.edgeTiles', { count: result.edgeTiles.indices.length })}
                      </span>
                    )}
                  </div>
                  <AIButton size="small" onClick={downloadJson} icon={<Download size={14} />}>
                    {t('importHid.downloadJson')}
                  </AIButton>
                </div>

                <AIDivider type="line-teal" style={{ marginTop: 4, marginBottom: 14 }} />

                <h4 className="font-extrabold text-leaf-800 mb-2 text-sm">{t('importHid.objectsHeader')}</h4>
                {result.objectGroups.length === 0 ? (
                  <p className="text-xs text-leaf-700/85">{t('importHid.objectsEmpty')}</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
                    {result.objectGroups.map((g) => (
                      <div
                        key={g.key}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border-2 border-cream-200 bg-cream-50"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-leaf-600 uppercase tracking-wide">
                            {g.category}
                          </div>
                          <div className="text-xs font-extrabold text-leaf-800 truncate" title={g.type}>
                            {g.type || '—'}
                          </div>
                        </div>
                        <span className="chip-mint shrink-0">× {g.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </AICard>
            )}
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-0">
        <AIFooter type="sea" />
      </div>
    </div>
  );
}
