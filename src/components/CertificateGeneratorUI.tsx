import { useState, useCallback, useRef } from 'react';
import { generateBulkCertificates, downloadSingleCertificate, BulkGenerationProgress, getRecommendedBatchSize } from '../utils/files';
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
// Types for props
export type CertificateEvent = {
  title: string;
  date: string;
  location: string;
  id: string;
};
export type CertificateParticipant = { id: string; name: string; email?: string };
export type CertificateNGO = { name: string; logo_url?: string };

interface CertificateGeneratorUIProps {
  onConfirmPlacement?: (payload: CertificatePayload) => void;
  event?: CertificateEvent;
  participants?: CertificateParticipant[];
  ngo?: CertificateNGO;
}

type Step = 'template-selection' | 'placement' | 'preview';

export function CertificateGeneratorUI({ onConfirmPlacement, event, participants, ngo }: CertificateGeneratorUIProps) {
  // Bulk generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<BulkGenerationProgress | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const [isBulk, setIsBulk] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] = useState<CertificateParticipant | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('template-selection');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [backdropDataUrl, setBackdropDataUrl] = useState<string>('');
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);
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

  const handleConfirmPlacement = useCallback(async () => {
    const payload: CertificatePayload = {
      backdropDataUrl,
      canvasPxSize: canvasSize,
      nameBoxPx,
      nameBoxMm,
    };

    // If no event/participants/ngo, fallback to default
    if (!event || !ngo || (!participants || participants.length === 0)) {
      if (onConfirmPlacement) {
        onConfirmPlacement(payload);
      } else {
        console.log('Certificate placement confirmed:', payload);
        alert('Placement confirmed! Check console for payload data.');
      }
      return;
    }

    // Ask user: single or bulk
    if (!isBulk && participants.length > 1 && !selectedParticipant) {
      setIsBulk(true);
      return;
    }

    if (isBulk) {
      // Bulk generation
      setIsGenerating(true);
      setProgress({ completed: 0, total: participants.length, percentage: 0 });
      abortController.current = new AbortController();
      // Patch: ensure all participants have email as string
      const safeParticipants = participants.map(p => ({ ...p, email: p.email ?? '' }));
      try {
        await generateBulkCertificates(
          safeParticipants,
          event,
          ngo,
          {
            backdropDataUrl,
            canvasPxSize: canvasSize,
            nameBoxPx,
            nameBoxMm,
          },
          {
            onProgress: setProgress,
            signal: abortController.current.signal,
          }
        );
        setIsGenerating(false);
        setProgress(null);
        setIsBulk(false);
        alert('Bulk certificate ZIP downloaded!');
      } catch (err: any) {
        setIsGenerating(false);
        setProgress(null);
        setIsBulk(false);
        if (err?.message?.includes('cancel')) {
          alert('Bulk generation cancelled.');
        } else {
          alert('Error during bulk generation: ' + err);
        }
      }
      return;
    }

    // Single participant
    let participant = selectedParticipant || participants[0];
    // Patch: ensure email is string
    const safeParticipant = { ...participant, email: participant.email ?? '' };
    try {
      await downloadSingleCertificate(
        safeParticipant,
        event,
        ngo,
        {
          backdropDataUrl,
          canvasPxSize: canvasSize,
          nameBoxPx,
          nameBoxMm,
        }
      );
      alert('Certificate downloaded!');
    } catch (err) {
      alert('Error generating certificate: ' + err);
    }
  }, [backdropDataUrl, canvasSize, nameBoxPx, nameBoxMm, onConfirmPlacement, event, participants, ngo, isBulk, selectedParticipant]);
  // Cancel bulk generation
  const handleCancel = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

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

  // Guard: disable confirm unless all required fields are present
  const canGenerate = !!(event && ngo && backdropDataUrl && nameBoxMm && nameBoxMm.widthMm > 0 && nameBoxMm.heightMm > 0);
  const recommendedBatchSize = participants && participants.length > 1 ? getRecommendedBatchSize(participants.length) : 5;

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

            {/* Bulk/single selection UI */}
            {participants && participants.length > 1 && !isBulk && (
              <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex items-center gap-2 mb-2 md:mb-0">
                  <button
                    className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50"
                    onClick={() => { setIsBulk(true); setSelectedParticipant(null); }}
                    disabled={isGenerating}
                  >
                    Bulk Generate ({participants.length} participants)
                  </button>
                  <span className="text-gray-500">or</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-medium mr-2">Single:</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={selectedParticipant ? selectedParticipant.id : ''}
                    onChange={e => {
                      const p = (participants as CertificateParticipant[]).find(p => p.id === e.target.value);
                      setSelectedParticipant(p ?? null);
                    }}
                  >
                    <option value="">Select participant</option>
                    {(participants as CertificateParticipant[]).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-gray-500 mt-2 md:mt-0 md:ml-4">
                  Recommended batch size: {recommendedBatchSize}
                </div>
              </div>
            )}

            {/* Progress bar for bulk generation */}
            {isGenerating && progress && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                  <div
                    className="bg-rose-600 h-4 rounded-full transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>{progress.completed} / {progress.total} completed</span>
                  <span>{progress.percentage}%</span>
                  <button className="text-rose-600 underline ml-4" onClick={() => {
                    handleCancel();
                    setIsGenerating(false);
                    setProgress(null);
                    setIsBulk(false);
                  }}>Cancel</button>
                </div>
                {progress.completed === progress.total && (
                  <div className="text-green-700 mt-2 text-center">Bulk ZIP ready! Download should start automatically.</div>
                )}
              </div>
            )}

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
                  className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors font-medium disabled:opacity-50"
                  disabled={isGenerating || !canGenerate}
                >
                  <Download className="w-4 h-4" />
                  {isBulk ? 'Generate ZIP' : 'Confirm & Generate'}
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