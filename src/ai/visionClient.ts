// Multimodal-LLM adapter used by the recognition flow.
// Sends an image + prompt to the user's BYOK provider and returns a typed
// RecognitionResult. Three providers are supported directly from the browser:
//   - Google Gemini (default; cheapest with vision; JSON-mode native)
//   - OpenAI (gpt-4o family via /v1/chat/completions, response_format: json_object)
//   - Anthropic (claude-3.5-*; needs the dangerous-direct-browser header)
//
// No backend is involved; users supply their own key in Settings.

import { matchCatalog } from './catalogMatcher';
import type { StyleId } from './types';
import type {
  CatalogMatch,
  MatchedItem,
  RawVisionResponse,
  RecognitionResult,
} from './visionTypes';
import type { AIProvider, BYOKSettings } from '../stores/settingsStore';

const STYLE_IDS: StyleId[] = ['japanese', 'garden', 'fairy', 'cafe', 'modern'];

const SYSTEM_INSTRUCTION = `你是一名《动物之森：新视界》(Animal Crossing: New Horizons) 岛屿设计分析专家。
用户会上传一张岛屿/区域截图。请用结构化 JSON 返回分析结果，且只输出 JSON，不要任何前后文字。

需要识别：
1. 五种风格的匹配分数 (japanese 日式 / garden 田园 / fairy 童话 / cafe 咖啡 / modern 现代)，各项 0~1，加起来不要求归一。
2. 中文一句话场景描述。
3. 整体密度: "sparse" | "medium" | "dense"。
4. 可见的家具/树木/建筑列表，每项给:
   - nameEn: 完整英文名 (与 Nookipedia 一致，例如 "stone lantern"、"cherry blossom tree"、"tea table"、"streetlight")
   - count: 可见数量 (无法估算时用 1)
   - confidence: 0~1
   - region: "center" | "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "scattered"
   - note: 可选 1 句中文备注

仅输出符合以下 schema 的 JSON：
{
  "styleScores": { "japanese": number, "garden": number, "fairy": number, "cafe": number, "modern": number },
  "description": string,
  "density": "sparse" | "medium" | "dense",
  "items": [{ "nameEn": string, "count": integer, "confidence": number, "region"?: string, "note"?: string }]
}`;

const USER_PROMPT =
  '请分析这张 ACNH 岛屿/区域截图，按 system 中定义的 JSON schema 返回结果。识别尽量完整，至少列出 5 件可见物品。';

// Provider-agnostic response schema used by Gemini structured output.
const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    styleScores: {
      type: 'object',
      properties: Object.fromEntries(
        STYLE_IDS.map((s) => [s, { type: 'number' }]),
      ),
      required: STYLE_IDS,
    },
    description: { type: 'string' },
    density: { type: 'string', enum: ['sparse', 'medium', 'dense'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nameEn: { type: 'string' },
          count: { type: 'integer' },
          confidence: { type: 'number' },
          region: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['nameEn', 'count', 'confidence'],
      },
    },
  },
  required: ['styleScores', 'description', 'density', 'items'],
};

/** Read a File / Blob and resolve to `{ mimeType, base64 }` (without the data: prefix). */
export async function fileToBase64(file: File): Promise<{ mimeType: string; base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) {
        reject(new Error('Unexpected FileReader output'));
        return;
      }
      resolve({ mimeType: m[1], base64: m[2], dataUrl });
    };
    reader.readAsDataURL(file);
  });
}

export class VisionError extends Error {
  status?: number;
  body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = 'VisionError';
    this.status = status;
    this.body = body;
  }
}

interface ProviderCall {
  text: string;
  usage?: { in: number; out: number };
}

async function callGemini(
  byok: BYOKSettings,
  mimeType: string,
  base64: string,
): Promise<ProviderCall> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${byok.model}:generateContent?key=${encodeURIComponent(byok.apiKey)}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: USER_PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new VisionError(`Gemini API ${res.status}`, res.status, await res.text());
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    throw new VisionError('Gemini returned empty/unexpected response', undefined, JSON.stringify(json));
  }
  const usage = json?.usageMetadata
    ? { in: json.usageMetadata.promptTokenCount ?? 0, out: json.usageMetadata.candidatesTokenCount ?? 0 }
    : undefined;
  return { text, usage };
}

