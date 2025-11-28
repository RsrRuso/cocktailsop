import { useEffect } from 'react';

/**
 * Preload images for faster display
 */
export const useImagePreloader = (imageUrls: string[]) => {
  useEffect(() => {
    if (!imageUrls?.length) return;

    const images = imageUrls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });

    return () => {
      images.forEach((img) => {
        img.src = '';
      });
    };
  }, [imageUrls]);
};
