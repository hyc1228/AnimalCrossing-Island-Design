import {
  MousePointer2,
  Paintbrush,
  Square,
  Eraser,
  Hand,
  Undo2,
  Redo2,
  Trash2,
  ChevronLeft,
  Save,
  RotateCw,
  Grid3x3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../../stores/canvasStore';
import { useUIStore } from '../../stores/uiStore';
import { TERRAIN } from '../../types';

const TERRAIN_OPTIONS = [
  { code: TERRAIN.GRASS, label: '草地', color: '#a3d68a' },
  { code: TERRAIN.SAND, label: '沙地', color: '#f4dfae' },
  { code: TERRAIN.WATER, label: '水域', color: '#7cc7ff' },
  { code: TERRAIN.PATH_STONE, label: '石板路', color: '#cfcfcf' },
  { code: TERRAIN.PATH_WOOD, label: '木板路', color: '#c89968' },
  { code: TERRAIN.PATH_BRICK, label: '砖路', color: '#c97a4e' },
  { code: TERRAIN.CLIFF1, label: '悬崖1', color: '#7fbf63' },
  { code: TERRAIN.CLIFF2, label: '悬崖2', color: '#5fa844' },
  { code: TERRAIN.CLIFF3, label: '悬崖3', color: '#488733' },
  { code: TERRAIN.FLOWER_BED, label: '花田', color: '#e9c2d9' },
];

export default function Toolbar() {
  const navigate = useNavigate();
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const past = useCanvasStore((s) => s.past.length);
  const future = useCanvasStore((s) => s.future.length);
  const clearAll = useCanvasStore((s) => s.clearAll);
  const selectedTerrainCode = useCanvasStore((s) => s.selectedTerrainCode);
  const setSelectedTerrainCode = useCanvasStore((s) => s.setSelectedTerrainCode);
  const brushSize = useCanvasStore((s) => s.brushSize);
  const setBrushSize = useCanvasStore((s) => s.setBrushSize);
  const designName = useCanvasStore((s) => s.design.name);
  const renameDesign = useCanvasStore((s) => s.renameDesign);
  const rotateSelected = useCanvasStore((s) => s.rotateSelected);
  const selectedPlacedId = useCanvasStore((s) => s.selectedPlacedId);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const showGrid = useUIStore((s) => s.showGrid);
  const toggleGrid = useUIStore((s) => s.toggleGrid);

  const isTerrainTool = tool === 'terrain-brush' || tool === 'terrain-rect';

  return (
    <div className="panel mx-3 mt-3 p-2 flex items-center gap-2 flex-wrap">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm" title="返回首页">
        <ChevronLeft size={16} /> 首页
      </button>

      <input
        value={designName}
        onChange={(e) => renameDesign(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-leaf-100 bg-white text-leaf-800 font-semibold focus:outline-none focus:ring-2 focus:ring-leaf-300 text-sm w-44"
      />

      <div className="w-px h-6 bg-leaf-200 mx-1" />

      <ToolBtn active={tool === 'select'} onClick={() => setTool('select')} title="选择 (V)">
        <MousePointer2 size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'terrain-brush'} onClick={() => setTool('terrain-brush')} title="地形画笔 (B)">
        <Paintbrush size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'terrain-rect'} onClick={() => setTool('terrain-rect')} title="矩形铺设 (R)">
        <Square size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'erase'} onClick={() => setTool('erase')} title="橡皮 (E)">
        <Eraser size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'pan'} onClick={() => setTool('pan')} title="平移 (H)">
        <Hand size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-leaf-200 mx-1" />

      <ToolBtn onClick={undo} disabled={past === 0} title="撤销 (Ctrl+Z)">
        <Undo2 size={16} />
      </ToolBtn>
      <ToolBtn onClick={redo} disabled={future === 0} title="重做 (Ctrl+Y)">
        <Redo2 size={16} />
      </ToolBtn>

      <ToolBtn onClick={rotateSelected} disabled={!selectedPlacedId} title="旋转选中 (R)">
        <RotateCw size={16} />
      </ToolBtn>
      <ToolBtn onClick={deleteSelected} disabled={!selectedPlacedId} title="删除选中 (Del)">
        <Trash2 size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-leaf-200 mx-1" />

      <ToolBtn active={showGrid} onClick={toggleGrid} title="显示/隐藏网格">
        <Grid3x3 size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-leaf-200 mx-1" />

      <button
        onClick={() => {
          if (confirm('清空整个画布？')) clearAll();
        }}
        className="btn-ghost text-sm text-red-600 hover:bg-red-50"
        title="清空画布"
      >
        清空
      </button>

      {/* Auto saved hint */}
      <div className="ml-auto flex items-center gap-2 text-xs text-leaf-600">
        <Save size={14} />
        自动保存
      </div>

      {/* Second row: terrain picker (visible when terrain tool active) */}
      {isTerrainTool && (
        <div className="basis-full flex items-center gap-2 pt-2 mt-1 border-t border-leaf-100 flex-wrap">
          <span className="text-xs text-leaf-700 font-semibold mr-1">地形:</span>
          {TERRAIN_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => setSelectedTerrainCode(opt.code)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition ${
                selectedTerrainCode === opt.code
                  ? 'border-leaf-500 bg-leaf-50 text-leaf-800 font-semibold'
                  : 'border-leaf-100 hover:bg-leaf-50'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-sm border border-black/10"
                style={{ background: opt.color }}
              />
              {opt.label}
            </button>
          ))}
          {tool === 'terrain-brush' && (
            <div className="flex items-center gap-2 ml-2 text-xs text-leaf-700">
              <span>笔刷</span>
              <input
                type="range"
                min={1}
                max={8}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="accent-leaf-500 w-24"
              />
              <span className="w-4 text-center">{brushSize}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-9 h-9 grid place-items-center rounded-lg transition ${
        active
          ? 'bg-leaf-500 text-white shadow-soft'
          : 'text-leaf-700 hover:bg-leaf-50'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}
