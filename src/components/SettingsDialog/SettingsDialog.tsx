import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ExternalLink, Sparkles, Info } from 'lucide-react';
import { Modal as AIModal, Button as AIButton } from 'animal-island-ui';
import {
  DEFAULT_MODELS,
  MODEL_OPTIONS,
  useSettingsStore,
  type AIProvider,
} from '../../stores/settingsStore';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const KEY_DOCS_URL: Record<AIProvider, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
};

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const byok = useSettingsStore((s) => s.byok);
  const setProvider = useSettingsStore((s) => s.setProvider);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setModel = useSettingsStore((s) => s.setModel);
  const setCustomEndpoint = useSettingsStore((s) => s.setCustomEndpoint);

  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(byok.apiKey);

  useEffect(() => {
    if (open) {
      setLocalKey(byok.apiKey);
      setShowKey(false);
    }
  }, [open, byok.apiKey]);

  const providerLabel = (p: AIProvider) =>
    t(
      p === 'gemini'
        ? 'settings.providerGemini'
        : p === 'openai'
          ? 'settings.providerOpenAI'
          : 'settings.providerAnthropic',
    );

  const pricingNote = (p: AIProvider) =>
    t(
      p === 'gemini'
        ? 'settings.pricingGemini'
        : p === 'openai'
          ? 'settings.pricingOpenAI'
          : 'settings.pricingAnthropic',
    );

  const docsLabel = (p: AIProvider) =>
    t(
      p === 'gemini'
        ? 'settings.apiKeyDocsGemini'
        : p === 'openai'
          ? 'settings.apiKeyDocsOpenAI'
          : 'settings.apiKeyDocsAnthropic',
    );

  const handleSave = () => {
    setApiKey(localKey);
    onClose();
  };

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    if (!MODEL_OPTIONS[p].some((m) => m.id === byok.model)) {
      setModel(DEFAULT_MODELS[p]);
    }
  };

  return (
    <AIModal
      open={open}
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={18} className="text-mint-500" /> {t('settings.title')}
        </span>
      }
      typewriter={false}
      width={520}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <AIButton onClick={onClose}>{t('settings.cancel')}</AIButton>
          <AIButton type="primary" onClick={handleSave}>
            {t('settings.save')}
          </AIButton>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        <div className="flex items-start gap-2 text-xs text-leaf-700 bg-mint-50 border-2 border-mint-100 rounded-2xl p-3">
          <Info size={14} className="text-mint-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{t('settings.privacyNote')}</span>
        </div>

        <div>
          <label className="text-xs font-bold text-leaf-700">{t('settings.providerLabel')}</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {(['gemini', 'openai', 'anthropic'] as AIProvider[]).map((p) => {
              const active = byok.provider === p;
              return (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`py-2 rounded-full text-xs font-bold transition border-2 ${
                    active
                      ? 'bg-mint-500 text-white border-mint-500'
                      : 'bg-white text-leaf-700 border-cream-200 hover:bg-cream-50'
                  }`}
                  style={active ? { boxShadow: '0 3px 0 0 #11a89b' } : { boxShadow: '0 2px 0 0 #d4c9b4' }}
                >
                  {providerLabel(p)}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-leaf-600 mt-1.5">{pricingNote(byok.provider)}</p>
        </div>

        <div>
          <label className="text-xs font-bold text-leaf-700">{t('settings.modelLabel')}</label>
          <select
            value={byok.model}
            onChange={(e) => setModel(e.target.value)}
            className="input w-full mt-1.5 py-2 text-sm font-semibold"
            style={{ borderWidth: 2 }}
          >
            {MODEL_OPTIONS[byok.provider].map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.note ? ` — ${m.note}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-leaf-700 flex items-center justify-between">
            <span>{t('settings.apiKeyLabel')}</span>
            <a
              href={KEY_DOCS_URL[byok.provider]}
              target="_blank"
              rel="noreferrer"
              className="text-mint-600 hover:text-mint-700 font-semibold flex items-center gap-1 text-[11px]"
            >
              {docsLabel(byok.provider)}
              <ExternalLink size={11} />
            </a>
          </label>
          <div className="relative mt-1.5">
            <input
              type={showKey ? 'text' : 'password'}
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder={
                byok.provider === 'gemini'
                  ? 'AIza...'
                  : byok.provider === 'openai'
                    ? 'sk-...'
                    : 'sk-ant-...'
              }
              spellCheck={false}
              autoComplete="off"
              className="input w-full pr-10 font-mono text-sm py-2"
              style={{ borderWidth: 2 }}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-leaf-500 hover:text-mint-600 transition"
              title={showKey ? t('settings.apiKeyHide') : t('settings.apiKeyShow')}
              type="button"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {byok.provider === 'openai' && (
          <div>
            <label className="text-xs font-bold text-leaf-700">
              {t('settings.customEndpointLabel')}{' '}
              <span className="font-normal text-leaf-500">{t('settings.customEndpointOptional')}</span>
            </label>
            <input
              type="url"
              value={byok.customEndpoint ?? ''}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="input w-full mt-1.5 font-mono text-sm py-2"
              style={{ borderWidth: 2 }}
            />
          </div>
        )}
      </div>
    </AIModal>
  );
}
