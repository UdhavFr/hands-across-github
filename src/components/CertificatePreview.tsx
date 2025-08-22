import { useState } from 'react';
import { Eye, EyeOff, Type } from 'lucide-react';
import type { PxBox } from '../utils/coords';

interface CertificatePreviewProps {
  backdropDataUrl: string;
  nameBoxPx: PxBox;
  canvasSize: { widthPx: number; heightPx: number };
  sampleText?: string;
}

export function CertificatePreview({
  backdropDataUrl,
  nameBoxPx,
  canvasSize,
  sampleText = "John Doe"
}: CertificatePreviewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [customText, setCustomText] = useState(sampleText);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('serif');
  const [textColor, setTextColor] = useState('#000000');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');

  const fontOptions = [
    { value: 'serif', label: 'Serif (Times)' },
    { value: 'sans-serif', label: 'Sans Serif (Arial)' },
    { value: 'monospace', label: 'Monospace' },
    { value: 'cursive', label: 'Cursive' },
    { value: 'fantasy', label: 'Fantasy' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Type className="w-5 h-5" />
            Text Preview
          </h3>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            aria-label={isVisible ? 'Hide preview' : 'Show preview'}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isVisible ? 'Hide' : 'Show'} Preview
          </button>
        </div>

        {isVisible && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sample Text
              </label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="Enter name to preview"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Size
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
                <span className="text-sm text-gray-600 w-8">{fontSize}px</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Family
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              >
                {fontOptions.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="#000000"
                />
              </div>
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

            <img
              src={backdropDataUrl}
              alt="Certificate backdrop with text preview"
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', left: 0, top: 0, zIndex: 1 }}
            />

            {/* Text overlay positioned exactly where the name box is */}

            <div
              className="absolute flex items-center justify-center overflow-hidden"
              style={{
                left: `${(nameBoxPx.x / canvasSize.widthPx) * 100}%`,
                top: `${(nameBoxPx.y / canvasSize.heightPx) * 100}%`,
                width: `${(nameBoxPx.width / canvasSize.widthPx) * 100}%`,
                height: `${(nameBoxPx.height / canvasSize.heightPx) * 100}%`,
                zIndex: 2,
              }}
            >
              <div
                className="w-full h-full flex px-2"
                style={{
                  alignItems: 'center',
                  justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                  position: 'relative',
                }}
              >
                {/* Vertically center text block by measuring text height and offsetting */}
                <span
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily,
                    color: textColor,
                    textAlign,
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                    display: 'inline-block',
                    width: '100%',
                    // Center text block vertically in the box
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    transform: 'translateY(-50%)',
                  }}
                  className="font-medium"
                >
                  {customText}
                </span>
              </div>
            </div>

            {/* Name box outline for reference */}
            <div
              className="absolute border-2 border-rose-500/50 bg-rose-500/10 pointer-events-none"
              style={{
                left: `${(nameBoxPx.x / canvasSize.widthPx) * 100}%`,
                top: `${(nameBoxPx.y / canvasSize.heightPx) * 100}%`,
                width: `${(nameBoxPx.width / canvasSize.widthPx) * 100}%`,
                height: `${(nameBoxPx.height / canvasSize.heightPx) * 100}%`,
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
        </div>
      )}
    </div>
  );
}