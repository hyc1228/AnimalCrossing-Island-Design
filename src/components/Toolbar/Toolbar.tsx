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
  Image as ImageIcon,
  Share2,
  Clipboard,
  Copy,
  X,
  LayoutTemplate,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { useCanvasStore } from '../../stores/canvasStore';
import { useUIStore } from '../../stores/uiStore';
import { TERRAIN } from '../../types';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import ScenePicker from '../ScenePicker/ScenePicker';
import { exportCanvasPng, downloadDataUrl } from '../../utils/canvasHandle';
import { buildShareUrl } from '../../utils/shareDesign';

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
  const design = useCanvasStore((s) => s.design);

  const [toast, setToast] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [scenesOpen, setScenesOpen] = useState(false);

  const isTerrainTool = tool === 'terrain-brush' || tool === 'terrain-rect';

  const pushToast = (msg: string, ms = 2500) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), ms);
  };

  const getDesignPngDataUrl = (): string | null => {
    const CELL_PX = 18;
    return exportCanvasPng({
      fitToDesign: true,
      designPx: {
        width: design.size.cols * CELL_PX,
        height: design.size.rows * CELL_PX,
      },
      pixelRatio: 2,
    });
  };

  const handleExportPng = () => {
    const url = getDesignPngDataUrl();
    if (!url) {
      pushToast(t('editor.exportPngFailed'), 3000);
      return;
    }
    const safeName = design.name.replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 40);
    downloadDataUrl(`ACNH-${safeName}-${Date.now()}.png`, url);
    pushToast(t('editor.exportPngOk'));
  };

  const handleCopyPng = async () => {
    const url = getDesignPngDataUrl();
    if (!url) {
      pushToast(t('editor.exportPngFailed'), 3000);
      return;
    }
    // Convert the data URL to a Blob and write it as image/png to the clipboard.
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      // ClipboardItem isn't typed everywhere; cast through unknown.
      const ClipboardItemCtor =
        (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (!ClipboardItemCtor || !navigator.clipboard?.write) {
        throw new Error('Clipboard API unavailable');
      }
      const item = new ClipboardItemCtor({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      pushToast(t('editor.copyPngOk'));
    } catch {
      pushToast(t('editor.copyPngFailed'), 3000);
    }
  };

  const handleShareUrl = () => setShareOpen(true);

  return (
    <div className="panel mx-3 mt-3 p-2 flex items-center gap-1.5 md:gap-2 flex-wrap">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm shrink-0" title={t('common.home')}>
        <ChevronLeft size={16} />
        <span className="hidden sm:inline ml-0.5">{t('common.home')}</span>
      </button>

      <input
        value={designName}
        onChange={(e) => renameDesign(e.target.value)}
        className="input text-sm py-1.5 w-32 md:w-48 min-w-0"
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
      <ToolBtn onClick={() => setScenesOpen(true)} title={t('scenes.toolbarTitle')}>
        <LayoutTemplate size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-cream-300 mx-1" />

      <ToolBtn onClick={handleExportPng} title={t('editor.exportPng')}>
        <ImageIcon size={16} />
      </ToolBtn>
      <ToolBtn onClick={handleCopyPng} title={t('editor.copyPng')}>
        <Clipboard size={16} />
      </ToolBtn>
      <ToolBtn onClick={handleShareUrl} title={t('editor.shareUrl')}>
        <Share2 size={16} />
      </ToolBtn>

      <button
        onClick={() => {
          if (confirm(t('editor.clearConfirm'))) clearAll();
        }}
        className="btn-ghost text-sm text-red-600 hover:bg-red-50 shrink-0"
        title={t('editor.clearAll')}
      >
        <Trash2 size={14} className="md:hidden" />
        <span className="hidden md:inline">{t('editor.clearAll')}</span>
      </button>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="hidden md:flex items-center gap-1 text-xs text-leaf-600">
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

      {toast && (
        <div className="basis-full flex justify-center pt-1">
          <span className="chip chip-mint text-xs px-3 py-1 animate-[fadeUp_0.25s_ease-out]">{toast}</span>
        </div>
      )}

      {shareOpen && (
        <ShareModal
          design={design}
          onClose={() => setShareOpen(false)}
          onCopied={() => pushToast(t('editor.shareUrlCopied'))}
        />
      )}

      <ScenePicker
        open={scenesOpen}
        onClose={() => setScenesOpen(false)}
        onPlaced={(msg) => pushToast(msg)}
      />
    </div>
  );
}

function ShareModal({
  design,
  onClose,
  onCopied,
}: {
  design: ReturnType<typeof useCanvasStore.getState>['design'];
  onClose: () => void;
  onCopied: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shareUrl = buildShareUrl(design);
    setUrl(shareUrl);
    // Render a 240px QR code as a data URL. QRCode.toDataURL is async and may
    // refuse very long payloads; we surface a friendlier message in that case.
    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#1f3a1f', light: '#fff8e8' },
      errorCorrectionLevel: 'L',
    })
      .then(setQrSrc)
      .catch(() => setQrSrc(null));
  }, [design]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
      try {
        document.execCommand?.('copy');
      } catch {
        /* ignore */
      }
    }
    onCopied();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-[fadeUp_0.18s_ease-out]"
      onClick={onClose}
    >
      <div
        className="panel max-w-md w-full p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full text-leaf-600 hover:bg-cream-100"
          title={t('common.close', { defaultValue: 'Close' })}
        >
          <X size={16} />
        </button>
        <h3 className="font-extrabold text-leaf-800 text-base mb-1">{t('editor.shareTitle')}</h3>
        <p className="text-xs text-leaf-600 leading-relaxed mb-4">{t('editor.shareDesc')}</p>

        <div className="rounded-2xl bg-cream-50 border-2 border-cream-200 p-3 grid place-items-center mb-3">
          {qrSrc ? (
            <img src={qrSrc} alt="share QR" className="w-60 h-60" />
          ) : (
            <div className="w-60 h-60 grid place-items-center text-xs text-leaf-500 text-center px-4">
              {t('editor.shareQrTooLong')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
            className="input flex-1 text-xs py-1.5 font-mono"
          />
          <button
            onClick={copy}
            className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <Copy size={12} />
            {t('common.copy', { defaultValue: 'Copy' })}
          </button>
        </div>
        <p className="text-[11px] text-leaf-500 mt-2 leading-relaxed">
          {t('editor.shareUrlSize', { kb: (url.length / 1024).toFixed(1) })}
        </p>
      </div>
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
