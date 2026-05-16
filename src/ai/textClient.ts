// Text-only LLM adapter used by the generation flow.
//
// Users describe an island in natural language ("我想要日式茶园，要有锦鲤池
// 和几张坐席") and pick a primary style; the LLM returns the same
// `RecognitionResult` shape the vision pipeline produces, so the existing
// "select items → place on canvas / export shopping list" UI works without
// any branching.
//
// Same three providers as `visionClient` (Gemini / OpenAI / Anthropic) and
// the same BYOK settings — no backend.

import { matchCatalog } from './catalogMatcher';
import { STYLES } from './styles';
import type { StyleId } from './types';
import type {
  CatalogMatch,
  MatchedItem,
  RawVisionResponse,
  RecognitionResult,
} from './visionTypes';
import { VisionError } from './visionClient';
import type { AIProvider, BYOKSettings } from '../stores/settingsStore';

const STYLE_IDS: StyleId[] = ['japanese', 'garden', 'fairy', 'cafe', 'modern'];

// We bias the model toward our 60-item curated catalog by listing its English
// names in the system prompt — anything outside this is welcome but harder to
// auto-place (catalog matcher will still surface NH fallbacks).
const CATALOG_HINTS = [
  'museum', 'resident services', 'nooks cranny', 'able sisters', 'campsite',
  'player house', 'villager house', 'wooden bridge', 'stone bridge', 'brick bridge',
  'wooden incline', 'stone incline', 'oak tree', 'pine tree', 'cherry blossom tree',
  'palm tree', 'bamboo', 'apple tree', 'shrub',
  'red rose', 'white rose', 'yellow tulip', 'pink tulip', 'white lily',
  'pink cosmos', 'blue hyacinth', 'white mum',
  'bamboo fence', 'wooden fence', 'iron fence', 'log fence',
  'stone lantern', 'zen bell tower', 'tea table', 'cafe chair', 'beach parasol',
  'wooden bench', 'streetlight', 'fountain', 'windmill', 'mailbox', 'campfire',
  'tent', 'log bench', 'sandbox', 'swing', 'koi pond decoration', 'torii gate',
  'rock garden', 'flag pole', 'phone booth', 'planter box', 'garden lamp post',
  'mushroom decoration', 'water well', 'modern sculpture',
];

function buildSystemInstruction(style: StyleDef, density: 'sparse' | 'medium' | 'dense'): string {
  return `你是一名《动物之森：新视界》(ACNH) 资深岛屿设计师。
用户会用自然语言描述他们想要的岛屿区域风格。请把构想转化成可放置的 ACNH 物品清单，并只输出结构化 JSON（不要任何前后文字、不要 markdown 围栏）。

风格基调：${style.name} (${style.id}) — ${style.description}
密度要求：${density}（sparse≈8~14 件、medium≈18~28 件、dense≈30~45 件）

需要输出：
1. 五种风格的契合分数 (japanese / garden / fairy / cafe / modern)，各项 0~1。主风格 ${style.id} 应该 ≥ 0.7。
2. 中文 1~2 句场景描述。
3. 实际的密度等级。
4. 推荐放置的物品列表，每项给：
   - nameEn: 完整英文名 (尽量与 Nookipedia 一致，例如 "stone lantern"、"cherry blossom tree"、"tea table"、"streetlight"、"wooden bench")
   - count: 建议数量（整数，>=1）
   - confidence: 你对这条建议的信心 0~1
   - region: "center" | "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "scattered"
   - note: 可选 1 句中文备注（如"围绕水池"）

建议优先使用下列常见物品名称之一（必要时也可超出此列表）：
${CATALOG_HINTS.join(', ')}

JSON schema（且只输出此 schema）：
{
  "styleScores": { "japanese": number, "garden": number, "fairy": number, "cafe": number, "modern": number },
  "description": string,
  "density": "sparse" | "medium" | "dense",
  "items": [{ "nameEn": string, "count": integer, "confidence": number, "region"?: string, "note"?: string }]
}`;
}

interface StyleDef {
  id: StyleId;
  name: string;
  description: string;
}

const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    styleScores: {
      type: 'object',
      properties: Object.fromEntries(STYLE_IDS.map((s) => [s, { type: 'number' }])),
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

export interface GenerateRequest {
  /** Primary style — biases the prompt and is required ≥ 0.7 in styleScores. */
  style: StyleId;
  /** Free-form description from the user (Chinese / English / Japanese — pass through). */
  description: string;
  /** How crowded the scene should feel. */
  density: 'sparse' | 'medium' | 'dense';
}

interface ProviderCall {
  text: string;
  usage?: { in: number; out: number };
}

async function callGemini(
  byok: BYOKSettings,
  system: string,
  user: string,
): Promise<ProviderCall> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${byok.model}:generateContent?key=${encodeURIComponent(byok.apiKey)}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.55,
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
  system: string,
  user: string,
): Promise<ProviderCall> {
  const endpoint =
    (byok.customEndpoint?.replace(/\/$/, '') || 'https://api.openai.com/v1') + '/chat/completions';
  const body = {
    model: byok.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.55,
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
  system: string,
  user: string,
): Promise<ProviderCall> {
  const endpoint = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: byok.model,
    max_tokens: 2000,
    temperature: 0.55,
    system,
    messages: [{ role: 'user', content: user }],
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

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
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
  const styleScores = STYLE_IDS.reduce(
    (acc, s) => {
      acc[s] = clamp01(styleScoresRaw[s]);
      return acc;
    },
    {} as Record<StyleId, number>,
  );

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

/**
 * Main entry point. Throws `VisionError` on any failure (reused so the UI
 * layer doesn't need a second error type).
 */
export async function generateScene(
  req: GenerateRequest,
  byok: BYOKSettings,
): Promise<RecognitionResult> {
  if (!byok.apiKey) {
    throw new VisionError('API Key 未配置，请先到设置里填入。');
  }
  const styleDef = STYLES.find((s) => s.id === req.style);
  if (!styleDef) {
    throw new VisionError(`Unknown style: ${req.style}`);
  }

  const system = buildSystemInstruction(
    { id: styleDef.id, name: styleDef.name, description: styleDef.description },
    req.density,
  );
  const trimmedDesc = req.description.trim();
  const userPrompt = trimmedDesc
    ? `用户描述：${trimmedDesc}\n\n请按 system 中的 JSON schema 给出符合「${styleDef.name}」风格、密度「${req.density}」的物品方案。`
    : `请按 system 中的 JSON schema 给出一份典型的「${styleDef.name}」风格、密度「${req.density}」的物品方案。`;

  const fn = PROVIDER_FNS[byok.provider];
  if (!fn) throw new VisionError(`Unsupported provider: ${byok.provider}`);

  const { text, usage } = await fn(byok, system, userPrompt);

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

  const topStyles = STYLE_IDS.map((s) => ({ style: s, score: raw.styleScores[s] })).sort(
    (a, b) => b.score - a.score,
  );

  // Reuse the RecognitionResult shape so downstream UI doesn't need to know
  // the data came from text generation. `imageDataUrl` is left empty.
  return {
    imageDataUrl: '',
    provider: byok.provider,
    model: byok.model,
    ranAt: Date.now(),
    topStyles,
    raw,
    items,
    usage,
  };
}
