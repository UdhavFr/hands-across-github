import { useState, useCallback } from 'react';
import { TemplateSelector } from './TemplateSelector';
import { BackdropUploader } from './BackdropUploader';
import { NamePlacementCanvas } from './NamePlacementCanvas';
import { CertificatePreview } from './CertificatePreview';
import { ArrowLeft, Download } from 'lucide-react';
import type { PxBox, MmBox, CanvasSize } from '../utils/coords';

interface Template {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
}

interface CertificatePayload {
  backdropDataUrl: string;
  canvasPxSize: CanvasSize;
  nameBoxPx: PxBox;
  nameBoxMm: MmBox;
}

interface CertificateGeneratorUIProps {
  onConfirmPlacement?: (payload: CertificatePayload) => void;
}

type Step = 'template-selection' | 'placement' | 'preview';

export function CertificateGeneratorUI({ onConfirmPlacement }: CertificateGeneratorUIProps) {
  const [currentStep, setCurrentStep] = useState<Step>('template-selection');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [backdropDataUrl, setBackdropDataUrl] = useState<string>('');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [canvasSize] = useState<CanvasSize>({ widthPx: 800, heightPx: 600 });
  const [nameBoxPx, setNameBoxPx] = useState<PxBox>({ x: 200, y: 150, width: 400, height: 80 });
  const [nameBoxMm, setNameBoxMm] = useState<MmBox>({ xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 });

  const handleTemplateSelect = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setBackdropDataUrl(template.thumbnail);
    setCurrentStep('placement');
  }, []);

  const handleCustomUpload = useCallback((dataUrl: string) => {
    setSelectedTemplate(null);
    setBackdropDataUrl(dataUrl);
    setCurrentStep('placement');
  }, []);

  const handleCoordinatesChange = useCallback((pxBox: PxBox, mmBox: MmBox) => {
    setNameBoxPx(pxBox);
    setNameBoxMm(mmBox);
  }, []);

  const handleConfirmPlacement = useCallback(() => {
    const payload: CertificatePayload = {
      backdropDataUrl,
      canvasPxSize: canvasSize,
      nameBoxPx,
      nameBoxMm,
    };

    if (onConfirmPlacement) {
      onConfirmPlacement(payload);
    } else {
      // Default behavior: log the payload
      console.log('Certificate placement confirmed:', payload);
      alert('Placement confirmed! Check console for payload data.');
    }
  }, [backdropDataUrl, canvasSize, nameBoxPx, nameBoxMm, onConfirmPlacement]);

  const handleReset = useCallback(() => {
    setCurrentStep('template-selection');
    setSelectedTemplate(null);
    setBackdropDataUrl('');
    setNameBoxPx({ x: 200, y: 150, width: 400, height: 80 });
    setNameBoxMm({ xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 });
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep === 'placement') {
      setCurrentStep('template-selection');
    } else if (currentStep === 'preview') {
      setCurrentStep('placement');
    }
  }, [currentStep]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          {currentStep !== 'template-selection' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            Certificate Generator
          </h1>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className={currentStep === 'template-selection' ? 'text-rose-600 font-medium' : ''}>
            1. Choose Template
          </span>
          <span className="text-gray-300">→</span>
          <span className={currentStep === 'placement' ? 'text-rose-600 font-medium' : ''}>
            2. Position Name
          </span>
          <span className="text-gray-300">→</span>
          <span className={currentStep === 'preview' ? 'text-rose-600 font-medium' : ''}>
            3. Preview & Confirm
          </span>
        </div>
      </div>

      {currentStep === 'template-selection' && (
        <TemplateSelector
          onTemplateSelect={handleTemplateSelect}
          onUploadClick={() => setIsUploaderOpen(true)}
          selectedTemplateId={selectedTemplate?.id}
        />
      )}

      {currentStep === 'placement' && backdropDataUrl && (
        <div className="space-y-6">
          <NamePlacementCanvas
            backdropDataUrl={backdropDataUrl}
            onCoordinatesChange={handleCoordinatesChange}
            onConfirm={() => setCurrentStep('preview')}
            onReset={handleReset}
          />
        </div>
      )}

      {currentStep === 'preview' && backdropDataUrl && (
        <div className="space-y-6">
          <CertificatePreview
            backdropDataUrl={backdropDataUrl}
            nameBoxPx={nameBoxPx}
            canvasSize={canvasSize}
          />

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Final Confirmation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Template</h4>
                <p className="text-gray-600">
                  {selectedTemplate ? selectedTemplate.name : 'Custom Upload'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Name Box Position</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Position: {nameBoxMm.xMm}mm, {nameBoxMm.yMm}mm</p>
                  <p>Size: {nameBoxMm.widthMm}mm × {nameBoxMm.heightMm}mm</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep('placement')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Adjust Position
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleConfirmPlacement}
                  className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Confirm & Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BackdropUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onImageUpload={handleCustomUpload}
      />
    </div>
  );
}