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

// Recommended cheap-vision defaults per provider.
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
};

// Models the UI exposes; not exhaustive but covers the cheap+vision picks.
export const MODEL_OPTIONS: Record<AIProvider, Array<{ id: string; label: string; note?: string }>> = {
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', note: '最便宜 + 视觉，推荐' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: '更准, 略贵' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: '便宜 + 视觉' },
    { id: 'gpt-4o', label: 'GPT-4o', note: '更准, 贵 10x' },
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', note: '便宜 + 视觉' },
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', note: '更准' },
  ],
};

function loadInitial(): BYOKSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BYOKSettings>;
      const provider = (parsed.provider as AIProvider) || 'gemini';
      return {
        provider,
        apiKey: parsed.apiKey ?? '',
        model: parsed.model || DEFAULT_MODELS[provider],
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
