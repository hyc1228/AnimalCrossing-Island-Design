// Module-level handle for the active Konva stage. IslandCanvas registers its
// stage on mount; Toolbar (and other consumers) can call `exportCanvasPng` to
// rasterise the current view without prop-drilling a ref through the React
// tree. Only one stage is ever active in this app.

import type Konva from 'konva';

let currentStage: Konva.Stage | null = null;

export function registerCanvasStage(stage: Konva.Stage | null): void {
  currentStage = stage;
}

export function getCanvasStage(): Konva.Stage | null {
  return currentStage;
}

interface ExportPngOptions {
  /** Output pixel density. 2 = retina-quality. */
  pixelRatio?: number;
  /** When true, fit the export to the design bounds rather than the viewport. */
  fitToDesign?: boolean;
  /** Design dimensions in cells × CELL pixel size, needed for `fitToDesign`. */
  designPx?: { width: number; height: number };
}

/**
 * Capture the current Konva stage as a PNG data URL. When `fitToDesign` is
 * provided the export covers exactly the island bounds, ignoring zoom / pan.
 * Returns `null` if there is no active stage.
 */
export function exportCanvasPng(opts: ExportPngOptions = {}): string | null {
  if (!currentStage) return null;
  const pixelRatio = opts.pixelRatio ?? 2;

  if (opts.fitToDesign && opts.designPx) {
    // Reset transform to neutral so the export is consistent regardless of the
    // user's zoom / pan, then restore afterwards.
    const oldScaleX = currentStage.scaleX();
    const oldScaleY = currentStage.scaleY();
    const oldPos = currentStage.position();
    currentStage.scale({ x: 1, y: 1 });
    currentStage.position({ x: 0, y: 0 });
    const dataUrl = currentStage.toDataURL({
      x: 0,
      y: 0,
      width: opts.designPx.width,
      height: opts.designPx.height,
      pixelRatio,
      mimeType: 'image/png',
    });
    currentStage.scale({ x: oldScaleX, y: oldScaleY });
    currentStage.position(oldPos);
    return dataUrl;
  }

  return currentStage.toDataURL({ pixelRatio, mimeType: 'image/png' });
}

/** Trigger a browser download of a data URL. */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
