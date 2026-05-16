# 岛屿规划师 · 产品方案

> 最近更新: 2026-05-16
> 状态: 第二迭代 + 第三迭代 1-4 批完成 · 模板库 3D 封面上线 · 等待用户反馈

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

### 第三迭代第二批进度（本批新做）
1. ✅ **AI 文本生成** `/generate`：选风格 + 密度 + 自由描述 → LLM 出物品清单 + 风格分数 + 起点放置 → 复用 RecognizePage 的"勾选→应用到新岛屿"链路（共享 `components/RecognitionResult/ResultPanel.tsx` + `ai/applyResult.ts`）。文本生成也自动收藏到灵感库；3 家 BYOK provider 都通用；中/英/日 prompt 模板齐备。
   - 文件：`src/ai/textClient.ts`、`src/ai/applyResult.ts`、`src/components/RecognitionResult/ResultPanel.tsx`、`src/pages/GeneratePage.tsx`
2. ✅ **主题快速铺设（Scene Packs）**：7 个手工搭配的 4×3 ~ 6×6 小场景（咖啡街角 / 禅意庭院 / 儿童乐园 / 森林营地 / 现代广场 / 田园小院 / 樱花小径），Toolbar 多了"主题快速铺设"按钮；模态弹窗有 SVG 微缩预览 + 按风格过滤；点击后自动选定不与已有物品冲突的中心区域 stamp 下去。
   - 文件：`src/data/scenePacks.ts`、`src/components/ScenePicker/ScenePicker.tsx`、`src/components/Toolbar/Toolbar.tsx`
3. ✅ **iPad / 手机适配**：编辑器在 768px 以下首次进入自动收起两侧面板；面板以 `absolute` 浮层呈现，新增点击空白处即关闭的 backdrop；Toolbar 改成响应式（小屏隐藏文字、压缩按钮、设计名输入框 32→48）。
4. ✅ **画布双指缩放**：IslandCanvas 新增 `onTouchMove/onTouchEnd`，2 指 pinch 触发以指中心为锚点的 scale，单指仍走原 Konva 拖拽逻辑；pinch 时屏蔽放置/绘制 mouseDown，避免误点。
5. ✅ **i18n 全量补齐**：新增 `home.generateIsland`、`generate.*`、`scenes.*` 三组键 × zh-CN / en / ja。

## 第三迭代第三批（已完成）

聚焦"长期使用的稳定性"和"用户能不能找到东西"。

- ✅ **灵感库标签 + 搜索**：`inspirationsStore` 加 `tags: string[]` 字段（v1 自动迁移 `[]`），新增 `setTags`；`InspirationsPage` 增加搜索框（描述 / 物品名 / 标签全文匹配）、置顶的标签筛选条（含计数），详情弹层里有 chip 形态的可编辑标签输入框（回车 / 逗号添加、退格删除、复用建议）。卡片底部展示 ≤3 个标签 +N 概览。
- ✅ **Thumbnail 海蓝边框**：`exportCanvasThumbnail` 改为 async，先把岛屿区域抽成透明 PNG 保留 cornerRadius alpha，然后在 28px 海蓝 padding 的 canvas 上合成，回写 JPEG。彻底消除"圆角变黑"的视觉脏点；灵感卡 / 首页"最近设计"全部受益。
- ✅ **iOS Safari pinch 锁页**：`IslandCanvas` 容器加 `touch-action: none` + `WebkitTouchCallout: none` + `overscrollBehavior: contain`，配合既有的 viewport `user-scalable=no`，让两指捏合只触发画布缩放而不会顺带放大整页。
- ✅ **i18n**：zh-CN / en / ja 同步新增 `inspirations.searchPlaceholder / allTags / shownCount / noMatch / clearFilters / tagsTitle / addTagPlaceholder / addTag / suggestedTags`。

## 第三迭代第四批（已完成）

- ✅ **模板库 3D 封面**：抽出 `Preview3D` 里的所有 r3f 场景图元到独立的 `IslandScene`（地形 / 树 / 花 / 建筑 / 栅栏 / 通用家具，加灯光与海岛基底）；`Preview3D` 重构为复用它的薄壳。新增 `TemplateCover3D`：单个 `<Canvas frameloop="demand">`，固定 isometric 相机，shadow map 仅 512，DPR `[1, 1.5]`，外加 `IntersectionObserver` 懒挂载（只在卡片真正进入视口时才创建 WebGL 上下文，避免 5+ 个 GPU 上下文同时存在）。`GalleryPage.TemplateCard` 用 3D 封面替换 emoji 拼贴，3D 组件用 `React.lazy` 拆分，模板库初始包再瘦一圈（GalleryPage chunk 从 6.85KB → 5.59KB）。
- ✅ **i18n**：`gallery.loading3D` 三语 fallback 文案。

