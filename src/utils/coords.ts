// PDF A4 landscape size constant
export const PDF_SIZE: PdfSize = { widthMm: 297, heightMm: 210 };


/**
 * Compute contain-fit for an image inside a container (returns {width, height, offsetX, offsetY, scale})
 */
export function computeContainFit(containerW: number, containerH: number, imageW: number, imageH: number) {
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  const offsetX = (containerW - width) / 2;
  const offsetY = (containerH - height) / 2;
  return { width, height, offsetX, offsetY, scale };
}
// Coordinate conversion utilities for certificate generation
export interface PxBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MmBox {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface CanvasSize {
  widthPx: number;
  heightPx: number;
}

export interface PdfSize {
  widthMm: number;
  heightMm: number;
}

/**
 * Convert pixel coordinates to millimeters
 * @param box - Box coordinates in pixels
 * @param canvasSize - Canvas dimensions in pixels
 * @param pdfSize - PDF dimensions in millimeters
 * @param devicePixelRatio - Device pixel ratio for high-DPI displays
 */
export function pxToMm(
  box: PxBox,
  canvasSize: CanvasSize,
  pdfSize: PdfSize,
  devicePixelRatio: number = window.devicePixelRatio || 1
): MmBox {
  // Account for device pixel ratio
  const scaleFactor = 1 / devicePixelRatio;
  
  // Calculate scaling factors from canvas pixels to PDF millimeters
  const scaleX = pdfSize.widthMm / (canvasSize.widthPx * scaleFactor);
  const scaleY = pdfSize.heightMm / (canvasSize.heightPx * scaleFactor);
  
  return {
    xMm: Math.round((box.x * scaleFactor * scaleX) * 100) / 100,
    yMm: Math.round((box.y * scaleFactor * scaleY) * 100) / 100,
    widthMm: Math.round((box.width * scaleFactor * scaleX) * 100) / 100,
    heightMm: Math.round((box.height * scaleFactor * scaleY) * 100) / 100,
  };
}

/**
 * Convert millimeter coordinates to pixels
 * @param box - Box coordinates in millimeters
 * @param canvasSize - Canvas dimensions in pixels
 * @param pdfSize - PDF dimensions in millimeters
 * @param devicePixelRatio - Device pixel ratio for high-DPI displays
 */
export function mmToPx(
  box: MmBox,
  canvasSize: CanvasSize,
  pdfSize: PdfSize,
  devicePixelRatio: number = window.devicePixelRatio || 1
): PxBox {
  // Account for device pixel ratio
  const scaleFactor = devicePixelRatio;
  
  // Calculate scaling factors from PDF millimeters to canvas pixels
  const scaleX = (canvasSize.widthPx * scaleFactor) / pdfSize.widthMm;
  const scaleY = (canvasSize.heightPx * scaleFactor) / pdfSize.heightMm;
  
  return {
    x: Math.round((box.xMm * scaleX) / scaleFactor),
    y: Math.round((box.yMm * scaleY) / scaleFactor),
    width: Math.round((box.widthMm * scaleX) / scaleFactor),
    height: Math.round((box.heightMm * scaleY) / scaleFactor),
  };
}

/**
 * Calculate DPI from image dimensions
 */
export function calculateDPI(
  imageWidthPx: number,
  imageHeightPx: number,
  pdfWidthMm: number = 297,
  pdfHeightMm: number = 210
): { dpiX: number; dpiY: number; minDpi: number } {
  const mmToInch = 25.4;
  const pdfWidthInch = pdfWidthMm / mmToInch;
  const pdfHeightInch = pdfHeightMm / mmToInch;
  
  const dpiX = imageWidthPx / pdfWidthInch;
  const dpiY = imageHeightPx / pdfHeightInch;
  const minDpi = Math.min(dpiX, dpiY);
  
  return { dpiX, dpiY, minDpi };
}