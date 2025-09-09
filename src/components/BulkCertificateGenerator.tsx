import { useState, useCallback } from 'react';
import { Users, AlertCircle, CheckCircle, X, Play, Pause } from 'lucide-react';
import { generateBulkCertificates, validateParticipants, getRecommendedBatchSize, type BulkGenerationProgress } from '../utils/files';
import { type EventData, type NgoData, type Participant } from '../utils/certificate';


interface BulkCertificateGeneratorProps {
  event: EventData;
  ngo: NgoData;
  participants: Participant[];
  template: {
    backdropDataUrl: string;
    nameBoxPx: { x: number; y: number; width: number; height: number };
    nameBoxMm?: { xMm: number; yMm: number; widthMm: number; heightMm: number };
    canvasPxSize: { widthPx: number; heightPx: number };
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
  };
  onClose: () => void;
}

function BulkCertificateGenerator({ event, ngo, participants: initialParticipants, template, onClose }: BulkCertificateGeneratorProps) {
  const [participants] = useState<Participant[]>(initialParticipants || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BulkGenerationProgress | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // CSV input is not needed for admin mass generation
  // const [csvInput, setCsvInput] = useState('');





  // Use the provided template instead of hardcoded default

  const validateAndStartGeneration = useCallback(async () => {
    const validationErrors = validateParticipants(participants);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsGenerating(true);
    setProgress(null);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const batchSize = getRecommendedBatchSize(participants.length);
      
      await generateBulkCertificates(
        participants,
        event,
        ngo,
        template,
        {
          batchSize,
          signal: controller.signal,
          onProgress: (progressData) => {
            setProgress(progressData);
          }
        }
      );

      setProgress({
        completed: participants.length,
        total: participants.length,
        percentage: 100
      });

      // Reset after successful completion
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(null);
        setAbortController(null);
      }, 2000);

    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        setProgress(null);
      } else {
        setErrors([`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [participants, event, ngo, template]);

  const handleCancelGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      setProgress(null);
    }
  }, [abortController]);

  const recommendedBatchSize = participants.length > 0 ? getRecommendedBatchSize(participants.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bulk Certificate Generation</h2>
          <p className="text-gray-600">Generate certificates for multiple participants</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close bulk generator"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Event Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Event: {event.title}</h3>
        <p className="text-blue-700 text-sm">
          {new Date(event.date).toLocaleDateString()} • {event.location}
        </p>
      </div>

      {/* Participants Summary for Admin */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
        {participants.length === 0 ? (
          <div className="text-gray-500">No participants found for this event.</div>
        ) : (
          <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto bg-white border rounded">
            {participants.map((p) => (
              <li key={p.id} className="px-4 py-2 flex justify-between items-center text-sm">
                <span>{p.name}</span>
                <span className="text-gray-400">{p.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Validation Results */}
      {participants.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">{participants.length} participants loaded</span>
          </div>
          {recommendedBatchSize > 0 && (
            <p className="text-green-700 text-sm mt-1">
              Recommended batch size: {recommendedBatchSize} (for optimal performance)
            </p>
          )}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-800">Validation Errors:</h4>
              <ul className="text-red-700 text-sm mt-1 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-blue-900">
              Generating Certificates... ({progress.completed}/{progress.total})
            </span>
            <span className="text-blue-700 font-medium">{progress.percentage}%</span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          
          {progress.currentParticipant && (
            <p className="text-blue-700 text-sm">
              Processing: {progress.currentParticipant}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{participants.length} participants ready</span>
        </div>

        <div className="flex gap-3">
          {isGenerating ? (
            <button
              onClick={handleCancelGeneration}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Cancel Generation
            </button>
          ) : (
            <button
              onClick={validateAndStartGeneration}
              disabled={participants.length === 0 || errors.length > 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              Generate {participants.length} Certificates
            </button>
          )}
        </div>
      </div>

      {/* Progress Completion */}
      {progress?.percentage === 100 && !isGenerating && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">
              Successfully generated {participants.length} certificates!
            </span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            ZIP file has been downloaded to your device.
          </p>
        </div>
      )}
    </div>
  );
}

export default BulkCertificateGenerator;