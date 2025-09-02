import { jsPDF } from 'jspdf';
import { pxToMm, type PxBox, type MmBox } from './coords';
import { mapCssFontToJsPDF } from './fontMapping';

// Type definitions for certificate generation payload
export interface Participant {
  name: string;
  email: string;
  id: string;
}

export interface EventData {
  title: string;
  date: string;
  location: string;
  description?: string;
  id: string;
}

export interface NgoData {
  name: string;
  logo_url?: string;
}

export interface TemplateOptions {
  backdropDataUrl: string;
  nameBoxPx: PxBox;
  nameBoxMm?: MmBox;
  canvasPxSize: { widthPx: number; heightPx: number };
  fontFamily?: string; // Can contain TTF base64: "data:font/ttf;base64,..."
  fontSize?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
  lineHeight?: number;
}

// PDF dimensions for A4 landscape
const PDF_SIZE = { widthMm: 297, heightMm: 210 };

/**
 * Helper function to fit text inside a box with automatic font scaling and wrapping
 * @param doc - jsPDF document instance
 * @param text - Text to fit
 * @param box - Box dimensions in mm
 * @param fontName - Font name to use
 * @param style - Font style (normal, bold, italic)
 * @param textAlign - Text alignment (left, center, right)
 * @param maxFontSize - Maximum font size allowed
 * @returns The final font size used
 */
export function fitTextToBox(
  doc: jsPDF,
  text: string,
  box: MmBox,
  fontName: string = 'helvetica',
  style: string = 'normal',
  textAlign: 'left' | 'center' | 'right' = 'center',
  maxFontSize: number = 32
): number {
  const actualMaxFontSizePt = Math.min(maxFontSize, 72); // max font size in points
  const minFontSizePt = 6; // points
  const paddingMm = 2; // mm padding inside the box
  const lineHeight = 1.2;

  // helper: convert points -> mm (1pt = 25.4/72 mm)
  const ptToMm = (pt: number) => (pt * 25.4) / 72;

  // Available space inside the box (mm)
  const availableWidth = box.widthMm - (paddingMm * 2);
  const availableHeight = box.heightMm - (paddingMm * 2);

  let chosenFontPt = actualMaxFontSizePt;
  let lines: string[] = [];

  // Binary search for optimal font size in points
  let maxPt = actualMaxFontSizePt;
  let minPt = minFontSizePt;

  while (minPt <= maxPt) {
    const testPt = Math.floor((minPt + maxPt) / 2);
    doc.setFont(fontName, style);
    doc.setFontSize(testPt); // points

    // Split text into words and wrap
    const words = text.split(' ');
    lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidthMm = doc.getTextWidth(testLine); // mm (jsPDF uses doc unit)

      if (textWidthMm <= availableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }

    if (currentLine) lines.push(currentLine);

    // Calculate total height in mm using pt->mm conversion
    const singleLineHeightMm = ptToMm(testPt) * lineHeight;
    const totalHeightMm = lines.length * singleLineHeightMm;

    if (totalHeightMm <= availableHeight && lines.every(line => doc.getTextWidth(line) <= availableWidth)) {
      minPt = testPt + 1; // try larger
    } else {
      maxPt = testPt - 1; // try smaller
    }
  }

  // Use the largest font size (in points) that fits
  chosenFontPt = maxPt;
  doc.setFontSize(chosenFontPt);

  // Recalculate wrapped lines with final font size
  const words = text.split(' ');
  lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidthMm = doc.getTextWidth(testLine);
    if (textWidthMm <= availableWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
      }
    }
  }
  if (currentLine) lines.push(currentLine);

  // Draw the text lines
  const baselineOffsetMm = ptToMm(chosenFontPt) * 0.8; // approximate baseline offset
  const startY = box.yMm + paddingMm + baselineOffsetMm;
  const totalTextHeightMm = lines.length * ptToMm(chosenFontPt) * lineHeight;
  const verticalOffset = Math.max(0, (availableHeight - totalTextHeightMm) / 2);

  lines.forEach((line, index) => {
    const yPosition = startY + verticalOffset + (index * ptToMm(chosenFontPt) * lineHeight);

    // Determine x position based on alignment
    let xPosition = box.xMm + paddingMm;
    const lineWidth = doc.getTextWidth(line);

    if (typeof doc.getTextWidth !== 'function') {
      xPosition = box.xMm + availableWidth / 2;
    } else {
      switch (textAlign) {
        case 'center':
          xPosition = box.xMm + (box.widthMm - lineWidth) / 2;
          break;
        case 'right':
          xPosition = box.xMm + box.widthMm - paddingMm - lineWidth;
          break;
        default:
          xPosition = box.xMm + paddingMm;
      }
    }

    doc.text(line, xPosition, yPosition);
  });

  // Return chosen font size in points to the caller
  return chosenFontPt;
}

