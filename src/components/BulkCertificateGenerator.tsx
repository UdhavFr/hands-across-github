import { useState, useCallback } from 'react';
import { Upload, Users, AlertCircle, CheckCircle, X, Play, Pause } from 'lucide-react';
import { generateBulkCertificates, validateParticipants, getRecommendedBatchSize, type BulkGenerationProgress } from '../utils/files';
import { type EventData, type NgoData, type TemplateOptions, type Participant } from '../utils/certificate';

interface BulkCertificateGeneratorProps {
  event: EventData;
  ngo: NgoData;
  template: TemplateOptions;
  onClose: () => void;
}

export function BulkCertificateGenerator({ event, ngo, template, onClose }: BulkCertificateGeneratorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BulkGenerationProgress | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [csvInput, setCsvInput] = useState('');

  // Sample CSV data for demonstration
  const sampleCsv = `name,email,id
John Doe,john@example.com,user-001
Jane Smith,jane@example.com,user-002
Bob Johnson,bob@example.com,user-003`;

  const parseCsvData = useCallback((csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      setErrors(['CSV must have at least a header row and one data row']);
      return [];
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIndex = header.findIndex(h => h === 'name' || h === 'full_name');
    const emailIndex = header.findIndex(h => h === 'email');
    const idIndex = header.findIndex(h => h === 'id' || h === 'user_id');

    if (nameIndex === -1) {
      setErrors(['CSV must have a "name" or "full_name" column']);
      return [];
    }

    if (idIndex === -1) {
      setErrors(['CSV must have an "id" or "user_id" column']);
      return [];
    }

    const participants: Participant[] = [];
    const parseErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim());
      
      if (row.length !== header.length) {
        parseErrors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const name = row[nameIndex]?.replace(/['"]/g, '');
      const email = emailIndex >= 0 ? row[emailIndex]?.replace(/['"]/g, '') : '';
      const id = row[idIndex]?.replace(/['"]/g, '');

      if (!name) {
        parseErrors.push(`Row ${i + 1}: Name is required`);
        continue;
      }

      if (!id) {
        parseErrors.push(`Row ${i + 1}: ID is required`);
        continue;
      }

      participants.push({ name, email, id });
    }

    setErrors(parseErrors);
    return participants;
  }, []);

  const handleCsvInputChange = useCallback((value: string) => {
    setCsvInput(value);
    if (value.trim()) {
      const parsed = parseCsvData(value);
      setParticipants(parsed);
    } else {
      setParticipants([]);
      setErrors([]);
    }
  }, [parseCsvData]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleCsvInputChange(text);
    };
    reader.readAsText(file);
  }, [handleCsvInputChange]);

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

      {/* CSV Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Participant Data</h3>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </label>
            <button
              onClick={() => handleCsvInputChange(sampleCsv)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Load Sample Data
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSV Data (name, email, id columns required)
          </label>
          <textarea
            value={csvInput}
            onChange={(e) => handleCsvInputChange(e.target.value)}
            placeholder={`name,email,id\nJohn Doe,john@example.com,user-001\nJane Smith,jane@example.com,user-002`}
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
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