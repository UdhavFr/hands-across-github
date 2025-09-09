import { useState, useRef } from 'react';
import { Upload, Loader2, X, Camera, Image as ImageIcon } from 'lucide-react';
import { useImageUpload } from '../hooks/useImageUpload';
import { cn } from '../lib/utils';

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
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadImage, deleteImage, isUploading } = useImageUpload({
    bucket,
    folder,
    maxSizeMB,
    allowedTypes
  });

  const handleFileSelect = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const result = await uploadImage(file, userId);
    
    if (result.error) {
      console.error('Upload error:', result.error);
      return;
    }

    if (result.url) {
      onImageUpdate(result.url);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    const success = await deleteImage(currentImageUrl);
    if (success) {
      onImageUpdate(null);
    }
  };

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
          isUploading && 'pointer-events-none'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {currentImageUrl && !imageError ? (
          <>
            <img
              src={currentImageUrl}
              alt="Uploaded image"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              ) : (
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
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
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
          disabled={isUploading}
          className="flex items-center px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : currentImageUrl ? 'Change' : 'Upload'}
        </button>
        
        {currentImageUrl && !isUploading && (
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