import { useState, useEffect } from 'react';

interface ImageCache {
  [key: string]: string;
}

const imageCache: ImageCache = {};
const pendingImages = new Map<string, Promise<string>>();

export const useOptimizedImage = (src: string) => {
  const [imageSrc, setImageSrc] = useState<string>(imageCache[src] || '');
  const [isLoading, setIsLoading] = useState(!imageCache[src]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (imageCache[src]) {
      setImageSrc(imageCache[src]);
      setIsLoading(false);
      return;
    }

    // If image is already being loaded, wait for it
    if (pendingImages.has(src)) {
      pendingImages.get(src)!.then((url) => {
        setImageSrc(url);
        setIsLoading(false);
      }).catch(() => {
        setError(true);
        setIsLoading(false);
      });
      return;
    }

    // Start loading image
    setIsLoading(true);
    const loadPromise = new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imageCache[src] = src;
        pendingImages.delete(src);
        resolve(src);
      };
      img.onerror = () => {
        pendingImages.delete(src);
        reject(new Error('Failed to load image'));
      };
      img.src = src;
    });

    pendingImages.set(src, loadPromise);

    loadPromise
      .then((url) => {
        setImageSrc(url);
        setIsLoading(false);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  }, [src]);

  return { imageSrc, isLoading, error };
};
