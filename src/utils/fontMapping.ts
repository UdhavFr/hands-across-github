/**
 * Font mapping utilities for consistent font rendering between preview and PDF
 */

/**
 * Map CSS font family names to jsPDF-compatible font names
 */
export function mapCssFontToJsPDF(cssFont: string): string {
  const fontMap: Record<string, string> = {
    'arial': 'helvetica',
    'Arial': 'helvetica',
    'helvetica': 'helvetica',
    'Helvetica': 'helvetica',
    'times': 'times',
    'Times': 'times',
    'Times New Roman': 'times',
    'courier': 'courier',
    'Courier': 'courier',
    'Courier New': 'courier',
    // Add more mappings as needed
  };

  // Handle font stacks by taking the first font
  const firstFont = cssFont.split(',')[0].trim().replace(/['"]/g, '');
  
  return fontMap[firstFont] || 'helvetica';
}

/**
 * Get the correct font weight string for jsPDF
 */
export function mapFontWeight(weight?: string | number): 'normal' | 'bold' {
  if (!weight) return 'normal';
  
  if (typeof weight === 'string') {
    return weight === 'bold' || weight === 'bolder' ? 'bold' : 'normal';
  }
  
  if (typeof weight === 'number') {
    return weight >= 600 ? 'bold' : 'normal';
  }
  
  return 'normal';
}

/**
 * Calculate consistent font size between preview and PDF
 * This ensures the font size in the preview matches the PDF output
 */
export function calculatePreviewFontSize(
  pdfFontSize: number,
  previewScale: number
): number {
  return pdfFontSize * previewScale;
}

/**
 * Calculate consistent font size for PDF based on preview settings
 */
export function calculatePdfFontSize(
  previewFontSize: number,
  previewScale: number
): number {
  return previewFontSize / previewScale;
}