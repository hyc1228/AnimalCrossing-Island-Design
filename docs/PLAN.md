# 岛屿规划师 · 产品方案

> 最近更新: 2026-05-16
> 状态: 第二迭代已收尾 · 等待用户反馈再排第三轮

## 一句话定位

**别人的好设计 + 你的家具清单 + 你的平面图** —— 一个把"参考图 → 可执行方案"做到极致的免费 ACNH 岛屿规划工具。

## 战略转向（重要）

最早一版的卖点是"AI 一键生成完整岛屿"，对标 Happy Island Designer。后来认识到这条路：
- **竞品扎堆**：HID、Island Designer App、Semantic Pen 都在做类似事
- **玩家心智不对**：花 80 小时建岛的人不会要"AI 帮我摆好"
- **质量难保证**：LLM 生成布局参差不齐

**改走"识别 + 检索"路线**：
- 玩家刷到一张好看的 Pinterest/小红书图 → 上传 → AI 识别出家具清单 + 风格 + 试探性平面图
- 玩家有粗略草图 → 系统匹配相似的设计参考
- 出口是"购物清单 + 起点平面图"，玩家拿回游戏里执行，价值落地清晰
- 没有竞品在做这件事

## 核心原则

1. **完全免费**：默认体验零成本，AI 调用走 BYOK
2. **本地优先**：玩家上传的图片、识别结果、设计文件**只保存在本地浏览器**，永不上传任何服务器
3. **无后端**：纯前端 + 用户自带 LLM API Key，部署到任意静态托管 (GitHub Pages / Vercel / Cloudflare Pages)
4. **多模型适配**：Gemini / OpenAI / Anthropic 三个 provider 任选
5. **中文优先**：UI 中文 + 物品中英双名，i18n 已经支持 zh-CN / en / ja

## MVP 范围（当前迭代目标）

### 包含
- ✅ **AI 服务设置**：BYOK 配置（provider / model / key），localStorage 持久化
- ✅ **多模态 LLM 客户端**：Gemini Flash / GPT-4o-mini / Claude Haiku 三家适配
- ✅ **物品名匹配器**：把 LLM 识别到的英文物品名 fuzzy 匹配到本地 60 件精选 + 2075 件 Nookipedia 数据
- 🔄 **识别页面 `/recognize`**：上传图片 → 调用 LLM → 显示风格分析+物品清单 → "导出 TXT" / "应用到新岛屿"
- ⏳ **首页入口**：从 HomePage 跳转到识别页