## 下一步候选（等用户挑）

第二轮 + 第三轮三批结束，剩下的候选：

1. **HID 映射扩张**：扩 `hidCatalog.ts` 覆盖更多 HID 子类型（特别是各种花色 → NH 真实花色 itemKey）
2. **NH 物品 fractional size**：NH 数据里 `size.w/h` 是 0.5/1.5 这种浮点；目前一律 ceil 到 1。可以做亚像素布局
3. **AI 识别离线 fallback**：BYOK 未配置时用纯 catalogMatcher + 视觉哈希做"近似估计"
4. **「接受/换一个」流程深化**：现在 GeneratePage 是 1 次生成 → 全量应用；可以做"接受部分 + 再生成补充"的多轮 LLM
5. **Scene Pack 扩张**：现在 7 个手工搭配；可以根据 NH HHA 主题自动生成更多
6. **灵感库 collections**：在 tags 之上再做 collections / smart folder（按风格自动归集）
7. **导出岛屿为可滚动长图**：把整张岛 + 物品清单合成 PDF / 长图，便于在小红书/Reddit 分享
8. **回到首页快捷键 + 命令面板**：⌘K 直达搜索（设计名 / 物品名 / 灵感）

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

### 第三迭代进度（性能 + 完整度收尾）
1. ✅ **HID drawing → terrain 反解**：`src/import/hidTerrain.ts` 用点在多边形内 + 优先级采样把 HID 的 `drawing` 闭合路径栅格化成我们的 80×70 terrain 网格。色名映射：level1→GRASS、level2/3→CLIFF1/2、rock→CLIFF3、sand→SAND、water/waterfall→WATER、pathStone/pathDirt/pathSand/pathBrick → 我们的 4 种 path。优先级表对齐 HID `layerDefinition` 的 v2Priority（path=100、water=60、level3=50、level2=40、level1=30、sand=25、rock=15）。HID 导入页面同时显示「地形可还原 N 个非草地格」预览。
2. ✅ **画布缩略图**：editor 自动保存时调 `exportCanvasThumbnail` 抓 ≤480px JPEG（quality 0.72，~10KB），存到 `design.thumbnail`。HomePage 设计卡用真实缩略图替代 🏝️ emoji，没有就回退 emoji。
3. ✅ **代码分包**：
   - `vite.config.ts` 用 `manualChunks` 把 konva / three / animal-island-ui / lucide / i18next / react-router 各自单独成包
   - `App.tsx` 用 `React.lazy` 把 EditorPage / GalleryPage / RecognizePage / InspirationsPage / ImportHidPage 全部 lazy-load
   - 首页初始下载从 540KB gzip → 181KB gzip（含字体不计），主包 51KB gzip
   - editor 用到的 nh-furniture 数据自动落到独立 chunk (78KB gzip)
   - three.js (188KB gzip) 只有进 3D 预览时才下
4. ✅ **URL 分享 QR 码**：分享按钮改成模态：240px QR + URL + 一键复制 + 实时显示链接大小（KB）。QR 用 `qrcode` 库，深色取 `#1f3a1f`、浅色取 `#fff8e8` 跟 AC 主题对齐。
5. ✅ **PNG 一键复制到剪贴板**：Toolbar 多个剪贴板按钮，调 `ClipboardItem` + `navigator.clipboard.write`，不支持的浏览器有 fallback toast。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| LLM 输出物品名跟 Nookipedia 对不上 | catalogMatcher 已经做 fuzzy；后续可以让 LLM 在 prompt 里参考一份"高频物品名"清单 |
| Gemini 在中国大陆访问不稳定 | UI 里给 OpenAI / Anthropic 兜底；OpenAI 支持自定义 endpoint（中转代理） |
| 用户没 API Key 用不了 | Gemini 在 AI Studio 有免费额度，文档里要写清怎么申请 |
| LLM 调用超时/失败 | UI 显示 VisionError 详情；用户可重试或换 provider |
| API Key 泄露风险 | UI 提示"仅本地存储"；用户可随时清除。明文风险用户自己承担 |
| 3D 图识别准确率有限 | UI 标明"3D 图识别风格 + 物品列表，俯视图才还原网格"；管理预期 |
