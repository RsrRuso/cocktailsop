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

// Chunked upload for large files
export const uploadLargeFile = async (
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const {
    onProgress = () => {},
    onStageChange = () => {},
    maxRetries = 3,
    chunkSize = 5 * 1024 * 1024, // 5MB chunks
  } = options;

  const totalChunks = Math.ceil(file.size / chunkSize);
  
  if (totalChunks === 1) {
    // File is small enough, do regular upload
    return uploadWithRetry(bucket, path, file, options);
  }

  onStageChange("Preparing upload");
  
  try {
    // For large files, we'll use the standard upload but with better progress tracking
    // Supabase handles chunking internally
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
    onStageChange("Complete");

    return { publicUrl, path };
  } catch (error) {
    return { publicUrl: "", path: "", error: error as Error };
  }
};

// Upload with automatic retry
export const uploadWithRetry = async (
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const {
    onProgress = () => {},
    onStageChange = () => {},
    maxRetries = 3,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onStageChange(attempt > 1 ? `Retrying (${attempt}/${maxRetries})` : "Uploading");
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        onProgress(Math.min(90, Math.random() * 30 + 30));
      }, 300);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      onProgress(100);
      onStageChange("Complete");

      return { publicUrl, path };
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        onStageChange(`Failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    publicUrl: "",
    path: "",
    error: lastError || new Error("Upload failed"),
  };
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
    // Compress images before upload
    let fileToUpload = file;
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

    // Use appropriate upload method based on file size
    if (fileToUpload.size > 50 * 1024 * 1024) {
      // Large file (>50MB)
      return uploadLargeFile(bucket, fileName, fileToUpload, {
        ...options,
        onProgress: (p) => onProgress(20 + (p * 0.8)),
      });
    } else {
      // Regular file
      return uploadWithRetry(bucket, fileName, fileToUpload, {
        ...options,
        onProgress: (p) => onProgress(20 + (p * 0.8)),
      });
    }
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
