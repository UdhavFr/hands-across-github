import { jsPDF } from 'jspdf';
import { v4 as uuidv4 } from 'uuid';
import { pxToMm, type PxBox, type MmBox } from './coords';

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
 * @returns The final font size used
 */
export function fitTextToBox(
  doc: jsPDF,
  text: string,
  box: MmBox,
  fontName: string = 'helvetica',
  style: string = 'normal'
): number {
  const maxFontSize = 72;
  const minFontSize = 8;
  const padding = 2; // mm padding inside the box
  const lineHeight = 1.2;
  
  // Available space inside the box
  const availableWidth = box.widthMm - (padding * 2);
  const availableHeight = box.heightMm - (padding * 2);
  
  let fontSize = maxFontSize;
  let lines: string[] = [];
  
  // Binary search for optimal font size
  let maxSize = maxFontSize;
  let minSize = minFontSize;
  
  while (minSize <= maxSize) {
    fontSize = Math.floor((minSize + maxSize) / 2);
    doc.setFont(fontName, style);
    doc.setFontSize(fontSize);
    
    // Split text into words and wrap
    const words = text.split(' ');
    lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = doc.getTextWidth(testLine);
      
      if (textWidth <= availableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word is too long, break it
          lines.push(word);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Check if all lines fit in available height
    const totalHeight = lines.length * fontSize * lineHeight;
    
    if (totalHeight <= availableHeight && lines.every(line => doc.getTextWidth(line) <= availableWidth)) {
      minSize = fontSize + 1; // Try larger font
    } else {
      maxSize = fontSize - 1; // Try smaller font
    }
  }
  
  // Use the largest font size that fits
  fontSize = maxSize;
  doc.setFontSize(fontSize);
  
  // Recalculate lines with final font size
  const words = text.split(' ');
  lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = doc.getTextWidth(testLine);
    
    if (textWidth <= availableWidth) {
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
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Draw the text lines
  const startY = box.yMm + padding + (fontSize * 0.8); // Adjust for font baseline
  const totalTextHeight = lines.length * fontSize * lineHeight;
  const verticalOffset = Math.max(0, (availableHeight - totalTextHeight) / 2);
  
  lines.forEach((line, index) => {
    const yPosition = startY + verticalOffset + (index * fontSize * lineHeight);
    
    // Determine x position based on alignment
    let xPosition = box.xMm + padding;
    const lineWidth = doc.getTextWidth(line);
    
    if (doc.getTextWidth === undefined) {
      // Fallback if getTextWidth is not available
      xPosition = box.xMm + availableWidth / 2;
    } else {
      switch (style) {
        case 'center':
          xPosition = box.xMm + (box.widthMm - lineWidth) / 2;
          break;
        case 'right':
          xPosition = box.xMm + box.widthMm - padding - lineWidth;
          break;
        default: // left
          xPosition = box.xMm + padding;
      }
    }
    
    doc.text(line, xPosition, yPosition);
  });
  
  return fontSize;
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
  event: EventData,
  ngo: NgoData,
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
  
  try {
    // Add backdrop image
    // Extract image format from data URL
    const imageMatch = options.backdropDataUrl.match(/^data:image\/([a-zA-Z0-9+/]+);base64,/);
    const imageFormat = imageMatch ? imageMatch[1].toLowerCase() : 'jpeg';
    
    // Add image to fill entire PDF page (A4 landscape)
    doc.addImage(
      options.backdropDataUrl,
      imageFormat.toUpperCase(),
      0, // x position (mm)
      0, // y position (mm) 
      PDF_SIZE.widthMm, // width (mm)
      PDF_SIZE.heightMm, // height (mm)
      undefined, // alias
      'FAST' // compression
    );
    
  } catch (error) {
    console.warn('Failed to add backdrop image:', error);
    // Continue without backdrop if image loading fails
  }
  
  // Handle custom font embedding if provided
  if (options.fontFamily && options.fontFamily.startsWith('data:font/ttf;base64,')) {
    try {
      // Extract base64 font data
      const fontData = options.fontFamily.split(',')[1];
      const fontName = 'CustomFont';
      
      // Add the font to jsPDF
      doc.addFileToVFS(`${fontName}.ttf`, fontData);
      doc.addFont(`${fontName}.ttf`, fontName, 'normal');
      doc.setFont(fontName);
    } catch (error) {
      console.warn('Failed to embed custom font, falling back to default:', error);
      doc.setFont('helvetica', 'normal');
    }
  } else {
    // Use standard font
    const fontName = options.fontFamily || 'helvetica';
    doc.setFont(fontName, 'normal');
  }
  
  // Set text color
  const textColor = options.textColor || '#000000';
  const rgb = hexToRgb(textColor);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  
  // Draw participant name in the name box using fitTextToBox
  fitTextToBox(
    doc,
    participant.name,
    nameBoxMm,
    options.fontFamily && !options.fontFamily.startsWith('data:') ? options.fontFamily : 'helvetica',
    'bold'
  );
  
  // Add certificate elements in strategic positions
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
  
  const certificateId = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
  
  // Certificate title (top center)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(50, 50, 50); // Dark gray
  const titleText = 'CERTIFICATE OF APPRECIATION';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (PDF_SIZE.widthMm - titleWidth) / 2, 30);
  
  // Event details (below name box)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  
  const eventY = nameBoxMm.yMm + nameBoxMm.heightMm + 20;
  
  // Event title
  const eventTitleText = `for participating in "${event.title}"`;
  const eventTitleWidth = doc.getTextWidth(eventTitleText);
  doc.text(eventTitleText, (PDF_SIZE.widthMm - eventTitleWidth) / 2, eventY);
  
  // Event date and location
  const eventDetailsText = `${new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} • ${event.location}`;
  const eventDetailsWidth = doc.getTextWidth(eventDetailsText);
  doc.text(eventDetailsText, (PDF_SIZE.widthMm - eventDetailsWidth) / 2, eventY + 10);
  
  // Bottom section with NGO info and certificate details
  const bottomY = PDF_SIZE.heightMm - 30;
  
  // NGO name (bottom left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(ngo.name, 20, bottomY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Organization', 20, bottomY + 5);
  
  // Issue date (bottom center)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const dateText = `Issued: ${currentDate}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, (PDF_SIZE.widthMm - dateWidth) / 2, bottomY);
  
  // Certificate ID (bottom right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const idText = `ID: ${certificateId}`;
  const idWidth = doc.getTextWidth(idText);
  doc.text(idText, PDF_SIZE.widthMm - 20 - idWidth, bottomY);
  
  // Add decorative border (optional)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, PDF_SIZE.widthMm - 20, PDF_SIZE.heightMm - 20);
  
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