async function callOpenAI(
  byok: BYOKSettings,
  mimeType: string,
  base64: string,
): Promise<ProviderCall> {
  const endpoint = (byok.customEndpoint?.replace(/\/$/, '') || 'https://api.openai.com/v1') + '/chat/completions';
  const body = {
    model: byok.model,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: USER_PROMPT },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${byok.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new VisionError(`OpenAI API ${res.status}`, res.status, await res.text());
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new VisionError('OpenAI returned empty/unexpected response', undefined, JSON.stringify(json));
  }
  const usage = json?.usage
    ? { in: json.usage.prompt_tokens ?? 0, out: json.usage.completion_tokens ?? 0 }
    : undefined;
  return { text, usage };
}

async function callAnthropic(
  byok: BYOKSettings,
  mimeType: string,
  base64: string,
): Promise<ProviderCall> {
  const endpoint = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: byok.model,
    max_tokens: 1500,
    temperature: 0.2,
    system: SYSTEM_INSTRUCTION,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          { type: 'text', text: USER_PROMPT },
        ],
      },
    ],
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': byok.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new VisionError(`Anthropic API ${res.status}`, res.status, await res.text());
  }
  const json = await res.json();
  const text = json?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new VisionError('Anthropic returned empty/unexpected response', undefined, JSON.stringify(json));
  }
  const usage = json?.usage
    ? { in: json.usage.input_tokens ?? 0, out: json.usage.output_tokens ?? 0 }
    : undefined;
  return { text, usage };
}

const PROVIDER_FNS: Record<AIProvider, typeof callGemini> = {
  gemini: callGemini,
  openai: callOpenAI,
  anthropic: callAnthropic,
};

/** Strip ```json fences etc. that some providers might wrap around the payload. */
function extractJsonText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find the first '{' through the last '}'.
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function clamp01(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function validateAndNormalize(raw: unknown): RawVisionResponse {
  if (!raw || typeof raw !== 'object') {
    throw new VisionError('LLM JSON is not an object');
  }
  const r = raw as Record<string, unknown>;
  const styleScoresRaw = (r.styleScores ?? {}) as Record<string, unknown>;
  const styleScores = STYLE_IDS.reduce((acc, s) => {
    acc[s] = clamp01(styleScoresRaw[s]);
    return acc;
  }, {} as Record<StyleId, number>);

  const density = (() => {
    const d = String(r.density ?? 'medium').toLowerCase();
    return d === 'sparse' || d === 'dense' ? d : 'medium';
  })() as RawVisionResponse['density'];

  const items = Array.isArray(r.items) ? r.items : [];
  const normalizedItems = items
    .map((it) => {
      if (!it || typeof it !== 'object') return null;
      const o = it as Record<string, unknown>;
      const nameEn = typeof o.nameEn === 'string' ? o.nameEn.trim() : '';
      if (!nameEn) return null;
      const count = Math.max(1, Math.round(Number(o.count) || 1));
      const confidence = clamp01(o.confidence);
      const region = typeof o.region === 'string' ? o.region : undefined;
      const note = typeof o.note === 'string' ? o.note : undefined;
      return { nameEn, count, confidence, region, note } as RawVisionResponse['items'][number];
    })
    .filter((x): x is RawVisionResponse['items'][number] => x !== null);

  return {
    styleScores,
    description: typeof r.description === 'string' ? r.description : '',
    density,
    items: normalizedItems,
  };
}

function attachCatalogMatches(items: RawVisionResponse['items']): MatchedItem[] {
  return items.map((it) => {
    const matches: CatalogMatch[] = matchCatalog(it.nameEn, 5, 0.35);
    return { ...it, matches };
  });
}

/** Main entry point. Throws VisionError on any failure. */
export async function recognizeImage(file: File, byok: BYOKSettings): Promise<RecognitionResult> {
  if (!byok.apiKey) {
    throw new VisionError('API Key 未配置，请先到设置里填入。');
  }
  const { mimeType, base64, dataUrl } = await fileToBase64(file);

  const fn = PROVIDER_FNS[byok.provider];
  if (!fn) throw new VisionError(`Unsupported provider: ${byok.provider}`);

  const { text, usage } = await fn(byok, mimeType, base64);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(text));
  } catch (e) {
    throw new VisionError(
      'LLM 返回的不是合法 JSON：' + (e as Error).message,
      undefined,
      text.slice(0, 800),
    );
  }
  const raw = validateAndNormalize(parsed);
  const items = attachCatalogMatches(raw.items);

  const topStyles = STYLE_IDS.map((s) => ({ style: s, score: raw.styleScores[s] }))
    .sort((a, b) => b.score - a.score);

  return {
    imageDataUrl: dataUrl,
    provider: byok.provider,
    model: byok.model,
    ranAt: Date.now(),
    topStyles,
    raw,
    items,
    usage,
  };
}
