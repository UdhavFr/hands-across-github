import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { Move, RotateCcw, Info } from 'lucide-react';
import { pxToMm, type PxBox, type MmBox, type CanvasSize, type PdfSize } from '../utils/coords';

interface Props {
  backdropDataUrl: string;
  canvasSize: CanvasSize; // canonical px size, e.g. { widthPx: 800, heightPx: 600 }
  initialNameBoxPx?: PxBox; // canonical px
  onCoordinatesChange: (pxBox: PxBox, mmBox: MmBox) => void;
  onConfirm: () => void;
  onReset: () => void;
}

const PDF_SIZE: PdfSize = { widthMm: 297, heightMm: 210 }; // A4 landscape

export function NamePlacementCanvas({
  backdropDataUrl,
  canvasSize,
  initialNameBoxPx,
  onCoordinatesChange,
  onConfirm,
  onReset
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Canonical (source-of-truth) coordinates in canvas px
  const defaultCanonical: PxBox = useMemo(
    () =>
      initialNameBoxPx ?? {
        x: Math.round(canvasSize.widthPx * 0.25),
        y: Math.round(canvasSize.heightPx * 0.4),
        width: Math.round(canvasSize.widthPx * 0.5),
        height: Math.round(canvasSize.heightPx * 0.15),
      },
    [initialNameBoxPx, canvasSize]
  );

  const [canonicalBox, setCanonicalBox] = useState<PxBox>(defaultCanonical);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);

  // Display size (DOM pixels). We preserve aspect ratio of canonical canvas.
  const [displayWidth, setDisplayWidth] = useState<number>(canvasSize.widthPx);
  const displayHeight = useMemo(
    () => Math.round((canvasSize.heightPx / canvasSize.widthPx) * displayWidth),
    [displayWidth, canvasSize]
  );

  // Resize observer -> update display width
  const updateDisplayWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(100, Math.floor(rect.width));
    setDisplayWidth(w);
  }, []);

  useEffect(() => {
    updateDisplayWidth();
    window.addEventListener('resize', updateDisplayWidth);
    return () => window.removeEventListener('resize', updateDisplayWidth);
  }, [updateDisplayWidth]);

  // Keep canonical -> mm notify parent
  useEffect(() => {
    const mm = pxToMm(canonicalBox, canvasSize, PDF_SIZE);
    onCoordinatesChange(canonicalBox, mm);
  }, [canonicalBox, canvasSize, onCoordinatesChange]);

  // scale: display px per canonical px (guard divide-by-zero)
  const scale = useMemo(() => {
    return canvasSize.widthPx > 0 ? displayWidth / canvasSize.widthPx : 1;
  }, [displayWidth, canvasSize]);

  // Derived display box for Rnd (rounded ints)
  const displayBox = useMemo(() => {
    return {
      x: Math.round(canonicalBox.x * scale),
      y: Math.round(canonicalBox.y * scale),
      width: Math.round(canonicalBox.width * scale),
      height: Math.round(canonicalBox.height * scale),
    };
  }, [canonicalBox, scale]);

  // Convert display -> canonical
  const displayToCanonical = useCallback(
    (box: { x: number; y: number; width: number; height: number }): PxBox => {
      return {
        x: Math.max(0, Math.round(box.x / Math.max(scale, 1e-6))),
        y: Math.max(0, Math.round(box.y / Math.max(scale, 1e-6))),
        width: Math.max(1, Math.round(box.width / Math.max(scale, 1e-6))),
        height: Math.max(1, Math.round(box.height / Math.max(scale, 1e-6))),
      };
    },
    [scale]
  );

  // Rnd handlers: convert display coords to canonical and set
  const onRndDrag = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      const newCanonical = displayToCanonical({ x: d.x, y: d.y, width: displayBox.width, height: displayBox.height });
      setCanonicalBox(prev => (JSON.stringify(prev) === JSON.stringify(newCanonical) ? prev : newCanonical));
    },
    [displayBox.width, displayBox.height, displayToCanonical]
  );

  const onRndResize = useCallback(
    (_e: any, _dir: any, ref: HTMLElement, _delta: any, pos: { x: number; y: number }) => {
      const displayW = parseInt(ref.style.width || `${displayBox.width}`, 10);
      const displayH = parseInt(ref.style.height || `${displayBox.height}`, 10);
      const newCanonical = displayToCanonical({ x: pos.x, y: pos.y, width: displayW, height: displayH });
      setCanonicalBox(prev => (JSON.stringify(prev) === JSON.stringify(newCanonical) ? prev : newCanonical));
    },
    [displayBox.width, displayBox.height, displayToCanonical]
  );

  // Keyboard nudging in canonical px (arrows, +/-)
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      const step = e.shiftKey ? 10 : 1;
      const next = { ...canonicalBox };
      let changed = false;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          next.x = Math.max(0, next.x - step);
          changed = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          next.x = Math.min(canvasSize.widthPx - next.width, next.x + step);
          changed = true;
          break;
        case 'ArrowUp':
          e.preventDefault();
          next.y = Math.max(0, next.y - step);
          changed = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          next.y = Math.min(canvasSize.heightPx - next.height, next.y + step);
          changed = true;
          break;
        case '+':
        case '=':
          e.preventDefault();
          next.width = Math.min(canvasSize.widthPx - next.x, next.width + step);
          next.height = Math.min(canvasSize.heightPx - next.y, next.height + step);
          changed = true;
          break;
        case '-':
          e.preventDefault();
          next.width = Math.max(50, next.width - step);
          next.height = Math.max(20, next.height - step);
          changed = true;
          break;
      }

      if (changed) setCanonicalBox(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    },
    [canonicalBox, canvasSize]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  const resetBox = useCallback(() => {
    const def = {
      x: Math.round(canvasSize.widthPx * 0.25),
      y: Math.round(canvasSize.heightPx * 0.4),
      width: Math.round(canvasSize.widthPx * 0.5),
      height: Math.round(canvasSize.heightPx * 0.15),
    };
    setCanonicalBox(def);
  }, [canvasSize]);

  // mm box for display
  const mmBox = useMemo(() => pxToMm(canonicalBox, canvasSize, PDF_SIZE), [canonicalBox, canvasSize]);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Position Name Box</h3>
          <button
            type="button"
            onClick={() => setShowCoordinates(s => !s)}
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
              <div className="font-mono">x: {canonicalBox.x}, y: {canonicalBox.y}</div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Size (px)</div>
              <div className="font-mono">{canonicalBox.width} × {canonicalBox.height}</div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Position (mm)</div>
              <div className="font-mono">x: {mmBox.xMm}, y: {mmBox.yMm}</div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Size (mm)</div>
              <div className="font-mono">{mmBox.widthMm} × {mmBox.heightMm}</div>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <p className="mb-2">
            <strong>Controls:</strong> Drag to move • Resize from corners/edges • Arrow keys to nudge (Shift for 10px steps)
          </p>
          <p><strong>Keyboard:</strong> +/- to resize • Focus the canvas area for keyboard control</p>
        </div>
      </div>

      <div className="p-4">
        <div
          ref={containerRef}
          className="relative w-full bg-gray-100 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-rose-500"
          style={{ width: '100%', height: displayHeight }}
          tabIndex={0}
          role="application"
          aria-label="Certificate canvas - use arrow keys to move name box, +/- to resize"
        >
          <img
            src={backdropDataUrl}
            alt="Certificate backdrop"
            className="w-full h-full object-cover"
            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
            onLoad={() => {
              setIsImageLoaded(true);
              updateDisplayWidth();
            }}
          />

          {isImageLoaded && (
            <Rnd
              size={{ width: displayBox.width, height: displayBox.height }}
              position={{ x: displayBox.x, y: displayBox.y }}
              onDrag={onRndDrag}
              onResize={onRndResize}
              bounds="parent"
              minWidth={Math.max(8, Math.round(50 * scale))}
              minHeight={Math.max(6, Math.round(20 * scale))}
              className="border-2 border-rose-500 bg-rose-500/20 backdrop-blur-sm"
              style={{ zIndex: 2 }}
              enableResizing={{
                top: true, right: true, bottom: true, left: true,
                topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
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
            type="button"
            onClick={resetBox}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Position
          </button>

          <div className="flex gap-3">
            <button type="button" onClick={onReset} className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors">Start Over</button>
            <button type="button" onClick={onConfirm} className="px-6 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors font-medium">Confirm Placement</button>
          </div>
        </div>
      </div>
    </div>
  );
}
