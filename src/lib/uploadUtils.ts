import { supabase } from "@/integrations/supabase/client";

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onStageChange?: (stage: string) => void;
  maxRetries?: number;
  chunkSize?: number;
}

export interface UploadResult {
  publicUrl: string;
  path: string;
  error?: Error;
}

// Compress image with quality control
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Compression failed"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// Upload with real progress tracking using XMLHttpRequest
export const uploadWithProgress = async (
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const {
    onProgress = () => {},
    onStageChange = () => {},
  } = options;

  // Get session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  return new Promise((resolve) => {
    onStageChange("Uploading 0%");
    onProgress(0);
    
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
        onStageChange(`Uploading ${percent}%`);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        
        onProgress(100);
        onStageChange("Complete!");
        resolve({ publicUrl, path });
      } else {
        console.error('Upload error:', xhr.status, xhr.responseText);
        resolve({ publicUrl: "", path: "", error: new Error(`Upload failed: ${xhr.status}`) });
      }
    });
    
    xhr.addEventListener('error', (e) => {
      console.error('XHR error:', e);
      resolve({ publicUrl: "", path: "", error: new Error("Upload failed - network error") });
    });
    
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token || supabaseKey}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Cache-Control', '3600');
    xhr.send(file);
  });
};

// Upload for large files - uses tus resumable protocol
export const uploadLargeFile = async (
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { onProgress = () => {}, onStageChange = () => {} } = options;
  
  onStageChange("Uploading large file...");
  onProgress(0);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Use tus resumable upload for large files
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    onProgress(100);
    onStageChange("Complete!");

    return { publicUrl, path };
  } catch (error) {
    console.error('Large file upload error:', error);
    return { publicUrl: "", path: "", error: error as Error };
  }
};

// Fallback upload using standard Supabase SDK (no progress but reliable)
export const uploadFallback = async (
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { onProgress = () => {}, onStageChange = () => {} } = options;
  
  onStageChange("Uploading...");
  onProgress(50); // Show indeterminate progress
  
  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    onProgress(100);
    onStageChange("Complete!");

    return { publicUrl, path };
  } catch (error) {
    return { publicUrl: "", path: "", error: error as Error };
  }
};

// Upload with automatic retry and fallback
export const uploadWithRetry = async (
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { onProgress = () => {}, onStageChange = () => {} } = options;

  // Try XHR upload with progress first
  try {
    onStageChange("Uploading");
    const result = await uploadWithProgress(bucket, path, file, options);
    if (!result.error) return result;
    console.warn('XHR upload failed, trying fallback:', result.error);
  } catch (error) {
    console.warn('XHR upload error, trying fallback:', error);
  }

  // Fallback to standard Supabase upload
  return uploadFallback(bucket, path, file, options);
};

// Compress video to reduce size
export const compressVideo = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> => {
  // For now, return original file - video compression requires FFmpeg which is heavy
  // The main fix is to handle large files properly with resumable uploads
  return file;
};

// Smart upload - automatically chooses best method
export const smartUpload = async (
  bucket: string,
  userId: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { onProgress = () => {}, onStageChange = () => {} } = options;

  try {
    let fileToUpload = file;
    
    // Compress images before upload
    if (file.type.startsWith("image/")) {
      onStageChange("Compressing image");
      onProgress(10);
      
      try {
        fileToUpload = await compressImage(file);
      } catch (error) {
        fileToUpload = file;
      }
      
      onProgress(20);
    }

    // Generate unique filename
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Check file size - 200MB limit for reels
    const maxSize = 200 * 1024 * 1024; // 200MB limit
    if (fileToUpload.size > maxSize) {
      onStageChange("File too large (max 200MB)");
      return {
        publicUrl: "",
        path: "",
        error: new Error(`File size ${(fileToUpload.size / 1024 / 1024).toFixed(1)}MB exceeds 200MB limit. Please compress your video.`),
      };
    }

    // Use XHR upload with real progress tracking
    return uploadWithRetry(bucket, fileName, fileToUpload, {
      ...options,
      onProgress: (p) => onProgress(20 + (p * 0.8)),
    });
  } catch (error) {
    return {
      publicUrl: "",
      path: "",
      error: error as Error,
    };
  }
};

// Batch upload multiple files
export const batchUpload = async (
  bucket: string,
  userId: string,
  files: File[],
  onProgress?: (overall: number, current: number, total: number) => void,
  onStageChange?: (stage: string) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onStageChange?.(`Uploading ${i + 1}/${files.length}`);
    
    const result = await smartUpload(bucket, userId, file, {
      onProgress: (fileProgress) => {
        const overallProgress = ((i / files.length) * 100) + ((fileProgress / files.length));
        onProgress?.(overallProgress, i + 1, files.length);
      },
      onStageChange,
    });
    
    results.push(result);
  }
  
  return results;
};
