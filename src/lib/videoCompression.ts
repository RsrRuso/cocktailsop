// Browser-based video compression using canvas and MediaRecorder

export interface CompressionProgress {
  stage: 'loading' | 'compressing' | 'encoding' | 'complete';
  progress: number;
}

export const compressVideo = async (
  file: File,
  targetSizeMB: number = 45,
  onProgress?: (progress: CompressionProgress) => void
): Promise<File> => {
  const originalSizeMB = file.size / (1024 * 1024);
  
  // If already under target, return as-is
  if (originalSizeMB <= targetSizeMB) {
    onProgress?.({ stage: 'complete', progress: 100 });
    return file;
  }

  onProgress?.({ stage: 'loading', progress: 0 });

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        // Calculate compression ratio needed
        const compressionRatio = targetSizeMB / originalSizeMB;
        
        // Reduce resolution based on compression needed
        let scale = Math.sqrt(compressionRatio);
        scale = Math.max(0.3, Math.min(1, scale)); // Between 30% and 100%
        
        const originalWidth = video.videoWidth;
        const originalHeight = video.videoHeight;
        const newWidth = Math.floor(originalWidth * scale / 2) * 2; // Must be even
        const newHeight = Math.floor(originalHeight * scale / 2) * 2;

        // Calculate bitrate for target size
        const duration = video.duration;
        const targetBitsPerSecond = Math.floor((targetSizeMB * 8 * 1024 * 1024) / duration * 0.8);

        onProgress?.({ stage: 'compressing', progress: 10 });

        // Create canvas for rendering frames
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d')!;

        // Create MediaRecorder to encode compressed video
        const stream = canvas.captureStream(30);
        
        // Try to use efficient codec
        let mimeType = 'video/webm;codecs=vp8';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        }

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: Math.min(targetBitsPerSecond, 2500000), // Cap at 2.5 Mbps
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(url);
          
          const blob = new Blob(chunks, { type: mimeType });
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
            type: mimeType,
            lastModified: Date.now(),
          });

          onProgress?.({ stage: 'complete', progress: 100 });
          resolve(compressedFile);
        };

        mediaRecorder.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(new Error('MediaRecorder error'));
        };

        // Start recording
        mediaRecorder.start(100);
        video.currentTime = 0;

        onProgress?.({ stage: 'encoding', progress: 20 });

        // Render frames
        const renderFrame = () => {
          if (video.ended || video.paused) {
            mediaRecorder.stop();
            return;
          }

          ctx.drawImage(video, 0, 0, newWidth, newHeight);
          
          const progress = 20 + (video.currentTime / video.duration) * 75;
          onProgress?.({ stage: 'encoding', progress: Math.min(95, progress) });

          requestAnimationFrame(renderFrame);
        };

        video.onended = () => {
          mediaRecorder.stop();
        };

        video.onplay = () => {
          renderFrame();
        };

        // Play video to start encoding
        video.play().catch(reject);

      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
  });
};

// Quick check if compression is needed
export const needsCompression = (file: File, maxSizeMB: number = 50): boolean => {
  return file.size > maxSizeMB * 1024 * 1024;
};

// Get file size in MB
export const getFileSizeMB = (file: File): number => {
  return file.size / (1024 * 1024);
};
