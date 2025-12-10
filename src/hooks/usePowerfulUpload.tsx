import { useState, useCallback } from "react";
import { smartUpload, batchUpload, UploadResult } from "@/lib/uploadUtils";
import { toast } from "sonner";

export interface UploadProgress {
  progress: number;
  stage: string;
  isUploading: boolean;
  currentFile?: number;
  totalFiles?: number;
}

export const usePowerfulUpload = () => {
  const [uploadState, setUploadState] = useState<UploadProgress>({
    progress: 0,
    stage: "",
    isUploading: false,
  });

  const uploadSingle = useCallback(
    async (bucket: string, userId: string, file: File): Promise<UploadResult> => {
      setUploadState({
        progress: 0,
        stage: "Preparing...",
        isUploading: true,
      });

      const result = await smartUpload(bucket, userId, file, {
        onProgress: (progress) => {
          setUploadState((prev) => ({ 
            ...prev, 
            progress,
            isUploading: true, // Keep it uploading
          }));
        },
        onStageChange: (stage) => {
          setUploadState((prev) => ({ 
            ...prev, 
            stage,
            isUploading: true, // Keep it uploading
          }));
        },
      });

      if (result.error) {
        setUploadState({
          progress: 0,
          stage: "Failed",
          isUploading: false,
        });
        toast.error(`Upload failed: ${result.error.message}`);
      } else {
        // Show complete state briefly
        setUploadState({
          progress: 100,
          stage: "Complete!",
          isUploading: true,
        });
        
        // Hide after a short delay
        setTimeout(() => {
          setUploadState({
            progress: 100,
            stage: "Complete",
            isUploading: false,
          });
        }, 500);
        
        toast.success("Upload complete!");
      }

      return result;
    },
    []
  );

  const uploadMultiple = useCallback(
    async (
      bucket: string,
      userId: string,
      files: File[]
    ): Promise<UploadResult[]> => {
      setUploadState({
        progress: 0,
        stage: "Starting uploads",
        isUploading: true,
        currentFile: 0,
        totalFiles: files.length,
      });

      const results = await batchUpload(
        bucket,
        userId,
        files,
        (overall, current, total) => {
          setUploadState((prev) => ({
            ...prev,
            progress: overall,
            currentFile: current,
            totalFiles: total,
          }));
        },
        (stage) => {
          setUploadState((prev) => ({ ...prev, stage }));
        }
      );

      const failedCount = results.filter((r) => r.error).length;
      const successCount = results.length - failedCount;

      setUploadState({
        progress: 100,
        stage: "Complete",
        isUploading: false,
      });

      if (failedCount > 0) {
        toast.error(`${failedCount} upload(s) failed, ${successCount} succeeded`);
      } else {
        toast.success(`All ${successCount} files uploaded successfully!`);
      }

      return results;
    },
    []
  );

  const reset = useCallback(() => {
    setUploadState({
      progress: 0,
      stage: "",
      isUploading: false,
    });
  }, []);

  return {
    uploadState,
    uploadSingle,
    uploadMultiple,
    reset,
  };
};
