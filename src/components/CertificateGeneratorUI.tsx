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

function CertificateGeneratorUI({ participants, onClose }: CertificateGeneratorUIProps)
  // Bulk generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BulkGenerationProgress | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const [isBulk, setIsBulk] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<CertificateParticipant | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>('template-selection');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [backdropDataUrl, setBackdropDataUrl] = useState('');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [canvasSize] = useState({ widthPx: 800, heightPx: 600 });
  const [nameBoxPx, setNameBoxPx] = useState<PxBox>({ x: 200, y: 150, width: 400, height: 80 });
  const [nameBoxMm, setNameBoxMm] = useState<MmBox>({ xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 });

  const [previewStyle, setPreviewStyle] = useState<{
    fontSize: number;
    fontFamily: string;
    textColor: string;
    textAlign: 'left' | 'center' | 'right';
  }>({
    fontSize: 24,
    fontFamily: 'helvetica',
    textColor: '#000000',
    textAlign: 'center'
  });

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
            fontSize: previewStyle.fontSize,
            fontFamily: previewStyle.fontFamily,
            textColor: previewStyle.textColor,
            textAlign: previewStyle.textAlign,
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
  }, [backdropDataUrl, canvasSize, nameBoxPx, nameBoxMm, onConfirmPlacement, event, participants, ngo, isBulk, selectedParticipant, previewStyle]);

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
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header with Back Button and Title */}
  <div className="flex items-center justify-between p-6 border-b border-rose-200">
        {currentStep !== 'template-selection' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        
        <h1 className="text-2xl font-bold text-gray-900 flex-1 text-center">
          Certificate Generator
        </h1>
        
        {/* Placeholder for symmetry */}
        {currentStep !== 'template-selection' && <div className="w-20"></div>}
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center ${currentStep === 'template-selection' ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                currentStep === 'template-selection' 
                  ? 'bg-rose-600 text-white' 
                  : currentStep === 'placement' || currentStep === 'preview'
                    ? 'bg-rose-600 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}>
              1
            </div>
            Choose Template
          </div>
          
          <div className={`flex items-center ${currentStep === 'placement' ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
              currentStep === 'placement' 
                ? 'bg-rose-600 text-white' 
                : currentStep === 'preview'
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            Position Name
          </div>
          
          <div className={`flex items-center ${currentStep === 'preview' ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
              currentStep === 'preview' 
                ? 'bg-rose-600 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            Preview & Confirm
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {currentStep === 'template-selection' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Choose Your Certificate Template</h2>
              <p className="text-gray-600">Select a pre-made template or upload your own custom backdrop</p>
            </div>

            {/* Pre-made Template */}
            <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                 onClick={() => handleTemplateSelect({
                   id: 'premade',
                   name: 'Pre-made Template',
                   thumbnail: 'https://i.ibb.co/67JyzFx6/Beige-and-Cream-Geometric-Bordered-Completion-Certificate.png',
                   description: 'A beautiful pre-made certificate template.'
                 })}>
              <div className="flex items-center space-x-4">
                <img 
                  src="https://i.ibb.co/67JyzFx6/Beige-and-Cream-Geometric-Bordered-Completion-Certificate.png" 
                  alt="Pre-made Template"
                  className="w-24 h-16 object-cover rounded border"
                />
                <div>
                  <h3 className="font-semibold text-gray-800">Pre-made Template</h3>
                  <p className="text-gray-600 text-sm">A beautiful pre-made certificate template.</p>
                </div>
              </div>
            </div>

            {/* Custom Upload Option */}
            <div className="border border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
              <button
                onClick={() => setIsUploaderOpen(true)}
                className="w-full text-center"
              >
                <div className="text-blue-600 text-4xl mb-2">+</div>
                <h3 className="font-semibold text-gray-800 mb-1">Add Custom Backdrop</h3>
                <p className="text-gray-600 text-sm">Upload your own certificate background image</p>
              </button>
            </div>
          </div>
        )}

        {currentStep === 'placement' && backdropDataUrl && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Position the Name Area</h2>
              <p className="text-gray-600">Drag and resize the red box to set where participant names will appear</p>
            </div>

            <NamePlacementCanvas
              backdropDataUrl={backdropDataUrl}
              canvasSize={canvasSize}
              initialNameBoxPx={nameBoxPx}
              onCoordinatesChange={handleCoordinatesChange}
              onConfirm={() => setCurrentStep('preview')}
              onReset={handleReset}
            />
          </div>
        )}

        {currentStep === 'preview' && backdropDataUrl && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Preview & Generate</h2>
              <p className="text-gray-600">Customize the text style and generate your certificates</p>
            </div>

            <CertificatePreview
              backdropDataUrl={backdropDataUrl}
              nameBoxPx={nameBoxPx}
              canvasSize={canvasSize}
              sampleText={participants && participants.length > 0 ? participants[0].name : "John Doe"}
              onStyleChange={(style) => {
                setPreviewStyle(style);
              }}
            />

            {/* Final Confirmation Section */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Final Confirmation</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Template</h4>
                  <p className="text-gray-600">{selectedTemplate ? selectedTemplate.name : 'Custom Upload'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Name Box Position</h4>
                  <p className="text-gray-600">
                    Position: {nameBoxMm.xMm}mm, {nameBoxMm.yMm}mm<br />
                    Size: {nameBoxMm.widthMm}mm × {nameBoxMm.heightMm}mm
                  </p>
                </div>
              </div>

              {/* Bulk/single selection UI */}
              {participants && participants.length > 1 && !isBulk && (
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => { setIsBulk(true); setSelectedParticipant(null); }}
                        disabled={isGenerating}
                        className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
                      >
                        Bulk Generate ({participants.length} participants)
                      </button>
                      <span className="text-gray-500">or</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Single:</label>
                      <select
                        className="px-3 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-transparent"
                        value={selectedParticipant?.id || ''}
                        onChange={(e) => {
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
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Recommended batch size: {recommendedBatchSize}</p>
                </div>
              )}

              {/* Progress bar for bulk generation */}
              {isGenerating && progress && (
                <div className="border-t pt-4">
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{progress.completed} / {progress.total} completed</span>
                        <span>{progress.percentage}%</span>
                      </div>
                      <div className="w-full bg-rose-100 rounded-full h-2 mt-1">
                        <div 
                          className="bg-rose-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleCancel();
                        setIsGenerating(false);
                        setProgress(null);
                        setIsBulk(false);
                      }}
                      className="text-rose-600 hover:text-rose-800 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  {progress.completed === progress.total && (
                    <p className="text-green-600 text-sm mt-2">Bulk ZIP ready! Download should start automatically.</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => setCurrentStep('placement')}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Adjust Position
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-gray-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    Start Over
                  </button>
                  
                  <button
                    onClick={handleConfirmPlacement}
                    disabled={!canGenerate || isGenerating}
                    className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {isBulk ? 'Generate ZIP' : 'Confirm & Generate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop Uploader Modal */}
      <BackdropUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onImageUpload={handleCustomUpload}
      />
    </div>
  );
}
