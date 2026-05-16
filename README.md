# 岛屿规划师 · Animal Crossing Island Planner

一个帮助动森（Animal Crossing: New Horizons）玩家规划岛屿布局的网页应用。

> 完整的产品策划与技术方案见 [`docs/设计方案.md`](docs/设计方案.md)。

## 核心功能

- **2D 俯视网格画布**（80×70）：四图层（地形 / 道路 / 建筑 / 装饰）独立编辑
- **物品库**：精选 50+ 高频物品（建筑、桥梁、坡道、家具、树木、花草、栅栏）
- **AI 智能建议**：5 种风格（日式 / 田园 / 童话 / 咖啡街 / 现代极简），整岛或局部生成
- **5 个起步模板**：套用后自由调整
- **3D 积木预览**：简化几何体立体预览，感受空间感
- **家具清单导出**：自动统计、估算金币，文本导出
- **本地自动保存**：localStorage 持久化

## 技术栈

- Vite + React 18 + TypeScript
- Tailwind CSS（含动森风配色 leaf/sand/sky）
- Zustand（含撤销/重做历史栈）
- react-konva（2D 网格渲染）
- react-three-fiber + drei（3D 预览）
- react-router-dom（路由）
- lucide-react（图标）

## 项目结构

```
src/
  ai/                 # 规则式 AI 引擎（风格 palette + 布局算法）
  components/         # UI 组件
    Canvas/           # 主画布
    Toolbar/          # 顶部工具栏
    ItemPalette/      # 左侧物品库
    LayerPanel/       # 图层面板
    AISuggestPanel/   # AI 建议
    Preview3D/        # 3D 预览
    FurnitureList/    # 物品清单
  data/               # 物品 / 模板数据
  pages/              # 首页 / 编辑器 / 模板库
  stores/             # Zustand 状态管理
  utils/              # 网格工具、本地存储
```

## 开发

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:5173
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 键盘快捷键

- `V` 选择 · `B` 地形画笔 · `E` 橡皮 · `H` 平移
- `R` 旋转选中物品
- `Ctrl/Cmd + Z` 撤销 · `Ctrl/Cmd + Y` / `Ctrl/Cmd + Shift + Z` 重做
- `Delete / Backspace` 删除选中
- `Esc` 取消选择

## Roadmap

- [ ] 后期接入 LLM API（GPT/Claude）生成更灵活的方案
- [ ] 扩充至完整 Nookipedia 物品库
- [ ] 云端保存与分享链接
- [ ] React Native / Capacitor 打包为移动端 App
- [ ] 拼接相邻 Acre 概念（更贴合游戏建造单位）
- [ ] 自定义路径花纹（QR / 设计号导入）

## 致谢

本工具与任天堂无关，仅为玩家社区辅助。
Made with love for Animal Crossing fans.
