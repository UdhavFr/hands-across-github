import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface ImageUploadOptions {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export interface ImageUploadResult {
  url: string | null;
  error: string | null;
  isUploading: boolean;
}

export function useImageUpload(options: ImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    bucket,
    folder,
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    onProgress
  } = options;

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `Please upload a valid image file (${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')})`;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Image must be less than ${maxSizeMB}MB`;
    }

    return null;
  }, [allowedTypes, maxSizeMB]);

  const uploadImage = useCallback(async (file: File, userId: string): Promise<ImageUploadResult> => {
    const validation = validateFile(file);
    if (validation) {
      return { url: null, error: validation, isUploading: false };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = folder ? `${userId}/${folder}/${fileName}` : `${userId}/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUploadProgress(100);
      onProgress?.(100);

      return { url: data.publicUrl, error: null, isUploading: false };
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      return { url: null, error: errorMessage, isUploading: false };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [bucket, folder, validateFile, onProgress]);

  const deleteImage = useCallback(async (imageUrl: string): Promise<boolean> => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === bucket);
      
      if (bucketIndex === -1) {
        throw new Error('Invalid image URL');
      }

      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Image deletion error:', error);
      toast.error('Failed to delete image');
      return false;
    }
  }, [bucket]);

  return {
    uploadImage,
    deleteImage,
    isUploading,
    uploadProgress,
    validateFile
  };
}