### 不包含（明确推迟）
- ❌ **后端服务**：不做。所有功能都在浏览器里完成
- ❌ **公共参考库**：不做。玩家不需要共享、不存任何用户数据
- ❌ **UGC / 上传分享**：不做
- ❌ **图片识别历史记录**（本地）：第二迭代再加
- ❌ **HID PNG 解码器**：第二迭代再加（[已验证可逆](#技术决策记录)）
- ❌ **平面图相似度匹配**：第二迭代再加（要先有"本地灵感库"才有匹配池）

## 数据流

```
┌──────────────┐    BYOK key      ┌──────────────────┐
│  浏览器      │  ──────────────►  │ LLM Provider API │
│  RecognizePage│                  │ (Gemini/GPT/Claude)│
│   │          │                  └─────────┬─────────┘
│   ▼          │                            │
│ 上传 File    │                            ▼
│   │          │                       JSON 结果
│   ▼          │  ◄───────────────────────────
│ FileReader   │
│ → base64     │
│   │          │
│   ▼          │
│ visionClient │
│   │          │
│   ▼          │
│ 解析 + 校验  │
│   │          │
│   ▼          │
│ catalogMatcher │  (匹配本地 60+2075 数据)
│   │          │
│   ▼          │
│ RecognitionResult │
│   │          │
│   ▼          │
│ UI 展示      │  + 一键"应用到新岛屿"
└──────────────┘     ↓
                IslandDesign → localStorage → /editor/:id
```

**关键点**：图片本身**永远不离开浏览器**，只在内存里转 base64 发给 LLM provider。LLM 厂商按各自隐私政策处理；我们不留任何记录。

## 当前进度

### 已完成
| 文件 | 用途 |
|---|---|
| `scripts/parse-nookipedia-furniture.mjs` | 抓 Nookipedia 全量家具数据脚本 |
| `src/data/nh-furniture.json` | 2075 件 NH 家具数据（含图片URL、价格、HHA主题、占地） |
| `src/data/nh-furniture.ts` | JSON 的 TS 类型包装 |
| `src/ai/visionTypes.ts` | 识别结果 schema (RawVisionResponse / MatchedItem / RecognitionResult) |
| `src/ai/catalogMatcher.ts` | 物品名 fuzzy 匹配（精选 + NH 数据） |
| `src/ai/visionClient.ts` | 多模态 LLM 适配层（Gemini / OpenAI / Anthropic） |
| `src/stores/settingsStore.ts` | BYOK 设置 store（provider/model/apiKey, localStorage） |
| `src/components/SettingsDialog/SettingsDialog.tsx` | BYOK 设置弹窗 |
| `src/pages/RecognizePage.tsx` | 主识别页面（上传、识别、展示、导出、应用） |
| `src/App.tsx` | 加了 `/recognize` 路由 |

### 待完成
- [ ] HomePage 加"参考图识别"入口（之前发现 HomePage 已被 i18n+animal-island-ui 重构）
- [ ] RecognizePage + SettingsDialog 视觉对齐到新设计系统（mint/cream/sun 色板 + AIButton/AICard 组件）
- [ ] i18n keys：把识别页的中文字符串挪进 `src/i18n/locales/*.json`
- [ ] `tsc -b` 通过
- [ ] 跑通整链路：上传 → 识别 → 出清单 → 应用到画布 → 编辑器

### 第二迭代进度
1. ✅ **本地灵感库** `/inspirations`：每次识别结果自动存到 localStorage（缩略图压到 720px / JPEG 0.78），最多 40 条；首页顶部导航和英雄区都有入口；详情页可重新应用到新岛屿、导出购物清单、单条/全部删除。
   - 文件：`src/stores/inspirationsStore.ts`、`src/pages/InspirationsPage.tsx`
2. ✅ **HID PNG 解码器 + 导入到画布** `/import-hid`：完整复用 HID 的 LZ-String + 隐写格式，解出 v1/v2 JSON，按 `category/type` 聚合显示物品分布，下载完整 JSON，**一键导入到新岛屿**。坐标从 HID 的 112×96 paper.js 网格线性映射到我们的 80×70 网格；建筑/桥梁/坡道/树木/花卉走 `hidCatalog.ts` 映射表，未覆盖的类型记入跳过统计 + 高频项展示。
   - 文件：`src/import/steganography.ts`、`src/import/hidDecoder.ts`、`src/import/hidCatalog.ts`、`src/pages/ImportHidPage.tsx`
3. ✅ **NH 数据接入 ItemPalette**：物品库新增 "NH 2075" 切换模式，按 HHA 主题分组 + 简易虚拟滚动（自定义实现，无外部依赖）。
   - 通过 `src/data/itemResolver.ts` 把 `nh:<slug>` 这种 itemKey 即时合成为 ItemDef（image URL、size、颜色）
   - IslandCanvas 增加 `SpriteShape` 分支：`def.imageUrl` 触发 Konva Image 渲染，带模块级 image 缓存
   - canvasStore.placeItem / Preview3D / FurnitureList 全部走 resolver
4. ✅ **PNG 导出 + URL 分享**：
   - Toolbar 新增"导出 PNG"按钮：临时重置 stage scale/位置 → `stage.toDataURL({ pixelRatio: 2 })` → 浏览器下载
   - "复制分享链接"按钮：`utils/shareDesign.ts` 用 `LZString.compressToEncodedURIComponent` 把岛屿 JSON 塞进 `#design=...`，HomePage 检测 hash 自动导入并跳转编辑器，URL 自动清空避免重复导入
5. ✅ **平面图相似度匹配**：`utils/similarity.ts` 计算 `0.55 × cosine(styleScores) + 0.45 × jaccard(items)`；灵感库详情弹窗底部多了"相似的参考"列表，点击切换到那张灵感。
6. **AI 文本驱动生成**（未做）：选风格 + 中文描述 → 规则引擎 + LLM hint
7. **本地灵感库引入 NH 物品过滤**（待提）：详情页支持只看带 NH 完整匹配的物品

## 技术决策记录

### LLM Provider 选型
| Provider | 默认模型 | 单图成本（约） | 备注 |
|---|---|---|---|
| **Google Gemini** (默认) | `gemini-2.0-flash` | < ¥0.001 | 最便宜 + 视觉，Google AI Studio 有免费额度 |
| OpenAI | `gpt-4o-mini` | ¥0.005 | 国内访问需代理；支持 `response_format: json_object` |
| Anthropic | `claude-3-5-haiku-latest` | ¥0.02 | 需 `anthropic-dangerous-direct-browser-access` 头允许浏览器直连 |

所有三家都支持浏览器直接 fetch，**无需后端代理**。

### HID PNG 编码格式（已逆向）
HappyIslandDesigner 用以下流程把设计塞进 PNG：

```
state(JSON) → JSON.stringify
  → LZString.compressToUTF16    // 双字节 UTF-16 字符串压缩
  → steganography (LSB) 嵌入像素 // vendors/steganography.ts
  → 输出 PNG
```

**结论**：完全可逆。后续要写解码器就直接装 `lz-string` + 复制他们的 `steganography` 库 → 把分享的 PNG 喂进去拿到原始 JSON → 转成我们的 `IslandDesign`。

JSON 字段（v2 格式）：
- `objects`: `{ "category_type": [x, y, x, y, ...] }`  键是 `${category}_${type}`，值是扁平坐标数组
- `drawing`: 每种颜色一组 path 段（地形）
- `edgeTiles`: 24 个数字（v2 only，海岸边缘自定义）

源码位置：`.research/hid/app/save.ts` + `save-legacy.ts`。

### 隐私与权限
- API Key 明文存 localStorage（MVP 简化）。Settings 弹窗里有显眼提示"仅保存在本设备"
- 图片转 base64 后只 in-memory，调用完即丢
- 不做加密、不做指纹、不发任何遥测请求
- 不写任何 `fetch` 到我们自己的域名

### Provider 调用细节
- **Gemini**：URL `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...`，body 用 `systemInstruction` + `contents` + `generationConfig.responseSchema`
- **OpenAI**：URL `/v1/chat/completions`，`messages[*].content` 支持 `image_url` 类型；`response_format: { type: 'json_object' }`
- **Anthropic**：URL `/v1/messages`，`messages[*].content` 用 `{type:'image', source:{type:'base64',media_type,data}}`，请求头加 `anthropic-dangerous-direct-browser-access: true`

### 物品名匹配策略
LLM 被 prompt 要求输出 Nookipedia 标准英文名（如 `stone lantern`）。本地 fuzzy 匹配：
- 归一化（lowercase, strip 标点, 去停用词 the/a/an）
- 精确字符串 → 1.0
- 包含关系 → 0.75 + 长度比例
- Token Jaccard + 子集加权 → 0..0.9
- 返回 top-5 候选，score 阈值 0.35

候选池：60 件精选（`ITEMS`）+ 2075 件 NH（`NH_FURNITURE`），合计 ~2135 行的 in-memory 表。

## 文件夹结构

```
.
├── docs/
│   └── PLAN.md                      ← 你在看的这个文件
├── scripts/
│   ├── parse-nookipedia-furniture.mjs
│   └── README.md
├── src/
│   ├── ai/
│   │   ├── types.ts                 五种风格定义
│   │   ├── styles.ts                风格 palette + 描述
│   │   ├── generator.ts             【保留】规则式整岛生成器
│   │   ├── visionTypes.ts           ← MVP
│   │   ├── visionClient.ts          ← MVP
│   │   └── catalogMatcher.ts        ← MVP
│   ├── components/
│   │   ├── AISuggestPanel/          【保留】规则式生成 UI
│   │   ├── SettingsDialog/          ← MVP
│   │   ├── ItemPalette/             ← 第二迭代要接入 NH 数据
│   │   ├── Canvas/                  Konva 2D 画布
│   │   ├── Preview3D/               R3F 3D 预览
│   │   ├── Toolbar/  LayerPanel/
│   │   └── FurnitureList/
│   ├── data/
│   │   ├── items.ts                 60 件精选
│   │   ├── nh-furniture.json        2075 件原始
│   │   ├── nh-furniture.ts          类型包装
│   │   └── templates.ts             5 个模板（规则引擎生成）
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/{zh-CN,en,ja}.json
│   ├── pages/
│   │   ├── HomePage.tsx             【已重构成 animal-island-ui + i18n】
│   │   ├── EditorPage.tsx
│   │   ├── GalleryPage.tsx
│   │   └── RecognizePage.tsx        ← MVP
│   ├── stores/
│   │   ├── canvasStore.ts
│   │   ├── uiStore.ts
│   │   └── settingsStore.ts         ← MVP
│   └── utils/
│       ├── grid.ts
│       └── storage.ts
└── .research/hid/                  HID 源码副本（已 gitignore 待添加）
```

## 下一步候选（等用户挑）

第二迭代结束。下一轮可挑（无强制顺序）：

1. **AI 文本生成**：输入风格 + 中文描述 → 调用 LLM 生成放置候选 → 接入现有"接受/换一个"流程
2. **HID 映射扩张**：扩充 `hidCatalog.ts` 覆盖 HID 的小件 / 围栏，并把 HID 的 `drawing` 数据反解成我们的 terrain 数组（地形导入）
3. **NH 物品的 Konva 旋转/翻转**：现在 NH item 都是 1×1，加更细的 size 推断（如 NH 数据 `size.w/h` 0.5/1.5 的 fractional）
4. **画布缩略图**：保存设计时顺便生成 1280×... 缩略图存到 IslandDesign.thumbnail，HomePage 的设计卡片用它代替 🏝️ emoji
5. **URL 分享 - 短链 / QR**：当前 URL 在 80×70 全 0 地形 + 30 件物品下大约 1.2 KB，可以加个 QR 显示
6. **批量物品颜色 / 主题**：NH 数据带 HHA 主题，做"按主题快速布景"的快捷操作
7. **iPad / 手机适配**：编辑器在窄屏下面板布局
8. **代码切割**：现在主 bundle 2.1 MB，按 page 切 chunk
9. **PNG 一键发到剪贴板**：除了下载之外，还提供 `navigator.clipboard.write` 的 PNG 复制

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| LLM 输出物品名跟 Nookipedia 对不上 | catalogMatcher 已经做 fuzzy；后续可以让 LLM 在 prompt 里参考一份"高频物品名"清单 |
| Gemini 在中国大陆访问不稳定 | UI 里给 OpenAI / Anthropic 兜底；OpenAI 支持自定义 endpoint（中转代理） |
| 用户没 API Key 用不了 | Gemini 在 AI Studio 有免费额度，文档里要写清怎么申请 |
| LLM 调用超时/失败 | UI 显示 VisionError 详情；用户可重试或换 provider |
| API Key 泄露风险 | UI 提示"仅本地存储"；用户可随时清除。明文风险用户自己承担 |
| 3D 图识别准确率有限 | UI 标明"3D 图识别风格 + 物品列表，俯视图才还原网格"；管理预期 |
