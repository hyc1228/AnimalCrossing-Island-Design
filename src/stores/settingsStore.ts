import { create } from 'zustand';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface BYOKSettings {
  provider: AIProvider;
  /** Plaintext API key, persisted to localStorage only on this device. */
  apiKey: string;
  /** Selected model id (provider-specific). */
  model: string;
  /** Optional OpenAI-compatible custom endpoint. */
  customEndpoint?: string;
}

interface SettingsState {
  byok: BYOKSettings;
  setProvider: (p: AIProvider) => void;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  setCustomEndpoint: (e: string) => void;
  reset: () => void;
}

const STORAGE_KEY = 'ac_island_planner_settings_v1';

// Recommended cheap-vision defaults per provider (refreshed May 2026).
// We bias toward the cheapest model that still has vision — recognition
// payloads are dominated by the image, so paying for a heavier reasoning
// model rarely changes the answer materially.
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-3-flash-latest',
  openai: 'gpt-5.4-mini',
  anthropic: 'claude-haiku-4-5',
};

// Model lineup as of May 2026. Keep the **recommended** option first in
// each list so the default selector lands on it. We include one or two
// legacy entries (gpt-4o-mini, gemini-2.5-flash) so users who already have
// a working setup against those don't get surprised by a forced upgrade.
export const MODEL_OPTIONS: Record<AIProvider, Array<{ id: string; label: string; note?: string }>> = {
  gemini: [
    { id: 'gemini-3-flash-latest', label: 'Gemini 3 Flash', note: '推荐 · 便宜 + 视觉, frontier 速度' },
    { id: 'gemini-3.1-pro-latest', label: 'Gemini 3.1 Pro', note: '最强, 但贵很多' },
    { id: 'gemini-3.1-flash-lite-latest', label: 'Gemini 3.1 Flash-Lite', note: '最便宜, 适合大批量' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: '旧但稳定' },
  ],
  openai: [
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', note: '推荐 · 便宜 + 视觉' },
    { id: 'gpt-5.4', label: 'GPT-5.4', note: '更准, 贵 10x' },
    { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano', note: '最便宜, 准确率略低' },
    { id: 'gpt-5.5', label: 'GPT-5.5', note: '顶级, 贵很多' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: '旧, 仍可用' },
  ],
  anthropic: [
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: '推荐 · 便宜 + 视觉' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', note: '更准, 中价位' },
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', note: '顶级, 贵 5x' },
  ],
};

/**
 * Best-effort provider detection from the API key prefix. Each vendor uses
 * a stable, easy-to-recognize sentinel:
 *   - Anthropic  → `sk-ant-…`
 *   - OpenAI     → `sk-…` (including `sk-proj-…` and `sk-svcacct-…`)
 *   - Gemini     → `AIza…` (Google AI Studio personal keys)
 *
 * Anthropic is checked **before** OpenAI because `sk-ant-` would also match
 * the broader `sk-` rule. Returns `null` when the key shape is unrecognised
 * (e.g. user is using a proxy / custom endpoint with a non-standard token).
 */
export function detectProviderFromKey(rawKey: string): AIProvider | null {
  const k = rawKey.trim();
  if (!k) return null;
  if (k.startsWith('sk-ant-')) return 'anthropic';
  if (k.startsWith('AIza')) return 'gemini';
  if (k.startsWith('sk-')) return 'openai';
  return null;
}

function loadInitial(): BYOKSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BYOKSettings>;
      const provider = (parsed.provider as AIProvider) || 'gemini';
      // Migration: if the persisted model is no longer in our lineup (e.g. an
      // older default like `gemini-2.0-flash` or `claude-3-5-haiku-latest`),
      // silently upgrade to the current per-provider default so existing
      // users don't get "model not found" errors after we bump the catalog.
      const persistedModel = parsed.model;
      const model =
        persistedModel && MODEL_OPTIONS[provider].some((m) => m.id === persistedModel)
          ? persistedModel
          : DEFAULT_MODELS[provider];
      return {
        provider,
        apiKey: parsed.apiKey ?? '',
        model,
        customEndpoint: parsed.customEndpoint,
      };
    }
  } catch {
    // ignore
  }
  return { provider: 'gemini', apiKey: '', model: DEFAULT_MODELS.gemini };
}

function persist(state: BYOKSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable / full; we accept transient settings in that case.
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  byok: loadInitial(),
  setProvider: (provider) =>
    set((s) => {
      const next: BYOKSettings = {
        ...s.byok,
        provider,
        // Reset model to provider default if the previous model isn't valid for this provider.
        model: MODEL_OPTIONS[provider].some((m) => m.id === s.byok.model)
          ? s.byok.model
          : DEFAULT_MODELS[provider],
      };
      persist(next);
      return { byok: next };
    }),
  setApiKey: (apiKey) =>
    set((s) => {
      const next = { ...s.byok, apiKey: apiKey.trim() };
      persist(next);
      return { byok: next };
    }),
  setModel: (model) =>
    set((s) => {
      const next = { ...s.byok, model };
      persist(next);
      return { byok: next };
    }),
  setCustomEndpoint: (customEndpoint) =>
    set((s) => {
      const next = { ...s.byok, customEndpoint: customEndpoint || undefined };
      persist(next);
      return { byok: next };
    }),
  reset: () => {
    const next: BYOKSettings = { provider: 'gemini', apiKey: '', model: DEFAULT_MODELS.gemini };
    persist(next);
    set({ byok: next });
    void get; // keep get reachable for future actions
  },
}));

/** Convenience selector for components that just need to know if AI is usable. */
export function isBYOKConfigured(): boolean {
  const { apiKey } = useSettingsStore.getState().byok;
  return apiKey.length > 0;
}
