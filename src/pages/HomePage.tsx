import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, Sparkles, TreePine, Trash2, ChevronRight } from 'lucide-react';
import { createDesign } from '../utils/grid';
import { deleteDesign, getCurrentDesignId, loadAllDesigns, saveDesign, setCurrentDesignId } from '../utils/storage';
import type { IslandDesign } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<IslandDesign[]>([]);
  const [currentId, setCurId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setDesigns(loadAllDesigns());
    setCurId(getCurrentDesignId());
  }, []);

  const handleNewDesign = () => {
    const d = createDesign('我的小岛 ' + (designs.length + 1));
    saveDesign(d);
    setCurrentDesignId(d.id);
    navigate(`/editor/${d.id}`);
  };

  const handleContinue = () => {
    if (currentId) {
      navigate(`/editor/${currentId}`);
    } else if (designs[0]) {
      navigate(`/editor/${designs[0].id}`);
    } else {
      handleNewDesign();
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定删除这个岛屿设计？此操作不可恢复。')) return;
    deleteDesign(id);
    setDesigns(loadAllDesigns());
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-leaf-500 grid place-items-center text-white shadow-soft">
            <TreePine size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-leaf-800">岛屿规划师</h1>
            <p className="text-xs text-leaf-600 -mt-0.5">Animal Crossing Island Planner</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/gallery" className="btn-ghost">
            <LayoutGrid size={16} /> 模板库
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 lg:px-12 pb-12">
        <section className="max-w-6xl mx-auto mt-8 lg:mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="chip bg-leaf-100 text-leaf-700 mb-4">
              <Sparkles size={12} /> 让岛建变得轻松又有趣
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-leaf-900 leading-tight">
              先规划，再落地，
              <br />
              再也不用反复 <span className="text-leaf-500">拆建</span>
            </h2>
            <p className="mt-4 text-leaf-700/80 text-lg">
              俯视网格自由布局 · 5 套精选风格模板 · AI 智能配置建议 · 3D 预览与家具清单
            </p>

            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <button onClick={handleNewDesign} className="btn-primary text-base">
                <Plus size={18} /> 新建岛屿
              </button>
              <button onClick={handleContinue} className="btn-secondary text-base" disabled={designs.length === 0}>
                继续上次设计 <ChevronRight size={18} />
              </button>
              <Link to="/gallery" className="btn-secondary text-base">
                <LayoutGrid size={18} /> 浏览模板
              </Link>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
            <FeatureCard
              icon="🎨"
              title="网格化画布"
              desc="80×70 俯视网格，四图层独立编辑，画地形、铺道路、摆家具一气呵成。"
            />
            <FeatureCard
              icon="✨"
              title="AI 智能建议"
              desc="选个风格，AI 帮你在整岛或选中区域自动生成布局，喜欢就保留。"
            />
            <FeatureCard
              icon="🧱"
              title="3D 积木预览"
              desc="一键查看立体效果，提前感受岛屿空间感，导出家具清单照着采购。"
            />
          </div>

          {/* My designs */}
          {designs.length > 0 && (
            <div className="mt-12">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-xl font-bold text-leaf-800">我的岛屿设计</h3>
                <span className="text-sm text-leaf-600">{designs.length} 个</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {designs.map((d) => (
                  <DesignCard
                    key={d.id}
                    design={d}
                    onOpen={() => {
                      setCurrentDesignId(d.id);
                      navigate(`/editor/${d.id}`);
                    }}
                    onDelete={() => handleDelete(d.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-leaf-600/70 py-6">
        本工具与任天堂无关 · 仅为玩家社区辅助 · Made with love for Animal Crossing fans
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="font-bold text-leaf-800 mb-1">{title}</h4>
      <p className="text-sm text-leaf-700/80 leading-relaxed">{desc}</p>
    </div>
  );
}

function DesignCard({
  design,
  onOpen,
  onDelete,
}: {
  design: IslandDesign;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const itemCount = design.items.length;
  const updated = new Date(design.updatedAt).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="card p-4 flex flex-col gap-3 hover:shadow-soft transition-shadow group">
      <button
        onClick={onOpen}
        className="aspect-video rounded-xl bg-gradient-to-br from-leaf-100 to-sky-100 grid place-items-center text-5xl"
      >
        🏝️
      </button>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-leaf-800 truncate">{design.name}</h4>
          <p className="text-xs text-leaf-600/80 mt-0.5">
            {itemCount} 个物品 · {updated}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-leaf-600/60 hover:text-red-500 p-1 transition"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <button onClick={onOpen} className="btn-secondary text-sm">
        打开编辑 <ChevronRight size={16} />
      </button>
    </div>
  );
}
