import { describe, it, expect } from 'vitest';
import { pxToMm, mmToPx, calculateDPI, type PxBox, type MmBox, type CanvasSize, type PdfSize } from '../utils/coords';

describe('Coordinate Conversion Utils', () => {
  // Standard test constants
  const PDF_SIZE: PdfSize = { widthMm: 297, heightMm: 210 }; // A4 landscape
  const CANVAS_SIZE: CanvasSize = { widthPx: 800, heightPx: 600 };
  const DEVICE_PIXEL_RATIO = 2; // High DPI display

  describe('pxToMm', () => {
    it('should convert pixel coordinates to millimeters correctly', () => {
      const pxBox: PxBox = { x: 100, y: 50, width: 200, height: 100 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, PDF_SIZE);
      
      // Expected calculations:
      // scaleX = 297 / (800 * (1/2)) = 297 / 400 = 0.7425
      // scaleY = 210 / (600 * (1/2)) = 210 / 300 = 0.7
      // x = (100 * (1/2) * 0.7425) = 37.125 → 37.13
      // y = (50 * (1/2) * 0.7) = 17.5 → 17.5
      
      expect(result.xMm).toBe(37.13);
      expect(result.yMm).toBe(17.5);
      expect(result.widthMm).toBe(74.25);
      expect(result.heightMm).toBe(35);
    });

    it('should handle device pixel ratio = 1', () => {
      const pxBox: PxBox = { x: 100, y: 50, width: 200, height: 100 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, PDF_SIZE, 1);
      
      // With DPR = 1:
      // scaleX = 297 / 800 = 0.37125
      // scaleY = 210 / 600 = 0.35
      
      expect(result.xMm).toBe(37.13);
      expect(result.yMm).toBe(17.5);
      expect(result.widthMm).toBe(74.25);
      expect(result.heightMm).toBe(35);
    });

    it('should handle edge case: zero position and size', () => {
      const pxBox: PxBox = { x: 0, y: 0, width: 0, height: 0 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, PDF_SIZE, DEVICE_PIXEL_RATIO);
      
      expect(result.xMm).toBe(0);
      expect(result.yMm).toBe(0);
      expect(result.widthMm).toBe(0);
      expect(result.heightMm).toBe(0);
    });

    it('should handle full canvas size', () => {
      const pxBox: PxBox = { x: 0, y: 0, width: 800, height: 600 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, PDF_SIZE, DEVICE_PIXEL_RATIO);
      
      // Should map to full PDF size
      expect(result.xMm).toBe(0);
      expect(result.yMm).toBe(0);
      expect(result.widthMm).toBe(297);
      expect(result.heightMm).toBe(210);
    });

    it('should round to 2 decimal places', () => {
      const pxBox: PxBox = { x: 123, y: 456, width: 333, height: 111 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, PDF_SIZE, 1.5);
      
      // All values should be rounded to 2 decimal places
      expect(Number.isInteger(result.xMm * 100)).toBe(true);
      expect(Number.isInteger(result.yMm * 100)).toBe(true);
      expect(Number.isInteger(result.widthMm * 100)).toBe(true);
      expect(Number.isInteger(result.heightMm * 100)).toBe(true);
    });
  });

  describe('mmToPx', () => {
    it('should convert millimeter coordinates to pixels correctly', () => {
      const mmBox: MmBox = { xMm: 37.13, yMm: 17.5, widthMm: 74.25, heightMm: 35 };
      
      const result = mmToPx(mmBox, CANVAS_SIZE, PDF_SIZE, DEVICE_PIXEL_RATIO);
      
      // Should convert back to approximately original values
      expect(result.x).toBeCloseTo(100, 0);
      expect(result.y).toBeCloseTo(50, 0);
      expect(result.width).toBeCloseTo(200, 0);
      expect(result.height).toBeCloseTo(100, 0);
    });

    it('should handle conversion symmetry', () => {
      const originalPx: PxBox = { x: 150, y: 75, width: 300, height: 150 };
      
      // Convert px -> mm -> px
      const mmResult = pxToMm(originalPx, CANVAS_SIZE, PDF_SIZE, DEVICE_PIXEL_RATIO);
      const pxResult = mmToPx(mmResult, CANVAS_SIZE, PDF_SIZE, DEVICE_PIXEL_RATIO);
      
      // Should get back to original values (within rounding tolerance)
      expect(pxResult.x).toBeCloseTo(originalPx.x, 0);
      expect(pxResult.y).toBeCloseTo(originalPx.y, 0);
      expect(pxResult.width).toBeCloseTo(originalPx.width, 0);
      expect(pxResult.height).toBeCloseTo(originalPx.height, 0);
    });

    it('should handle edge case: full PDF size to canvas', () => {
      const mmBox: MmBox = { xMm: 0, yMm: 0, widthMm: 297, heightMm: 210 };
      
      const result = mmToPx(mmBox, CANVAS_SIZE, PDF_SIZE, DEVICE_PIXEL_RATIO);
      
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });
  });

  describe('calculateDPI', () => {
    it('should calculate DPI for standard A4 landscape image', () => {
      const result = calculateDPI(2970, 2100); // 10x scale of A4 mm
      
      expect(result.dpiX).toBeCloseTo(254, 1); // 2970 / (297/25.4) ≈ 254
      expect(result.dpiY).toBeCloseTo(254, 1); // 2100 / (210/25.4) ≈ 254
      expect(result.minDpi).toBeCloseTo(254, 1);
    });

    it('should handle non-square aspect ratios', () => {
      const result = calculateDPI(1485, 2100); // Half width
      
      expect(result.dpiX).toBeCloseTo(127, 1); // Lower DPI in X
      expect(result.dpiY).toBeCloseTo(254, 1); // Normal DPI in Y
      expect(result.minDpi).toBeCloseTo(127, 1); // Should return the minimum
    });

    it('should work with custom PDF dimensions', () => {
      // US Letter landscape: 279.4 x 215.9 mm
      const result = calculateDPI(2794, 2159, 279.4, 215.9);
      
      expect(result.dpiX).toBeCloseTo(254, 1);
      expect(result.dpiY).toBeCloseTo(254, 1);
      expect(result.minDpi).toBeCloseTo(254, 1);
    });

    it('should handle low resolution images', () => {
      const result = calculateDPI(800, 600); // Low res image
      
      expect(result.dpiX).toBeLessThan(100);
      expect(result.dpiY).toBeLessThan(100);
      expect(result.minDpi).toBeLessThan(100);
    });

    it('should handle high resolution images', () => {
      const result = calculateDPI(5940, 4200); // Double A4 resolution
      
      expect(result.dpiX).toBeCloseTo(508, 1); // ~508 DPI
      expect(result.dpiY).toBeCloseTo(508, 1);
      expect(result.minDpi).toBeCloseTo(508, 1);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle zero canvas dimensions gracefully', () => {
      const pxBox: PxBox = { x: 100, y: 50, width: 200, height: 100 };
      const zeroCanvas: CanvasSize = { widthPx: 0, heightPx: 0 };
      
      expect(() => {
        pxToMm(pxBox, zeroCanvas, PDF_SIZE);
      }).not.toThrow();
      
      const result = pxToMm(pxBox, zeroCanvas, PDF_SIZE);
      expect(result.xMm).toBe(Infinity);
      expect(result.yMm).toBe(Infinity);
    });

    it('should handle zero PDF dimensions', () => {
      const pxBox: PxBox = { x: 100, y: 50, width: 200, height: 100 };
      const zeroPdf: PdfSize = { widthMm: 0, heightMm: 0 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, zeroPdf);
      
      expect(result.xMm).toBe(0);
      expect(result.yMm).toBe(0);
      expect(result.widthMm).toBe(0);
      expect(result.heightMm).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const pxBox: PxBox = { x: -100, y: -50, width: 200, height: 100 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, PDF_SIZE, 1);
      
      // Should preserve negative values
      expect(result.xMm).toBeLessThan(0);
      expect(result.yMm).toBeLessThan(0);
      expect(result.widthMm).toBeGreaterThan(0);
      expect(result.heightMm).toBeGreaterThan(0);
    });

    it('should handle very small dimensions', () => {
      const pxBox: PxBox = { x: 0.1, y: 0.1, width: 0.5, height: 0.3 };
      
      const result = pxToMm(pxBox, CANVAS_SIZE, PDF_SIZE, 1);
      
      // Should handle sub-pixel precision
      expect(result.xMm).toBeGreaterThanOrEqual(0);
      expect(result.yMm).toBeGreaterThanOrEqual(0);
      expect(result.widthMm).toBeGreaterThan(0);
      expect(result.heightMm).toBeGreaterThan(0);
    });

    it('should maintain precision in round-trip conversion', () => {
      const testCases: PxBox[] = [
        { x: 123.45, y: 678.9, width: 234.56, height: 345.67 },
        { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        { x: 799.9, y: 599.9, width: 0.1, height: 0.1 }
      ];

      testCases.forEach((originalPx) => {
        const mmResult = pxToMm(originalPx, CANVAS_SIZE, PDF_SIZE, 1);
        const pxResult = mmToPx(mmResult, CANVAS_SIZE, PDF_SIZE, 1);

        // Should be within 1 pixel of original (due to rounding)
        expect(Math.abs(pxResult.x - originalPx.x)).toBeLessThan(1);
        expect(Math.abs(pxResult.y - originalPx.y)).toBeLessThan(1);
        expect(Math.abs(pxResult.width - originalPx.width)).toBeLessThan(1);
        expect(Math.abs(pxResult.height - originalPx.height)).toBeLessThan(1);
      });
    });
  });
});