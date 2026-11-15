/**
 * Client-side share-card export with `html-to-image`.
 */
import { toBlob } from 'html-to-image';

/**
 * Rasterises a DOM node to PNG (3× pixel ratio → 1080×1350 for the 360×450 card).
 * @throws If the browser cannot render the node.
 */
export async function nodeToPngBlob(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true });
  if (!blob) throw new Error('No se pudo generar la imagen');
  return blob;
}

/** Triggers a browser download of `blob` as `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shares the PNG through the Web Share API (mobile) when files are supported,
 * otherwise downloads it.
 * @returns `'shared'`, `'downloaded'` or `'cancelled'`.
 */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
