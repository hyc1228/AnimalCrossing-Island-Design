import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  Box,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import Toolbar from '../components/Toolbar/Toolbar';
import IslandCanvas from '../components/Canvas/IslandCanvas';
import ItemPalette from '../components/ItemPalette/ItemPalette';
import LayerPanel from '../components/LayerPanel/LayerPanel';
import AISuggestPanel from '../components/AISuggestPanel/AISuggestPanel';
import Preview3D from '../components/Preview3D/Preview3D';
import FurnitureList from '../components/FurnitureList/FurnitureList';
import { useCanvasStore } from '../stores/canvasStore';
import { useUIStore, type RightPanelTab } from '../stores/uiStore';
import { loadDesign, saveDesign, setCurrentDesignId } from '../utils/storage';
import { createDesign } from '../utils/grid';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const loadFromDesign = useCanvasStore((s) => s.loadFromDesign);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const setTool = useCanvasStore((s) => s.setTool);
  const rotateSelected = useCanvasStore((s) => s.rotateSelected);

  const rightTab = useUIStore((s) => s.rightTab);
  const setRightTab = useUIStore((s) => s.setRightTab);
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeft = useUIStore((s) => s.toggleLeftPanel);
  const toggleRight = useUIStore((s) => s.toggleRightPanel);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Load design on mount
  useEffect(() => {
    if (!id) return;
    const d = loadDesign(id);
    if (d) {
      loadFromDesign(d);
      setCurrentDesignId(id);
    } else {
      // Create new one with this id
      const fresh = createDesign('我的小岛');
      fresh.id = id;
      saveDesign(fresh);
      loadFromDesign(fresh);
      setCurrentDesignId(id);
    }
  }, [id, loadFromDesign]);

  // Resize observer for canvas
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const update = () => {
      setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [leftOpen, rightOpen]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'v') {
        setTool('select');
      } else if (e.key === 'b') {
        setTool('terrain-brush');
      } else if (e.key === 'r') {
        // both rotate selected and switch to rect tool conflict; prefer rotate
        rotateSelected();
      } else if (e.key === 'e') {
        setTool('erase');
      } else if (e.key === 'h') {
        setTool('pan');
      } else if (e.key === 'Escape') {
        useCanvasStore.getState().setSelectedItemKey(undefined);
        useCanvasStore.getState().setSelectedPlacedId(undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setTool, rotateSelected]);

  const RIGHT_TABS: { id: RightPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'layers', label: '图层', icon: <Layers size={16} /> },
    { id: 'ai', label: 'AI', icon: <Sparkles size={16} /> },
    { id: 'preview3d', label: '3D', icon: <Box size={16} /> },
    { id: 'shopping', label: '清单', icon: <ListChecks size={16} /> },
  ];

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex gap-3 p-3 min-h-0 relative">
        {/* Left panel: item palette */}
        {leftOpen && (
          <aside
            className="panel w-64 shrink-0 flex flex-col overflow-hidden
              max-md:absolute max-md:inset-y-3 max-md:left-3 max-md:z-20 max-md:w-[80vw] max-md:max-w-xs"
          >
            <ItemPalette />
          </aside>
        )}
        <button
          onClick={toggleLeft}
          className="absolute z-30 top-1/2 -translate-y-1/2 panel w-6 h-12 grid place-items-center text-leaf-600 hover:text-leaf-800 max-md:hidden"
          style={{ left: leftOpen ? '17rem' : '0.75rem' }}
          title={leftOpen ? '收起物品库' : '展开物品库'}
        >
          {leftOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
        </button>

        {/* Center: canvas */}
        <main ref={canvasContainerRef} className="flex-1 panel overflow-hidden relative min-w-0">
          <IslandCanvas width={canvasSize.width} height={canvasSize.height} />
        </main>

        <button
          onClick={toggleRight}
          className="absolute z-30 top-1/2 -translate-y-1/2 panel w-6 h-12 grid place-items-center text-leaf-600 hover:text-leaf-800 max-md:hidden"
          style={{ right: rightOpen ? '21rem' : '0.75rem' }}
          title={rightOpen ? '收起右侧面板' : '展开右侧面板'}
        >
          {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
        </button>

        {/* Right panel: tabs */}
        {rightOpen && (
          <aside
            className="panel w-80 shrink-0 flex flex-col overflow-hidden
              max-md:absolute max-md:inset-y-3 max-md:right-3 max-md:z-20 max-md:w-[85vw] max-md:max-w-sm"
          >
            <div className="flex border-b border-leaf-100 bg-leaf-50/60">
              {RIGHT_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRightTab(t.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition ${
                    rightTab === t.id
                      ? 'bg-white text-leaf-800 border-b-2 border-leaf-500'
                      : 'text-leaf-600 hover:bg-white/60'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {rightTab === 'layers' && <LayerPanel />}
              {rightTab === 'ai' && <AISuggestPanel />}
              {rightTab === 'preview3d' && (
                <div className="w-full h-full p-2">
                  <Preview3D />
                </div>
              )}
              {rightTab === 'shopping' && <FurnitureList />}
            </div>
          </aside>
        )}

        {/* Mobile floating panel toggles */}
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30 panel flex p-1 gap-1">
          <button
            onClick={toggleLeft}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${leftOpen ? 'bg-leaf-500 text-white' : 'text-leaf-700'}`}
          >
            物品
          </button>
          <button
            onClick={toggleRight}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${rightOpen ? 'bg-leaf-500 text-white' : 'text-leaf-700'}`}
          >
            面板
          </button>
        </div>
      </div>
    </div>
  );
}
