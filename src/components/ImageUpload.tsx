import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, X, Camera, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { useImageUpload } from '../hooks/useImageUpload';
import { StorageService, StorageUtils } from '../services/storageService';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

// Image optimization utilities
class ImageOptimizer {
  static async compressImage(file: File, maxSizeMB: number, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
  
  static async convertToWebP(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(webpFile);
          } else {
            resolve(file);
          }
        }, 'image/webp', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}

interface ImageUploadProps {
  currentImageUrl?: string | null;
  userId: string;
  bucket: string;
  folder?: string;
  onImageUpdate: (url: string | null) => void;
  placeholder?: string;
  className?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  maxSizeMB?: number;
  allowedTypes?: string[];
  showProgress?: boolean;
  enableRetry?: boolean;
  enableOptimization?: boolean;
  enableWebPConversion?: boolean;
  compressionQuality?: number;
  onUploadStart?: () => void;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  retryCount: number;
  isOptimizing: boolean;
  originalSize: number;
  optimizedSize: number;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  portrait: 'aspect-[3/4]'
};

export function ImageUpload({
  currentImageUrl,
  userId,
  bucket,
  folder,
  onImageUpdate,
  placeholder = "Click to upload or drag & drop",
  className,
  aspectRatio = 'landscape',
  maxSizeMB = 5,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  showProgress = true,
  enableRetry = true,
  onUploadStart,
  onUploadComplete,
  onUploadError
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    retryCount: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Validates and uploads a file with enhanced error handling
   */
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    // Reset previous state
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      retryCount: 0,
    });

    // Validate file
    const validation = StorageService.validateFile(file, bucket);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      setUploadState(prev => ({ ...prev, error: errorMessage }));
      onUploadError?.(errorMessage);
      toast.error(errorMessage);
      return;
    }

    // Create preview
    if (StorageUtils.isImageFile(file)) {
      const preview = StorageUtils.createPreviewUrl(file);
      setPreviewUrl(preview);
    }

    await uploadFile(file);
  }, [bucket, onUploadError]);

  /**
   * Uploads file with retry logic and progress tracking
   */
  const uploadFile = useCallback(async (file: File, isRetry = false) => {
    try {
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        progress: 0,
        error: null,
        retryCount: isRetry ? prev.retryCount + 1 : 0,
      }));

      onUploadStart?.();

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Generate unique file path
      const filePath = StorageUtils.generateFilePath(userId, file.name, folder);

      // Upload with progress tracking
      const url = await StorageService.uploadWithRetry(file, filePath, bucket, {
        maxRetries: enableRetry ? 3 : 1,
        onProgress: (progress) => {
          if (showProgress) {
            setUploadState(prev => ({ ...prev, progress: progress.percentage }));
          }
        },
        signal: abortControllerRef.current.signal,
      });

      // Success
      setUploadState(prev => ({ ...prev, isUploading: false, progress: 100 }));
      
      // Clean up preview
      if (previewUrl) {
        StorageUtils.revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
      }

      onImageUpdate(url);
      onUploadComplete?.(url);
      toast.success('Image uploaded successfully!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));

      onUploadError?.(errorMessage);
      
      // Don't show toast for aborted uploads
      if (!errorMessage.includes('aborted')) {
        toast.error(errorMessage);
      }
    }
  }, [userId, folder, bucket, enableRetry, showProgress, previewUrl, onUploadStart, onImageUpdate, onUploadComplete, onUploadError]);

  /**
   * Retries the upload with the same file
   */
  const retryUpload = useCallback(async () => {
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.[0]) return;

    await uploadFile(fileInput.files[0], true);
  }, [uploadFile]);

  /**
   * Cancels the current upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      retryCount: 0,
    });

    if (previewUrl) {
      StorageUtils.revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }

    toast.info('Upload cancelled');
  }, [previewUrl]);

  /**
   * Removes the current image
   */
  const handleRemoveImage = useCallback(async () => {
    if (!currentImageUrl) return;

    try {
      // Extract path from URL for deletion
      const urlParts = currentImageUrl.split('/');
      const pathIndex = urlParts.findIndex(part => part === bucket);
      
      if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
        const filePath = urlParts.slice(pathIndex + 1).join('/');
        const result = await StorageService.removeFiles([filePath], bucket);
        
        if (result.success.length > 0) {
          onImageUpdate(null);
          toast.success('Image removed successfully');
        } else {
          throw new Error('Failed to remove image from storage');
        }
      } else {
        // Fallback: just clear the URL
        onImageUpdate(null);
        toast.success('Image removed');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  }, [currentImageUrl, bucket, onImageUpdate]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Image Display/Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden transition-colors cursor-pointer group',
          aspectRatioClasses[aspectRatio],
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          uploadState.isUploading && 'pointer-events-none',
          uploadState.error && 'border-red-300 bg-red-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploadState.isUploading && !uploadState.error && fileInputRef.current?.click()}
      >
        {(currentImageUrl || previewUrl) && !imageError ? (
          <>
            <img
              src={previewUrl || currentImageUrl || ''}
              alt="Uploaded image"
              className={cn(
                "w-full h-full object-cover transition-opacity",
                uploadState.isUploading && "opacity-75"
              )}
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
            
            {/* Progress Overlay */}
            {uploadState.isUploading && showProgress && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <div className="text-sm font-medium">Uploading...</div>
                  <div className="text-xs mt-1">{Math.round(uploadState.progress)}%</div>
                  {uploadState.progress > 0 && (
                    <div className="w-32 bg-white/20 rounded-full h-1 mt-2">
                      <div 
                        className="bg-white h-1 rounded-full transition-all duration-300"
                        style={{ width: `${uploadState.progress}%` }}
                      />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelUpload();
                    }}
                    className="mt-2 px-2 py-1 text-xs bg-white/20 rounded hover:bg-white/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Hover Overlay */}
            {!uploadState.isUploading && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    title="Change image"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                  {currentImageUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                      title="Remove image"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {uploadState.error ? (
              <>
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-sm font-medium text-red-700 mb-2">Upload Failed</p>
                <p className="text-xs text-red-600 mb-4 max-w-xs">{uploadState.error}</p>
                {enableRetry && uploadState.retryCount < 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      retryUpload();
                    }}
                    className="flex items-center px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry ({uploadState.retryCount + 1}/3)
                  </button>
                )}
              </>
            ) : uploadState.isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
                {showProgress && (
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      {Math.round(uploadState.progress)}%
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-primary h-1 rounded-full transition-all duration-300"
                        style={{ width: `${uploadState.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">{placeholder}</p>
                <p className="text-xs text-muted-foreground">
                  {allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} (max {maxSizeMB}MB)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadState.isUploading}
          className="flex items-center px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploadState.isUploading ? 'Uploading...' : currentImageUrl ? 'Change' : 'Upload'}
        </button>
        
        {uploadState.isUploading && (
          <button
            type="button"
            onClick={cancelUpload}
            className="flex items-center px-3 py-2 text-sm border border-border rounded-md bg-background text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
        )}
        
        {uploadState.error && enableRetry && uploadState.retryCount < 3 && (
          <button
            type="button"
            onClick={retryUpload}
            className="flex items-center px-3 py-2 text-sm border border-border rounded-md bg-background text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        )}
        
        {currentImageUrl && !uploadState.isUploading && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="flex items-center px-3 py-2 text-sm border border-border rounded-md bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </button>
        )}
      </div>

      {/* Error Display */}
      {uploadState.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-800">Upload Error</p>
              <p className="text-red-700 mt-1">{uploadState.error}</p>
              {uploadState.retryCount > 0 && (
                <p className="text-red-600 text-xs mt-1">
                  Retry attempt {uploadState.retryCount} of 3
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}