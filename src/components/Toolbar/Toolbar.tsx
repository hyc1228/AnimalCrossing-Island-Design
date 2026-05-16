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
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '../../stores/canvasStore';
import { useUIStore } from '../../stores/uiStore';
import { TERRAIN } from '../../types';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

const TERRAIN_OPTIONS = [
  { code: TERRAIN.GRASS, key: 'grass', color: '#8fc662' },
  { code: TERRAIN.SAND, key: 'sand', color: '#f2dba4' },
  { code: TERRAIN.WATER, key: 'water', color: '#76c4e8' },
  { code: TERRAIN.PATH_STONE, key: 'pathStone', color: '#d5cfc5' },
  { code: TERRAIN.PATH_WOOD, key: 'pathWood', color: '#c9a26f' },
  { code: TERRAIN.PATH_BRICK, key: 'pathBrick', color: '#c66b45' },
  { code: TERRAIN.CLIFF1, key: 'cliff1', color: '#7fb060' },
  { code: TERRAIN.CLIFF2, key: 'cliff2', color: '#6fa14a' },
  { code: TERRAIN.CLIFF3, key: 'cliff3', color: '#558636' },
  { code: TERRAIN.FLOWER_BED, key: 'flowerBed', color: '#f0c7df' },
];

export default function Toolbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      <button onClick={() => navigate('/')} className="btn-ghost text-sm" title={t('common.home')}>
        <ChevronLeft size={16} /> {t('common.home')}
      </button>

      <input
        value={designName}
        onChange={(e) => renameDesign(e.target.value)}
        className="input text-sm py-1.5 w-48"
        style={{ borderWidth: 2, boxShadow: '0 2px 0 0 #d4c9b4' }}
      />

      <div className="w-px h-6 bg-cream-300 mx-1" />

      <ToolBtn active={tool === 'select'} onClick={() => setTool('select')} title={t('toolbar.select')}>
        <MousePointer2 size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'terrain-brush'} onClick={() => setTool('terrain-brush')} title={t('toolbar.terrainBrush')}>
        <Paintbrush size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'terrain-rect'} onClick={() => setTool('terrain-rect')} title={t('toolbar.terrainRect')}>
        <Square size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'erase'} onClick={() => setTool('erase')} title={t('toolbar.erase')}>
        <Eraser size={16} />
      </ToolBtn>
      <ToolBtn active={tool === 'pan'} onClick={() => setTool('pan')} title={t('toolbar.pan')}>
        <Hand size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-cream-300 mx-1" />

      <ToolBtn onClick={undo} disabled={past === 0} title={t('toolbar.undo')}>
        <Undo2 size={16} />
      </ToolBtn>
      <ToolBtn onClick={redo} disabled={future === 0} title={t('toolbar.redo')}>
        <Redo2 size={16} />
      </ToolBtn>

      <ToolBtn onClick={rotateSelected} disabled={!selectedPlacedId} title={t('toolbar.rotate')}>
        <RotateCw size={16} />
      </ToolBtn>
      <ToolBtn onClick={deleteSelected} disabled={!selectedPlacedId} title={t('toolbar.deleteSelected')}>
        <Trash2 size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-cream-300 mx-1" />

      <ToolBtn active={showGrid} onClick={toggleGrid} title={t('toolbar.toggleGrid')}>
        <Grid3x3 size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-cream-300 mx-1" />

      <button
        onClick={() => {
          if (confirm(t('editor.clearConfirm'))) clearAll();
        }}
        className="btn-ghost text-sm text-red-600 hover:bg-red-50"
        title={t('editor.clearAll')}
      >
        {t('editor.clearAll')}
      </button>

      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-leaf-600">
          <Save size={14} />
          {t('editor.autoSaved')}
        </span>
        <LanguageSwitcher compact />
      </div>

      {isTerrainTool && (
        <div className="basis-full flex items-center gap-2 pt-2 mt-1 border-t-2 border-cream-200 flex-wrap">
          <span className="text-xs text-leaf-700 font-bold mr-1">{t('toolbar.terrainLabel')}</span>
          {TERRAIN_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => setSelectedTerrainCode(opt.code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border-2 transition ${
                selectedTerrainCode === opt.code
                  ? 'border-mint-500 bg-mint-50 text-leaf-800 font-bold'
                  : 'border-cream-200 hover:bg-cream-50'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/15"
                style={{ background: opt.color }}
              />
              {t(`terrain.${opt.key}`)}
            </button>
          ))}
          {tool === 'terrain-brush' && (
            <div className="flex items-center gap-2 ml-2 text-xs text-leaf-700">
              <span className="font-semibold">{t('toolbar.brush')}</span>
              <input
                type="range"
                min={1}
                max={8}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="accent-mint-500 w-24"
              />
              <span className="w-4 text-center font-bold">{brushSize}</span>
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
      className={`w-9 h-9 grid place-items-center rounded-full transition-all ${
        active
          ? 'bg-mint-500 text-white'
          : 'text-leaf-700 hover:bg-mint-500/12 hover:text-mint-600'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      style={active ? { boxShadow: '0 3px 0 0 #11a89b' } : undefined}
    >
      {children}
    </button>
  );
}
