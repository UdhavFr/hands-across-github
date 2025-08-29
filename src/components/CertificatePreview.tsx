import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Type } from 'lucide-react';
import type { PxBox } from '../utils/coords';

interface CertificatePreviewProps {
  backdropDataUrl: string;
  nameBoxPx: PxBox;
  canvasSize: { widthPx: number; heightPx: number };
  sampleText?: string;
  onStyleChange?: (style: { 
    fontSize: number; 
    fontFamily: string; 
    textColor: string; 
    textAlign: 'left' | 'center' | 'right';
    effectiveFontSize?: number;
  }) => void;
}

const mapCssFontToPreviewer = (cssFont: string): string => {
  switch (cssFont) {
    case 'helvetica': return '"Helvetica Neue", Helvetica, Arial, sans-serif';
    case 'times': return '"Times New Roman", Times, serif';
    case 'courier': return '"Courier New", Courier, monospace';
    default: return '"Helvetica Neue", Helvetica, Arial, sans-serif';
  }
};

export function CertificatePreview({ 
  backdropDataUrl, 
  nameBoxPx, 
  canvasSize, 
  sampleText = "John Doe",
  onStyleChange 
}: CertificatePreviewProps) {
  const textMeasureRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [customText, setCustomText] = useState(sampleText);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('helvetica');
  const [textColor, setTextColor] = useState('#000000');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [effectiveFontSize, setEffectiveFontSize] = useState(24);

  // Measure text width using canvas (exactly like jsPDF)
  const measureTextWidth = useCallback((text: string, font: string, size: number): number => {
    if (!textMeasureRef.current) return 0;
    const ctx = textMeasureRef.current.getContext('2d');
    if (!ctx) return 0;
    
    ctx.font = `bold ${size}px ${mapCssFontToPreviewer(font)}`;
    return ctx.measureText(text).width;
  }, []);

  // Exact replica of PDF's fitTextToBox logic
  const fitTextToBox = useCallback((
    text: string,
    boxWidthPx: number,
    boxHeightPx: number,
    maxFontSize: number
  ): { effectiveSize: number; lines: string[] } => {
    const actualMaxFontSize = Math.min(maxFontSize, 72);
    const minFontSize = 8;
    
    // Convert 2mm padding to pixels - exact same as PDF
    const pxPerMm = canvasSize.widthPx / 297; // A4 width mapping
    const paddingPx = 2 * pxPerMm; // 2mm padding
    const lineHeight = 1.2;

    const availableWidth = boxWidthPx - (paddingPx * 2);
    const availableHeight = boxHeightPx - (paddingPx * 2);

    let fontSize = actualMaxFontSize;
    let lines: string[] = [];

    // Binary search - exact same logic as PDF
    let maxSize = actualMaxFontSize;
    let minSize = minFontSize;

    while (minSize <= maxSize) {
      fontSize = Math.floor((minSize + maxSize) / 2);
      
      // Split text into words and wrap - exact same as PDF
      const words = text.split(' ');
      lines = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = measureTextWidth(testLine, fontFamily, fontSize);
        
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

      // Check if all lines fit - exact same as PDF
      const totalHeight = lines.length * fontSize * lineHeight;
      
      if (totalHeight <= availableHeight && lines.every(line => 
        measureTextWidth(line, fontFamily, fontSize) <= availableWidth
      )) {
        minSize = fontSize + 1; // Try larger font
      } else {
        maxSize = fontSize - 1; // Try smaller font
      }
    }

    return { effectiveSize: maxSize, lines };
  }, [fontFamily, measureTextWidth, canvasSize.widthPx]);

  // Calculate effective font size when inputs change
  useEffect(() => {
    const { effectiveSize } = fitTextToBox(customText, nameBoxPx.width, nameBoxPx.height, fontSize);
    setEffectiveFontSize(effectiveSize);
  }, [customText, nameBoxPx.width, nameBoxPx.height, fontSize, fitTextToBox]);

  // Notify parent of style changes
  useEffect(() => {
    onStyleChange?.({
      fontSize,
      fontFamily,
      textColor,
      textAlign,
      effectiveFontSize
    });
  }, [fontSize, fontFamily, textColor, textAlign, effectiveFontSize, onStyleChange]);

  const fontOptions = [
    { value: 'helvetica', label: 'Helvetica (PDF Default)' },
    { value: 'times', label: 'Times New Roman' },
    { value: 'courier', label: 'Courier New' }
  ];

  const { effectiveSize: actualFontSize, lines } = fitTextToBox(customText, nameBoxPx.width, nameBoxPx.height, fontSize);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Hidden canvas for text measurement */}
      <canvas ref={textMeasureRef} style={{ display: 'none' }} width="500" height="100" />
      
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Type className="w-5 h-5" />
            Text Preview
          </h3>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isVisible ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {isVisible && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Text</label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter name to preview"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Font Size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12">{fontSize}px</span>
              </div>
              {effectiveFontSize !== fontSize && (
                <div className="text-xs text-gray-500 mt-1">
                  Effective: {effectiveFontSize}px
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {fontOptions.map(font => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {isVisible && (
        <div className="p-4">
          <div
            className="relative w-full bg-gray-100 rounded-lg overflow-hidden"
            style={{ aspectRatio: '297/210' }}
          >
            {/* Full-cover backdrop */}
            <img
              src={backdropDataUrl}
              alt="Certificate backdrop"
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: 'cover', zIndex: 1 }}
            />

            {/* Text overlay with exact PDF positioning */}
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${(nameBoxPx.x / canvasSize.widthPx) * 100}%`,
                top: `${(nameBoxPx.y / canvasSize.heightPx) * 100}%`,
                width: `${(nameBoxPx.width / canvasSize.widthPx) * 100}%`,
                height: `${(nameBoxPx.height / canvasSize.heightPx) * 100}%`,
                zIndex: 2,
                padding: `${(2 * canvasSize.widthPx / 297) / canvasSize.widthPx * 100}%`, // 2mm padding
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              {lines.map((line, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: `${actualFontSize}px`,
                    fontFamily: mapCssFontToPreviewer(fontFamily),
                    fontWeight: 'bold',
                    color: textColor,
                    textAlign,
                    lineHeight: 1.2,
                    textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>

            {/* Name box outline */}
            <div
              className="absolute border-2 border-rose-500/50 bg-rose-500/10 pointer-events-none"
              style={{
                left: `${(nameBoxPx.x / canvasSize.widthPx) * 100}%`,
                top: `${(nameBoxPx.y / canvasSize.heightPx) * 100}%`,
                width: `${(nameBoxPx.width / canvasSize.widthPx) * 100}%`,
                height: `${(nameBoxPx.height / canvasSize.heightPx) * 100}%`,
                zIndex: 3
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setTextAlign('left')}
              className={`px-3 py-1 text-sm rounded ${textAlign === 'left' ? 'bg-rose-100 text-rose-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Left
            </button>
            <button
              onClick={() => setTextAlign('center')}
              className={`px-3 py-1 text-sm rounded ${textAlign === 'center' ? 'bg-rose-100 text-rose-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Center
            </button>
            <button
              onClick={() => setTextAlign('right')}
              className={`px-3 py-1 text-sm rounded ${textAlign === 'right' ? 'bg-rose-100 text-rose-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Right
            </button>
          </div>

          {effectiveFontSize !== fontSize && (
            <div className="mt-2 text-center text-sm text-gray-600">
              Text resized to {effectiveFontSize}px to fit within the name box
            </div>
          )}
        </div>
      )}
    </div>
  );
}
