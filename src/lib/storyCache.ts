// Story media preloading cache for instant story viewing

const preloadedMedia = new Set<string>();
const preloadingPromises = new Map<string, Promise<void>>();

export const preloadImage = (url: string): Promise<void> => {
  if (preloadedMedia.has(url)) return Promise.resolve();
  if (preloadingPromises.has(url)) return preloadingPromises.get(url)!;
  
  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedMedia.add(url);
      preloadingPromises.delete(url);
      resolve();
    };
    img.onerror = () => {
      preloadingPromises.delete(url);
      resolve();
    };
    img.src = url;
  });
  
  preloadingPromises.set(url, promise);
  return promise;
};

export const preloadVideo = (url: string): Promise<void> => {
  if (preloadedMedia.has(url)) return Promise.resolve();
  if (preloadingPromises.has(url)) return preloadingPromises.get(url)!;
  
  const promise = new Promise<void>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.onloadeddata = () => {
      preloadedMedia.add(url);
      preloadingPromises.delete(url);
      resolve();
    };
    video.onerror = () => {
      preloadingPromises.delete(url);
      resolve();
    };
    video.src = url;
  });
  
  preloadingPromises.set(url, promise);
  return promise;
};

export const preloadStoryMedia = async (mediaUrl: string, mediaType: string): Promise<void> => {
  if (mediaType?.startsWith('video')) {
    return preloadVideo(mediaUrl);
  }
  return preloadImage(mediaUrl);
};

export const isMediaPreloaded = (url: string): boolean => {
  return preloadedMedia.has(url);
};