/**
 * Generate a certificate PDF with participant, event, and template data
 * 
 * Expected payload structure from Prompt 1:
 * {
 *   participant: { name: "John Doe", email: "john@example.com", id: "user-123" },
 *   event: { title: "Beach Cleanup", date: "2024-03-15", location: "Santa Monica Beach", id: "event-456" },
 *   ngo: { name: "Ocean Guardians", logo_url: "https://..." },
 *   template: {
 *     backdropDataUrl: "data:image/jpeg;base64,/9j/4AAQ...",
 *     nameBoxPx: { x: 200, y: 150, width: 400, height: 80 },
 *     canvasPxSize: { widthPx: 800, heightPx: 600 },
 *     fontFamily: "helvetica", // or "data:font/ttf;base64,..." for custom TTF
 *     fontSize: 24,
 *     textColor: "#000000",
 *     textAlign: "center"
 *   }
 * }
 * 
 * @param participant - Participant information
 * @param event - Event information  
 * @param ngo - NGO information
 * @param options - Template and styling options
 * @returns jsPDF document instance
 */
export function generateCertificate(
  participant: Participant,
  _event: EventData,
  _ngo: NgoData,
  options: TemplateOptions
): jsPDF {
  // Initialize jsPDF in landscape A4 format with mm units
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Convert pixel coordinates to millimeters
  const nameBoxMm = options.nameBoxMm || pxToMm(
    options.nameBoxPx,
    options.canvasPxSize,
    PDF_SIZE
  );

  // Add backdrop image if available
  try {
    const imageMatch = options.backdropDataUrl.match(/^data:image\/([a-zA-Z0-9+/]+);base64,/);
    const imageFormat = imageMatch ? imageMatch[1].toLowerCase() : 'jpeg';
    doc.addImage(
      options.backdropDataUrl,
      imageFormat.toUpperCase(),
      0, 0,
      PDF_SIZE.widthMm,
      PDF_SIZE.heightMm,
      undefined,
      'FAST'
    );
  } catch (error) {
    console.warn('Failed to add backdrop image:', error);
  }

  // Handle custom font embedding if provided
  let actualFontName = 'helvetica';

  if (options.fontFamily && options.fontFamily.startsWith('data:font/ttf;base64,')) {
    try {
      const fontData = options.fontFamily.split(',')[1];
      const customFontName = 'CustomFont';
      doc.addFileToVFS(`${customFontName}.ttf`, fontData);
      doc.addFont(`${customFontName}.ttf`, customFontName, 'normal');
      doc.setFont(customFontName);
      actualFontName = customFontName;
    } catch (error) {
      console.warn('Failed to embed custom font, falling back to default:', error);
      doc.setFont('helvetica', 'bold');
    }
  } else {
    actualFontName = mapCssFontToJsPDF(options.fontFamily || 'helvetica');
    doc.setFont(actualFontName, 'bold');
  }

  // Set text color
  const textColor = options.textColor || '#000000';
  const rgb = hexToRgb(textColor);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);

  // Draw only the participant name
  // Make PDF name font a bit smaller than the preview by reducing the max font size by 4 points
  const requestedFontSize = options.fontSize ?? 32;
  const adjustedMaxFontSize = Math.max(8, requestedFontSize - 4);
  fitTextToBox(
    doc,
    participant.name,
    nameBoxMm,
    actualFontName,
    'bold',
    options.textAlign || 'center',
    adjustedMaxFontSize
  );

  // No other certificate elements are rendered
  return doc;
}

/**
 * Helper function to convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Example usage:
 * 
 * const certificateData = {
 *   participant: {
 *     name: "John Doe",
 *     email: "john.doe@example.com",
 *     id: "user-123"
 *   },
 *   event: {
 *     title: "Beach Cleanup Volunteer Event",
 *     date: "2024-03-15",
 *     location: "Santa Monica Beach, CA",
 *     description: "Community beach cleaning initiative",
 *     id: "event-456"
 *   },
 *   ngo: {
 *     name: "Ocean Guardians NGO",
 *     logo_url: "https://example.com/logo.png"
 *   },
 *   template: {
 *     backdropDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...", // Your backdrop image
 *     nameBoxPx: { x: 200, y: 150, width: 400, height: 80 },
 *     canvasPxSize: { widthPx: 800, heightPx: 600 },
 *     fontFamily: "helvetica", // or custom TTF: "data:font/ttf;base64,..."
 *     fontSize: 24,
 *     textColor: "#2D3748",
 *     textAlign: "center"
 *   }
 * };
 * 
 * // Generate certificate
 * const pdfDoc = generateCertificate(
 *   certificateData.participant,
 *   certificateData.event,
 *   certificateData.ngo,
 *   certificateData.template
 * );
 * 
 * // Save or display the PDF
 * pdfDoc.save(`certificate-${certificateData.participant.name.replace(/\s+/g, '-')}.pdf`);
 * 
 * // Or get as blob for upload
 * const pdfBlob = pdfDoc.output('blob');
 */