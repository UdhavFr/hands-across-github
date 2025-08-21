import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertTriangle, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import { calculateDPI } from '../utils/coords';

interface BackdropUploaderProps {
  onImageUpload: (dataUrl: string, file: File) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface ImageValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  dpi?: number;
}

export function BackdropUploader({ onImageUpload, onClose, isOpen }: BackdropUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [validation, setValidation] = useState<ImageValidation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const validateImage = useCallback((file: File): Promise<ImageValidation> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const { minDpi } = calculateDPI(img.naturalWidth, img.naturalHeight);
        const warnings: string[] = [];
        const errors: string[] = [];
        
        // DPI validation
        if (minDpi < 150) {
          errors.push(`Low resolution: ${Math.round(minDpi)} DPI. Recommended: 300+ DPI for print quality.`);
        } else if (minDpi < 300) {
          warnings.push(`Medium resolution: ${Math.round(minDpi)} DPI. Consider 300+ DPI for best print quality.`);
        }
        
        // Aspect ratio validation (A4 landscape is roughly 1.414:1)
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const expectedRatio = 297 / 210; // A4 landscape
        const ratioTolerance = 0.1;
        
        if (Math.abs(aspectRatio - expectedRatio) > ratioTolerance) {
          warnings.push(`Aspect ratio ${aspectRatio.toFixed(2)}:1 differs from A4 landscape (${expectedRatio.toFixed(2)}:1). Image may be stretched.`);
        }
        
        // File size validation
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 10) {
          errors.push(`File size ${fileSizeMB.toFixed(1)}MB exceeds 10MB limit.`);
        }
        
        URL.revokeObjectURL(url);
        resolve({
          isValid: errors.length === 0,
          warnings,
          errors,
          dpi: Math.round(minDpi)
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          isValid: false,
          warnings: [],
          errors: ['Invalid image file. Please upload a valid PNG or JPG image.']
        });
      };
      
      img.src = url;
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);

    // Validate image
    const validationResult = await validateImage(file);
    setValidation(validationResult);
    setIsProcessing(false);
  }, [validateImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleConfirm = () => {
    if (preview && uploadedFile && validation?.isValid) {
      onImageUpload(preview, uploadedFile);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setPreview(null);
    setValidation(null);
    setUploadedFile(null);
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Upload Custom Backdrop
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close uploader"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!preview ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragActive
                  ? 'border-rose-400 bg-rose-50'
                  : 'border-gray-300 hover:border-rose-400 hover:bg-rose-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragActive ? 'Drop your image here' : 'Drag & drop your backdrop'}
              </p>
              <p className="text-gray-500 mb-4">
                or click to browse files
              </p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Supported: PNG, JPG (max 10MB)</p>
                <p>Recommended: 300+ DPI, A4 landscape ratio</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Backdrop preview"
                  className="w-full h-64 object-contain bg-gray-50 rounded-lg border"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-600"></div>
                  <span className="ml-2 text-gray-600">Validating image...</span>
                </div>
              )}

              {validation && !isProcessing && (
                <div className="space-y-3">
                  {validation.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-800 mb-2">Errors</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {validation.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {validation.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-amber-800 mb-2">Warnings</h4>
                          <ul className="text-sm text-amber-700 space-y-1">
                            {validation.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {validation.isValid && validation.warnings.length === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <div>
                          <h4 className="font-medium text-green-800">Image looks great!</h4>
                          <p className="text-sm text-green-700">
                            Resolution: {validation.dpi} DPI - Perfect for printing
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          {preview && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!validation?.isValid || isProcessing}
            className="px-6 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Use This Backdrop
          </button>
        </div>
      </div>
    </div>
  );
}