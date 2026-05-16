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
 *
 * Implementation note: the island has rounded corners and the wrapper's sea
 * background is rendered with CSS (outside the Konva stage). Capturing the
 * raw stage at the island bounds produces hard black corners under JPEG. We
 * pad the capture by a small sea margin and composite the island on top of
 * a matching sea-blue fill so the rounded corners blend naturally.
 */
const SEA_FILL = '#bfe4ff';

export async function exportCanvasThumbnail(designPx: { width: number; height: number }): Promise<string | null> {
  if (!currentStage) return null;
  const PAD = 28; // sea-blue margin around the island in design pixels
  const longest = Math.max(designPx.width, designPx.height) + PAD * 2;
  const ratio = Math.min(1, 520 / longest);
  const outW = Math.max(1, Math.round((designPx.width + PAD * 2) * ratio));
  const outH = Math.max(1, Math.round((designPx.height + PAD * 2) * ratio));

  const oldScaleX = currentStage.scaleX();
  const oldScaleY = currentStage.scaleY();
  const oldPos = currentStage.position();
  currentStage.scale({ x: 1, y: 1 });
  currentStage.position({ x: 0, y: 0 });

  // Render the island region of the stage as a transparent PNG so we keep the
  // rounded corner alpha intact for compositing.
  let islandPng: string | null = null;
  try {
    islandPng = currentStage.toDataURL({
      x: 0,
      y: 0,
      width: designPx.width,
      height: designPx.height,
      pixelRatio: ratio,
      mimeType: 'image/png',
    });
  } finally {
    currentStage.scale({ x: oldScaleX, y: oldScaleY });
    currentStage.position(oldPos);
    currentStage.batchDraw();
  }
  if (!islandPng) return null;

  const composite = document.createElement('canvas');
  composite.width = outW;
  composite.height = outH;
  const ctx = composite.getContext('2d');
  if (!ctx) return islandPng;
  // Sea-blue background, matching the CSS radial gradient stops used in the
  // editor wrapper.
  ctx.fillStyle = SEA_FILL;
  ctx.fillRect(0, 0, outW, outH);

  try {
    const img = await decodeImage(islandPng);
    const padPx = PAD * ratio;
    ctx.drawImage(img, padPx, padPx, outW - padPx * 2, outH - padPx * 2);
  } catch {
    return islandPng;
  }
  return composite.toDataURL('image/jpeg', 0.78);
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
