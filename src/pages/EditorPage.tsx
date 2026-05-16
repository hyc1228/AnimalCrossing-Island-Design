import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  Sparkles,
  Box,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X as CloseIcon,
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
  const { t } = useTranslation();
  const loadFromDesign = useCanvasStore((s) => s.loadFromDesign);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const setTool = useCanvasStore((s) => s.setTool);
  const rotateSelected = useCanvasStore((s) => s.rotateSelected);

  const deleteSelected = useCanvasStore((s) => s.deleteSelected);

  const rightTab = useUIStore((s) => s.rightTab);
  const setRightTab = useUIStore((s) => s.setRightTab);
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeft = useUIStore((s) => s.toggleLeftPanel);
  const toggleRight = useUIStore((s) => s.toggleRightPanel);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [recognizeToast, setRecognizeToast] = useState<{ placed: number; skipped: number } | null>(null);

  // Load design on mount
  useEffect(() => {
    if (!id) return;
    const d = loadDesign(id);
    if (d) {
      loadFromDesign(d);
      setCurrentDesignId(id);
    } else {
      const fresh = createDesign(t('editor.defaultName'));
      fresh.id = id;
      saveDesign(fresh);
      loadFromDesign(fresh);
      setCurrentDesignId(id);
    }
  }, [id, loadFromDesign, t]);

  // Pick up "skipped count" notice left by RecognizePage → applyToCanvas.
  useEffect(() => {
    if (!id) return;
    try {
      const raw = sessionStorage.getItem('ac_recognize_skipped');
      if (!raw) return;
      const data = JSON.parse(raw) as { placedCount: number; skippedCount: number; designId: string };
      if (data.designId !== id) return;
      sessionStorage.removeItem('ac_recognize_skipped');
      setRecognizeToast({ placed: data.placedCount, skipped: data.skippedCount });
      const timer = setTimeout(() => setRecognizeToast(null), 10000);
      return () => clearTimeout(timer);
    } catch {
      /* ignore */
    }
  }, [id]);

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
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedPlacedId = useCanvasStore.getState().selectedPlacedId;
        if (selectedPlacedId) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.key === 'Escape') {
        useCanvasStore.getState().setSelectedItemKey(undefined);
        useCanvasStore.getState().setSelectedPlacedId(undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setTool, rotateSelected, deleteSelected]);

  const RIGHT_TABS: { id: RightPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'layers', label: t('editor.panelTabs.layers'), icon: <Layers size={16} /> },
    { id: 'ai', label: t('editor.panelTabs.ai'), icon: <Sparkles size={16} /> },
    { id: 'preview3d', label: t('editor.panelTabs.preview3d'), icon: <Box size={16} /> },
    { id: 'shopping', label: t('editor.panelTabs.shopping'), icon: <ListChecks size={16} /> },
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
          title={leftOpen ? t('editor.collapseLeft') : t('editor.expandLeft')}
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
          title={rightOpen ? t('editor.collapseRight') : t('editor.expandRight')}
        >
          {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
        </button>

        {/* Right panel: tabs */}
        {rightOpen && (
          <aside
            className="panel w-80 shrink-0 flex flex-col overflow-hidden
              max-md:absolute max-md:inset-y-3 max-md:right-3 max-md:z-20 max-md:w-[85vw] max-md:max-w-sm"
          >
            <div className="flex gap-1 p-2 border-b-2 border-cream-200 bg-cream-50">
              {RIGHT_TABS.map((tab) => {
                const active = rightTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-full text-xs font-semibold transition ${
                      active
                        ? 'text-mint-600 bg-mint-500/15'
                        : 'text-leaf-600 hover:bg-mint-500/10 hover:text-leaf-700'
                    }`}
                    style={active ? { boxShadow: '0 3px 0 0 #d4c9b4', fontWeight: 700 } : undefined}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {active && (
                      <span className="absolute -top-1 -right-1 leaf-wiggle text-[10px]">🌿</span>
                    )}
                  </button>
                );
              })}
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

        {/* Toast: shown right after applying a recognition result */}
        {recognizeToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 panel px-4 py-2.5 flex items-center gap-3 max-w-md animate-fadeUp" style={{ boxShadow: '0 4px 0 0 #e0b800' }}>
            <Sparkles size={16} className="text-mint-500 shrink-0" />
            <span className="text-xs text-leaf-800 font-semibold leading-relaxed">
              {t('recognize.skippedToast', { placed: recognizeToast.placed, skipped: recognizeToast.skipped })}
            </span>
            <button
              onClick={() => setRecognizeToast(null)}
              className="text-leaf-500 hover:text-mint-600 shrink-0"
              title={t('recognize.skippedToastDismiss')}
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )}

        {/* Mobile floating panel toggles */}
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30 panel flex p-1 gap-1">
          <button
            onClick={toggleLeft}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${leftOpen ? 'bg-mint-500 text-white' : 'text-leaf-700'}`}
            style={leftOpen ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
          >
            {t('editor.panelToggle.items')}
          </button>
          <button
            onClick={toggleRight}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${rightOpen ? 'bg-mint-500 text-white' : 'text-leaf-700'}`}
            style={rightOpen ? { boxShadow: '0 2px 0 0 #11a89b' } : undefined}
          >
            {t('editor.panelToggle.panels')}
          </button>
        </div>
      </div>
    </div>
  );
}
