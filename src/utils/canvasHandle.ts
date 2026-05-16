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

/**
 * Capture a small JPEG thumbnail of the current design bounds (~480px tall).
 * Returns `null` if there is no active stage. Used by the auto-save flow so
 * the gallery and recent-designs lists can show real previews instead of a
 * placeholder emoji.
 */
export function exportCanvasThumbnail(designPx: { width: number; height: number }): string | null {
  if (!currentStage) return null;
  // Aim for the largest dimension to be ≈480 so we stay well under 30KB per
  // design after JPEG encoding (localStorage has a hard 5MB-ish budget).
  const longest = Math.max(designPx.width, designPx.height);
  const pixelRatio = Math.min(1, 480 / longest);

  const oldScaleX = currentStage.scaleX();
  const oldScaleY = currentStage.scaleY();
  const oldPos = currentStage.position();
  currentStage.scale({ x: 1, y: 1 });
  currentStage.position({ x: 0, y: 0 });
  const dataUrl = currentStage.toDataURL({
    x: 0,
    y: 0,
    width: designPx.width,
    height: designPx.height,
    pixelRatio,
    mimeType: 'image/jpeg',
    quality: 0.72,
  });
  currentStage.scale({ x: oldScaleX, y: oldScaleY });
  currentStage.position(oldPos);
  // Force the visible stage back to its prior transform immediately so the
  // user sees no flash (toDataURL has already drawn at 1:1 above).
  currentStage.batchDraw();
  return dataUrl;
}
