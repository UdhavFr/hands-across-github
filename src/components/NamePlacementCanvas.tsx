import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Move, RotateCcw, Info } from 'lucide-react';
import { pxToMm, mmToPx, type PxBox, type MmBox, type CanvasSize, type PdfSize } from '../utils/coords';

interface NamePlacementCanvasProps {
  backdropDataUrl: string;
  onCoordinatesChange: (pxBox: PxBox, mmBox: MmBox) => void;
  onConfirm: () => void;
  onReset: () => void;
}

const PDF_SIZE: PdfSize = { widthMm: 297, heightMm: 210 }; // A4 landscape

export function NamePlacementCanvas({
  backdropDataUrl,
  onCoordinatesChange,
  onConfirm,
  onReset
}: NamePlacementCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ widthPx: 800, heightPx: 600 });
  const [nameBox, setNameBox] = useState<PxBox>({ x: 200, y: 150, width: 400, height: 80 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);

  // Update canvas size when container resizes
  const updateCanvasSize = useCallback(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newSize = { widthPx: rect.width, heightPx: rect.height };
      setCanvasSize(newSize);
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Calculate mm coordinates whenever px coordinates change
  useEffect(() => {
    const mmBox = pxToMm(nameBox, canvasSize, PDF_SIZE);
    onCoordinatesChange(nameBox, mmBox);
  }, [nameBox, canvasSize, onCoordinatesChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!canvasRef.current?.contains(document.activeElement)) return;

    const step = e.shiftKey ? 10 : 1;
    let newBox = { ...nameBox };

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newBox.x = Math.max(0, newBox.x - step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newBox.x = Math.min(canvasSize.widthPx - newBox.width, newBox.x + step);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newBox.y = Math.max(0, newBox.y - step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newBox.y = Math.min(canvasSize.heightPx - newBox.height, newBox.y + step);
        break;
      case '+':
      case '=':
        e.preventDefault();
        newBox.width = Math.min(canvasSize.widthPx - newBox.x, newBox.width + step);
        newBox.height = Math.min(canvasSize.heightPx - newBox.y, newBox.height + step);
        break;
      case '-':
        e.preventDefault();
        newBox.width = Math.max(50, newBox.width - step);
        newBox.height = Math.max(20, newBox.height - step);
        break;
    }

    if (JSON.stringify(newBox) !== JSON.stringify(nameBox)) {
      setNameBox(newBox);
    }
  }, [nameBox, canvasSize]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleRndChange = (d: any, size: any) => {
    setNameBox({
      x: d.x,
      y: d.y,
      width: size.width,
      height: size.height
    });
  };

  const resetNameBox = () => {
    const defaultBox = {
      x: Math.round(canvasSize.widthPx * 0.25),
      y: Math.round(canvasSize.heightPx * 0.4),
      width: Math.round(canvasSize.widthPx * 0.5),
      height: Math.round(canvasSize.heightPx * 0.15)
    };
    setNameBox(defaultBox);
  };

  const mmBox = pxToMm(nameBox, canvasSize, PDF_SIZE);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Position Name Box
          </h3>
          <button
            onClick={() => setShowCoordinates(!showCoordinates)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Toggle coordinate display"
          >
            <Info className="w-4 h-4" />
            {showCoordinates ? 'Hide' : 'Show'} Coordinates
          </button>
        </div>

        {showCoordinates && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Position (px)</div>
              <div className="font-mono">
                x: {nameBox.x}, y: {nameBox.y}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Size (px)</div>
              <div className="font-mono">
                {nameBox.width} × {nameBox.height}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Position (mm)</div>
              <div className="font-mono">
                x: {mmBox.xMm}, y: {mmBox.yMm}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Size (mm)</div>
              <div className="font-mono">
                {mmBox.widthMm} × {mmBox.heightMm}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <p className="mb-2">
            <strong>Controls:</strong> Drag to move • Resize from corners/edges • Arrow keys to nudge (Shift for 10px steps)
          </p>
          <p>
            <strong>Keyboard:</strong> +/- to resize • Focus the canvas area for keyboard control
          </p>
        </div>
      </div>

      <div className="p-4">
        <div
          ref={canvasRef}
          className="relative w-full bg-gray-100 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-rose-500"
          style={{ aspectRatio: '297/210' }}
          tabIndex={0}
          role="application"
          aria-label="Certificate canvas - use arrow keys to move name box, +/- to resize"
        >
          <img
            src={backdropDataUrl}
            alt="Certificate backdrop"
            className="w-full h-full object-cover"
            onLoad={() => {
              setIsImageLoaded(true);
              updateCanvasSize();
            }}
          />

          {isImageLoaded && (
            <Rnd
              size={{ width: nameBox.width, height: nameBox.height }}
              position={{ x: nameBox.x, y: nameBox.y }}
              onDrag={(e, d) => handleRndChange(d, { width: nameBox.width, height: nameBox.height })}
              onResize={(e, direction, ref, delta, position) => {
                handleRndChange(position, {
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height)
                });
              }}
              bounds="parent"
              minWidth={50}
              minHeight={20}
              className="border-2 border-rose-500 bg-rose-500/20 backdrop-blur-sm"
              enableResizing={{
                top: true,
                right: true,
                bottom: true,
                left: true,
                topRight: true,
                bottomRight: true,
                bottomLeft: true,
                topLeft: true,
              }}
              resizeHandleStyles={{
                topRight: { backgroundColor: '#e11d48', width: '12px', height: '12px' },
                bottomRight: { backgroundColor: '#e11d48', width: '12px', height: '12px' },
                bottomLeft: { backgroundColor: '#e11d48', width: '12px', height: '12px' },
                topLeft: { backgroundColor: '#e11d48', width: '12px', height: '12px' },
                top: { backgroundColor: '#e11d48', height: '6px' },
                right: { backgroundColor: '#e11d48', width: '6px' },
                bottom: { backgroundColor: '#e11d48', height: '6px' },
                left: { backgroundColor: '#e11d48', width: '6px' },
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-rose-700 font-medium text-sm select-none">
                <Move className="w-4 h-4 mr-2" />
                Name Area
              </div>
            </Rnd>
          )}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={resetNameBox}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Position
          </button>

          <div className="flex gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors font-medium"
            >
              Confirm Placement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}